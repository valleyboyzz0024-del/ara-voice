const express = require('express');
const app = express();

app.use(express.json());

// Security: Use environment variable for API key, fallback to hardcoded for backwards compatibility
const API_KEY = process.env.ARA_API_KEY || 'Bruins';

// Natural language processing helpers
function extractDataFromNaturalSpeech(transcript) {
  const text = transcript.toLowerCase().trim();
  
  // Remove common filler words and normalize
  const normalized = text
    .replace(/\b(um|uh|like|you know|actually)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Try different patterns for flexible voice commands
  const patterns = [
    // Pattern 1: "ara [tab] add [item] [quantity] at [price] [status]"
    /^ara\s+(\w+)\s+(?:add\s+)?([a-zA-Z0-9\s]+?)\s+(\d+(?:\.\d+)?)\s*(?:kg|kilos?)?\s+(?:at|for)\s+(\d+)\s*(?:dollars?|bucks?)?\s*(?:per\s+kg)?\s+(.*?)$/,
    
    // Pattern 2: "[tab] [item] [quantity] at [price] [status]" (ara implied)
    /^(\w+)\s+([a-zA-Z0-9\s]+?)\s+(\d+(?:\.\d+)?)\s*(?:kg|kilos?)?\s+(?:at|for)\s+(\d+)\s*(?:dollars?|bucks?)?\s*(?:per\s+kg)?\s+(.*?)$/,
    
    // Pattern 3: "add/put [item] to/in [tab] [quantity] at [price] [status]"
    /^(?:ara\s+)?(?:add|put|enter)\s+([a-zA-Z0-9\s]+?)\s+(?:to|in)\s+(\w+)\s+(\d+(?:\.\d+)?)\s*(?:kg|kilos?)?\s+(?:at|for)\s+(\d+)\s*(?:dollars?|bucks?)?\s*(?:per\s+kg)?\s+(.*?)$/,
    
    // Pattern 4: Original rigid format for backwards compatibility
    /^ara\s+(\w+)\s+([a-zA-Z0-9]+)\s+(\d+(?:\.\d+)?)\s+at\s+(\d+)\s+(\w+)$/
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = normalized.match(pattern);
    if (match) {
      let tab, item, qty, price, status;
      
      if (i === 2) { // Pattern 3 has different order (item, tab)
        [, item, tab, qty, price, status] = match;
      } else {
        [, tab, item, qty, price, status] = match;
      }
      
      // Clean up extracted data
      item = item.trim().replace(/\s+/g, '_');
      qty = parseFloat(qty);
      price = parseInt(price);
      status = status.trim().toLowerCase();
      
      // Validate extracted data
      if (tab && item && !isNaN(qty) && !isNaN(price) && status) {
        return { tab, item, qty, price, status, success: true };
      }
    }
  }
  
  return { success: false, error: 'Could not parse voice command' };
}

function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>\"'&]/g, '').trim();
}

function validateSheetData(data) {
  const errors = [];
  
  if (!data.tab || data.tab.length < 1 || data.tab.length > 50) {
    errors.push('Tab name must be 1-50 characters');
  }
  
  if (!data.item || data.item.length < 1 || data.item.length > 100) {
    errors.push('Item name must be 1-100 characters');
  }
  
  if (isNaN(data.qty) || data.qty <= 0 || data.qty > 10000) {
    errors.push('Quantity must be a positive number up to 10000');
  }
  
  if (isNaN(data.price) || data.price <= 0 || data.price > 1000000) {
    errors.push('Price must be a positive number up to 1,000,000');
  }
  
  if (!data.status || data.status.length < 1 || data.status.length > 50) {
    errors.push('Status must be 1-50 characters');
  }
  
  return errors;
}

