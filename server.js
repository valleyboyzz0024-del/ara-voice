import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { handleCommand } from './aiHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated === true) {
        return next();
    }
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        res.status(401).json({ error: 'Session expired. Please log in again.' });
    } else {
        res.redirect('/');
    }
};

// --- ROUTES ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.APP_PASSWORD) {
        req.session.isAuthenticated = true;
        res.redirect('/chat');
    } else {
        res.redirect('/');
    }
});

app.get('/chat', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.post('/command', isAuthenticated, async (req, res) => {
    try {
        const { messages, smartMode } = req.body;
        const reply = await handleCommand(messages, smartMode);
        res.json({ reply });
    } catch (error) {
        console.error('Error in /command endpoint:', error);
        res.status(500).json({ error: 'An error occurred on the server.' });
    }
});

app.listen(port, () => {
    console.log(`Ultimate Ara AI server is running on port ${port}.`);
});