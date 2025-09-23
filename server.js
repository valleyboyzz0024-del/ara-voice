import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleCommand } from './aiHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const APP_PASSWORD = process.env.APP_PASSWORD;

app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json());

const authenticate = (req, res, next) => {
  if (!APP_PASSWORD) {
    console.warn("WARNING: APP_PASSWORD is not set. The server is not secure.");
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required.' });
  }
  const providedPassword = authHeader.split(' ')[1];
  if (providedPassword !== APP_PASSWORD) {
    return res.status(403).json({ error: 'Forbidden: Invalid password.' });
  }
  next();
};

app.post('/command', authenticate, async (req, res) => {
  const { messages, isSmartMode } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'A valid message history is required' });
  }
  try {
    const result = await handleCommand(messages, isSmartMode);
    res.json(result);
  } catch (error) {
    console.error('Error processing command:', error);
    res.status(500).json({ error: 'Failed to process command', details: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}. Visit your URL to see the chat interface.`);
});
