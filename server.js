const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const config = require('./config');
const { validateAuth, validateBearerToken, validateSpokenPin, validateSecretPhrase, parseVoiceCommand, sendToGoogleSheets } = require('./index');

// Configure axios retry for resilient Google Apps Script requests
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx responses
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500);
  }
});

const app = express();

// Context storage for conversation continuity
const conversationContexts = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Config check endpoint (for debugging)
app.get('/config', (req, res) => {
  res.status(200).json({ 
    googleAppsScriptUrl: config.googleAppsScriptUrl ? 'Configured' : 'Missing',
    port: config.port,
    aiMode: process.env.GROK_API_KEY ? 'Grok AI' : 'Mock AI'
  });
});

// Session storage for PIN authentication
const authenticatedSessions = new Map();

// Webhook endpoint with Bearer token authentication and backup PIN support
app.post('/webhook/voice', async (req, res) => {
  try {
    console.log('Received webhook voice command:', req.body);
    console.log('Authorization header:', req.headers.authorization);
    
    let isAuthenticated = false;
    let authMethod = '';
    const sessionId = req.headers['x-session-id'] || 'default';
    
    // Primary authentication: Secret phrase in command
    if (req.body.command && typeof req.body.command === 'string') {
      // Check for secret phrase authentication
      if (validateSecretPhrase(req.body.command.trim())) {
        isAuthenticated = true;
        authMethod = 'Secret phrase';
        
        // If command is exactly the secret phrase, return success without processing
        if (req.body.command.trim().toLowerCase() === config.auth.secretPhrase.toLowerCase()) {
          return res.json({
            status: 'success',
            message: 'Secret phrase authenticated. You can now send your voice command.',
            authMethod: 'Secret phrase'
          });
        }
      }
    }
    
    // Secondary authentication: Bearer token
    if (!isAuthenticated && validateBearerToken(req.headers.authorization)) {
      isAuthenticated = true;
      authMethod = 'Bearer token';
    }
    
    // Fallback authentication: Spoken PIN in command  
    if (!isAuthenticated && req.body.command && typeof req.body.command === 'string') {
      const words = req.body.command.toLowerCase().trim().split(/\s+/);
      
      // Check if command starts with "pin is [PIN]"
      if (words.length >= 3 && words[0] === 'pin' && words[1] === 'is') {
        const spokenPin = words[2];
        if (validateSpokenPin(spokenPin)) {
          // Mark session as authenticated for next command
          authenticatedSessions.set(sessionId, Date.now() + 300000); // 5 minutes
          return res.json({
            status: 'success',
            message: 'PIN authenticated. You can now send your voice command.',
            authMethod: 'Spoken PIN'
          });
        } else {
          return res.status(401).json({
            status: 'error',
            message: 'Invalid PIN'
          });
        }
      }
      
      // Check if session is already authenticated from previous PIN
      const sessionAuth = authenticatedSessions.get(sessionId);
      if (sessionAuth && sessionAuth > Date.now()) {
        isAuthenticated = true;
        authMethod = 'Session (PIN authenticated)';
        // Clean up expired sessions
        authenticatedSessions.delete(sessionId);
      }
    }
    
    if (!isAuthenticated) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Use secret phrase, Bearer token in Authorization header, or spoken PIN with "pin is [PIN]".',
        authMethods: [
          'Secret phrase: "purple people dance keyboard pig"', 
          'Bearer token in Authorization header', 
          `Spoken PIN: "pin is ${config.auth.spokenPin}"`
        ]
      });
    }
    
    console.log(`Authenticated via ${authMethod}`);
    
    // Validate command
    if (!req.body.command || typeof req.body.command !== 'string') {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No valid command provided' 
      });
    }
    
    // Parse the voice command
    const parsedCommand = parseVoiceCommand(req.body.command);
    
    if (!parsedCommand.success) {
      return res.status(400).json({ 
        status: 'error', 
        message: parsedCommand.error 
      });
    }
    
    const { tab, item, qty, price, status } = parsedCommand.data;
    
    try {
      // Send data to Google Apps Script
      const sheetsResponse = await sendToGoogleSheets({
        tab: tab,
        item: item,
        qty: qty,
        price: price,
        status: status
      });
      
      res.json({ 
        status: 'success', 
        message: 'Command processed successfully via webhook',
        authMethod: authMethod,
        data: {
          parsed: parsedCommand.data,
          sheets_response: sheetsResponse
        }
      });
      
    } catch (sheetsError) {
      console.error('Google Sheets error:', sheetsError);
      res.status(502).json({ 
        status: 'error', 
        message: `Failed to update Google Sheets: ${sheetsError.message}` 
      });
    }
    
  } catch (error) {
    console.error('Unexpected error in /webhook/voice:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
});

