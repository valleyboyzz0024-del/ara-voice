require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { google } = require('googleapis');

const SHEETS_CONFIG = [
    { name: "Heath's Ledger", id: "1aAb6jKRxisGKVQIex_HU59lX6X-Kkm4tTIH7qXfaEW0", range: "'Hulk'!A1:Z1000" },
    { name: "Winnipeg LP Expenses", id: "1dElu39ly3LNHAMZupg1OzWmAmoDZVMRWXX5x2ksw12Q", range: "Sheet1!A1:Z1000" },
    { name: "House Project Expenses", id: "1tGcU53sMpzuGrU3tDUilyj0KACnsjEfFY0t_5eW4pZM", range: "Sheet1!A1:Z1000" },
    { name: "Sample Product Tracking", id: "1RIXQIyGZ9qfW3x3JdpwfBIMmoNf-r9zH7ffjk5jeYks", range: "Sheet1!A1:Z1000" },
    { name: "Old Ledger", id: "1CwV3uJ_fgs783230SQXvZs5kRGFFNmeaYRYYTT-yvkQ", range: "'FLOAT'!A1:Z1000" }
];

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const app = express();
const port = process.env.PORT || 3000; // Use port from environment or default to 3000

if (!process.env.OPENAI_API_KEY) {
  console.error("FATAL ERROR: OPENAI_API_KEY is not set.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const standardPrompt = `You are Ara, a helpful and direct data assistant...`; // Keeping this brief for clarity
const smartPrompt = `You are Ara, a highly intelligent and thorough data analyst...`;

let conversationHistory = [];

app.use(express.static('public'));
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

async function getGoogleAuth() {
    // For deployment, credentials will be in an environment variable.
    if (process.env.GOOGLE_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        return google.auth.fromJSON(credentials);
    }
    // For local development, it will use the file.
    return new google.auth.GoogleAuth({
        keyFile: 'google-credentials.json',
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
}

async function getSheetData() {
    try {
        const auth = await getGoogleAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        let allSheetsData = {};
        for (const sheetConfig of SHEETS_CONFIG) {
            console.log(`Fetching data from sheet: "${sheetConfig.name}" (Range: ${sheetConfig.range})`);
            try {
                const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetConfig.id, range: sheetConfig.range });
                allSheetsData[sheetConfig.name] = response.data.values;
            } catch (sheetError) {
                console.error(`Error fetching sheet "${sheetConfig.name}": ${sheetError.message}`);
                allSheetsData[sheetConfig.name] = `[Error: ${sheetError.message}]`;
            }
        }
        return allSheetsData;
    } catch (error) {
        console.error('The Google Auth API returned an error: ' + error);
        return null;
    }
}

async function handleChat(userMessage, useSmartMode) {
    const sheetData = await getSheetData();
    const systemPrompt = useSmartMode ? smartPrompt : standardPrompt;
    console.log(`Using ${useSmartMode ? 'Smart' : 'Standard'} Mode.`);
    let messagesForAI = [{ role: 'system', content: systemPrompt }];
    if (sheetData) {
        let sheetContext = "Here is the data from the connected Google Sheets:\n\n";
        for (const sheetName in sheetData) {
            sheetContext += `--- Data from "${sheetName}" ---\n`;
            sheetContext += JSON.stringify(sheetData[sheetName]) + "\n\n";
        }
        messagesForAI.push({ role: 'system', content: sheetContext });
    } else {
        messagesForAI.push({ role: 'system', content: "Warning: Could not read data from Google Sheets." });
    }
    messagesForAI.push(...conversationHistory.slice(-6), { role: 'user', content: userMessage });
    const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages: messagesForAI });
    const aiResponse = completion.choices[0].message.content;
    conversationHistory.push({ role: 'user', content: userMessage }, { role: 'assistant', content: aiResponse });
    return aiResponse;
}

app.post('/voice', upload.single('voice'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No voice file uploaded.' });
    const useSmartMode = req.body.smartMode === 'true';
    const inputPath = req.file.path;
    const outputPath = path.join('uploads', `${req.file.filename}.mp3`);
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath).toFormat('mp3').on('end', resolve).on('error', reject).save(outputPath);
        });
        const transcription = await openai.audio.transcriptions.create({ file: fs.createReadStream(outputPath), model: 'whisper-1' });
        const transcribedText = transcription.text;
        console.log(`Transcription: "${transcribedText}"`);
        const aiResponse = await handleChat(transcribedText, useSmartMode);
        res.json({ transcribedText, reply: aiResponse });
    } catch (error) {
        console.error('Error in /voice endpoint:', error.message);
        res.status(500).json({ error: 'Failed to process voice.' });
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
});

app.post('/speak', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided.' });
    try {
        const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: "nova", input: text });
        res.setHeader('Content-Type', 'audio/mpeg');
        mp3.body.pipe(res);
    } catch (error) {
        console.error('Error in /speak endpoint:', error);
        res.status(500).json({ error: 'Failed to generate speech.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log("Ara is ready.");
});