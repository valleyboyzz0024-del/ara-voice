/**
 * Ara Voice - The Google Sheets God
 * Main application server with comprehensive AI and Google Sheets integration
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./config');

// Import utility functions
const { 
  validateBearerToken, 
  validateSpokenPin, 
  validateSecretPhrase,
  parseVoiceCommand,
  sendToGoogleSheets 
} = require('./index');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Session storage for conversational context
const sessions = new Map();

/**
 * AI Processing with OpenAI or Mock fallback
 */
class AIProcessor {
  constructor() {
    this.openai = null;
    if (!config.useMockAI && config.openaiApiKey) {
      try {
        const { OpenAI } = require('openai');
        this.openai = new OpenAI({
          apiKey: config.openaiApiKey,
        });
      } catch (error) {
        console.warn('OpenAI not available, using mock responses:', error.message);
        config.useMockAI = true;
      }
    }
  }

  async processCommand(command, sessionId = 'default', sheetData = null) {
    if (config.useMockAI || !this.openai) {
      return this.mockAIProcess(command, sessionId, sheetData);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(sheetData);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: command }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return this.parseAIResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.mockAIProcess(command, sessionId, sheetData);
    }
  }

  buildSystemPrompt(sheetData) {
    let prompt = `You are the Google Sheets God - an AI assistant that can answer questions about spreadsheet data and execute sheet operations.

Current sheet data: ${JSON.stringify(sheetData || {}, null, 2)}

You can either:
1. ANSWER questions about the data (respond with JSON: {"type": "answer", "answer": "your response"})
2. EXECUTE actions on the sheet (respond with JSON: {"type": "action", "action": "addRow|updateRow|deleteRow|createSheet", "tabName": "sheet name", "item": "item", "qty": number, "pricePerKg": number, "status": "status"})

Always respond with valid JSON.`;

    return prompt;
  }

  parseAIResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      // If JSON parsing fails, treat as an answer
      return {
        type: 'answer',
        answer: response
      };
    }
  }

  mockAIProcess(command, sessionId, sheetData) {
    const commandLower = command.toLowerCase();
    
    // Mock sheet data for testing
    const mockData = {
      groceries: [
        { item: 'apples', qty: 2.5, pricePerKg: 1200, status: 'owes', person: 'Hulk' },
        { item: 'bananas', qty: 1, pricePerKg: 800, status: 'pending', person: 'User' }
      ]
    };

    // Question detection
    if (commandLower.includes('how much') || commandLower.includes('what') || commandLower.includes('show') || commandLower.includes('?')) {
      if (commandLower.includes('hulk')) {
        return {
          type: 'answer',
          answer: 'Based on your sheet data, Hulk owes $3,000 total (2.5kg of apples at $1,200/kg).',
          action_type: 'answer'
        };
      }
      if (commandLower.includes('pending')) {
        return {
          type: 'answer',
          answer: 'You have pending items: bananas (1kg at $800/kg).',
          action_type: 'answer'
        };
      }
      if (commandLower.includes('items') || commandLower.includes('list')) {
        return {
          type: 'answer',
          answer: 'Your grocery list contains: apples (2.5kg at $1,200/kg) and bananas (1kg at $800/kg).',
          action_type: 'answer'
        };
      }
      if (commandLower.includes('show') && (commandLower.includes('items') || commandLower.includes('list'))) {
        if (commandLower.includes('pending')) {
          return {
            type: 'answer',
            answer: 'You have pending items: bananas (1kg at $800/kg).',
            action_type: 'answer'
          };
        }
        return {
          type: 'answer',
          answer: 'Your grocery list contains: apples (2.5kg at $1,200/kg) and bananas (1kg at $800/kg).',
          action_type: 'answer'
        };
      }
      if (commandLower.includes('meaning') || commandLower.includes('life')) {
        return {
          type: 'answer',
          answer: 'I can help you with questions about your sheet data and execute operations. What would you like to know?',
          action_type: 'answer'
        };
      }
      return {
        type: 'answer',
        answer: 'I can help you with questions about your sheet data. What specific information would you like to know?',
        action_type: 'answer'
      };
    }

    // Action detection
    if (commandLower.includes('add') || commandLower.includes('put')) {
      // Extract details from natural language
      const item = this.extractItem(commandLower);
      const qty = this.extractQuantity(commandLower);
      const price = this.extractPrice(commandLower);
      const tabName = this.extractTabName(commandLower);
      const status = this.extractStatus(commandLower);

      return {
        type: 'action',
        action: 'addRow',
        tabName: tabName || 'groceries',
        item: item || 'unknown',
        qty: qty || 1,
        pricePerKg: price || 1000,
        status: status || 'pending'
      };
    }

    // Default response
    return {
      type: 'answer',
      answer: 'I understand you want to work with your Google Sheets. Can you be more specific about what you\'d like to do?'
    };
  }

  extractItem(text) {
    const items = ['apples', 'bananas', 'oranges', 'bread', 'milk', 'eggs'];
    for (const item of items) {
      if (text.includes(item)) return item;
    }
    // Try to extract item mentioned with "of"
    const ofMatch = text.match(/of\s+(\w+)/);
    if (ofMatch) return ofMatch[1];
    return 'item';
  }

  extractQuantity(text) {
    // Look for number followed by kg/kilo/kilogram
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram)/);
    if (match) return parseFloat(match[1]);
    
    // Look for just a number before "of"
    const ofMatch = text.match(/(\d+(?:\.\d+)?)\s+(?:of|kilo)/);
    if (ofMatch) return parseFloat(ofMatch[1]);
    
    return 1;
  }

  extractPrice(text) {
    const match = text.match(/(?:at|for)\s*(\d+)(?:\s*(?:per|\/)\s*kg)?/);
    return match ? parseInt(match[1]) : 1000;
  }

  extractTabName(text) {
    const tabs = ['groceries', 'grocery', 'shopping', 'work', 'personal'];
    for (const tab of tabs) {
      if (text.includes(tab)) return tab === 'grocery' ? 'groceries' : tab;
    }
    return 'groceries';
  }

  extractStatus(text) {
    if (text.includes('owes') || text.includes('owe')) return 'owes';
    if (text.includes('paid')) return 'paid';
    return 'pending';
  }
}