// New voice command endpoint with conversational AI
app.post('/voice-command', async (req, res) => {
  try {
    console.log('Received voice command:', req.body);
    
    if (!req.body.command || typeof req.body.command !== 'string') {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No valid command provided' 
      });
    }
    
    const sessionId = req.body.sessionId || 'default';
    
    // Process command with AI (Read, Think, Act architecture)
    const aiResult = await processAICommand(req.body.command, sessionId);
    
    if (!aiResult.success) {
      return res.status(400).json({ 
        status: 'error', 
        message: aiResult.error,
        needsClarification: aiResult.needsClarification || false
      });
    }
    
    const commandData = aiResult.data;
    console.log('AI processed command:', commandData);
    
    // Handle Q&A responses (no Google Sheets interaction needed)
    if (aiResult.isAnswer) {
      return res.status(200).json({
        status: 'success',
        message: 'Question answered successfully',
        type: 'answer',
        data: {
          original_command: req.body.command,
          answer: commandData.response,
          action_type: 'answer'
        }
      });
    }
    
    // Handle data modification actions (addRow, deleteRow, etc.)
    if (aiResult.isAddRow || commandData.action !== 'answer') {
      // Create abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);
      
      try {
        // Send data to Google Apps Script based on action type
        let response;
        if (config.googleAppsScriptUrl.includes('test-mode') || config.googleAppsScriptUrl.includes('localhost')) {
          // Mock response for testing
          response = {
            data: {
              status: 'success',
              message: `Mock: ${commandData.action} operation completed successfully`,
              data: commandData
            }
          };
        } else {
          response = await axios.post(
            config.googleAppsScriptUrl,
            {
              action: commandData.action,
              ...commandData
            },
            { 
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: config.requestTimeout
            }
          );
        }
        
        clearTimeout(timeoutId);
        
        console.log('Google Apps Script response:', response.data);
        
        return res.status(200).json({
          status: 'success',
          message: 'Command processed successfully',
          type: 'action',
          data: {
            original_command: req.body.command,
            interpreted_action: commandData,
            sheets_response: response.data
          }
        });
        
      } catch (axiosError) {
        clearTimeout(timeoutId);
        console.error('Error calling Google Apps Script:', axiosError.message);
        
        let errorMessage = 'Failed to update Google Sheets';
        if (axiosError.code === 'ECONNABORTED') {
          errorMessage = 'Request to Google Sheets timed out';
        } else if (axiosError.response) {
          errorMessage = `Google Sheets error: ${axiosError.response.status}`;
        }
        
        return res.status(500).json({
          status: 'error',
          message: errorMessage,
          details: axiosError.message
        });
      }
    }
    
    // Fallback for unknown response types
    return res.status(200).json({
      status: 'success',
      message: 'Command processed',
      type: 'unknown',
      data: {
        original_command: req.body.command,
        interpreted_action: commandData
      }
    });
    
  } catch (error) {
    console.error('Unexpected error in /voice-command:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Helper function to parse voice commands is now imported from index.js

async function processAICommand(naturalCommand, sessionId) {
  // Check if the Grok API key is present
  if (!process.env.GROK_API_KEY) {
    console.error('ERROR: GROK_API_KEY environment variable is not set.');
    return mockAIProcessing(naturalCommand, sessionId);
  }

  const context = conversationContexts.get(sessionId) || [];
  
  // STEP 1: READ - Get all sheet data for full-sheet awareness
  console.log('Reading all sheet data for full-sheet awareness...');
  let allSheetsData = null;
  
  try {
    // Read all sheets data from Google Apps Script
    if (config.googleAppsScriptUrl.includes('test-mode') || config.googleAppsScriptUrl.includes('localhost')) {
      // Mock data for testing
      allSheetsData = {
        sheets: {
          'groceries': {
            headers: ['Timestamp', 'Item', 'Quantity', 'Price/kg', 'Status'],
            rows: [
              ['2024-01-01 10:00', 'apples', 2.5, 1200, 'owes'],
              ['2024-01-01 11:00', 'bananas', 1.0, 800, 'paid']
            ],
            rowCount: 2
          },
          'expenses': {
            headers: ['Timestamp', 'Item', 'Quantity', 'Price/kg', 'Status'],
            rows: [
              ['2024-01-01 12:00', 'coffee', 0.5, 2000, 'owes']
            ],
            rowCount: 1
          }
        },
        totalSheets: 2,
        totalRows: 3
      };
    } else {
      const response = await axios.post(
        config.googleAppsScriptUrl,
        { action: 'readAllSheets' },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: config.requestTimeout
        }
      );
      
      if (response.data.status === 'success') {
        allSheetsData = response.data.data;
      } else {
        console.error('Failed to read all sheets:', response.data.message);
        allSheetsData = { sheets: {}, totalSheets: 0, totalRows: 0 };
      }
    }
  } catch (error) {
    console.error('Error reading all sheets data:', error.message);
    allSheetsData = { sheets: {}, totalSheets: 0, totalRows: 0 };
  }

  // STEP 2: THINK - New system prompt for conversational data assistant
  const systemPrompt = `You are a conversational data assistant for a voice-controlled Google Sheets application. You have FULL AWARENESS of all the user's sheet data and can both answer questions about the data AND add new entries.

CURRENT SHEET DATA:
${JSON.stringify(allSheetsData, null, 2)}

Your capabilities:
1. **ANSWER QUESTIONS** about the data (e.g., "How much does Hulk owe in total?", "What items do I have in groceries?", "Show me all pending items")
2. **ADD NEW DATA** when the user wants to add items to sheets

For QUESTIONS about data, respond with:
{
  "action": "answer",
  "response": "Your detailed answer based on the sheet data above"
}

For ADDING DATA, respond with:
{
  "action": "addRow", 
  "tabName": "sheet_name",
  "item": "item_name",
  "qty": number,
  "pricePerKg": number,
  "status": "owes|paid|pending"
}

IMPORTANT ANALYSIS RULES:
- When calculating totals, multiply quantity by price per kg for each row
- Status "owes" means money is owed, "paid" means paid, "pending" means not yet determined
- Be conversational and helpful in your answers
- If asking about a person like "Hulk", search for that name in the Item column
- Always base your answers on the ACTUAL DATA provided above
- For ambiguous commands, ask for clarification

The user is speaking to you naturally. Determine if they're asking a question or wanting to add data.`;

  context.push({ role: 'user', content: naturalCommand });

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.slice(-10)
        ],
        temperature: 0.1,
        max_tokens: 1000,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Grok API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const completion = await response.json();
    const reply = completion.choices[0].message.content;

    context.push({ role: 'assistant', content: reply });
    conversationContexts.set(sessionId, context);

    try {
      const parsed = JSON.parse(reply);
      
      // STEP 3: ACT - Handle both answer and addRow actions
      if (parsed.action === 'answer') {
        return { 
          success: true, 
          data: parsed,
          isAnswer: true  // Flag to indicate this is a Q&A response
        };
      } else if (parsed.action === 'addRow') {
        return { 
          success: true, 
          data: parsed,
          isAddRow: true  // Flag to indicate this needs to add data
        };
      } else {
        // Support other existing actions
        return { success: true, data: parsed };
      }
      
    } catch (parseError) {
      return {
        success: false,
        error: reply,
        needsClarification: true
      };
    }

  } catch (error) {
    console.error('Error in AI processing with Grok:', error);
    return {
      success: false,
      error: `AI processing failed: ${error.message}`,
      errorType: 'GENERAL_ERROR'
    };
  }
}

