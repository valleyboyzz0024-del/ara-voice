export default {
  port: process.env.PORT || 10000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  googleAppsScriptUrl: process.env.APPS_SCRIPT_URL, // Update with your deployed URL
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  },
  useMockAI: process.env.USE_MOCK_AI === 'true' || false // Optional mock mode
};