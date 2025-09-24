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

// Fix static file serving for both local and Render
const publicPath = path.join(__dirname, 'public');
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));

// Session configuration
app.use(session(config.session || {
  secret: process.env.SESSION_SECRET || 'fallback-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: config.port,
    env: process.env.NODE_ENV || 'development'
  });
});

// --- Route to handle voice commands ---
app.post('/voice-command', async (req, res) => {
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
                answer: `Mock AI received: '${userCommand}'. This is a test response. To enable real AI, add your OpenAI API key to the environment variables.` 
            });
        }

        console.log('Processing command:', userCommand);

        // --- Step 1 - Get all available sheet names from Google Sheets ---
        let availableSheets = ['Groceries', 'Expenses', 'Tasks', 'Shopping List']; // Default sheets
        let availableSheetsString = availableSheets.join(', ');
        let sheetsConnected = false;

        if (config.googleAppsScriptUrl && !config.googleAppsScriptUrl.includes('placeholder') && !config.googleAppsScriptUrl.includes('mock')) {
            try {
                console.log('🔗 Attempting to connect to Google Sheets...');
                const sheetsResponse = await axios.post(config.googleAppsScriptUrl, { action: 'getSheetNames' }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                });
                const responseData = sheetsResponse.data;

                if (responseData.status === 'success' && responseData.sheetNames) {
                    availableSheets = responseData.sheetNames;
                    availableSheetsString = availableSheets.join(', ');
                    sheetsConnected = true;
                    console.log('✅ Connected to Google Sheets. Available sheets:', availableSheetsString);
                } else {
                    console.log('⚠️ Google Sheets responded but no sheet names found');
                }
            } catch (sheetsError) {
                console.log('❌ Could not connect to Google Sheets:', sheetsError.message);
                console.log('📋 Using default sheets for demo purposes');
            }
        } else {
            console.log('📋 Google Apps Script URL not configured, using mock mode');
        }

        // --- Step 2: Determine User Intent (Read vs. Write) ---
        const intentResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use cheaper model for intent classification
            messages: [
                { role: "system", content: `You are an intent classifier for a Google Sheet. The user gives a command. Determine if they want to 'WRITE' new data (add, create, log) or 'READ' existing data (ask a question, what is, how many, summarize). Your response must be a single word: READ or WRITE. The available sheets are: ${availableSheetsString}.` },
                { role: "user", content: userCommand }
            ],
            max_tokens: 5,
        });
        const intent = intentResponse.choices[0].message.content.trim().toUpperCase();
        console.log('Detected intent:', intent);

        // --- Step 3: Execute based on intent ---
        let answer;
        if (intent === 'WRITE') {
            answer = await handleWriteCommand(userCommand, availableSheetsString, sheetsConnected);
        } else if (intent === 'READ') {
            answer = await handleReadCommand(userCommand, availableSheetsString, sheetsConnected);
        } else {
            answer = `I understand you want to: ${userCommand}. However, I couldn't determine if this is a read or write operation. Could you be more specific?`;
        }

        res.json({ status: 'success', answer });
    } catch (error) {
        console.error('Error processing command:', error.message);
        const errorMessage = error.message || 'An internal server error occurred.';
        res.status(500).json({ status: 'error', message: `I encountered an error: ${errorMessage}` });
    }
});

async function handleWriteCommand(command, availableSheetsString, sheetsConnected) {
    if (!openai || config.useMockAI) {
        const mockData = parseMockWriteCommand(command, availableSheetsString);
        if (sheetsConnected) {
            try {
                const writeResult = await axios.post(config.googleAppsScriptUrl, mockData, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                });
                return `✅ Successfully added to ${mockData.sheetName}: ${mockData.data.join(', ')}`;
            } catch (error) {
                return `📝 Processed write command: "${command}" for ${mockData.sheetName}. Error connecting to sheets: ${error.message}`;
            }
        } else {
            return `📝 Mock: Would add to ${mockData.sheetName}: ${mockData.data.join(', ')}. Set up Google Apps Script to enable real sheet updates.`;
        }
    }

    const writePrompt = `You are a data parsing AI for Google Sheets. The user wants to add data. Your job is to identify the correct sheet and parse the data. The available sheets are: [${availableSheetsString}].
    From the user's command, determine the single most appropriate sheet to write to.
    Parse the user's command into a JSON object for the Google Apps Script. The JSON object must have "action" set to "addRow", "sheetName", and "data" (an array of values for the new row).
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
        console.log('📤 Write command to send:', writeCommand);
        
        if (sheetsConnected) {
            const writeResult = await axios.post(config.googleAppsScriptUrl, writeCommand, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000
            });
            return writeResult.data.message || `✅ Successfully added to ${writeCommand.sheetName}`;
        } else {
            return `📝 Parsed command for ${writeCommand.sheetName}: ${writeCommand.data.join(', ')}. Google Sheets not connected - set up your Apps Script URL.`;
        }
    } catch (error) {
        console.error('Error in handleWriteCommand:', error);
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
        sheetName = 'Shopping List';
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
                const readResult = await axios.post(config.googleAppsScriptUrl, { 
                    action: 'readSheet', 
                    sheetName: sheetName 
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                });
                
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
                return `📋 Mock response for: "${command}". Available sheets: ${availableSheetsString}. Error reading sheets: ${error.message}`;
            }
        } else {
            return `📋 Mock response for: "${command}". Available sheets: ${availableSheetsString}. Connect Google Sheets to see real data!`;
        }
    }

    try {
        let systemPrompt = `You are a helpful assistant that can read Google Sheets data. The available sheets are: ${availableSheetsString}.`;
        
        if (sheetsConnected) {
            systemPrompt += ` You can access real sheet data. Provide helpful responses about the user's query.`;
        } else {
            systemPrompt += ` Google Sheets is not connected, so provide helpful mock responses and suggest setting up the connection.`;
        }
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: command }
            ],
            max_tokens: 200,
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        return `I understand you want to know about: "${command}". The available sheets are ${availableSheetsString}. However, I encountered an error processing your request.`;
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
    if (lowerCommand.includes('shop')) return 'Shopping List';
    
    return availableSheets[0] || 'Groceries';
}

