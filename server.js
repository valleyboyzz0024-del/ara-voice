import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { OpenAI } from 'openai';
import config from './config.js';

const app = express();

// Initialize OpenAI with better error handling
let openai;
try {
  openai = new OpenAI({
    apiKey: config.openaiApiKey || 'sk-mock-key-for-testing',
  });
} catch (error) {
  console.log('OpenAI initialization failed, using mock mode');
  openai = null;
}

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced session configuration for production
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'ara-voice-super-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 5 * 60 * 1000, // 5 minutes as requested
    secure: process.env.NODE_ENV === 'production' ? false : false, // Set to true if using HTTPS
    httpOnly: true
  },
  name: 'ara-voice-session'
};

// Use memory store warning fix for production
if (process.env.NODE_ENV === 'production') {
  console.log('⚠️  Using memory store in production. Consider using a persistent store like Redis.');
}

app.use(session(sessionConfig));

// The passcode you need to set in your environment
const REQUIRED_PASSCODE = process.env.SECRET_PHRASE || 'ara2024voice';
console.log(`🔐 Authentication passcode set. Use: "${REQUIRED_PASSCODE}"`);

// Authentication middleware
function requireAuth(req, res, next) {
  // Check if session is authenticated and not expired
  if (req.session.authenticated && req.session.authTime) {
    const now = Date.now();
    const authTime = req.session.authTime;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - authTime < fiveMinutes) {
      // Update auth time to extend session
      req.session.authTime = now;
      return next();
    } else {
      // Session expired
      req.session.destroy();
    }
  }
  
  // For API endpoints, return JSON error
  if (req.path.startsWith('/voice-command') || req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Authentication required. Please login first.' 
    });
  }
  
  // For web requests, redirect to lock page
  res.redirect('/lock');
}

