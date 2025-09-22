// Use dotenv to load environment variables from a .env file for local development
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import webhookHandler from './src/webhook.js';

const app = express();
// Use a port from the environment variable (for Render) or default to 3000
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON bodies
app.use(express.json());

// A simple root route to confirm the server is running
app.get('/', (req, res) => {
    res.send('AI Webhook server is alive!');
});

// The main webhook route that uses your handler logic
app.post('/webhook', webhookHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // These logs will appear in your Render logs to confirm setup
    if (process.env.GOOGLE_APPS_SCRIPT_URL) {
        console.log('Google Apps Script URL: Configured');
    } else {
        console.warn('Warning: GOOGLE_APPS_SCRIPT_URL is not configured.');
    }
    if (process.env.OPENAI_API_KEY) {
        console.log('OpenAI API Key: Configured');
    } else {
        console.warn('Warning: OPENAI_API_KEY is not configured.');
    }
});
