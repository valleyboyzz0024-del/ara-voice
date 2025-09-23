import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { handleCommand } from './aiHandler.js';

// Setup for serving static files from the 'public' folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Password Protection Middleware
const checkPassword = (req, res, next) => {
    const { password } = req.body;
    const appPassword = process.env.APP_PASSWORD;

    if (!appPassword || password === appPassword) {
        next(); // Password is correct, proceed.
    } else {
        res.status(401).json({ error: 'Unauthorized: Incorrect password.' });
    }
};

// Main API endpoint for all commands from the chat interface
app.post('/command', checkPassword, async (req, res) => {
    try {
        const { messages, smartMode } = req.body;
        if (!messages) {
            return res.status(400).json({ error: 'Request body must include messages.' });
        }
        const reply = await handleCommand(messages, smartMode);
        res.json({ reply });
    } catch (error) {
        console.error('Error in /command endpoint:', error);
        res.status(500).json({ error: 'An error occurred on the server.' });
    }
});

app.listen(port, () => {
    console.log(`Ara AI server is running on port ${port}.`);
});