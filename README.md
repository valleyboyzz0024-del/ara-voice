# Ara Voice - Enhanced Voice Command Processing

A Node.js server that processes voice commands and logs data to Google Sheets with support for both structured commands and natural language input.

## Features

### Two Command Formats Supported:

#### 1. Original Structured Format
```
"Ara [tab] [item] [quantity] at [price] [status]"
```
**Example:** `"Ara Hulk starburst 1 at 2100 owes"`

#### 2. Natural Language Format ✨ NEW!
```
"In the [sheetName] sheet, add a row with [item], [quantity] [unit], and [price]"
```
**Examples:**
- `"In the Purchases sheet, add a row with grass, 2 lbs, and 5 dollars"`
- `"In the inventory sheet, add a row with apples, 3.5 pounds, and $12"`
- `"in the sales sheet add a row with bananas 1.2 kg and 8 dollars"`

### Flexible Natural Language Processing

The system intelligently parses various speech-to-text variations:

- **Flexible punctuation:** Works with or without commas
- **Multiple units:** Supports lbs, pounds, kg, kilograms, grams, ounces, etc.
- **Price formats:** Handles "$12", "12 dollars", "12$", etc.
- **Case insensitive:** Works regardless of capitalization
- **Speech variations:** Handles minor speech-to-text mishearing

## API Endpoints

### POST /voice
Processes voice commands and logs to Google Sheets.

**Request Body:**
```json
{
  "key": "Bruins",
  "transcript": "In the Purchases sheet, add a row with grass, 2 lbs, and 5 dollars"
}
```

**Success Response:** `"Logged"` (200)
**Error Responses:** 
- `"Wrong key"` (403)
- `"Bad format - use either: ..."` (400)
- `"Sheet down"` (500)

### POST /ara
Direct data input endpoint (for testing/debugging).

**Request Body:**
```json
{
  "key": "Bruins",
  "tab": "Purchases",
  "item": "grass",
  "qty": 2,
  "price": 5,
  "status": "added"
}
```

## Running the Server

```bash
npm install
npm start
```

Server runs on port 10000.

## Testing Examples

### Test Natural Language Commands
```bash
# Basic natural language format
curl -X POST http://localhost:10000/voice \
  -H "Content-Type: application/json" \
  -d '{"key": "Bruins", "transcript": "In the Purchases sheet, add a row with grass, 2 lbs, and 5 dollars"}'

# With different units and formatting
curl -X POST http://localhost:10000/voice \
  -H "Content-Type: application/json" \
  -d '{"key": "Bruins", "transcript": "In the inventory sheet, add a row with apples, 3.5 kilograms, and $12"}'

# Minimal punctuation (speech-to-text style)
curl -X POST http://localhost:10000/voice \
  -H "Content-Type: application/json" \
  -d '{"key": "Bruins", "transcript": "in the sales sheet add a row with bananas 1.2 kg and 8 dollars"}'
```

### Test Original Format
```bash
curl -X POST http://localhost:10000/voice \
  -H "Content-Type: application/json" \
  -d '{"key": "Bruins", "transcript": "Ara Hulk starburst 1 at 2100 owes"}'
```

## Technical Implementation

The system uses advanced regex patterns to parse natural language:

1. **Natural Language Pattern:** Extracts sheet name, item, quantity, and price from conversational input
2. **Original Format Pattern:** Maintains backward compatibility with structured commands
3. **Intelligent Fallback:** If one pattern fails, tries the other
4. **Robust Error Handling:** Provides clear feedback for invalid formats

## JSON Output Format

Both command formats produce the same structured output for Google Sheets:

```json
{
  "tabName": "purchases",
  "item": "grass",
  "qty": 2,
  "pricePerKg": 5,
  "status": "added"
}
```

## Use Cases

Perfect for:
- **Voice-controlled inventory management**
- **Hands-free purchase logging**
- **Speech-to-text applications with flexible input**
- **Multi-format data entry systems**

## Development

The server includes console logging for debugging voice command parsing. Monitor the server output to see how commands are being interpreted.