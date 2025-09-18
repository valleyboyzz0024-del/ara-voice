# 🎤 Ara Voice - The Google Sheets God

**Transform your voice into powerful Google Sheets operations with conversational AI!**

Ara Voice is an intelligent voice-to-Google-Sheets application that understands natural conversation and can perform any requested action in Google Sheets. Speak naturally, and watch as your commands are intelligently processed and executed.

## 🚀 Features

### 🧠 **Conversational AI Brain**
- **Natural Language Processing**: Speak normally - "add 5 kilos of bananas to my grocery list"
- **Context Awareness**: Remembers conversation history for follow-up commands
- **Intelligent Interpretation**: Infers missing details and provides reasonable defaults
- **Multi-Action Support**: Handles complex operations beyond simple data entry

### 📊 **Google Sheets God Mode**
- **addRow**: Add items with smart defaults
- **updateRow**: Modify existing entries by row number
- **deleteRow**: Remove items by position ("delete the last item")
- **findRow**: Search and locate specific entries
- **readSheet**: View entire sheet contents
- **createSheet**: Generate new tabs/worksheets
- **formatCell**: Apply styling and formatting

### 🎯 **Smart Command Examples**
```
"Add 2 kilos of apples to my grocery list"
"Delete the last item I added"
"Show me my shopping list" 
"Create a new sheet for work projects"
"Update row 3 with bananas instead"
"Find all entries with 'fruit'"
```

### 🔄 **Backwards Compatible**
- Supports legacy "pickle prince pepsi" command format
- Existing voice recognition interface works unchanged
- Gradual migration path for existing users

## ��️ Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- A Google account with access to Google Drive and Google Sheets
- Optional: OpenAI API key for enhanced AI (uses mock AI if not provided)

### 1. Clone and Install

```bash
git clone https://github.com/valleyboyzz0024-del/ara-voice.git
cd ara-voice
npm install
```

### 2. Configure Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project named "Voice Sheets God"
3. Replace the default `Code.gs` content with the provided `Code.gs` file
4. Create an `appsscript.json` file with the provided content
5. Deploy as a Web App:
   - Click "Deploy" → "New Deployment"
   - Choose "Web app" as the type
   - Set execute as "Me" and access to "Anyone"
   - Copy the generated URL

### 3. Environment Configuration

The `.env` file is already created with the correct Google Apps Script URL. Update it if needed:

```env
# Google Apps Script Web App URL
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzN07Imi1MgdHo11qmE2JHcOG-lsJ162CP3DMdiRPdrELmIUbs8ApF6VD3mNQSNI_u-yA/exec

# Port for the Node.js server
PORT=3000

# OpenAI API Configuration (Optional - uses mock AI if not provided)
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Start the Application

```bash
npm start
```

The server will start on `http://localhost:3000`

## 🔧 API Endpoints

### 🔐 `POST /webhook/voice` (Secure Webhook)
**New secure webhook endpoint with multiple authentication methods for external integrations.**

**Authentication Methods:**
- **Bearer Token**: Include `Authorization: Bearer your_token` header
- **Wake Phrase**: Include wake phrase at start of command (e.g., "pickle prince pepsi add items")
- **Spoken PIN**: Include PIN in command (e.g., "pin 1234 add items" or "pin one two three four add items")

**Request:**
```json
{
  "command": "pickle prince pepsi add 2 apples to shopping list",
  "sessionId": "optional-session-id"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Voice command processed successfully",
  "authMethod": "wake_phrase",
  "data": {
    "original_command": "pickle prince pepsi add 2 apples to shopping list",
    "clean_command": "add 2 apples to shopping list",
    "interpreted_action": { "action": "addRow", "tabName": "groceries", ... },
    "sheets_response": { "status": "success", ... }
  }
}
```

**Response (Auth Failed):**
```json
{
  "status": "error",
  "message": "Authentication failed",
  "code": "AUTH_FAILED",
  "details": ["Wake phrase not detected", "Invalid Bearer token"],
  "supportedMethods": ["Bearer token in Authorization header", "Wake phrase", "Spoken PIN"]
}
```

### 🆕 `POST /voice-command` (Conversational AI)
Main endpoint for natural language voice commands with optional authentication support.

**Request:**
```json
{
  "command": "add 2 kilos of apples to my grocery list",
  "sessionId": "user123"
}
```

**Success Response:**
```json
{
  "status": "success",
  "message": "Command processed successfully",
  "data": {
    "original_command": "add 2 kilos of apples to my grocery list",
    "interpreted_action": {
      "action": "addRow",
      "tabName": "groceries",
      "item": "apples",
      "qty": 2,
      "pricePerKg": 1000,
      "status": "pending"
    },
    "sheets_response": {
      "status": "success",
      "message": "Added \"apples\" to groceries"
    }
  }
}
```

### 📜 `POST /process-command` (Legacy)
Backwards compatible endpoint for structured commands.

**Request:**
```json
{
  "command": "pickle prince pepsi groceries apples 2.5 at 1200 owes"
}
```

### 📋 Other Endpoints
- `GET /health` - Health check
- `GET /config` - Configuration status

