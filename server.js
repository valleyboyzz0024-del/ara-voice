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

// --- Security Check ---
if (!process.env.APP_PASSWORD) {
    console.warn("WARNING: APP_PASSWORD is not set. The application will be unprotected.");
}
// --------------------

if (!process.env.OPENAI_API_KEY) {
  console.error("FATAL ERROR: OPENAI_API_KEY is not set.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const standardPrompt = `You are Ara, a helpful and direct data assistant...`;
const smartPrompt = `You are Ara, a highly intelligent and thorough data analyst...`;

let conversationHistory = [];

app.use(express.static('public'));
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// --- NEW LOGIN ENDPOINT ---
app.post('/login', (req, res) => {
    const { password } = req.body;
    const appPassword = process.env.APP_PASSWORD;

    // If no password is set on the server, allow access.
    if (!appPassword) {
        return res.json({ success: true });
    }

    if (password === appPassword) {
        console.log("Successful login.");
        res.json({ success: true });
    } else {
        console.log("Failed login attempt.");
        res.status(401).json({ success: false, message: 'Incorrect password.' });
    }
});
// -------------------------


async function getGoogleAuth() {
    if (process.env.GOOGLE_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        return google.auth.fromJSON(credentials);
    }
    return new google.auth.GoogleAuth({
        keyFile: 'google-credentials.json',
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
}

// ... (The rest of server.js remains exactly the same)
async function getSheetData(){try{const e=await getGoogleAuth(),t=await e.getClient(),a=google.sheets({version:"v4",auth:t});let o={};for(const e of SHEETS_CONFIG){console.log(`Fetching data from sheet: "${e.name}" (Range: ${e.range})`);try{const s=await a.spreadsheets.values.get({spreadsheetId:e.id,range:e.range});o[e.name]=s.data.values}catch(t){console.error(`Error fetching sheet "${e.name}": ${t.message}`),o[e.name]=`[Error: ${t.message}]`}}return o}catch(e){return console.error("The Google Auth API returned an error: "+e),null}}async function handleChat(e,t){const a=await getSheetData(),o=t?smartPrompt:standardPrompt;console.log(`Using ${t?"Smart":"Standard"} Mode.`);let s=[{role:"system",content:o}];if(a){let e="Here is the data from the connected Google Sheets:\n\n";for(const t in a)e+=`--- Data from "${t}" ---\n`,e+=JSON.stringify(a[t])+"\n\n";s.push({role:"system",content:e})}else s.push({role:"system",content:"Warning: Could not read data from Google Sheets."});s.push(...conversationHistory.slice(-6),{role:"user",content:e});const n=await openai.chat.completions.create({model:"gpt-4o",messages:s}),r=n.choices[0].message.content;return conversationHistory.push({role:"user",content:e},{role:"assistant",content:r}),r}app.post("/voice",upload.single("voice"),async(e,t)=>{if(!e.file)return t.status(400).json({error:"No voice file uploaded."});const a="true"===e.body.smartMode,o=e.file.path,s=path.join("uploads",`${e.file.filename}.mp3`);try{await new Promise((e,t)=>{ffmpeg(o).toFormat("mp3").on("end",e).on("error",t).save(s)});const e=await openai.audio.transcriptions.create({file:fs.createReadStream(s),model:"whisper-1"}),a=e.text;console.log(`Transcription: "${a}"`);const o=await handleChat(a,a);t.json({transcribedText:a,reply:o})}catch(e){console.error("Error in /voice endpoint:",e.message),t.status(500).json({error:"Failed to process voice."})}finally{fs.existsSync(o)&&fs.unlinkSync(o),fs.existsSync(s)&&fs.unlinkSync(s)}}),app.post("/speak",async(e,t)=>{const{text:a}=e.body;if(!a)return t.status(400).json({error:"No text provided."});try{const e=await openai.audio.speech.create({model:"tts-1",voice:"nova",input:a});t.setHeader("Content-Type","audio/mpeg"),e.body.pipe(t)}catch(e){console.error("Error in /speak endpoint:",e),t.status(500).json({error:"Failed to generate speech."})}}),app.listen(port,()=>{console.log(`Server listening at http://localhost:${port}`),console.log("Ara is ready.")});