/**
 * Mock AI processing for when Grok API key is not available
 */
function mockAIProcessing(naturalCommand, sessionId) {
  console.log('Using mock AI processing for:', naturalCommand);
  
  const command = naturalCommand.toLowerCase();
  
  // Mock Q&A responses for questions about data
  if (command.includes('how much') || command.includes('total') || command.includes('owe')) {
    if (command.includes('hulk')) {
      return {
        success: true,
        data: {
          action: 'answer',
          response: 'Based on the mock data, Hulk owes $3,000 total (2.5kg of apples at $1,200/kg).'
        },
        isAnswer: true
      };
    }
    return {
      success: true,
      data: {
        action: 'answer', 
        response: 'Based on the current data, the total amount owed is $3,400 across all items.'
      },
      isAnswer: true
    };
  }
  
  if (command.includes('what') && (command.includes('item') || command.includes('have') || command.includes('list'))) {
    return {
      success: true,
      data: {
        action: 'answer',
        response: 'You currently have: apples (2.5kg, owes), bananas (1.0kg, paid), and coffee (0.5kg, owes) in your sheets.'
      },
      isAnswer: true
    };
  }
  
  if (command.includes('show') && (command.includes('pending') || command.includes('owe'))) {
    return {
      success: true,
      data: {
        action: 'answer', 
        response: 'Items with pending/owed status: apples (2.5kg, $3,000 owed) and coffee (0.5kg, $1,000 owed).'
      },
      isAnswer: true
    };
  }
  
  // Simple pattern matching for adding data
  if (command.includes('add') && (command.includes('to') || command.includes('list'))) {
    // Extract quantity using regex
    const qtyMatch = command.match(/(\d+(?:\.\d+)?)\s*(?:kilo|kg|k|kilos)/);
    const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
    
    // Extract item name - look for pattern: "kilos of [item]" or after "add"
    let item = 'item';
    
    // First try: "kilos of apples"
    let itemMatch = command.match(/(?:kilo|kg|k|kilos)\s+(?:of\s+)?([a-zA-Z]+)/);
    if (itemMatch && itemMatch[1]) {
      item = itemMatch[1].trim();
    } else {
      // Second try: "add apples"
      itemMatch = command.match(/add\s+([a-zA-Z]+)/);
      if (itemMatch && itemMatch[1]) {
        item = itemMatch[1].trim();
      }
    }
    
    // Extract tab name
    let tabName = 'groceries'; // default
    if (command.includes('grocery') || command.includes('groceries')) tabName = 'groceries';
    if (command.includes('work') || command.includes('project')) tabName = 'work';
    if (command.includes('expense') || command.includes('expenses')) tabName = 'expenses';
    
    return {
      success: true,
      data: {
        action: 'addRow',
        tabName: tabName,
        item: item,
        qty: qty,
        pricePerKg: 1000, // default price
        status: 'pending'
      },
      isAddRow: true
    };
  }
  
  if (command.includes('delete') && command.includes('last')) {
    return {
      success: true,
      data: {
        action: 'deleteRow',
        tabName: 'groceries',
        position: 'last'
      }
    };
  }
  
  if (command.includes('show') || command.includes('read')) {
    return {
      success: true,
      data: {
        action: 'readSheet',
        tabName: 'groceries'
      }
    };
  }
  
  if (command.includes('create') && command.includes('sheet')) {
    const sheetMatch = command.match(/create.*?(?:sheet|list).*?(?:for|called|named)?\s+([a-zA-Z\s]+)/);
    const sheetName = sheetMatch ? sheetMatch[1].trim() : 'new_sheet';
    
    return {
      success: true,
      data: {
        action: 'createSheet',
        tabName: sheetName
      }
    };
  }
  
  // Default Q&A response for unrecognized questions
  if (command.includes('?') || command.includes('how') || command.includes('what') || command.includes('show')) {
    return {
      success: true,
      data: {
        action: 'answer',
        response: 'I can help you with questions about your data or adding new items. Try asking "How much do I owe?" or "Add 2 kilos of bananas to groceries".'
      },
      isAnswer: true
    };
  }
  
  // Default response for unrecognized commands
  return {
    success: false,
    error: "I couldn't understand that command. Try asking questions about your data like 'How much do I owe?' or adding items like 'Add 2 kilos of apples to grocery list'",
    needsClarification: true
  };
}

