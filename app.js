require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ---
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const USE_MOCK_AI = !process.env.OPENAI_API_KEY;

const openai = USE_MOCK_AI ? null : new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- Middleware ---
app.use(express.static('public'));
app.use(express.json());

// --- Main Voice Command Endpoint ---
app.post('/voice-command', async (req, res) => {
    let { command } = req.body;
    if (!command) {
        return res.status(400).json({ status: 'error', message: 'Command is empty' });
    }
    const userCommand = command.toLowerCase().trim();

    try {
        if (USE_MOCK_AI) {
            return res.json({ status: 'success', answer: `Mock AI received: '${userCommand}'.` });
        }

        // --- FIX: Step 1 - Get all available sheet names from Google Sheets ---
        // We now directly access the 'data' from the axios response, as Google Scripts can wrap it.
        const sheetsResponse = await axios.post(GOOGLE_APPS_SCRIPT_URL, { action: 'getSheetNames' });
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

        // --- Step 3: Execute based on intent ---
        if (intent === 'WRITE') {
            const answer = await handleWriteCommand(userCommand, availableSheetsString);
            res.json({ status: 'success', answer });
        } else if (intent === 'READ') {
            const answer = await handleReadCommand(userCommand, availableSheetsString);
            res.json({ status: 'success', answer });
        } else {
            res.status(500).json({ status: 'error', message: `AI could not determine intent. Classified as: ${intent}` });
        }

    } catch (error) {
        console.error('Error processing command:', error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || error.message || 'An internal server error occurred.';
        res.status(500).json({ status: 'error', message: errorMessage });
    }
});

async function handleWriteCommand(command, availableSheetsString) {
    const writePrompt = `You are a data parsing AI for Google Sheets. The user wants to add data. Your job is to identify the correct sheet and parse the data. The available sheets are: [${availableSheetsString}].
    From the user's command, determine the single most appropriate sheet to write to.
    Parse the user's command into a JSON object with "sheetName" (must be one of the available sheets) and "data" (an array of values for the new row).
    User command: "${command}"`;
    
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: writePrompt },
            { role: "user", content: command }
        ],
    });

    const parsedData = JSON.parse(response.choices[0].message.content);

    await axios.post(GOOGLE_APPS_SCRIPT_URL, {
        action: 'addRow',
        sheetName: parsedData.sheetName,
        data: parsedData.data
    });

    return `Okay, I've added that to the '${parsedData.sheetName}' sheet.`;
}

async function handleReadCommand(command, availableSheetsString) {
    // Step 1: Figure out which sheet the user is asking about
    const sheetNameResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: `You are a sheet name identifier. From the user's question, identify the single most likely sheet name they are asking about. Respond with only that sheet name. The available sheets are: [${availableSheetsString}].` },
            { role: "user", content: command }
        ],
        max_tokens: 25,
    });
    const sheetName = sheetNameResponse.choices[0].message.content.trim().replace(/['".]/g, '');

    // Step 2: Fetch the data from that sheet
    const scriptResponse = await axios.post(GOOGLE_APPS_SCRIPT_URL, {
        action: 'read',
        sheetName: sheetName
    });

    if (scriptResponse.data.status === 'error') {
        throw new Error(`Google Apps Script Error: ${scriptResponse.data.message}`);
    }
    const sheetData = scriptResponse.data.data;

    // Step 3: Give the AI the data and the question to formulate an answer
    const answerResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a helpful AI assistant for Google Sheets. The user asked a question, and here is the relevant data from their sheet in JSON format. Formulate a friendly, natural language answer to their question. Be direct and helpful." },
            { role: "user", content: `My question was: "${command}"\n\nHere is the data from the '${sheetName}' sheet:\n${JSON.stringify(sheetData)}` }
        ],
        max_tokens: 300,
    });
    
    return answerResponse.choices[0].message.content;
}

// --- Server Start ---
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    if (USE_MOCK_AI) console.warn('WARNING: OPENAI_API_KEY not found. Running in MOCK AI mode.');
    else console.log('OpenAI API key found. Running in LIVE AI mode.');
    if (!GOOGLE_APPS_SCRIPT_URL) console.error('FATAL: GOOGLE_APPS_SCRIPT_URL is not set in .env file!');
});