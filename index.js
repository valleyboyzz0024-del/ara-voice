const express = require('express');
const app = express();

app.use(express.json());

// Helper function to convert text numbers to numeric values
function textToNumber(text) {
  const textNumbers = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
  };
  
  const lower = text.toLowerCase();
  if (textNumbers.hasOwnProperty(lower)) {
    return textNumbers[lower];
  }
  
  // Try to parse as a regular number
  const num = parseFloat(text);
  return isNaN(num) ? null : num;
}

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
  const qty = textToNumber(words[3]);
  const price = parseInt(words[5]);
  const status = words[6];
  
  if (!tab || !item || qty === null || isNaN(price)) {
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

app.listen(10000, () => console.log('Ara server live'));