// Lock page - blocks access to everything
app.get('/lock', (req, res) => {
  // If already authenticated, redirect to main app
  if (req.session.authenticated && req.session.authTime) {
    const now = Date.now();
    const authTime = req.session.authTime;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - authTime < fiveMinutes) {
      return res.redirect('/');
    }
  }
  
  const lockPageHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔒 Ara Voice AI - Secure Access</title>
        <link rel="icon" type="image/png" href="icon-192.png">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                overflow: hidden;
            }
            
            .lock-container {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(15px);
                border-radius: 25px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
                padding: 50px 40px;
                width: 100%;
                max-width: 450px;
                text-align: center;
                position: relative;
                animation: slideIn 0.6s ease-out;
            }
            
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .lock-icon {
                width: 100px;
                height: 100px;
                background: linear-gradient(135deg, #2d5a3d 0%, #4a7c59 100%);
                border-radius: 25px;
                margin: 0 auto 25px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 3em;
                color: white;
                box-shadow: 0 10px 30px rgba(45, 90, 61, 0.3);
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            h1 { 
                color: #333; 
                margin-bottom: 15px; 
                font-size: 2.2em; 
                font-weight: 700;
            }
            
            .subtitle { 
                color: #666; 
                margin-bottom: 35px; 
                font-size: 1.1em;
                line-height: 1.5;
            }
            
            .form-group { 
                margin-bottom: 25px; 
                text-align: left; 
            }
            
            label { 
                display: block; 
                margin-bottom: 8px; 
                color: #555; 
                font-weight: 600;
                font-size: 1.1em;
            }
            
            input {
                width: 100%;
                padding: 18px 20px;
                border: 2px solid #eee;
                border-radius: 15px;
                font-size: 18px;
                transition: all 0.3s ease;
                background: rgba(255, 255, 255, 0.9);
                text-align: center;
                letter-spacing: 2px;
                font-weight: 500;
            }
            
            input:focus {
                outline: none;
                border-color: #2d5a3d;
                box-shadow: 0 0 0 4px rgba(45, 90, 61, 0.1);
                background: white;
            }
            
            .btn {
                width: 100%;
                padding: 18px;
                background: linear-gradient(135deg, #2d5a3d 0%, #4a7c59 100%);
                color: white;
                border: none;
                border-radius: 15px;
                font-size: 18px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .btn:hover { 
                transform: translateY(-3px); 
                box-shadow: 0 10px 25px rgba(45, 90, 61, 0.3);
            }
            
            .btn:active { 
                transform: translateY(-1px); 
            }
            
            .error {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 12px;
                margin-bottom: 25px;
                font-weight: 600;
                animation: shake 0.5s ease-in-out;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .security-info {
                margin-top: 30px;
                padding-top: 25px;
                border-top: 1px solid #eee;
                font-size: 0.95em;
                color: #666;
                line-height: 1.6;
            }
            
            .timer {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(45, 90, 61, 0.1);
                color: #2d5a3d;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: 600;
            }
            
            .features {
                margin-top: 20px;
                text-align: left;
            }
            
            .features ul {
                list-style: none;
                padding: 0;
            }
            
            .features li {
                padding: 5px 0;
                color: #555;
            }
            
            .features li:before {
                content: "🎤 ";
                margin-right: 8px;
            }
            
            @media (max-width: 480px) {
                .lock-container {
                    padding: 40px 25px;
                    margin: 10px;
                }
                
                h1 { font-size: 1.8em; }
                .lock-icon { width: 80px; height: 80px; font-size: 2.5em; }
            }
        </style>
    </head>
    <body>
        <div class="lock-container">
            <div class="timer" id="timer">🔒 Secure Access</div>
            <div class="lock-icon">🔒</div>
            <h1>Ara Voice AI</h1>
            <p class="subtitle">Enter your secure passcode to access your AI assistant</p>
            
            ${req.query.error ? '<div class="error">❌ Invalid passcode. Access denied.</div>' : ''}
            ${req.query.expired ? '<div class="error">⏰ Session expired. Please login again.</div>' : ''}
            
            <form method="POST" action="/authenticate" id="authForm">
                <div class="form-group">
                    <label for="passcode">🔑 Security Passcode:</label>
                    <input type="password" id="passcode" name="passcode" 
                           placeholder="Enter passcode..." required autocomplete="off">
                </div>
                <button type="submit" class="btn">🚀 Access Ara Voice AI</button>
            </form>
            
            <div class="security-info">
                <div class="features">
                    <strong>🎯 What you'll get access to:</strong>
                    <ul>
                        <li>Voice-controlled Google Sheets management</li>
                        <li>Multi-sheet data operations</li>
                        <li>AI-powered natural language processing</li>
                        <li>Secure 5-minute authenticated sessions</li>
                    </ul>
                </div>
                <br>
                <strong>🔐 Security:</strong> This system uses secure authentication to protect your data and Google Sheets access.
            </div>
        </div>
        
        <script>
            // Auto-focus on passcode input
            document.getElementById('passcode').focus();
            
            // Add enter key support
            document.getElementById('passcode').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    document.getElementById('authForm').submit();
                }
            });
            
            // Add some visual feedback
            document.getElementById('authForm').addEventListener('submit', function() {
                const btn = document.querySelector('.btn');
                btn.innerHTML = '🔓 Authenticating...';
                btn.style.background = 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)';
            });
        </script>
    </body>
    </html>
  `;
  res.send(lockPageHtml);
});

// Authentication handler
app.post('/authenticate', (req, res) => {
  const { passcode } = req.body;
  
  if (passcode === REQUIRED_PASSCODE) {
    req.session.authenticated = true;
    req.session.authTime = Date.now();
    console.log('✅ User authenticated successfully');
    res.redirect('/');
  } else {
    console.log('❌ Authentication failed - invalid passcode');
    res.redirect('/lock?error=1');
  }
});

// Session status endpoint
app.get('/session-status', (req, res) => {
  if (req.session.authenticated && req.session.authTime) {
    const now = Date.now();
    const authTime = req.session.authTime;
    const fiveMinutes = 5 * 60 * 1000;
    const timeLeft = fiveMinutes - (now - authTime);
    
    if (timeLeft > 0) {
      return res.json({
        authenticated: true,
        timeLeft: Math.floor(timeLeft / 1000),
        expiresAt: new Date(authTime + fiveMinutes).toISOString()
      });
    }
  }
  
  res.json({ authenticated: false });
});

// Logout handler
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/lock');
  });
});

// Fix static file serving for both local and Render
const publicPath = path.join(__dirname, 'public');
console.log('Serving static files from:', publicPath);
app.use('/public', express.static(publicPath));
app.use(express.static(publicPath));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: config.port,
    env: process.env.NODE_ENV || 'development',
    authenticated: !!req.session.authenticated,
    version: '2.0.0'
  });
});

// --- Route to handle voice commands (requires auth) ---
app.post('/voice-command', requireAuth, async (req, res) => {
    let { command } = req.body;
    if (!command) {
        return res.status(400).json({ status: 'error', message: 'Command is empty' });
    }
    const userCommand = command.toLowerCase().trim();

    try {
        // Use mock AI if OpenAI is not available or mock mode is enabled
        if (config.useMockAI || !openai) {
            return res.json({ 
                status: 'success', 
                answer: `🤖 Mock AI processed: "${userCommand}". Enable OpenAI API key for full functionality.` 
            });
        }

        console.log('🎯 Processing command:', userCommand);

        // --- Step 1 - Get all available sheet names from Google Sheets ---
        let availableSheets = ['Groceries', 'Expenses', 'Tasks', 'Shopping', 'Budget']; // Default sheets
        let availableSheetsString = availableSheets.join(', ');
        let sheetsConnected = false;

        if (config.googleAppsScriptUrl && !config.googleAppsScriptUrl.includes('placeholder') && !config.googleAppsScriptUrl.includes('mock')) {
            try {
                console.log('🔗 Connecting to Multi-Sheet Google Apps Script...');
                console.log('📍 Apps Script URL:', config.googleAppsScriptUrl.substring(0, 60) + '...');
                
                const sheetsResponse = await axios.post(config.googleAppsScriptUrl, { action: 'getSheetNames' }, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'User-Agent': 'Ara-Voice-AI-MultiSheet/2.0'
                    },
                    timeout: 25000,
                    validateStatus: function (status) {
                        return status < 500;
                    }
                });
                
                console.log('📊 Multi-Sheet Response Status:', sheetsResponse.status);
                console.log('📊 Multi-Sheet Response:', JSON.stringify(sheetsResponse.data, null, 2));
                
                const responseData = sheetsResponse.data;

                if (responseData && responseData.status === 'success' && responseData.sheetNames && responseData.sheetNames.length > 0) {
                    availableSheets = responseData.sheetNames;
                    availableSheetsString = availableSheets.join(', ');
                    sheetsConnected = true;
                    console.log('✅ Connected to Multi-Sheet system. Available sheets:', availableSheetsString);
                    console.log('📈 Total sheets connected:', responseData.totalSheets || availableSheets.length);
                } else if (responseData && responseData.status === 'error') {
                    console.log('❌ Multi-Sheet Error:', responseData.message);
                } else {
                    console.log('⚠️ Multi-Sheet responded but no valid sheet names found');
                    console.log('Response keys:', Object.keys(responseData || {}));
                }
            } catch (sheetsError) {
                console.log('❌ Could not connect to Multi-Sheet system:', sheetsError.message);
                if (sheetsError.response) {
                    console.log('Response status:', sheetsError.response.status);
                    console.log('Response data:', JSON.stringify(sheetsError.response.data, null, 2));
                }
                console.log('📋 Using default sheets for demo purposes');
            }
        } else {
            console.log('📋 Google Apps Script URL not configured, using mock mode');
        }

        // --- Step 2: Determine User Intent (Read vs. Write) ---
        const intentResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `You are an intent classifier for Google Sheets. The user gives a command. Determine if they want to 'WRITE' new data (add, create, log, insert) or 'READ' existing data (show, get, what, how many, summarize, find). Your response must be a single word: READ or WRITE. Available sheets: ${availableSheetsString}.` },
                { role: "user", content: userCommand }
            ],
            max_tokens: 5,
        });
        const intent = intentResponse.choices[0].message.content.trim().toUpperCase();
        console.log('🎯 Detected intent:', intent);

        // --- Step 3: Execute based on intent ---
        let answer;
        if (intent === 'WRITE') {
            answer = await handleWriteCommand(userCommand, availableSheetsString, sheetsConnected);
        } else if (intent === 'READ') {
            answer = await handleReadCommand(userCommand, availableSheetsString, sheetsConnected);
        } else {
            answer = `I understand you want to: "${userCommand}". However, I couldn't determine if this is a read or write operation. Could you be more specific? For example: "Add 2 apples to groceries" or "Show me my expenses".`;
        }

        res.json({ status: 'success', answer });
    } catch (error) {
        console.error('💥 Error processing command:', error.message);
        const errorMessage = error.message || 'An internal server error occurred.';
        res.status(500).json({ status: 'error', message: `I encountered an error: ${errorMessage}` });
    }
});

