/**
 * Voice-to-Google-Sheets Backend Server
 * 
 * This Express.js server receives voice commands from the frontend,
 * processes them, and sends the data to a Google Apps Script Web App
 * to update a Google Sheet.
 */

const express = require('express');
const config = require('./config');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

/**
 * Validates authentication key
 * @param {string} key - The provided key
 * @returns {boolean} - Whether the key is valid
 */
function validateAuth(key) {
  return key === config.auth.secretKey;
}

/**
 * Parses voice command into structured data
 * @param {string} command - The voice command string
 * @returns {Object} - Parsed command data or error
 */
function parseVoiceCommand(command) {
  try {
    const words = command.toLowerCase().trim().split(/\s+/);
    console.log('Parsed words:', words);
    
    // Expected format: "pickle prince pepsi [tab] [item] [qty] at [price] [status]"
    if (words.length < config.voice.minimumWords || 
        words[0] !== 'pickle' || 
        words[1] !== 'prince' || 
        words[2] !== 'pepsi') {
      return {
        success: false,
        error: `Bad format - use: ${config.voice.expectedFormat}`
      };
    }
    
    const tab = words[3];
    const item = words[4];
    const qty = parseFloat(words[5]);
    const price = parseInt(words[7]); // Skip "at" word at index 6
    const status = words[8];
    
    // Validate parsed values
    if (!tab || !item || isNaN(qty) || isNaN(price) || !status) {
      return {
        success: false,
        error: 'Invalid values - check tab, item, quantity, and price'
      };
    }
    
    return {
      success: true,
      data: { tab, item, qty, price, status }
    };
    
  } catch (error) {
    console.error('Error parsing voice command:', error);
    return {
      success: false,
      error: 'Failed to parse command'
    };
  }
}

/**
 * Sends data to Google Apps Script Web App
 * @param {Object} data - The data to send
 * @returns {Promise} - Fetch promise
 */
async function sendToGoogleSheets(data) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.googleAppsScript.timeout);
  
  try {
    console.log('Sending to Google Apps Script:', JSON.stringify(data, null, 2));
    
    const response = await fetch(config.googleAppsScript.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        tabName: data.tab,
        item: data.item,
        qty: data.qty,
        pricePerKg: data.price,
        status: data.status
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.text();
    console.log('Google Apps Script response:', result);
    
    return { success: true, response: result };
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error sending to Google Apps Script:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request to Google Apps Script timed out');
    }
    
    throw error;
  }
}

// API Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Main voice command processing endpoint
 */
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
    
    // Send to Google Apps Script
    try {
      const result = await sendToGoogleSheets(parseResult.data);
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
      
    } catch (sheetsError) {
      console.error('Google Sheets error:', sheetsError.message);
      res.status(502).json({ 
        status: 'error', 
        message: `Failed to update Google Sheets: ${sheetsError.message}` 
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

/**
 * Legacy endpoint for backward compatibility
 * @deprecated Use /process-command instead
 */
app.post('/voice', async (req, res) => {
  try {
    // Check authentication
    if (!validateAuth(req.body.key)) {
      return res.status(403).send('Wrong key');
    }
    
    // Forward to the main endpoint
    req.body.command = req.body.transcript;
    return app._router.handle({ ...req, path: '/process-command', method: 'POST' }, res);
    
  } catch (error) {
    console.error('Error in /voice endpoint:', error);
    res.status(500).send('Sheet down');
  }
});

/**
 * Configuration endpoint (for debugging)
 */
app.get('/config', (req, res) => {
  res.json({
    voice: {
      expectedFormat: config.voice.expectedFormat,
      minimumWords: config.voice.minimumWords
    },
    server: {
      port: config.server.port
    },
    googleAppsScript: {
      url: config.googleAppsScript.url ? '[CONFIGURED]' : '[NOT CONFIGURED]',
      timeout: config.googleAppsScript.timeout
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

// Start server
const server = app.listen(config.server.port, () => {
  console.log(`🚀 Ara Voice Server running on port ${config.server.port}`);
  console.log(`📊 Google Apps Script URL: ${config.googleAppsScript.url ? 'Configured' : 'Not configured'}`);
  console.log(`🔑 Auth key: ${config.auth.secretKey ? 'Configured' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;








