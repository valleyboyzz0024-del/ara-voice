const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const OpenAI = require('openai');
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

// Initialize OpenAI client (only if API key is provided)
let openai = null;
if (!config.useMockAI) {
  openai = new OpenAI({
    apiKey: config.openaiApiKey,
  });
}

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
    aiMode: config.useMockAI ? 'Mock AI' : 'OpenAI'
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
    
    // Process command with AI
    const aiResult = await processNaturalLanguageCommand(req.body.command, sessionId);
    
    if (!aiResult.success) {
      return res.status(400).json({ 
        status: 'error', 
        message: aiResult.error,
        needsClarification: aiResult.needsClarification || false
      });
    }
    
    const commandData = aiResult.data;
    console.log('AI processed command:', commandData);
    
    // Create abort controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);
    
    try {
      // Send data to Google Apps Script based on action type (skip if in test mode)
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
      
      res.status(200).json({
        status: 'success',
        message: 'Command processed successfully',
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
      
      res.status(500).json({
        status: 'error',
        message: errorMessage,
        details: axiosError.message
      });
    }
    
  } catch (error) {
    console.error('Unexpected error in /voice-command:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Helper function to parse voice commands is now imported from index.js

/**
 * Process natural language command using AI
 * @param {string} naturalCommand - Natural language command
 * @param {string} sessionId - Session ID for context continuity
 * @returns {Object} - Processed command with action and parameters
 */
async function processNaturalLanguageCommand(naturalCommand, sessionId = 'default') {
  console.log('Processing natural language command:', naturalCommand);
  
  try {
    if (config.useMockAI) {
      return mockAIProcessing(naturalCommand, sessionId);
    }
    
    // Get conversation context
    let context = conversationContexts.get(sessionId) || [];
    
    const systemPrompt = `You are a Google Sheets assistant that converts natural language commands into structured actions.

Available actions:
- addRow: Add a new row to a sheet
- updateRow: Update an existing row  
- deleteRow: Delete a row
- findRow: Search for rows
- readSheet: Read sheet contents
- createSheet: Create a new sheet
- formatCell: Format cells

For addRow actions, respond with JSON like:
{
  "action": "addRow",
  "tabName": "groceries",
  "item": "apples",
  "qty": 2.5,
  "pricePerKg": 1200,
  "status": "owes"
}

For other actions, infer the appropriate parameters. Be intelligent about missing information - use reasonable defaults or ask for clarification.

Examples:
- "add 2 kilos of bananas to grocery list" → addRow with reasonable price
- "delete the last item I added" → deleteRow (track context)
- "what's on my shopping list" → readSheet
- "create a work projects sheet" → createSheet`;

    // Add user message to context
    context.push({ role: 'user', content: naturalCommand });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: 'system', content: systemPrompt },
        ...context.slice(-10) // Keep last 10 messages for context
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content;
    
    // Add AI response to context
    context.push({ role: 'assistant', content: response });
    conversationContexts.set(sessionId, context);
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(response);
      return { success: true, data: parsed };
    } catch (parseError) {
      // If not JSON, treat as a clarification request
      return { 
        success: false, 
        error: response,
        needsClarification: true 
      };
    }
    
  } catch (error) {
    console.error('Error in AI processing:', error);
    
    // Handle specific OpenAI API errors
    if (error.status === 401) {
      return {
        success: false,
        error: 'OpenAI API key is invalid or expired. Please check your OPENAI_API_KEY environment variable.',
        errorType: 'API_KEY_ERROR'
      };
    } else if (error.status === 429) {
      return {
        success: false,
        error: 'OpenAI API rate limit exceeded. Please try again later.',
        errorType: 'RATE_LIMIT_ERROR'
      };
    } else if (error.status >= 500) {
      return {
        success: false,
        error: 'OpenAI service is temporarily unavailable. Please try again later.',
        errorType: 'SERVICE_ERROR'
      };
    }
    
    return {
      success: false,
      error: `AI processing failed: ${error.message}`,
      errorType: 'GENERAL_ERROR'
    };
  }
}

/**
 * Mock AI processing for when OpenAI API key is not available
 */
function mockAIProcessing(naturalCommand, sessionId) {
  console.log('Using mock AI processing for:', naturalCommand);
  
  const command = naturalCommand.toLowerCase();
  
  // Simple pattern matching for demo
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
      }
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
  
  if (command.includes('what') || command.includes('show') || command.includes('list')) {
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
  
  // Default response for unrecognized commands
  return {
    success: false,
    error: "I couldn't understand that command. Try commands like 'add 2 kilos of apples to grocery list' or 'show my shopping list'",
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