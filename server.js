app.post('/webhook/voice', async (req, res) => {
  try {
    console.log('Received webhook voice command:', req.body);
    console.log('Authorization header:', req.headers.authorization);

    let isAuthenticated = false;
    let authMethod = '';
    const sessionId = req.headers['x-session-id'] || 'default';
    const command = req.body.command || req.body.transcript; // This is the fix

    if (!command) {
        return res.status(400).json({
            status: 'error',
            message: 'No valid command or transcript provided'
        });
    }

    // Authentication logic remains the same
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

    // Parse the voice command
    const parsedCommand = await parseVoiceCommand(command);

    if (!parsedCommand.success) {
        return res.status(400).json({
            status: 'error',
            message: parsedCommand.error
        });
    }

    // Now send the parsed data to Google Sheets
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
