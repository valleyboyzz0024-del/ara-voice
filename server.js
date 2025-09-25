const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the web-build directory
app.use(express.static(path.join(__dirname, 'web-build')));

// Handle all routes by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});