app.post('/ara', (req, res) => {
  // Security check
  if (req.body.key !== API_KEY) {
    return res.status(403).json({ 
      error: 'Invalid API key',
      message: 'Access denied. Please check your API key.'
    });
  }
  
  let { tab, item, qty, price, status } = req.body;
  
  // Sanitize inputs
  tab = sanitizeInput(tab);
  item = sanitizeInput(item);
  status = sanitizeInput(status);
  
  // Validate data
  const validationErrors = validateSheetData({ tab, item, qty, price, status });
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationErrors,
      message: 'Please correct the following issues and try again.'
    });
  }
  
  console.log(`Direct entry: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  
  // Send to Google Sheets
  const sheetData = {
    tabName: tab,
    item,
    qty,
    pricePerKg: price,
    status
  };
  
  fetch('https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sheetData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  })
  .then(result => {
    console.log('Google Sheets response:', result);
    res.json({ 
      success: true, 
      message: 'Data successfully added to Google Sheets',
      data: sheetData
    });
  })
  .catch(error => {
    console.error('Google Sheets error:', error);
    res.status(500).json({
      error: 'Google Sheets integration failed',
      message: 'Unable to update the spreadsheet. Please try again later.',
      details: error.message
    });
  });
});

app.post('/voice', (req, res) => {
  // Security check
  if (req.body.key !== API_KEY) {
    return res.status(403).json({ 
      error: 'Invalid API key',
      message: 'Access denied. Please check your API key.'
    });
  }
  
  const transcript = sanitizeInput(req.body.transcript);
  if (!transcript) {
    return res.status(400).json({
      error: 'Missing transcript',
      message: 'Please provide a voice transcript to process.',
      examples: [
        "ara hulk starburst 1.5 at 2100 owes",
        "add bananas to fruits 2 kg at 500 paid",
        "hulk chocolate 3 for 1500 delivered"
      ]
    });
  }
  
  console.log(`Processing voice command: "${transcript}"`);
  
  // Extract data using natural language processing
  const extractedData = extractDataFromNaturalSpeech(transcript);
  
  if (!extractedData.success) {
    return res.status(400).json({
      error: 'Voice command not understood',
      message: 'I couldn\'t understand your command. Please try one of these formats:',
      transcript: transcript,
      examples: [
        "ara [tab] [item] [quantity] at [price] [status]",
        "add [item] to [tab] [quantity] kg at [price] [status]",
        "[tab] [item] [quantity] at [price] [status]"
      ],
      tips: [
        "Speak clearly and use simple words",
        "Include the tab name, item, quantity, price, and status",
        "You can say 'kg', 'kilos', 'at', 'for', 'dollars', 'bucks'",
        "Status examples: paid, owes, delivered, pending"
      ]
    });
  }
  
  // Validate extracted data
  const validationErrors = validateSheetData(extractedData);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: 'Invalid data extracted from voice',
      details: validationErrors,
      extractedData: extractedData,
      message: 'The voice command was understood but contains invalid data.'
    });
  }
  
  console.log(`Extracted data:`, extractedData);
  
  // Send to Google Sheets
  const sheetData = {
    tabName: extractedData.tab,
    item: extractedData.item,
    qty: extractedData.qty,
    pricePerKg: extractedData.price,
    status: extractedData.status
  };
  
  fetch('https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sheetData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  })
  .then(result => {
    console.log('Google Sheets response:', result);
    res.json({ 
      success: true, 
      message: `Successfully logged: ${extractedData.item} (${extractedData.qty}kg) at $${extractedData.price}/kg - ${extractedData.status}`,
      data: sheetData,
      transcript: transcript,
      extractedData: extractedData
    });
  })
  .catch(error => {
    console.error('Google Sheets error:', error);
    res.status(500).json({
      error: 'Google Sheets integration failed',
      message: 'I understood your command but couldn\'t update the spreadsheet. Please try again.',
      details: error.message,
      extractedData: extractedData,
      transcript: transcript
    });
  });
});

// Health check and usage endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Ara Voice Data Entry',
    status: 'online',
    message: 'Your friendly AI data entry assistant for Google Sheets',
    version: '2.0.0',
    endpoints: {
      'POST /voice': 'Process natural voice commands',
      'POST /ara': 'Direct data entry',
      'GET /help': 'Get detailed usage instructions'
    },
    quickStart: {
      voiceExamples: [
        "ara hulk chocolate 2.5 at 1800 paid",
        "add bananas to fruits 3 kg for 600 delivered",
        "vegetables carrots 1.2 at 450 owes"
      ],
      directEntry: {
        endpoint: '/ara',
        method: 'POST',
        body: {
          key: 'your-api-key',
          tab: 'sheet-tab-name',
          item: 'item-name',
          qty: 1.5,
          price: 2000,
          status: 'paid'
        }
      }
    }
  });
});

app.get('/help', (req, res) => {
  res.json({
    title: 'Ara Voice - Complete Usage Guide',
    description: 'Natural language voice commands for Google Sheets data entry',
    
    voiceCommands: {
      description: 'Speak naturally! I understand various formats:',
      formats: [
        {
          pattern: 'ara [tab] [item] [quantity] at [price] [status]',
          example: 'ara hulk chocolate 2.5 at 1800 paid',
          description: 'Standard format with explicit tab'
        },
        {
          pattern: 'add [item] to [tab] [quantity] kg at [price] [status]',
          example: 'add bananas to fruits 3 kg at 600 delivered',
          description: 'Natural "add to" format'
        },
        {
          pattern: '[tab] [item] [quantity] at [price] [status]',
          example: 'vegetables carrots 1.2 at 450 owes',
          description: 'Simplified format (ara implied)'
        }
      ],
      flexibleWords: {
        quantity: ['kg', 'kilos', 'kilo'],
        price: ['at', 'for', 'dollars', 'bucks', 'per kg'],
        actions: ['add', 'put', 'enter']
      },
      statusExamples: ['paid', 'owes', 'delivered', 'pending', 'processing', 'shipped']
    },
    
    directAPI: {
      description: 'Direct API access for structured data',
      endpoint: 'POST /ara',
      headers: { 'Content-Type': 'application/json' },
      body: {
        key: 'your-api-key',
        tab: 'sheet-tab-name',
        item: 'item-name',
        qty: 'number (0.1-10000)',
        price: 'number (1-1000000)',
        status: 'text (1-50 chars)'
      }
    },
    
    security: {
      apiKey: 'Set ARA_API_KEY environment variable for secure authentication',
      validation: 'All inputs are sanitized and validated for security',
      rateLimit: 'Consider implementing rate limiting for production use'
    },
    
    troubleshooting: {
      voiceNotUnderstood: 'Speak clearly, use simple words, include all required fields',
      sheetsNotUpdating: 'Check your Google Apps Script URL and permissions',
      authenticationFailed: 'Verify your API key is correct'
    }
  });
});

app.listen(10000, () => {
  console.log('🎤 Ara Voice Server is live on port 10000!');
  console.log('📊 Ready to process voice commands for Google Sheets');
  console.log('🔐 API Key:', API_KEY === 'Bruins' ? 'Using default key (consider setting ARA_API_KEY env var)' : 'Using custom key from environment');
  console.log('📚 Visit http://localhost:10000/help for usage instructions');
});








