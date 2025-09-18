const express = require('express');
const app = express();

app.use(express.json());

// Enhanced command parser with natural language support
class CommandParser {
  constructor() {
    // Command patterns for natural language processing
    this.patterns = {
      // Basic CRUD operations
      add: /(?:add|insert|create|put)\s+(.+)/i,
      update: /(?:update|modify|change)\s+(.+)/i,
      delete: /(?:delete|remove|clear)\s+(.+)/i,
      get: /(?:get|find|show|display|list)\s+(.+)/i,
      
      // Spreadsheet operations
      merge: /(?:merge|combine|join)\s+(.+)/i,
      copy: /(?:copy|duplicate)\s+(.+)/i,
      move: /(?:move|transfer|relocate)\s+(.+)/i,
      
      // Data entry patterns - more flexible
      entry: /(?:ara|hey ara)\s+(\w+)\s+(\w+)\s+(\w+)\s+(?:at|for|@)\s+(\d+)\s+(\w+)/i
    };
  }

  parseCommand(transcript) {
    const text = transcript.toLowerCase().trim();
    
    // Try entry format first (backwards compatibility)
    const entryMatch = text.match(this.patterns.entry);
    if (entryMatch) {
      const [, tab, item, qtyText, price, status] = entryMatch;
      const qty = this.parseQuantity(qtyText);
      return {
        action: 'add_entry',
        tab,
        item,
        qty,
        price: parseInt(price),
        status,
        raw: transcript
      };
    }

    // Try other command patterns
    for (const [action, pattern] of Object.entries(this.patterns)) {
      if (action === 'entry') continue;
      
      const match = text.match(pattern);
      if (match) {
        return {
          action,
          content: match[1],
          raw: transcript
        };
      }
    }

    // Fallback to AI-powered parsing
    return this.aiParse(transcript);
  }

  parseQuantity(qtyText) {
    const qtyLower = qtyText.toLowerCase();
    const numberWords = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'half': 0.5, 'quarter': 0.25
    };
    
    // Check if it's a number word
    if (numberWords.hasOwnProperty(qtyLower)) {
      return numberWords[qtyLower];
    }
    
    // Check if it's a decimal number
    const parsed = parseFloat(qtyText);
    if (!isNaN(parsed)) {
      return parsed;
    }
    
    // Default to 1 if can't parse
    return 1;
  }

  aiParse(transcript) {
    // Simple AI-like parsing based on keywords and context
    const text = transcript.toLowerCase();
    const words = text.split(/\s+/);
    
    // Extract key information
    const result = {
      action: 'unknown',
      raw: transcript,
      confidence: 0
    };

    // Look for action keywords
    if (words.some(w => ['add', 'insert', 'create', 'put', 'log'].includes(w))) {
      result.action = 'add_entry';
      result.confidence = 0.8;
    } else if (words.some(w => ['merge', 'combine', 'join'].includes(w))) {
      result.action = 'merge';
      result.confidence = 0.9;
    } else if (words.some(w => ['update', 'modify', 'change', 'edit'].includes(w))) {
      result.action = 'update';
      result.confidence = 0.8;
    } else if (words.some(w => ['delete', 'remove', 'clear'].includes(w))) {
      result.action = 'delete';
      result.confidence = 0.8;
    } else if (words.some(w => ['get', 'find', 'show', 'list', 'display'].includes(w))) {
      result.action = 'get';
      result.confidence = 0.7;
    }

    // Try to extract structured data for add_entry
    if (result.action === 'add_entry') {
      const numberMatches = text.match(/\d+(?:\.\d+)?/g);
      const tabMatch = words.find(w => ['hulk', 'vendor', 'customer', 'inventory'].includes(w));
      
      if (numberMatches && numberMatches.length >= 2) {
        result.qty = parseFloat(numberMatches[0]);
        result.price = parseInt(numberMatches[1]);
        result.confidence += 0.1;
      }
      
      if (tabMatch) {
        result.tab = tabMatch;
        result.confidence += 0.1;
      }

      // Extract item name (usually between tab and numbers)
      const itemMatch = text.match(/(?:hulk|vendor|customer|inventory)\s+(\w+)/);
      if (itemMatch) {
        result.item = itemMatch[1];
        result.confidence += 0.1;
      }

      // Extract status
      const statusMatch = words.find(w => ['owes', 'paid', 'pending', 'complete'].includes(w));
      if (statusMatch) {
        result.status = statusMatch;
        result.confidence += 0.1;
      }
    }

    return result;
  }
}

// Enhanced Google Sheets operations
class SheetsManager {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
  }

  async executeCommand(command) {
    const payload = this.buildPayload(command);
    
    try {
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.text();
      return { success: true, result };
    } catch (error) {
      console.error('Sheets operation failed:', error);
      return { success: false, error: error.message };
    }
  }

  buildPayload(command) {
    switch (command.action) {
      case 'add_entry':
        return {
          operation: 'addEntry',
          tabName: command.tab,
          item: command.item,
          qty: command.qty,
          pricePerKg: command.price,
          status: command.status,
          timestamp: new Date().toISOString()
        };
      
      case 'merge':
        return {
          operation: 'mergeSheets',
          content: command.content,
          aiAssisted: true
        };
      
      case 'update':
        return {
          operation: 'updateData',
          content: command.content
        };
      
      case 'delete':
        return {
          operation: 'deleteData',
          content: command.content
        };
      
      case 'get':
        return {
          operation: 'getData',
          content: command.content
        };
      
      default:
        return {
          operation: 'aiCommand',
          content: command.raw,
          parsedAction: command.action
        };
    }
  }
}