async function handleWriteCommand(command, availableSheetsString, sheetsConnected) {
    if (!openai || config.useMockAI) {
        const mockData = parseMockWriteCommand(command, availableSheetsString);
        if (sheetsConnected) {
            try {
                console.log('📤 Sending write command to Multi-Sheet system:', mockData);
                const writeResult = await axios.post(config.googleAppsScriptUrl, mockData, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'User-Agent': 'Ara-Voice-AI-MultiSheet/2.0'
                    },
                    timeout: 25000
                });
                console.log('📥 Write result:', writeResult.data);
                return `✅ Successfully added to ${mockData.sheetName}: ${mockData.data.join(', ')}`;
            } catch (error) {
                console.error('❌ Error writing to Multi-Sheet system:', error.message);
                return `📝 Processed write command: "${command}" for ${mockData.sheetName}. Error: ${error.message}`;
            }
        } else {
            return `📝 Mock: Would add to ${mockData.sheetName}: ${mockData.data.join(', ')}. Connect Google Apps Script for real updates.`;
        }
    }

    const writePrompt = `You are a data parsing AI for Google Sheets. Parse the user's command into a JSON object for Google Apps Script. Available sheets: [${availableSheetsString}].

Rules:
1. Choose the most appropriate sheet name from the available sheets
2. Create a JSON object with: "action": "addRow", "sheetName": "chosen_sheet", "data": [array of values]
3. Extract meaningful data from the command
4. Add relevant fields like item, quantity, date, status, etc.

User command: "${command}"`;
    
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: writePrompt },
                { role: "user", content: command }
            ],
            response_format: { type: "json_object" },
        });
        
        const writeCommand = JSON.parse(response.choices[0].message.content);
        console.log('📤 AI-generated write command:', writeCommand);
        
        if (sheetsConnected) {
            const writeResult = await axios.post(config.googleAppsScriptUrl, writeCommand, {
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Ara-Voice-AI-MultiSheet/2.0'
                },
                timeout: 25000
            });
            console.log('📥 Multi-Sheet write result:', writeResult.data);
            return writeResult.data.message || `✅ Successfully added to ${writeCommand.sheetName}`;
        } else {
            return `📝 Parsed command for ${writeCommand.sheetName}: ${writeCommand.data.join(', ')}. Google Sheets not connected.`;
        }
    } catch (error) {
        console.error('💥 Error in handleWriteCommand:', error);
        return `I understand you want to add something, but I had trouble processing: "${command}". Please try rephrasing your request.`;
    }
}