const aiProcessor = new AIProcessor();

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    config: {
      googleAppsScriptConfigured: !!config.googleAppsScriptUrl,
      openaiConfigured: !config.useMockAI
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Main conversational endpoint
app.post('/voice-command', async (req, res) => {
  try {
    const { command, sessionId = 'default' } = req.body;

    if (!command || typeof command !== 'string' || command.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid command provided'
      });
    }

    console.log(`Processing command for session ${sessionId}:`, command);

    // Process with AI
    const aiResponse = await aiProcessor.processCommand(command, sessionId);
    
    let result = {
      status: 'success',
      type: aiResponse.type,
      data: {
        original_command: command,
        ...aiResponse
      }
    };

    // If it's an action, execute it
    if (aiResponse.type === 'action') {
      // Always set the interpreted action first
      result.data.interpreted_action = {
        action: aiResponse.action,
        tabName: aiResponse.tabName,
        item: aiResponse.item,
        qty: aiResponse.qty,
        pricePerKg: aiResponse.pricePerKg,
        status: aiResponse.status
      };

      try {
        const sheetsResponse = await sendToGoogleSheets({
          tab: aiResponse.tabName,
          item: aiResponse.item,
          qty: aiResponse.qty,
          price: aiResponse.pricePerKg,
          status: aiResponse.status
        });

        result.data.sheets_response = sheetsResponse.response;
        result.message = `Added "${aiResponse.item}" to ${aiResponse.tabName}`;
      } catch (error) {
        console.error('Sheets operation failed:', error);
        result.data.sheets_error = error.message;
        result.message = 'Command understood but sheets operation failed';
      }
    } else {
      result.message = 'Question answered successfully';
    }

    // Store in session context
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    sessions.get(sessionId).push({
      command,
      response: result,
      timestamp: new Date().toISOString()
    });

    res.json(result);

  } catch (error) {
    console.error('Voice command processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process voice command',
      error: error.message
    });
  }
});

// Webhook endpoint with authentication
app.post('/webhook/voice', (req, res) => {
  try {
    const { command } = req.body;
    const authHeader = req.headers.authorization;

    if (!command) {
      return res.status(400).json({
        status: 'error',
        message: 'No command provided'
      });
    }

    let authMethod = null;

    // Check Bearer token authentication
    if (validateBearerToken(authHeader)) {
      authMethod = 'Bearer token';
    } 
    // Check spoken PIN authentication
    else {
      const words = command.split(' ');
      const possiblePin = words[0];
      if (validateSpokenPin(possiblePin)) {
        authMethod = 'Spoken PIN';
        // Remove PIN from command
        command = words.slice(1).join(' ');
      }
    }

    if (!authMethod) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Parse and process the command
    const parseResult = parseVoiceCommand(command);
    
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: parseResult.error
      });
    }

    // Send to Google Sheets
    sendToGoogleSheets(parseResult.data)
      .then(result => {
        res.json({
          status: 'success',
          message: 'Command processed successfully via webhook',
          authMethod: authMethod,
          data: {
            parsed: parseResult.data,
            result: result.response
          }
        });
      })
      .catch(error => {
        res.status(500).json({
          status: 'error',
          message: 'Failed to process command',
          error: error.message
        });
      });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Legacy process-command endpoint
app.post('/process-command', (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        status: 'error',
        message: 'No command provided'
      });
    }

    const parseResult = parseVoiceCommand(command);
    
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: parseResult.error
      });
    }

    sendToGoogleSheets(parseResult.data)
      .then(result => {
        res.json({
          status: 'success',
          message: 'Command processed successfully',
          data: {
            parsed: parseResult.data,
            result: result.response
          }
        });
      })
      .catch(error => {
        res.status(500).json({
          status: 'error',
          message: 'Failed to process command',
          error: error.message
        });
      });

  } catch (error) {
    console.error('Process command error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Config status endpoint
app.get('/config', (req, res) => {
  res.json({
    googleAppsScriptConfigured: !!config.googleAppsScriptUrl,
    openaiConfigured: !config.useMockAI,
    authMethods: {
      secretPhrase: !!config.auth.secretPhrase,
      bearerToken: !!config.auth.bearerToken,
      spokenPin: !!config.auth.spokenPin
    }
  });
});

// Export app for testing
module.exports = app;

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const PORT = config.port || 3000;
  app.listen(PORT, () => {
    console.log(`🎤 Ara Voice - Google Sheets God running on port ${PORT}`);
    console.log(`📊 Google Apps Script: ${config.googleAppsScriptUrl ? 'Configured' : 'Not configured'}`);
    console.log(`🤖 OpenAI: ${config.useMockAI ? 'Using mock AI' : 'Configured'}`);
    console.log(`🔐 Authentication: Ready`);
  });
}