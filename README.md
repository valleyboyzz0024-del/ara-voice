# Ara Voice API

A voice-to-inventory tracking API that processes spoken commands and logs them to Google Sheets.

## API Endpoints

### POST `/voice`

Processes voice transcripts and extracts inventory information.

**URL:** `https://ara-voice.onrender.com/voice`

**Authentication:** Requires `key: "Bruins"` in request body

**Expected transcript format:** `"Ara [tab] [item] [quantity] at [price] [status]"`

**Example:** `"Ara Hulk starburst 1 at 2100 owes"`

**Note:** Quantity must be a number (1, 2, 1.5), not words (one, two, etc.)

## Testing the API

### Using ReqBin.com (Recommended)

1. Open https://reqbin.com on your phone or browser
2. Click **POST** method
3. Enter URL: `https://ara-voice.onrender.com/voice`
4. Click **Headers** tab, add:
   - `Content-Type` = `application/json`
5. Click **Body** tab and enter:

```json
{
  "key": "Bruins",
  "transcript": "Ara Hulk starburst 1 at 2100 owes"
}
```

### Example Requests

#### Valid Request:
```json
{
  "key": "Bruins",
  "transcript": "Ara Hulk starburst 2 at 1500 paid"
}
```

**Response:** `500 Internal Server Error` - `"Sheet down"` (when Google Sheets API is unavailable)

#### Invalid Authentication:
```json
{
  "key": "WrongKey",
  "transcript": "Ara Hulk starburst 1 at 2100 owes"
}
```

**Response:** `403 Forbidden` - `"Wrong key"`

#### Invalid Format:
```json
{
  "key": "Bruins",
  "transcript": "Invalid format"
}
```

**Response:** `400 Bad Request` - `"Bad format - use: Ara Hulk starburst one at 2100 owes"`

**Note:** The error message still shows "one" but the API actually expects numeric values.

## Transcript Parsing

The API parses transcripts using this pattern:
- `words[0]` = "Ara" (command prefix)
- `words[1]` = Tab name (e.g., "Hulk")
- `words[2]` = Item name (e.g., "starburst")
- `words[3]` = Quantity as number (e.g., "1", "2.5")
- `words[4]` = "at" (separator)
- `words[5]` = Price per kg as integer (e.g., "2100")
- `words[6]` = Status (e.g., "owes", "paid")

## Development

### Installation
```bash
npm install
```

### Running Locally
```bash
npm start
```

Server runs on port 10000: http://localhost:10000

### Alternative Endpoint

There's also a `/ara` endpoint for direct inventory updates without transcript parsing:

```json
{
  "key": "Bruins",
  "tab": "Hulk",
  "item": "starburst",
  "qty": 1.0,
  "price": 2100,
  "status": "owes"
}
```