function parseMockWriteCommand(command, availableSheetsString) {
    const lowerCommand = command.toLowerCase();
    let sheetName = 'Groceries'; // default
    let data = [];
    
    // Determine sheet based on keywords
    if (lowerCommand.includes('grocery') || lowerCommand.includes('food') || lowerCommand.includes('apple') || lowerCommand.includes('banana')) {
        sheetName = 'Groceries';
    } else if (lowerCommand.includes('expense') || lowerCommand.includes('cost') || lowerCommand.includes('money') || lowerCommand.includes('budget')) {
        sheetName = 'Expenses';
    } else if (lowerCommand.includes('task') || lowerCommand.includes('todo') || lowerCommand.includes('reminder')) {
        sheetName = 'Tasks';
    } else if (lowerCommand.includes('shop') || lowerCommand.includes('buy')) {
        sheetName = 'Shopping';
    }
    
    // Extract data from command
    const words = command.split(' ');
    const numbers = words.filter(word => !isNaN(word) && word !== '');
    const quantity = numbers.length > 0 ? numbers[0] : '1';
    
    // Simple item extraction
    let item = command.replace(/add|create|insert|to|my|the|a|an/gi, '').trim();
    if (item.includes('to ')) {
        item = item.split('to ')[0].trim();
    }
    
    data = [item || 'Item from: ' + command, quantity, new Date().toLocaleDateString(), 'pending'];
    
    return {
        action: "addRow",
        sheetName: sheetName,
        data: data
    };
}

