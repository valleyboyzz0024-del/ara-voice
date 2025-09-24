import 'dotenv/config';

export default {
  port: process.env.PORT || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  googleAppsScriptUrl: process.env.APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL,
  session: {
    secret: process.env.SESSION_SECRET || 'fallback-session-secret-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  },
  useMockAI: process.env.USE_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY
};