// Initialize enhanced components
const commandParser = new CommandParser();
const sheetsManager = new SheetsManager('https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec');

// Enhanced /ara endpoint with better validation and logging
app.post('/ara', async (req, res) => {
  const { tab, item, qty, price, status } = req.body;
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  console.log(`[ARA] Direct update: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  
  // Create command object for consistent processing
  const command = {
    action: 'add_entry',
    tab,
    item,
    qty: parseFloat(qty),
    price: parseInt(price),
    status
  };

  try {
    const result = await sheetsManager.executeCommand(command);
    if (result.success) {
      res.json({ status: 'success', message: 'Entry added successfully', data: command });
    } else {
      res.status(500).json({ status: 'error', message: result.error });
    }
  } catch (error) {
    console.error('[ARA] Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Enhanced /voice endpoint with AI-powered natural language processing
app.post('/voice', async (req, res) => {
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Missing transcript' 
    });
  }

  console.log(`[VOICE] Processing: "${transcript}"`);
  
  try {
    // Parse the command using enhanced AI-powered parser
    const command = commandParser.parseCommand(transcript);
    console.log(`[VOICE] Parsed command:`, command);
    
    // Validate command confidence for critical operations
    if (command.confidence !== undefined && command.confidence < 0.5) {
      return res.status(400).json({
        status: 'error',
        message: 'Could not understand command with sufficient confidence',
        suggestion: 'Try: "Ara Hulk starburst one at 2100 owes" or "merge old spreadsheet with current data"',
        parsed: command
      });
    }

    // Execute the command
    const result = await sheetsManager.executeCommand(command);
    
    if (result.success) {
      res.json({ 
        status: 'success', 
        message: getSuccessMessage(command.action),
        command: command.action,
        data: result.result 
      });
    } else {
      res.status(500).json({ 
        status: 'error', 
        message: result.error,
        command: command.action 
      });
    }
  } catch (error) {
    console.error('[VOICE] Error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process voice command',
      error: error.message 
    });
  }
});

// New endpoint for spreadsheet merging operations
app.post('/merge', async (req, res) => {
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  const { sourceSheet, targetSheet, mergeType = 'smart' } = req.body;
  
  console.log(`[MERGE] Merging ${sourceSheet} into ${targetSheet} (${mergeType})`);
  
  try {
    const command = {
      action: 'merge',
      content: `${mergeType} merge from ${sourceSheet} to ${targetSheet}`,
      sourceSheet,
      targetSheet,
      mergeType
    };

    const result = await sheetsManager.executeCommand(command);
    
    if (result.success) {
      res.json({ 
        status: 'success', 
        message: 'Spreadsheets merged successfully',
        details: result.result 
      });
    } else {
      res.status(500).json({ 
        status: 'error', 
        message: result.error 
      });
    }
  } catch (error) {
    console.error('[MERGE] Error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to merge spreadsheets',
      error: error.message 
    });
  }
});

// Helper function for success messages
function getSuccessMessage(action) {
  const messages = {
    'add_entry': 'Entry logged successfully',
    'merge': 'Spreadsheets merged with AI assistance',
    'update': 'Data updated successfully',
    'delete': 'Data deleted successfully',
    'get': 'Data retrieved successfully',
    'unknown': 'Command processed'
  };
  
  return messages[action] || 'Operation completed';
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ara-voice',
    version: '2.0.0',
    features: [
      'natural-language-processing',
      'ai-powered-parsing',
      'spreadsheet-merging',
      'enhanced-logging',
      'comprehensive-sheets-operations'
    ]
  });
});

// Status endpoint with authentication
app.get('/status', (req, res) => {
  if (req.query.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  res.json({
    server: 'running',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    secretWord: 'Bruins ✓',
    lastActivity: new Date().toISOString(),
    capabilities: {
      voiceCommands: true,
      naturalLanguage: true,
      spreadsheetMerging: true,
      googleSheetsIntegration: true
    }
  });
});

// Test endpoint for development
app.post('/test', (req, res) => {
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  const { transcript } = req.body;
  const parsed = commandParser.parseCommand(transcript);
  
  res.json({
    status: 'test',
    input: transcript,
    parsed: parsed,
    timestamp: new Date().toISOString()
  });
});

app.listen(10000, () => {
  console.log('🚀 Ara Voice Server v2.0 - Enhanced AI-Powered Voice Commands');
  console.log('📍 Server running on port 10000');
  console.log('🔑 Secret activation word: "Bruins"');
  console.log('🎯 Features:');
  console.log('   • Natural language processing');
  console.log('   • AI-powered command parsing');
  console.log('   • Spreadsheet merging with AI');
  console.log('   • Comprehensive Google Sheets operations');
  console.log('   • Enhanced error handling and logging');
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   POST /voice  - Natural language voice commands');
  console.log('   POST /ara    - Direct structured commands');
  console.log('   POST /merge  - Spreadsheet merging operations');
  console.log('   POST /test   - Command parsing testing');
  console.log('   GET  /health - Health check');
  console.log('   GET  /status - Server status (requires key)');
  console.log('');
  console.log('💡 Example commands:');
  console.log('   "Ara Hulk starburst one at 2100 owes"');
  console.log('   "Add chicken 2.5 kilos at 1500 paid"');
  console.log('   "Merge old inventory with current data"');
  console.log('   "Update customer John status to paid"');
  console.log('   "Show all pending orders"');
});