async function handleReadCommand(command, availableSheetsString, sheetsConnected) {
    if (!openai || config.useMockAI) {
        if (sheetsConnected) {
            try {
                // Try to read from the most relevant sheet
                const sheetName = determineRelevantSheet(command, availableSheetsString.split(', '));
                console.log('📖 Reading from Multi-Sheet:', sheetName);
                const readResult = await axios.post(config.googleAppsScriptUrl, { 
                    action: 'readSheet', 
                    sheetName: sheetName 
                }, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'User-Agent': 'Ara-Voice-AI-MultiSheet/2.0'
                    },
                    timeout: 25000
                });
                
                console.log('📊 Multi-Sheet read result:', readResult.data);
                
                if (readResult.data.status === 'success') {
                    const data = readResult.data.data || [];
                    if (data.length === 0) {
                        return `📋 The ${sheetName} sheet is currently empty. Try adding some items first!`;
                    } else {
                        return `📊 Here's what I found in ${sheetName}:\n\n${formatSheetData(data, readResult.data.headers)}`;
                    }
                } else {
                    return `📋 I tried to read from ${sheetName} but encountered an issue: ${readResult.data.message}`;
                }
            } catch (error) {
                console.error('❌ Error reading from Multi-Sheet system:', error.message);
                return `📋 Mock response for: "${command}". Available sheets: ${availableSheetsString}. Error: ${error.message}`;
            }
        } else {
            return `📋 Mock response for: "${command}". Available sheets: ${availableSheetsString}. Connect Google Sheets to see real data!`;
        }
    }

    try {
        let systemPrompt = `You are a helpful assistant for Google Sheets data. Available sheets: ${availableSheetsString}.`;
        
        if (sheetsConnected) {
            systemPrompt += ` You can access real multi-sheet data. Provide helpful responses about the user's query.`;
        } else {
            systemPrompt += ` Google Sheets is not connected, so provide helpful mock responses and suggest setting up the connection.`;
        }
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: command }
            ],
            max_tokens: 250,
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        return `I understand you want to know about: "${command}". Available sheets: ${availableSheetsString}. However, I encountered an error processing your request.`;
    }
}

