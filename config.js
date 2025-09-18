require('dotenv').config();

const config = {
  googleAppsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL,
  port: process.env.PORT || 3000,
  requestTimeout: 10000, // 10 seconds timeout
  openaiApiKey: process.env.OPENAI_API_KEY
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

module.exports = config;