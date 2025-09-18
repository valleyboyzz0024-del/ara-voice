const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: {
      hasGeminiKey: !!GEMINI_API_KEY,
      hasAppsScriptUrl: !!APPS_SCRIPT_URL
    }
  });
});

// Main processing endpoint
app.post('/process-command', async (req, res) => {
  try {
    const { transcript, timestamp } = req.body;
    
    if (!transcript) {
      return res.status(400).send('Missing transcript in request body');
    }

    console.log(`[${timestamp || new Date().toISOString()}] Processing transcript: "${transcript}"`);

    // Check environment variables
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY environment variable not set');
      return res.status(500).send('Server configuration error: Missing Gemini API key');
    }

    if (!APPS_SCRIPT_URL) {
      console.error('APPS_SCRIPT_URL environment variable not set');
      return res.status(500).send('Server configuration error: Missing Apps Script URL');
    }

    // Step 1: Query Gemini API to convert natural language to structured command
    const geminiResponse = await queryGeminiAPI(transcript);
    
    if (!geminiResponse.success) {
      console.error('Gemini API error:', geminiResponse.error);
      return res.status(500).send(`Gemini API error: ${geminiResponse.error}`);
    }

    console.log('Gemini API response:', JSON.stringify(geminiResponse.data, null, 2));

    // Step 2: Send structured command to Google Apps Script
    const appsScriptResponse = await sendToAppsScript(geminiResponse.data);
    
    if (!appsScriptResponse.success) {
      console.error('Apps Script error:', appsScriptResponse.error);
      return res.status(500).send(`Apps Script error: ${appsScriptResponse.error}`);
    }

    console.log('Apps Script response:', appsScriptResponse.data);
    res.send('Command processed successfully and sent to Google Sheets');

  } catch (error) {
    console.error('Error in /process-command:', error);
    res.status(500).send(`Server error: ${error.message}`);
  }
});

// Function to query Gemini API
async function queryGeminiAPI(transcript) {
  try {
    const prompt = `
You are a voice command processor for a Google Sheets application. Convert the following natural language command into a structured JSON format.

The command should be parsed into this exact JSON structure:
{
  "action": "add" | "update" | "delete",
  "tabName": "string",
  "item": "string", 
  "quantity": number,
  "pricePerUnit": number,
  "status": "string",
  "notes": "string (optional)"
}

Rules:
- Extract the action (usually "add" for inventory commands)
- Identify the sheet tab/category name
- Find the item/product name
- Parse quantity (convert words like "five" to 5)
- Parse price per unit (extract from phrases like "at $2.50 each")
- Status could be things like "in_stock", "pending", "ordered", etc.
- If unclear, make reasonable assumptions
- Always respond with valid JSON only, no explanations

Voice command: "${transcript}"
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Try to parse the JSON response
    let parsedCommand;
    try {
      // Clean up the response to extract JSON
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedCommand = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in Gemini response');
      }
    } catch (parseError) {
      throw new Error(`Failed to parse Gemini JSON response: ${parseError.message}. Raw response: ${generatedText}`);
    }

    return { success: true, data: parsedCommand };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Function to send command to Google Apps Script
async function sendToAppsScript(commandData) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apps Script HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.text();
    return { success: true, data };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Legacy endpoints for backward compatibility
app.post('/ara', (req, res) => {
  const { tab, item, qty, price, status } = req.body;
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  console.log(`Legacy ara endpoint: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  res.send('Added');
});

app.post('/voice', (req, res) => {
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  const words = req.body.transcript.toLowerCase().split(' ');
  const tab = words[1];
  const item = words[2];
  const qty = parseFloat(words[3]);
  const price = parseInt(words[5]);
  const status = words[6];
  
  if (!tab || !item || isNaN(qty) || isNaN(price)) {
    return res.status(400).send('Bad format - use: Ara Hulk starburst one at 2100 owes');
  }
  
  // Use the Apps Script URL from environment if available
  const scriptUrl = APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec';
  
  fetch(scriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tabName: tab,
      item,
      qty,
      pricePerKg: price,
      status
    })
  })
  .then(() => res.send('Logged'))
  .catch((error) => {
    console.error('Legacy voice endpoint error:', error);
    res.status(500).send('Sheet down');
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Ara Voice server running on port ${PORT}`);
  console.log(`📊 Environment check:`);
  console.log(`   - Gemini API Key: ${GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - Apps Script URL: ${APPS_SCRIPT_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`🌐 Access the app at: http://localhost:${PORT}`);
});








