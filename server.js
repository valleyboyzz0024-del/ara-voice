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
const port = process.env.PORT || 3000;

// --- Security & API Key Checks ---
if (!process.env.APP_PASSWORD) {
    console.warn("WARNING: APP_PASSWORD is not set. The application will be unprotected.");
}
if (!process.env.OPENAI_API_KEY) {
  console.error("FATAL ERROR: OPENAI_API_KEY is not set in the environment.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const standardPrompt = `You are Ara, a helpful and direct data assistant...`;
const smartPrompt = `You are Ara, a highly intelligent and thorough data analyst...`;

let conversationHistory = [];

app.use(express.static('public'));
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// --- LOGIN ENDPOINT ---
app.post('/login', (req, res) => {
    const { password } = req.body;
    const appPassword = process.env.APP_PASSWORD;
    if (!appPassword || password === appPassword) {
        console.log("Successful login.");
        return res.json({ success: true });
    }
    console.log("Failed login attempt.");
    res.status(401).json({ success: false, message: 'Incorrect password.' });
});

async function getGoogleAuth() {
    try {
        if (process.env.GOOGLE_CREDENTIALS) {
            const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            return google.auth.fromJSON(credentials);
        }
        return new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
    } catch (error) {
        console.error("Error creating Google Auth client:", error);
        return null;
    }
}

async function getSheetData() {
    try {
        const auth = await getGoogleAuth();
        if (!auth) throw new Error("Google Authentication failed.");
        const sheets = google.sheets({ version: "v4", auth: auth });
        let allSheetData = {};
        for (const config of SHEETS_CONFIG) {
            console.log(`Fetching data from sheet: "${config.name}" (Range: ${config.range})`);
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: config.id,
                    range: config.range,
                });
                allSheetData[config.name] = response.data.values;
            } catch (err) {
                console.error(`Error fetching sheet "${config.name}": ${err.message}`);
                allSheetData[config.name] = `[Error: Could not fetch sheet.]`;
            }
        }
        return allSheetData;
    } catch (error) {
        console.error("Error in getSheetData:", error);
        return null;
    }
}

async function handleChat(userInput, isSmartMode) {
    const sheetData = await getSheetData();
    const activePrompt = isSmartMode ? smartPrompt : standardPrompt;
    console.log(`Using ${isSmartMode ? "Smart" : "Standard"} Mode.`);

    let messages = [{ role: "system", content: activePrompt }];
    if (sheetData) {
        let dataContext = "Here is the data from the connected Google Sheets:\n\n";
        for (const sheetName in sheetData) {
            dataContext += `--- Data from "${sheetName}" ---\n`;
            dataContext += JSON.stringify(sheetData[sheetName]) + "\n\n";
        }
        messages.push({ role: "system", content: dataContext });
    } else {
        messages.push({ role: "system", content: "Warning: Could not read data from Google Sheets." });
    }

    messages.push(...conversationHistory.slice(-6), { role: "user", content: userInput });

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
    });

    const aiReply = completion.choices[0].message.content;
    conversationHistory.push({ role: "user", content: userInput }, { role: "assistant", content: aiReply });
    return aiReply;
}

// --- REVISED /voice ENDPOINT ---
app.post("/voice", upload.single("voice"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No voice file uploaded." });
    }

    const isSmartMode = req.body.smartMode === "true";
    const originalPath = req.file.path;
    const mp3Path = path.join("uploads", `${req.file.filename}.mp3`);

    try {
        await new Promise((resolve, reject) => {
            ffmpeg(originalPath)
                .toFormat("mp3")
                .on("end", resolve)
                .on("error", reject)
                .save(mp3Path);
        });

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(mp3Path),
            model: "whisper-1",
        });

        const transcribedText = transcription.text;
        console.log(`Transcription: "${transcribedText}"`);

        const chatReply = await handleChat(transcribedText, isSmartMode);

        res.json({ transcribedText: transcribedText, reply: chatReply });

    } catch (error) {
        console.error("Error in /voice endpoint:", error.message);
        res.status(500).json({ error: "Failed to process voice. Check server logs." });
    } finally {
        // Cleanup both files
        if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
        if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
    }
});

app.post("/speak", async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: "No text provided." });
    }
    try {
        const speechResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "nova",
            input: text,
        });
        res.setHeader("Content-Type", "audio/mpeg");
        speechResponse.body.pipe(res);
    } catch (error) {
        console.error("Error in /speak endpoint:", error);
        res.status(500).json({ error: "Failed to generate speech." });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log("Ara is ready.");
});