import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { OpenAI } from 'openai';
import config from './config.js';

const app = express();
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Assuming config.session is defined; if not, use a default session setup
app.use(session(config.session || {
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- Route to handle voice commands ---
app.post('/voice-command', async (req, res) => {
    let { command } = req.body;
    if (!command) {
        return res.status(400).json({ status: 'error', message: 'Command is empty' });
    }
    const userCommand = command.toLowerCase().trim();

    try {
        if (config.useMockAI) {
            return res.json({ status: 'success', answer: `Mock AI received: '${userCommand}'.` });
        }

        console.log('Processing command:', userCommand); // Log the command

        // --- Step 1 - Get all available sheet names from Google Sheets ---
        const sheetsResponse = await axios.post(config.googleAppsScriptUrl, { action: 'getSheetNames' }, {
            headers: { 'Content-Type': 'application/json' }
        });
        const responseData = sheetsResponse.data;

        if (responseData.status === 'error') {
            throw new Error(`Google Apps Script Error: ${responseData.message}`);
        }
        
        const availableSheets = responseData.sheetNames;
        if (!availableSheets || !Array.isArray(availableSheets)) {
            throw new Error("Could not retrieve sheet names from Google. Please ensure the Apps Script is deployed correctly.");
        }
        const availableSheetsString = availableSheets.join(', ');

        // --- Step 2: Determine User Intent (Read vs. Write) ---
        const intentResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: `You are an intent classifier for a Google Sheet. The user gives a command. Determine if they want to 'WRITE' new data (add, create, log) or 'READ' existing data (ask a question, what is, how many, summarize). Your response must be a single word: READ or WRITE. The available sheets are: ${availableSheetsString}.` },
                { role: "user", content: userCommand }
            ],
            max_tokens: 5,
        });
        const intent = intentResponse.choices[0].message.content.trim().toUpperCase();
        console.log('Detected intent:', intent); // Log intent

        // --- Step 3: Execute based on intent ---
        let answer;
        if (intent === 'WRITE') {
            answer = await handleWriteCommand(userCommand, availableSheetsString);
            const writeCommand = JSON.parse(answer); // Ensure it's valid JSON
            console.log('Write command to send:', writeCommand); // Log the command
            const writeResult = await axios.post(config.googleAppsScriptUrl, writeCommand, {
                headers: { 'Content-Type': 'application/json' }
            });
            answer = writeResult.data.message || 'Write action completed.';
        } else if (intent === 'READ') {
            answer = await handleReadCommand(userCommand, availableSheetsString);
        } else {
            throw new Error(`AI could not determine intent. Classified as: ${intent}`);
        }

        res.json({ status: 'success', answer });
    } catch (error) {
        console.error('Error processing command:', error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || 'An internal server error occurred.';
        res.status(500).json({ status: 'error', message: errorMessage });
    }
});

async function handleWriteCommand(command, availableSheetsString) {
    const writePrompt = `You are a data parsing AI for Google Sheets. The user wants to add data. Your job is to identify the correct sheet and parse the data. The available sheets are: [${availableSheetsString}].
    From the user's command, determine the single most appropriate sheet to write to.
    Parse the user's command into a JSON object for the Google Apps Script. The JSON object must have "action" set to "addRow", "sheetName", and "data" (an array of values for the new row).
    User command: "${command}"`;
    
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: writePrompt },
            { role: "user", content: command }
        ],
        response_format: { type: "json_object" },
    });
    
    return response.choices[0].message.content;
}

async function handleReadCommand(command, availableSheetsString) {
    // Placeholder - implement read logic as needed
    return `Read command received: "${command}". The available sheets are ${availableSheetsString}.`;
}

// --- Serve the main page ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
});