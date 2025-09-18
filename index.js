const express = require('express');
const app = express();

app.use(express.json());

// Function to parse natural language voice commands
function parseNaturalLanguage(transcript) {
  const text = transcript.toLowerCase();
  console.log(`Parsing transcript: "${text}"`);
  
  // Pattern 1: "In the [sheet] sheet, add a row with [item], [quantity], and [price]"
  // More flexible pattern to handle various speech-to-text variations
  const naturalPattern = /in the (.+?)\s+sheet[,\s]*add a row with (.+?)[,\s]+([\d.]+)\s*(?:lbs?|pounds?|lb|kg|kilograms?|grams?|g|ounces?|oz)?[,\s]*(?:and\s+)?(?:\$)?([\d.]+)(?:\s*dollars?|\$)?/i;
  const naturalMatch = text.match(naturalPattern);
  
  if (naturalMatch) {
    const [, sheetName, item, quantity, price] = naturalMatch;
    const parsedData = {
      tabName: sheetName.trim(),
      item: item.trim(),
      qty: parseFloat(quantity),
      pricePerKg: parseFloat(price),
      status: 'added' // Default status for natural language commands
    };
    console.log('Parsed natural language:', parsedData);
    return parsedData;
  }
  
  // Pattern 2: Original format "Ara [tab] [item] [qty] at [price] [status]"
  const words = text.split(' ');
  if (words[0] === 'ara' && words.length >= 6) {
    const tab = words[1];
    const item = words[2];
    const qty = parseFloat(words[3]);
    const price = parseInt(words[5]);
    const status = words[6];
    
    if (tab && item && !isNaN(qty) && !isNaN(price) && status) {
      const parsedData = {
        tabName: tab,
        item,
        qty,
        pricePerKg: price,
        status
      };
      console.log('Parsed original format:', parsedData);
      return parsedData;
    }
  }
  
  console.log('No valid pattern matched');
  return null;
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
  
  const parsedData = parseNaturalLanguage(req.body.transcript);
  
  if (!parsedData) {
    return res.status(400).send('Bad format - use either: "Ara Hulk starburst one at 2100 owes" or "In the Purchases sheet, add a row with grass, 2 lbs, and 5 dollars"');
  }
  
  const { tabName, item, qty, pricePerKg, status } = parsedData;
  
  fetch('https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tabName,
      item,
      qty,
      pricePerKg,
      status
    })
  })
  .then(() => res.send('Logged'))
  .catch(() => res.status(500).send('Sheet down'));
});

app.listen(10000, () => console.log('Ara server live'));