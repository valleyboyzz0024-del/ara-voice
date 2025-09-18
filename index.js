/**
 * Utility Functions for Ara Voice Application
 * 
 * Shared utility functions for voice command parsing, authentication,
 * and Google Sheets integration.
 */

const config = require('./config');
const axios = require('axios');

/**
 * Validates authentication key
 * @param {string} key - The provided key
 * @returns {boolean} - Whether the key is valid
 */
function validateAuth(key) {
  return key === config.auth.secretKey;
}

/**
 * Validates Bearer token from Authorization header
 * @param {string} authHeader - The Authorization header value
 * @returns {boolean} - Whether the token is valid
 */
function validateBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  return token === config.auth.bearerToken;
}

/**
 * Validates spoken PIN
 * @param {string} spokenPin - The spoken PIN from voice command
 * @returns {boolean} - Whether the PIN is valid
 */
function validateSpokenPin(spokenPin) {
  return spokenPin === config.auth.spokenPin;
}

/**
 * Validates secret phrase authentication
 * @param {string} phrase - The provided secret phrase
 * @returns {boolean} - Whether the phrase is valid
 */
function validateSecretPhrase(phrase) {
  if (!phrase || typeof phrase !== 'string') {
    return false;
  }
  return phrase.trim().toLowerCase() === config.auth.secretPhrase.toLowerCase();
}

/**
 * Parses voice command into structured data
 * @param {string} command - The voice command string
 * @returns {Object} - Parsed command data or error
 */
function parseVoiceCommand(command) {
  try {
    // Handle null/undefined input
    if (!command || typeof command !== 'string') {
      return {
        success: false,
        error: 'Invalid command input'
      };
    }
    
    const words = command.toLowerCase().trim().split(/\s+/);
    console.log('Parsed words:', words);
    
    // Expected format: "people purple dance keyboard pig [tab] [item] [qty] at [price] [status]"
    const triggerPhrase = config.voice.triggerPhrase;
    if (words.length < config.voice.minimumWords) {
      return {
        success: false,
        error: `Bad format - use: ${config.voice.expectedFormat}`
      };
    }
    
    // Check trigger phrase
    for (let i = 0; i < triggerPhrase.length; i++) {
      if (words[i] !== triggerPhrase[i]) {
        return {
          success: false,
          error: `Bad format - use: ${config.voice.expectedFormat}`
        };
      }
    }
    
    const tab = words[5];  // After trigger phrase
    const item = words[6];
    const qty = parseFloat(words[7]);
    const price = parseInt(words[9]); // Skip "at" word at index 8
    const status = words[10];
    
    // Validate parsed values
    if (!tab || !item || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0 || !status) {
      return {
        success: false,
        error: 'Invalid values - check tab, item, quantity (must be > 0), and price (must be > 0)'
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
  try {
    console.log('Sending to Google Apps Script:', JSON.stringify(data, null, 2));
    
    const response = await axios.post(config.googleAppsScript.url, {
      tabName: data.tab,
      item: data.item,
      qty: data.qty,
      pricePerKg: data.price,
      status: data.status
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: config.googleAppsScript.timeout
    });
    
    console.log('Google Apps Script response:', response.data);
    return { success: true, response: response.data };
    
  } catch (error) {
    console.error('Error sending to Google Apps Script:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request to Google Apps Script timed out');
    }
    
    throw error;
  }
}

// Export utility functions for use by server.js
module.exports = {
  validateAuth,
  validateBearerToken,
  validateSpokenPin,
  validateSecretPhrase,
  parseVoiceCommand,
  sendToGoogleSheets
};








