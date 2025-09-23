require('dotenv').config();

// Create unified configuration that supports both server.js and index.js structures
const config = {
  // Server Configuration
  googleAppsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL,
  port: process.env.PORT || 3000,
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000,
  
  // AI Configuration
  openaiApiKey: process.env.OPENAI_API_KEY,
  useMockAI: !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here',

  // Google Sheets API Configuration (OAuth2)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
  },

  // Service Account Configuration (alternative to OAuth)
  googleServiceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  
  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    maxAge: 30 * 60 * 1000, // 30 minutes
    resave: false,
    saveUninitialized: false
  },
  
  // Flat structure (for server.js compatibility)
  server: {
    port: process.env.PORT || 3000
  },
  
  // Authentication Configuration
  auth: {
    secretPhrase: process.env.SECRET_PHRASE || 'purple people dance keyboard pig',
    secretKey: process.env.SECRET_KEY || 'pickle prince pepsi', // Legacy support
    bearerToken: process.env.BEARER_TOKEN || 'default-bearer-token',
    spokenPin: process.env.SPOKEN_PIN || '1279572380'
  },
  
  // Legacy structure (for index.js compatibility)
  googleAppsScript: {
    url: process.env.GOOGLE_APPS_SCRIPT_URL,
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000
  },
  
  // Voice Recognition Configuration
  voice: {
    triggerPhrase: ['people', 'purple', 'dance', 'keyboard', 'pig'],
    expectedFormat: 'people purple dance keyboard pig [tab] [item] [qty] at [price] [status]',
    minimumWords: 10
  }
};

// Validate required configuration
if (!config.googleAppsScriptUrl) {
  console.error('ERROR: GOOGLE_APPS_SCRIPT_URL environment variable is required');
  process.exit(1);
}

// OpenAI is optional - will use mock if not provided
if (!config.openaiApiKey || config.openaiApiKey === 'your_openai_api_key_here') {
  console.warn('WARNING: OPENAI_API_KEY not set - using mock AI responses');
  config.useMockAI = true;
} else {
  config.useMockAI = false;
}

// Google Sheets API is optional but recommended
if (!config.google.clientId && !config.googleServiceAccount) {
  console.warn('WARNING: Google Sheets API not configured - using fallback Google Apps Script only');
}

module.exports = config;