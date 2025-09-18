require('dotenv').config();

// Create unified configuration that supports both server.js and index.js structures
const config = {
  // Flat structure (for server.js compatibility)
  googleAppsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL,
  port: process.env.PORT || 3000,
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  
  // Nested structure (for index.js compatibility)
  server: {
    port: process.env.PORT || 3000
  },
  auth: {
    secretKey: process.env.SECRET_KEY || 'pickle prince pepsi'
  },
  googleAppsScript: {
    url: process.env.GOOGLE_APPS_SCRIPT_URL,
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000
  },
  voice: {
    expectedFormat: 'pickle prince pepsi [tab] [item] [qty] at [price] [status]',
    minimumWords: 8
  }
};

// Validate required configuration
if (!config.googleAppsScriptUrl) {
  console.error('ERROR: GOOGLE_APPS_SCRIPT_URL environment variable is required');
  console.error('The application will start but Google Sheets integration will not work.');
  console.error('Please set GOOGLE_APPS_SCRIPT_URL in your deployment environment variables.');
  
  // In production deployments, don't exit - allow the server to start for debugging
  if (process.env.NODE_ENV === 'production' || process.env.PORT) {
    console.warn('WARNING: Starting server without Google Apps Script URL - limited functionality');
    config.googleAppsScriptUrl = null;
    config.googleAppsScript.url = null;
  } else {
    // Only exit in development when .env should be available
    process.exit(1);
  }
}

// OpenAI is optional - will use mock if not provided
if (!config.openaiApiKey || config.openaiApiKey === 'your_openai_api_key_here') {
  console.warn('WARNING: OPENAI_API_KEY not set - using mock AI responses');
  config.useMockAI = true;
} else {
  config.useMockAI = false;
}

module.exports = config;