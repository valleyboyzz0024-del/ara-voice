const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static("public"));

app.post('/ara', (req, res) => {
  const { tab, item, qty, price, status } = req.body;
  if (req.body.key !== 'pickle prince pepsi') return res.status(403).send('Wrong key');
  
  console.log(`Voice update: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  // Later: this will hit your Google Sheet
  
  res.send('Added');
});

app.post('/voice', (req, res) => {
  if (req.body.key !== 'pickle prince pepsi') return res.status(403).send('Wrong key');
  
  const words = req.body.transcript.toLowerCase().split(' ');
  const tab = words[1];
  const item = words[2];
  const qty = parseFloat(words[3]);
  const price = parseInt(words[5]);
  const status = words[6];
  
  if (!tab || !item || isNaN(qty) || isNaN(price)) {
    return res.status(400).send('Bad format - use: pickle prince pepsi Hulk starburst one at 2100 owes');
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
  
  if (!req.body.command) {
    return res.status(400).json({ status: 'error', message: 'No command provided' });
  }
  
  const words = req.body.command.toLowerCase().split(' ');
  console.log('Parsed words:', words);
  
  // Expected format: "pickle prince pepsi [tab] [item] [qty] at [price] [status]"
  if (words.length < 8 || words[0] !== 'pickle' || words[1] !== 'prince' || words[2] !== 'pepsi') {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Bad format - use: pickle prince pepsi [tab] [item] [qty] at [price] [status]' 
    });
  }
  
  const tab = words[3];
  const item = words[4];
  const qty = parseFloat(words[5]);
  const price = parseInt(words[7]);
  const status = words[8];
  
  if (!tab || !item || isNaN(qty) || isNaN(price)) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Invalid values - check tab, item, quantity, and price' 
    });
  }
  
  console.log(`Processing: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  
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
    console.log('Successfully sent to Google Sheets');
    res.json({ status: 'success', message: 'Command processed successfully' });
  })
  .catch((error) => {
    console.error('Error sending to Google Sheets:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update Google Sheets' });
  });
});

app.listen(10000, () => console.log('Ara server live'));