// Process command endpoint (for compatibility with existing frontend)
app.post('/process-command', async (req, res) => {
  try {
    console.log('Received command:', req.body.command);
    
    // Validate request body
    if (!req.body.command || typeof req.body.command !== 'string') {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No valid command provided' 
      });
    }
    
    // Parse the voice command
    const parseResult = parseVoiceCommand(req.body.command);
    if (!parseResult.success) {
      return res.status(400).json({ 
        status: 'error', 
        message: parseResult.error 
      });
    }
    
    const { tab, item, qty, price, status } = parseResult.data;
    console.log(`Processing: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
    
    // Create abort controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);
    
    try {
      // Send data to Google Apps Script (skip if in test mode)
      let response;
      if (config.googleAppsScriptUrl.includes('test-mode') || config.googleAppsScriptUrl.includes('localhost')) {
        // Mock response for testing
        response = {
          data: {
            status: 'success',
            message: `Mock: Legacy command processed successfully`,
            data: { tab, item, qty, pricePerKg: price, status }
          }
        };
      } else {
        response = await axios.post(
          config.googleAppsScriptUrl,
          {
            tabName: tab,
            item: item,
            qty: qty,
            pricePerKg: price,
            status: status
          },
          { 
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          }
        );
      }
      
      clearTimeout(timeoutId);
      console.log('Successfully sent to Google Sheets');
      
      res.json({ 
        status: 'success', 
        message: 'Command processed successfully',
        data: {
          tab,
          item,
          qty,
          pricePerKg: price,
          status,
          total: qty * price
        }
      });
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Google Sheets error:', error.message);
      
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'error',
          message: 'The request to Google Apps Script timed out'
        });
      }
      
      res.status(502).json({ 
        status: 'error', 
        message: `Failed to update Google Sheets: ${error.message}` 
      });
    }
    
  } catch (error) {
    console.error('Unexpected error in /process-command:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Endpoint to handle voice data
app.post('/api/voice-data', async (req, res) => {
  try {
    const { tabName, item, qty, pricePerKg, status } = req.body;
    
    // Validate request data
    if (!tabName || !item || !qty || !pricePerKg || !status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        message: 'Please provide tabName, item, qty, pricePerKg, and status'
      });
    }
    
    // Create abort controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);
    
    try {
      // Send data to Google Apps Script
      const response = await axios.post(
        config.googleAppsScriptUrl,
        req.body,
        { 
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      return res.status(200).json(response.data);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Google Apps Script error:', error.message);
      
      if (error.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Request timeout',
          message: 'The request to Google Apps Script timed out'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to update Google Sheets'
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Google Apps Script URL: ${config.googleAppsScriptUrl ? 'Configured' : 'MISSING'}`);
});