function determineRelevantSheet(command, availableSheets) {
    const lowerCommand = command.toLowerCase();
    
    for (const sheet of availableSheets) {
        if (lowerCommand.includes(sheet.toLowerCase())) {
            return sheet;
        }
    }
    
    // Default logic based on keywords
    if (lowerCommand.includes('grocery') || lowerCommand.includes('food')) return 'Groceries';
    if (lowerCommand.includes('expense') || lowerCommand.includes('cost') || lowerCommand.includes('money')) return 'Expenses';
    if (lowerCommand.includes('task') || lowerCommand.includes('todo')) return 'Tasks';
    if (lowerCommand.includes('shop')) return 'Shopping';
    if (lowerCommand.includes('budget')) return 'Budget';
    
    return availableSheets[0] || 'Groceries';
}

function formatSheetData(data, headers) {
    if (!data || data.length === 0) return 'No data found.';
    
    let formatted = '';
    data.slice(0, 8).forEach((row, index) => {
        formatted += `${index + 1}. `;
        if (headers && headers.length > 0) {
            formatted += `${row[headers[0]] || row[0] || 'Item'}`;
            if (row[headers[1]] || row[1]) formatted += ` (${row[headers[1]] || row[1]})`;
            if (row[headers[2]] || row[2]) formatted += ` - ${row[headers[2]] || row[2]}`;
        } else {
            formatted += row.join(' | ');
        }
        formatted += '\n';
    });
    
    if (data.length > 8) {
        formatted += `\n... and ${data.length - 8} more items.`;
    }
    
    return formatted;
}

