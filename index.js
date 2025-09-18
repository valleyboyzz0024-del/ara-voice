require('dotenv').config();
const express = require('express');
const path = require('path');
const AIService = require('./ai-service');
const { config, getConfig, validateInventoryData } = require('./config');

const app = express();
const aiService = new AIService();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Middleware for logging
app.use((req, res, next) => {
  if (getConfig('logging.enableVoiceLogging')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

app.post('/ara', async (req, res) => {
  const { tab, item, qty, price, status } = req.body;
  if (req.body.key !== getConfig('server.apiKey')) {
    return res.status(403).send(getConfig('messages.errors.wrongKey'));
  }
  
  // Validate the data using configuration rules
  const validation = validateInventoryData({ tab, item, qty, price, status });
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors
    });
  }
  
  // Use AI to validate and potentially correct the data
  let correctedData = validation.data;
  if (getConfig('features.dataValidation') && getConfig('ai.enabled')) {
    try {
      correctedData = await aiService.validateAndCorrectData(validation.data);
    } catch (error) {
      console.log('AI validation failed:', error.message);
    }
  }
  
  console.log(`Voice update: ${correctedData.tab} | ${correctedData.item} | ${correctedData.qty}kg | $${correctedData.price}/kg | ${correctedData.status}`);
  
  // Later: this will hit your Google Sheet with corrected data
  
  res.json({
    message: getConfig('messages.success.added'),
    data: correctedData
  });
});

app.post('/voice', async (req, res) => {
  if (req.body.key !== getConfig('server.apiKey')) {
    return res.status(403).send(getConfig('messages.errors.wrongKey'));
  }
  
  const transcript = req.body.transcript;
  console.log(`Processing voice command: "${transcript}"`);
  
  let parsedData = null;
  
  // Try AI parsing first if enabled
  if (getConfig('features.aiParsing') && getConfig('ai.enabled')) {
    try {
      parsedData = await aiService.parseVoiceCommand(transcript);
    } catch (error) {
      console.log('AI parsing failed, falling back to legacy:', error.message);
    }
  }
  
  // Fallback to legacy parsing if AI parsing failed or is disabled
  if (!parsedData && getConfig('ai.fallbackToLegacy')) {
    parsedData = aiService.legacyParsing(transcript);
  }
  
  if (!parsedData) {
    let errorMessage = getConfig('messages.errors.badFormat');
    
    // Generate intelligent suggestion if AI is available
    if (getConfig('features.smartSuggestions') && getConfig('ai.enabled')) {
      try {
        errorMessage = await aiService.generateErrorSuggestion(transcript);
      } catch (error) {
        console.log('AI suggestion generation failed:', error.message);
      }
    }
    
    return res.status(400).json({
      error: 'Parsing failed',
      message: errorMessage,
      transcript: transcript
    });
  }
  
  // Validate the parsed data
  const validation = validateInventoryData(parsedData);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors,
      parsedData: parsedData
    });
  }
  
  // Use AI to validate and potentially correct the data
  let finalData = validation.data;
  if (getConfig('features.dataValidation') && getConfig('ai.enabled')) {
    try {
      finalData = await aiService.validateAndCorrectData(validation.data);
    } catch (error) {
      console.log('AI validation failed:', error.message);
    }
  }
  
  // Send to Google Sheets with enhanced error handling
  try {
    const response = await fetch(getConfig('googleSheets.scriptUrl'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tabName: finalData.tab,
        item: finalData.item,
        qty: finalData.qty,
        pricePerKg: finalData.price,
        status: finalData.status
      }),
      timeout: getConfig('googleSheets.timeout')
    });
    
    if (!response.ok) {
      throw new Error(`Google Sheets responded with status: ${response.status}`);
    }
    
    console.log(`Successfully logged to sheet: ${JSON.stringify(finalData)}`);
    res.json({
      message: getConfig('messages.success.logged'),
      data: finalData,
      originalTranscript: transcript
    });
    
  } catch (error) {
    console.error('Google Sheets error:', error.message);
    res.status(500).json({
      error: getConfig('messages.errors.sheetDown'),
      data: finalData,
      originalTranscript: transcript
    });
  }
});

// Admin interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      aiEnabled: getConfig('ai.enabled'),
      aiModel: getConfig('ai.model'),
      features: config.features
    }
  });
});

// Configuration endpoint (for easy updates)
app.get('/config', (req, res) => {
  if (req.query.key !== getConfig('server.apiKey')) {
    return res.status(403).send('Unauthorized');
  }
  
  // Return safe configuration (no secrets)
  res.json({
    validation: config.validation,
    messages: config.messages,
    features: config.features,
    ai: {
      enabled: config.ai.enabled,
      model: config.ai.model
    }
  });
});

app.listen(getConfig('server.port'), () => {
  console.log(`Ara server live on port ${getConfig('server.port')}`);
  console.log(`AI enabled: ${getConfig('ai.enabled')}`);
  console.log(`Features enabled:`, Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature)
    .join(', '));
});








