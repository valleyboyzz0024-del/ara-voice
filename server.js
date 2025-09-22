const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const config = require('./config');
const { validateAuth, validateBearerToken, validateSpokenPin, validateSecretPhrase, parseVoiceCommand, sendToGoogleSheets } = require('./index');

const authenticatedSessions = new Map(); // <-- Added for session tracking

// Configure axios retry for resilient Google Apps Script requests
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response && error.response.status >= 500);
  }
});

// Define the 'app' variable by creating a new Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Webhook endpoint to handle voice commands
app.post('/webhook/voice', async (req, res) => {
  try {
    console.log('Received webhook voice command:', req.body);
    console.log('Authorization header:', req.headers.authorization);

    let isAuthenticated = false;
    let authMethod = '';
    const sessionId = req.headers['x-session-id'] || 'default';
    const command = req.body.command || req.body.transcript;

    if (!command) {
        return res.status(400).json({
            status: 'error',
            message: 'No valid command or transcript provided'
        });
    }

    if (typeof command === 'string') {
        if (validateSecretPhrase(command.trim())) {
            isAuthenticated = true;
            authMethod = 'Secret phrase';
            if (command.trim().toLowerCase() === config.auth.secretPhrase.toLowerCase()) {
                return res.json({
                    status: 'success',
                    message: 'Secret phrase authenticated. You can now send your voice command.',
                    authMethod: 'Secret phrase'
                });
            }
        }
    }

    if (!isAuthenticated && validateBearerToken(req.headers.authorization)) {
        isAuthenticated = true;
        authMethod = 'Bearer token';
    }

    if (!isAuthenticated && typeof command === 'string') {
        const words = command.toLowerCase().trim().split(/\s+/);
        if (words.length >= 3 && words[0] === 'pin' && words[1] === 'is') {
            const spokenPin = words[2];
            if (validateSpokenPin(spokenPin)) {
                authenticatedSessions.set(sessionId, Date.now() + 300000);
                return res.json({
                    status: 'success',
                    message: 'PIN authenticated. You can now send your voice command.',
                    authMethod: 'Spoken PIN'
                });
            } else {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid PIN'
                });
            }
        }
        const sessionAuth = authenticatedSessions.get(sessionId);
        if (sessionAuth && sessionAuth > Date.now()) {
            isAuthenticated = true;
            authMethod = 'Session (PIN authenticated)';
            authenticatedSessions.delete(sessionId);
        }
    }

    if (!isAuthenticated) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required. Use secret phrase, Bearer token, or spoken PIN.'
        });
    }

    console.log(`Authenticated via ${authMethod}`);

    const parsedCommand = await parseVoiceCommand(command);

    if (!parsedCommand.success) {
        return res.status(400).json({
            status: 'error',
            message: parsedCommand.error
        });
    }

    const sheetsResponse = await sendToGoogleSheets(parsedCommand.data);
    
    res.json({
        status: 'success',
        message: 'Command processed successfully via webhook',
        authMethod: authMethod,
        data: {
            parsed: parsedCommand.data,
            sheets_response: sheetsResponse
        }
    });

  } catch (error) {
    console.error('Unexpected error in /webhook/voice:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      details: error.message
    });
  }
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Google Apps Script URL: ${config.googleAppsScriptUrl ? 'Configured' : 'MISSING'}`);
});