## 🎯 Command Examples

### Adding Items
```
"Add 3 kilos of oranges to grocery list"
"Put 1.5kg of chicken in my shopping"
"Add bananas, about 2 kilos to groceries"
```

### Managing Data
```
"Delete the last item I added"
"Remove row 5 from groceries"
"Update the third item to be tomatoes"
```

### Reading Information
```
"What's on my grocery list?"
"Show me all my shopping items"
"Find anything with 'apple' in groceries"
```

### Sheet Management
```
"Create a new sheet for work expenses"
"Make a new tab called 'home projects'"
```

## 🏗️ Google Apps Script Functions

The enhanced Google Apps Script supports these operations:

| Function | Description | Example Usage |
|----------|-------------|---------------|
| `addRowToSheet()` | Add new items | Adding groceries, expenses |
| `updateRowInSheet()` | Modify existing rows | Changing quantities, prices |
| `deleteRowFromSheet()` | Remove rows | Deleting mistakes, old items |
| `findRowInSheet()` | Search functionality | Finding specific items |
| `readSheetContents()` | View entire sheets | Getting shopping lists |
| `createNewSheet()` | Create new tabs | Organizing by category |
| `formatCellRange()` | Style cells | Highlighting important data |

## 🚀 Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add your `.env` variables

### Environment Variables for Production

Set these environment variables in your deployment platform:

- `GOOGLE_APPS_SCRIPT_URL`: Your deployed Google Apps Script Web App URL
- `PORT`: Server port (usually set automatically by hosting platforms)
- `OPENAI_API_KEY`: Optional - OpenAI API key for enhanced AI processing

**New Authentication Variables:**
- `BEARER_TOKEN`: Token for webhook Bearer authentication (default: 'your_bearer_token_here')
- `WAKE_PHRASE`: Wake phrase for voice activation (default: 'pickle prince pepsi')
- `BACKUP_PIN`: Numeric PIN for spoken authentication (default: '1234')
- `REQUIRE_WAKE_PHRASE`: Require wake phrase for /voice-command endpoint (default: false)
- `ENABLE_PIN_FALLBACK`: Enable spoken PIN authentication (default: true)

## 🧪 Testing

### Testing Google Apps Script

Test your Google Apps Script deployment directly:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"addRow","tabName":"test","item":"apple","qty":1,"pricePerKg":100,"status":"owes"}' \
  YOUR_GOOGLE_APPS_SCRIPT_URL
```

### Testing Webhook Authentication

Test the secure webhook endpoint with different authentication methods:

```bash
# Test with Bearer token
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token_here" \
  -d '{"command":"add 2 bananas to shopping list"}' \
  http://localhost:3000/webhook/voice

# Test with wake phrase
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"command":"pickle prince pepsi add 2 bananas to shopping list"}' \
  http://localhost:3000/webhook/voice

# Test with spoken PIN
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"command":"pin 1234 add 2 bananas to shopping list"}' \
  http://localhost:3000/webhook/voice
```

**Interactive Testing:**
Visit `/webhook-test.html` in your browser for a comprehensive authentication testing interface.

### Testing Conversational AI

Test the voice command endpoint:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"command":"add 2 kilos of bananas to grocery list"}' \
  http://localhost:3000/voice-command
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Server Won't Start
**Symptoms**: "GOOGLE_APPS_SCRIPT_URL environment variable is required"  
**Solution**: Ensure `.env` file exists with correct URL

#### 2. AI Commands Not Working
**Symptoms**: Commands not understood  
**Solutions**:
- Check if OpenAI API key is valid (or rely on mock AI)  
- Verify server logs for processing details
- Try simpler, more direct commands

#### 3. Google Sheets Not Updating
**Debugging Steps**:
1. Check Google Apps Script logs in the Apps Script editor
2. Verify Web App permissions (execute as "Me", access "Anyone")
3. Test the Web App URL directly
4. Check server logs for detailed error messages

#### 4. Conversational Context Issues
**Solutions**:
- Include `sessionId` in requests for conversation continuity
- Clear context by restarting server or using new sessionId
- Check server memory usage for context storage

## 🎨 Frontend Integration

The enhanced backend is compatible with the existing frontend. The voice recognition interface will automatically benefit from conversational AI processing.

To use conversational commands in your frontend:

```javascript
// New conversational endpoint
fetch('/voice-command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: transcript, // Natural language
    sessionId: userSession // For context
  })
});
```

## 🔮 Advanced Features

### Session Management
- Each user can have their own conversation context
- Commands can reference previous actions
- "Delete what I just added" works across sessions

### AI Fallback
- Uses OpenAI GPT-3.5-turbo when API key provided
- Falls back to pattern-matching mock AI
- Graceful degradation ensures always-working functionality

### Action Routing
- Google Apps Script intelligently routes based on action type
- Extensible architecture for new sheet operations
- Backwards compatible with legacy formats

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add conversational AI patterns or new sheet operations
4. Test thoroughly with both AI modes
5. Submit a pull request

---

**Ara Voice: Where conversation meets spreadsheet mastery! 🎤📊**