function formatSheetData(data, headers) {
    if (!data || data.length === 0) return 'No data found.';
    
    let formatted = '';
    data.slice(0, 5).forEach((row, index) => {
        formatted += `${index + 1}. `;
        if (headers && headers.length > 0) {
            formatted += `${row[headers[0]] || row[0] || 'Item'}`;
            if (row[headers[1]] || row[1]) formatted += ` (${row[headers[1]] || row[1]})`;
        } else {
            formatted += row.join(' - ');
        }
        formatted += '\n';
    });
    
    if (data.length > 5) {
        formatted += `... and ${data.length - 5} more items.`;
    }
    
    return formatted;
}

// --- Serve the main page ---
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log('Attempting to serve index.html from:', indexPath);
    
    // Check if file exists and serve it, otherwise send a basic HTML response
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Ara Voice AI</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                        .container { text-align: center; }
                        .status { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; }
                        .error { background: #ffe8e8; }
                        input, button { padding: 10px; margin: 5px; font-size: 16px; }
                        #response { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🎤 Ara Voice AI</h1>
                        <div class="status">
                            <p>✅ Server is running successfully!</p>
                            <p>Port: ${config.port}</p>
                            <p>Status: Ready to receive voice commands</p>
                        </div>
                        
                        <div>
                            <h3>Test Voice Command</h3>
                            <input type="text" id="commandInput" placeholder="Type your command here..." style="width: 300px;">
                            <button onclick="sendCommand()">Send Command</button>
                        </div>
                        
                        <div id="response"></div>
                        
                        <div style="margin-top: 30px; text-align: left;">
                            <h3>Example Commands:</h3>
                            <ul>
                                <li>"Add 2 apples to groceries"</li>
                                <li>"Show me my grocery list"</li>
                                <li>"Add task: Call dentist"</li>
                                <li>"What's in my expenses?"</li>
                            </ul>
                        </div>
                    </div>
                    
                    <script>
                        async function sendCommand() {
                            const input = document.getElementById('commandInput');
                            const response = document.getElementById('response');
                            const command = input.value.trim();
                            
                            if (!command) {
                                response.innerHTML = '<div style="color: red;">Please enter a command</div>';
                                return;
                            }
                            
                            response.innerHTML = '<div>Processing...</div>';
                            
                            try {
                                const result = await fetch('/voice-command', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ command: command })
                                });
                                
                                const data = await result.json();
                                
                                if (data.status === 'success') {
                                    response.innerHTML = '<div style="color: green;"><strong>Response:</strong><br>' + data.answer + '</div>';
                                } else {
                                    response.innerHTML = '<div style="color: red;"><strong>Error:</strong><br>' + data.message + '</div>';
                                }
                            } catch (error) {
                                response.innerHTML = '<div style="color: red;">Error: ' + error.message + '</div>';
                            }
                            
                            input.value = '';
                        }
                        
                        document.getElementById('commandInput').addEventListener('keypress', function(e) {
                            if (e.key === 'Enter') {
                                sendCommand();
                            }
                        });
                    </script>
                </body>
                </html>
            `);
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        status: 'error', 
        message: 'Internal server error' 
    });
});

// Start server
const port = config.port;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Ara Voice AI Server is running!`);
    console.log(`📍 Local: http://localhost:${port}`);
    console.log(`🌐 Network: http://0.0.0.0:${port}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 AI Mode: ${config.useMockAI ? 'Mock' : 'OpenAI'}`);
    console.log(`📊 Google Sheets: ${config.googleAppsScriptUrl ? 'Configured' : 'Not configured'}`);
});