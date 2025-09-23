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
    secret: process.env.SESSION_SECRET || 'a-very-secret-key-that-should-be-in-env',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Session expires after 24 hours
}));

// Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        return next();
    }
    // For API calls (like from our script.js), send a JSON error.
    // For browser navigation, redirect to the login page.
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

// The server now knows how to handle unauthorized API calls correctly.
app.post('/command', isAuthenticated, async (req, res) => {
    try {
        const { messages, smartMode } = req.body;
        const reply = await handleCommand(messages, smartMode);
        res.json({ reply });
    } catch (error)
    {
        console.error('Error in /command endpoint:', error);
        res.status(500).json({ error: 'An error occurred on the server.' });
    }
});


app.listen(port, () => {
    console.log(`Ara AI server is running on port ${port}.`);
});