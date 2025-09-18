const express = require('express');
const app = express();

app.use(express.json());

app.post('/ara', (req, res) => {
  const { tab, item, qty, price, status } = req.body;
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  console.log(`Voice update: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  // TODO: This endpoint currently only logs. To update Google Sheet, implement similar to /voice endpoint below
  
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
  
  // Google Apps Script endpoint that updates the Google Sheet
  // Script ID: AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA
  // Note: The actual Google Sheet name is configured within the Apps Script project
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

app.listen(10000, () => console.log('Ara server live'));








