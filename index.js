const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static("public"));

app.post('/ara', (req, res) => {
  const { tab, item, qty, price, status } = req.body;
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  console.log(`Voice update: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  // Later: this will hit your Google Sheet
  
  res.send('Added');
});

app.post('/voice', (req, res) => {
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  const words = req.body.transcript.toLowerCase().split(' ');
  const tab = words[1];
  const item = words[2];
  const qty = parseFloat(words[3]);
  const price = parseInt(words[5]);
  const status = words[6];
  
  if (!tab || !item || isNaN(qty) || isNaN(price)) {
    return res.status(400).send('Bad format - use: Ara Hulk starburst one at 2100 owes');
  }
  
  fetch('https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tabName: tab,
      item,
      qty,
      pricePerKg: price,
      status
    })
  })
  .then(() => res.send('Logged'))
  .catch(() => res.status(500).send('Sheet down'));
});

app.post('/process-command', (req, res) => {
  console.log('Received command:', req.body.command);
  
  const commandText = req.body.command.toLowerCase();
  const words = commandText.split(' ');
  
  // Expected format: "ara [tab] [item] [qty] at [price] [status]"
  if (words[0] !== 'ara' || words.length < 6) {
    return res.json({ 
      status: 'error', 
      message: 'Bad format - use: Ara Hulk starburst one at 2100 owes' 
    });
  }
  
  const tab = words[1];
  const item = words[2];
  const qty = parseFloat(words[3]);
  const price = parseInt(words[5]);
  const status = words[6];
  
  if (!tab || !item || isNaN(qty) || isNaN(price)) {
    return res.json({ 
      status: 'error', 
      message: 'Bad format - use: Ara Hulk starburst one at 2100 owes' 
    });
  }
  
  console.log(`Processing voice command: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  
  fetch('https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tabName: tab,
      item,
      qty,
      pricePerKg: price,
      status
    })
  })
  .then(() => {
    console.log('Successfully logged to Google Sheets');
    res.json({ status: 'success', message: 'Command processed successfully' });
  })
  .catch((error) => {
    console.error('Failed to log to Google Sheets:', error);
    res.json({ status: 'error', message: 'Sheet service unavailable' });
  });
});

app.listen(10000, () => console.log('Ara server live'));








