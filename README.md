# Ara Voice API

A simple Express.js API for processing voice transcripts and managing inventory data.

## Installation

```bash
npm install
npm start
```

The server runs on port 10000.

## Endpoints

### POST /ara
Direct inventory update endpoint.

**Request:**
```json
{
  "key": "Bruins",
  "tab": "Hulk",
  "item": "starburst", 
  "qty": 1,
  "price": 2100,
  "status": "owes"
}
```

### POST /voice
Voice transcript processing endpoint. Converts spoken numbers to numeric values.

**Request:**
```json
{
  "key": "Bruins",
  "transcript": "Ara Hulk starburst one at 2100 owes"
}
```

**Supported transcript format:**
`Ara [tab] [item] [quantity] at [price] [status]`

**Supported quantity words:**
- Numbers: zero, one, two, three, four, five, six, seven, eight, nine, ten
- Teens: eleven through nineteen
- Twenty
- Decimal numbers: 1.5, 2.75, etc.

## Authentication

Both endpoints require the key "Bruins" in the request body.

## Examples

```bash
# Direct API call
curl -X POST http://localhost:10000/ara \
  -H "Content-Type: application/json" \
  -d '{"key": "Bruins", "tab": "Hulk", "item": "starburst", "qty": 1, "price": 2100, "status": "owes"}'

# Voice transcript 
curl -X POST http://localhost:10000/voice \
  -H "Content-Type: application/json" \
  -d '{"key": "Bruins", "transcript": "Ara Hulk starburst five at 3000 paid"}'
```