/**
 * Configuration system for ara-voice
 * Makes it easy to update endpoints, validation rules, and AI settings
 */

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 10000,
    apiKey: process.env.API_KEY || 'Bruins'
  },

  // Google Sheets integration
  googleSheets: {
    scriptUrl: process.env.GOOGLE_SCRIPT_URL || 
      'https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec',
    retryAttempts: 3,
    timeout: 10000
  },

  // AI configuration
  ai: {
    enabled: !!process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    fallbackToLegacy: true,
    maxRetries: 2
  },

  // Voice command validation rules
  validation: {
    // Valid status values
    validStatuses: ['owes', 'paid', 'pending', 'cancelled'],
    
    // Price validation (in cents/dollars per kg)
    priceRange: {
      min: 1,
      max: 10000
    },
    
    // Quantity validation
    quantityRange: {
      min: 0.1,
      max: 1000
    },
    
    // Tab name validation
    validTabs: {
      // Leave empty to allow any tab, or specify allowed tabs:
      // allowed: ['hulk', 'thor', 'ironman'],
      allowed: [],
      maxLength: 20
    },
    
    // Item name validation
    itemName: {
      maxLength: 50,
      minLength: 2
    }
  },

  // Response messages
  messages: {
    success: {
      added: 'Added successfully',
      logged: 'Logged to sheet',
      updated: 'Updated successfully'
    },
    errors: {
      wrongKey: 'Invalid API key',
      badFormat: 'Bad format - use: Ara [tab] [item] [quantity] at [price] [status]',
      sheetDown: 'Google Sheets service unavailable',
      aiUnavailable: 'AI service unavailable, using basic parsing',
      invalidPrice: 'Price must be between $0.01 and $100.00 per kg',
      invalidQuantity: 'Quantity must be between 0.1 and 1000 kg',
      invalidStatus: 'Status must be one of: owes, paid, pending, cancelled'
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableVoiceLogging: true,
    enableErrorLogging: true,
    enablePerformanceLogging: false
  },

  // Feature flags for easy enabling/disabling of features
  features: {
    aiParsing: true,
    dataValidation: true,
    smartSuggestions: true,
    extendedLogging: false,
    webhookSupport: false,
    bulkOperations: false
  }
};

/**
 * Get configuration value with dot notation
 * @param {string} path - Configuration path (e.g., 'server.port')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 */
function getConfig(path, defaultValue = null) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue;
  }, config);
}

/**
 * Update configuration at runtime
 * @param {string} path - Configuration path
 * @param {*} value - New value
 */
function setConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, config);
  target[lastKey] = value;
}

/**
 * Validate a parsed inventory data object against configuration rules
 * @param {Object} data - Parsed inventory data
 * @returns {Object} Validation result with success flag and errors
 */
function validateInventoryData(data) {
  const errors = [];
  
  // Validate price
  if (data.price < config.validation.priceRange.min || 
      data.price > config.validation.priceRange.max) {
    errors.push(config.messages.errors.invalidPrice);
  }
  
  // Validate quantity
  if (data.qty < config.validation.quantityRange.min || 
      data.qty > config.validation.quantityRange.max) {
    errors.push(config.messages.errors.invalidQuantity);
  }
  
  // Validate status
  if (config.validation.validStatuses.length > 0 && 
      !config.validation.validStatuses.includes(data.status.toLowerCase())) {
    errors.push(config.messages.errors.invalidStatus);
  }
  
  // Validate tab name
  if (config.validation.validTabs.allowed.length > 0 && 
      !config.validation.validTabs.allowed.includes(data.tab.toLowerCase())) {
    errors.push(`Invalid tab. Allowed tabs: ${config.validation.validTabs.allowed.join(', ')}`);
  }
  
  if (data.tab.length > config.validation.validTabs.maxLength) {
    errors.push(`Tab name too long (max ${config.validation.validTabs.maxLength} characters)`);
  }
  
  // Validate item name
  if (data.item.length < config.validation.itemName.minLength || 
      data.item.length > config.validation.itemName.maxLength) {
    errors.push(`Item name must be ${config.validation.itemName.minLength}-${config.validation.itemName.maxLength} characters`);
  }
  
  return {
    success: errors.length === 0,
    errors: errors,
    data: data
  };
}

module.exports = {
  config,
  getConfig,
  setConfig,
  validateInventoryData
};