# Ara Voice API

A Node.js Express server that processes voice transcripts and updates a Google Sheet via Google Apps Script.

## Endpoints

### POST /voice
Processes voice transcripts and updates the connected Google Sheet.

**Format**: `Ara {tab} {item} {qty} at {price} {status}`

**Example**: `Ara Hulk starburst one at 2100 owes`

### POST /ara
Direct API endpoint for updating the Google Sheet with structured data.

## Google Sheet Integration

**Google Apps Script URL**: `https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec`

**Note**: The actual Google Sheet name is not directly accessible from this code. The Google Apps Script acts as a proxy that receives the data and writes it to the configured Google Sheet. To determine the sheet name, you would need to:

1. Access the Google Apps Script project using the script ID: `AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA`
2. Check the script's configuration to see which Google Sheet it's connected to
3. Or check the Google Apps Script logs/source code

The script receives these fields:
- `tabName`: The tab/sheet within the Google Sheet
- `item`: The item name
- `qty`: Quantity
- `pricePerKg`: Price per kilogram
- `status`: Current status

## Running the Server

```bash
npm install
npm start
```

The server runs on port 10000.

## Authentication

All requests require the key `'Bruins'` in the request body.