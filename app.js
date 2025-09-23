/**
 * Ara Voice - The Google Sheets God
 * Main application server with comprehensive AI and Google Sheets integration
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
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

// Import new modules
const GoogleSheetsAPI = require('./src/sheetsAPI');
const SessionManager = require('./src/sessionManager');

const app = express();

// Session middleware
app.use(session({
  secret: config.session?.secret || process.env.SESSION_SECRET || 'test-session-secret',
  resave: config.session?.resave || false,
  saveUninitialized: config.session?.saveUninitialized || false,
  cookie: { 
    maxAge: config.session?.maxAge || 30 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
  }
}));

// Other middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize services
const sessionManager = new SessionManager();
const googleSheetsAPI = new GoogleSheetsAPI();

/**
 * Enhanced AI Processing with Context Awareness
 */
class EnhancedAIProcessor {
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
    const context = sessionManager.getConversationContext(sessionId);
    
    if (config.useMockAI || !this.openai) {
      return this.mockAIProcess(command, sessionId, sheetData, context);
    }

    try {
      const systemPrompt = this.buildEnhancedSystemPrompt(sheetData, context);
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
      return this.mockAIProcess(command, sessionId, sheetData, context);
    }
  }

  buildEnhancedSystemPrompt(sheetData, context) {
    let prompt = `You are the Google Sheets God - an AI assistant that can answer questions about spreadsheet data and execute sheet operations.

Current sheet data: ${JSON.stringify(sheetData || {}, null, 2)}

Recent conversation context:
- Recent actions: ${JSON.stringify(context.recentActions, null, 2)}
- Preferred sheet: ${context.preferredSheetName}
- Recent history: ${JSON.stringify(context.recentHistory.map(h => ({command: h.command, type: h.type})), null, 2)}

You can either:
1. ANSWER questions about the data (respond with JSON: {"type": "answer", "answer": "your response"})
2. EXECUTE actions on the sheet (respond with JSON: {"type": "action", "action": "addRow|updateRow|deleteRow|createSheet", "tabName": "sheet name", "item": "item", "qty": number, "pricePerKg": number, "status": "status"})

When users refer to "the last item I added" or similar, use the recent actions context.
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

  mockAIProcess(command, sessionId, sheetData, context) {
    const commandLower = command.toLowerCase();
    
    // Mock sheet data for testing (enhanced with context)
    const mockData = {
      groceries: [
        { item: 'apples', qty: 2.5, pricePerKg: 1200, status: 'owes', person: 'Hulk' },
        { item: 'bananas', qty: 1, pricePerKg: 800, status: 'pending', person: 'User' }
      ]
    };

    // Handle contextual references
    if (commandLower.includes('last') || commandLower.includes('just added') || commandLower.includes('recent')) {
      if (context.recentActions && context.recentActions.length > 0) {
        const lastAction = context.recentActions[0];
        if (commandLower.includes('delete') || commandLower.includes('remove')) {
          return {
            type: 'action',
            action: 'deleteRow',
            tabName: lastAction.tabName || 'groceries',
            item: lastAction.item,
            qty: 0,
            pricePerKg: 0,
            status: 'deleted'
          };
        }
        return {
          type: 'answer',
          answer: `Your last action was adding ${lastAction.item} to ${lastAction.tabName} sheet.`,
          action_type: 'answer'
        };
      }
    }

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
      const tabName = this.extractTabName(commandLower) || context.preferredSheetName;
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

const aiProcessor = new EnhancedAIProcessor();

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    config: {
      googleAppsScriptConfigured: !!config.googleAppsScriptUrl,
      openaiConfigured: !config.useMockAI,
      googleSheetsAPIConfigured: googleSheetsAPI.initialized,
      activeSessions: sessionManager.getActiveSessions().length
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Google OAuth routes
app.get('/auth/google', (req, res) => {
  try {
    const authUrl = googleSheetsAPI.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ 
      error: 'Google OAuth not configured',
      message: error.message
    });
  }
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const tokens = await googleSheetsAPI.getTokensFromCode(code);
    
    // Store tokens in session
    const sessionId = req.session.id || 'default';
    sessionManager.setUserAuth(sessionId, tokens);
    
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/?auth=error');
  }
});

// Session management routes
app.get('/session/status', (req, res) => {
  const sessionId = req.session.id || 'default';
  const stats = sessionManager.getSessionStats(sessionId);
  const isAuthenticated = sessionManager.isUserAuthenticated(sessionId);
  
  res.json({
    ...stats,
    authenticated: isAuthenticated,
    googleSheetsAPI: googleSheetsAPI.initialized
  });
});

app.post('/session/clear', (req, res) => {
  const sessionId = req.session.id || 'default';
  const cleared = sessionManager.clearSession(sessionId);
  req.session.destroy();
  
  res.json({ 
    success: cleared,
    message: cleared ? 'Session cleared' : 'Session not found'
  });
});

// Main conversational endpoint (enhanced)
app.post('/voice-command', async (req, res) => {
  try {
    const { command, sessionId: providedSessionId } = req.body;
    const sessionId = providedSessionId || req.session.id || 'default';

    if (!command || typeof command !== 'string' || command.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid command provided'
      });
    }

    console.log(`Processing command for session ${sessionId}:`, command);

    // Try to get real sheet data if Google Sheets API is available
    let sheetData = null;
    const currentSpreadsheetId = sessionManager.getCurrentSpreadsheet(sessionId);
    
    if (googleSheetsAPI.initialized && currentSpreadsheetId) {
      try {
        sheetData = await googleSheetsAPI.readAllData(currentSpreadsheetId);
      } catch (error) {
        console.warn('Could not read sheet data:', error.message);
      }
    }

    // Process with AI
    const aiResponse = await aiProcessor.processCommand(command, sessionId, sheetData);
    
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

      // Try Google Sheets API first, then fallback to Google Apps Script
      let sheetsSuccess = false;
      
      if (googleSheetsAPI.initialized) {
        try {
          let spreadsheetId = currentSpreadsheetId;
          
          // Get or create spreadsheet if needed
          if (!spreadsheetId) {
            spreadsheetId = await googleSheetsAPI.getOrCreateSpreadsheet('Ara Voice Data');
            sessionManager.setCurrentSpreadsheet(sessionId, spreadsheetId);
          }

          // Execute the action
          switch (aiResponse.action) {
            case 'addRow':
              await googleSheetsAPI.addRow(spreadsheetId, aiResponse.tabName, {
                item: aiResponse.item,
                qty: aiResponse.qty,
                pricePerKg: aiResponse.pricePerKg,
                status: aiResponse.status
              });
              break;
            // Add other actions as needed
          }
          
          result.data.sheets_api_response = { success: true, method: 'Google Sheets API' };
          result.message = `Added "${aiResponse.item}" to ${aiResponse.tabName} via Google Sheets API`;
          sheetsSuccess = true;
        } catch (error) {
          console.warn('Google Sheets API failed, trying fallback:', error.message);
        }
      }

      // Fallback to Google Apps Script
      if (!sheetsSuccess) {
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
      }
    } else {
      result.message = 'Question answered successfully';
    }

    // Store interaction in session
    sessionManager.addInteraction(sessionId, {
      command,
      response: result,
      type: aiResponse.type,
      success: !result.data.sheets_error
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

// Enhanced webhook endpoint with session support
app.post('/webhook/voice', (req, res) => {
  try {
    const { command } = req.body;
    const authHeader = req.headers.authorization;
    const sessionId = req.headers['x-session-id'] || 'webhook-default';

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
        // Store in session
        sessionManager.addInteraction(sessionId, {
          command,
          response: result,
          type: 'action',
          success: true
        });

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
    googleSheetsAPIConfigured: googleSheetsAPI.initialized,
    authMethods: {
      secretPhrase: !!config.auth.secretPhrase,
      bearerToken: !!config.auth.bearerToken,
      spokenPin: !!config.auth.spokenPin
    },
    features: {
      sessionManagement: true,
      conversationalContext: true,
      googleSheetsAPI: googleSheetsAPI.initialized,
      oauth: !!config.google.clientId
    }
  });
});

// Admin endpoint for session management
app.get('/admin/sessions', (req, res) => {
  // In production, add proper admin authentication
  res.json({
    activeSessions: sessionManager.getActiveSessions(),
    totalSessions: sessionManager.sessions.size
  });
});

// Export app for testing
module.exports = app;

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  sessionManager.destroy();
  process.exit(0);
});

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const PORT = config.port || 3000;
  app.listen(PORT, () => {
    console.log(`🎤 Ara Voice - Google Sheets God running on port ${PORT}`);
    console.log(`📊 Google Apps Script: ${config.googleAppsScriptUrl ? 'Configured' : 'Not configured'}`);
    console.log(`🔗 Google Sheets API: ${googleSheetsAPI.initialized ? 'Configured' : 'Not configured'}`);
    console.log(`🤖 OpenAI: ${config.useMockAI ? 'Using mock AI' : 'Configured'}`);
    console.log(`🔐 Authentication: Ready`);
    console.log(`💾 Session Management: Active`);
  });
}