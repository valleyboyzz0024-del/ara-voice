const express = require('express');
const app = express();

app.use(express.json());

app.post('/ara', (req, res) => {
  const { tab, item, qty, price, status } = req.body;
  if (req.body.key !== 'Bruins') return res.status(403).send('Wrong key');
  
  console.log(`Voice update: ${tab} | ${item} | ${qty}kg | $${price}/kg | ${status}`);
  // Later: this will hit your Google Sheet
  
  res.send('Added');
});

app.listen(10000, () => console.log('Ara server live'));
