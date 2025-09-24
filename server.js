import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import OpenAI from 'openai'; // Import OpenAI
import { handleCommand } from './aiHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Initialize OpenAI

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated === true) { return next(); }
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        res.status(401).json({ error: 'Session expired. Please log in again.' });
    } else {
        res.redirect('/');
    }
};

// --- ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.post('/login', (req, res) => {
    if (req.body.password === process.env.APP_PASSWORD) {
        req.session.isAuthenticated = true;
        res.redirect('/chat');
    } else {
        res.redirect('/');
    }
});
app.get('/chat', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));
app.post('/command', isAuthenticated, async (req, res) => {
    try {
        const { messages, smartMode } = req.body;
        const reply = await handleCommand(messages, smartMode);
        res.json({ reply });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- NEW TEXT-TO-SPEECH ENDPOINT ---
app.post('/speak', isAuthenticated, async (req, res) => {
    try {
        const { text, voice } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'No text provided.' });
        }
        
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice || "nova", // Use selected voice, fallback to 'nova'
            input: text,
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        mp3.body.pipe(res);

    } catch (error) {
        console.error("Error in /speak endpoint:", error);
        res.status(500).json({ error: "Failed to generate speech." });
    }
});

app.listen(port, () => {
    console.log(`Ultimate Ara AI server is running on port ${port}.`);
});