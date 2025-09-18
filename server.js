const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const config = require('./config');

const app = express();

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
    port: config.port
  });
});

// Helper function to parse voice commands
function parseVoiceCommand(command) {
  try {
    const words = command.toLowerCase().trim().split(/\s+/);
    console.log('Parsed words:', words);
    
    // Expected format: "pickle prince pepsi [tab] [item] [qty] at [price] [status]"
    if (words.length < 8 || 
        words[0] !== 'pickle' || 
        words[1] !== 'prince' || 
        words[2] !== 'pepsi') {
      return {
        success: false,
        error: 'Command must start with "pickle prince pepsi" and have at least 8 words'
      };
    }
    
    // Find "at" keyword which separates quantity from price
    const atIndex = words.indexOf('at');
    if (atIndex === -1 || atIndex < 5) {
      return {
        success: false,
        error: 'Command must contain "at" keyword to separate quantity from price'
      };
    }
    
    const tab = words[3];
    const itemWords = words.slice(4, atIndex - 1);
    const qtyWord = words[atIndex - 1];
    const priceWord = words[atIndex + 1];
    const statusWords = words.slice(atIndex + 2);
    
    // Validate and parse quantity and price
    const qty = parseFloat(qtyWord);
    const price = parseFloat(priceWord);
    
    if (isNaN(qty) || qty <= 0) {
      return {
        success: false,
        error: `Invalid quantity: "${qtyWord}". Must be a positive number.`
      };
    }
    
    if (isNaN(price) || price <= 0) {
      return {
        success: false,
        error: `Invalid price: "${priceWord}". Must be a positive number.`
      };
    }
    
    return {
      success: true,
      data: {
        tab: tab,
        item: itemWords.join(' '),
        qty: qty,
        price: price,
        status: statusWords.join(' ')
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse command: ${error.message}`
    };
  }
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
      // Send data to Google Apps Script
      const response = await axios.post(
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