// --- Serve the main page (requires auth) ---
app.get('/', requireAuth, (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log('📄 Serving authenticated index.html from:', indexPath);
    
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('❌ Error serving index.html:', err);
            res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>🎤 Ara Voice AI - Multi-Sheet Assistant</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f7fa; }
                        .container { text-align: center; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                        .status { background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; border-radius: 12px; margin: 20px 0; }
                        .session-info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196F3; }
                        input, button { padding: 15px; margin: 8px; font-size: 16px; border-radius: 8px; border: 2px solid #ddd; }
                        button { background: linear-gradient(135deg, #2d5a3d, #4a7c59); color: white; border: none; cursor: pointer; font-weight: 600; }
                        button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
                        #response { margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #2d5a3d; }
                        .logout { position: absolute; top: 20px; right: 20px; }
                        .features { text-align: left; margin: 30px 0; }
                        .features ul { list-style: none; padding: 0; }
                        .features li { padding: 8px 0; color: #555; }
                        .features li:before { content: "🎯 "; margin-right: 8px; }
                        .timer { position: fixed; top: 20px; left: 20px; background: rgba(45, 90, 61, 0.9); color: white; padding: 10px 15px; border-radius: 20px; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <div class="timer" id="sessionTimer">⏱️ Session Active</div>
                    <div class="logout">
                        <form method="POST" action="/logout" style="display: inline;">
                            <button type="submit" style="background: #dc3545; padding: 10px 20px; font-size: 14px;">🔒 Logout</button>
                        </form>
                    </div>
                    <div class="container">
                        <h1>🎤 Ara Voice AI</h1>
                        <h2>Multi-Sheet Assistant</h2>
                        <div class="status">
                            <p>✅ Server running successfully!</p>
                            <p>🔐 Authenticated and secure (5-minute session)</p>
                            <p>📊 Multi-Sheet system ready</p>
                            <p>Port: ${config.port} | Environment: ${process.env.NODE_ENV || 'development'}</p>
                        </div>
                        
                        <div class="session-info">
                            <strong>🔒 Secure Session Active</strong><br>
                            Your session will automatically expire in 5 minutes for security.
                        </div>
                        
                        <div>
                            <h3>🎯 Voice Command Interface</h3>
                            <input type="text" id="commandInput" placeholder="Type your command here..." style="width: 400px;">
                            <button onclick="sendCommand()">🚀 Send Command</button>
                        </div>
                        
                        <div id="response"></div>
                        
                        <div class="features">
                            <h3>🎯 Multi-Sheet Commands:</h3>
                            <ul>
                                <li>"Add 2 apples to groceries"</li>
                                <li>"Show me my expenses"</li>
                                <li>"Add task: Call dentist"</li>
                                <li>"What's in my shopping list?"</li>
                                <li>"Add $50 coffee expense to budget"</li>
                                <li>"Show me all my tasks"</li>
                            </ul>
                        </div>
                    </div>
                    
                    <script>
                        let sessionTimer;
                        
                        function updateSessionTimer() {
                            fetch('/session-status')
                                .then(r => r.json())
                                .then(data => {
                                    const timerEl = document.getElementById('sessionTimer');
                                    if (data.authenticated && data.timeLeft > 0) {
                                        const minutes = Math.floor(data.timeLeft / 60);
                                        const seconds = data.timeLeft % 60;
                                        timerEl.textContent = \`⏱️ \${minutes}:\${seconds.toString().padStart(2, '0')}\`;
                                        
                                        if (data.timeLeft < 60) {
                                            timerEl.style.background = 'rgba(220, 53, 69, 0.9)';
                                        }
                                    } else {
                                        window.location.href = '/lock?expired=1';
                                    }
                                })
                                .catch(() => {
                                    window.location.href = '/lock?expired=1';
                                });
                        }
                        
                        // Update timer every second
                        sessionTimer = setInterval(updateSessionTimer, 1000);
                        updateSessionTimer();
                        
                        async function sendCommand() {
                            const input = document.getElementById('commandInput');
                            const response = document.getElementById('response');
                            const command = input.value.trim();
                            
                            if (!command) {
                                response.innerHTML = '<div style="color: red;">Please enter a command</div>';
                                return;
                            }
                            
                            response.innerHTML = '<div style="color: #2d5a3d;">🤖 Processing your command...</div>';
                            
                            try {
                                const result = await fetch('/voice-command', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ command: command })
                                });
                                
                                if (result.status === 401) {
                                    window.location.href = '/lock?expired=1';
                                    return;
                                }
                                
                                const data = await result.json();
                                
                                if (data.status === 'success') {
                                    response.innerHTML = '<div style="color: green;"><strong>🎯 Ara Response:</strong><br><pre style="white-space: pre-wrap; font-family: inherit;">' + data.answer + '</pre></div>';
                                } else {
                                    response.innerHTML = '<div style="color: red;"><strong>❌ Error:</strong><br>' + data.message + '</div>';
                                }
                            } catch (error) {
                                response.innerHTML = '<div style="color: red;">❌ Connection error: ' + error.message + '</div>';
                            }
                            
                            input.value = '';
                        }
                        
                        document.getElementById('commandInput').addEventListener('keypress', function(e) {
                            if (e.key === 'Enter') {
                                sendCommand();
                            }
                        });
                        
                        // Auto-focus on input
                        document.getElementById('commandInput').focus();
                    </script>
                </body>
                </html>
            `);
        }
    });
});

// Catch all other routes and redirect to lock page
app.get('*', (req, res) => {
    res.redirect('/lock');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);
    res.status(500).json({ 
        status: 'error', 
        message: 'Internal server error' 
    });
});

// Start server
const port = config.port;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Ara Voice AI Multi-Sheet Server is running!`);
    console.log(`📍 Local: http://localhost:${port}`);
    console.log(`🌐 Network: http://0.0.0.0:${port}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 AI Mode: ${config.useMockAI ? 'Mock' : 'OpenAI'}`);
    console.log(`📊 Google Sheets: ${config.googleAppsScriptUrl ? 'Configured' : 'Not configured'}`);
    console.log(`🔐 Authentication: ${REQUIRED_PASSCODE ? 'Enabled' : 'Disabled'}`);
    console.log(`⏱️  Session Timeout: 5 minutes`);
    console.log(`🔑 Required Passcode: "${REQUIRED_PASSCODE}"`);
});