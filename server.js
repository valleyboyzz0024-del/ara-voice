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
app.use(express.urlencoded({ extended: true })); // For parsing login form data
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
    res.redirect('/'); // If not logged in, send to login page
};

// --- ROUTES ---

// 1. Serve the login page at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 2. Handle the password submission from the login form
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.APP_PASSWORD) {
        req.session.isAuthenticated = true; // Set session cookie
        res.redirect('/chat');
    } else {
        res.redirect('/'); // Failed login
    }
});

// 3. Serve the chat page, but only if authenticated
app.get('/chat', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// 4. Handle API commands, but only if authenticated
app.post('/command', isAuthenticated, async (req, res) => {
    try {
        // We no longer need the password in the body because the session confirms authentication
        const { messages, smartMode } = req.body;
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