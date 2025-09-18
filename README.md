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

### 🔐 **Enterprise-Grade Security**
- **Dual Authentication**: Bearer token + Spoken PIN fallback
- **Session Management**: 5-minute authentication timeouts
- **Resilient Network**: Automatic retry with exponential backoff
- **Production Ready**: Comprehensive error handling and logging

### 🧪 **Web Test Interface**
- **Interactive Testing**: Built-in webhook test page at root URL
- **Real-time Results**: JSON response display with syntax highlighting
- **Authentication Testing**: Test both Bearer token and PIN methods
- **Developer Friendly**: Perfect for integration testing and debugging

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
- Supports legacy "pickle prince pepsi" command format (deprecated)
- **New trigger phrase**: "people purple dance keyboard pig"
- Multiple authentication methods for flexibility
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
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec

# Port for the Node.js server
PORT=3000

# Authentication Configuration
SECRET_PHRASE=purple people dance keyboard pig      # Primary authentication method
SECRET_KEY=pickle prince pepsi                      # Legacy authentication (deprecated)
BEARER_TOKEN=your-secure-bearer-token-here         # Secondary webhook authentication  
SPOKEN_PIN=1279572380                               # PIN for voice authentication fallback

# Request Configuration
REQUEST_TIMEOUT=10000                            # Timeout for Google Apps Script requests

# OpenAI API Configuration (Optional - uses mock AI if not provided)
OPENAI_API_KEY=your_openai_api_key_here
```

**Important Security Notes:**
- Replace `SECRET_PHRASE` with your own secure phrase for primary authentication
- Replace `BEARER_TOKEN` with a secure, randomly generated token
- Change `SPOKEN_PIN` to a memorable but secure numeric PIN
- Keep these credentials secure and never commit them to version control

### 4. Start the Application

```bash
npm start
```

The server will start on `http://localhost:3000`

## 🔧 API Endpoints

### 🆕 `POST /webhook/voice` (Webhook with Authentication)
Secure webhook endpoint for voice commands with Bearer token and PIN authentication.

**Authentication Methods:**
1. **Bearer Token** (Primary): Include `Authorization: Bearer your-token` header
2. **Spoken PIN** (Backup): Start command with PIN followed by voice command

**Request with Bearer Token:**
```json
{
  "command": "people purple dance keyboard pig groceries apples 2.5 at 1200 pending"
}
```
**Headers:**
```
Authorization: Bearer your-secure-bearer-token
Content-Type: application/json
```

**Request with Spoken PIN:**
```json
{
  "command": "1234 people purple dance keyboard pig groceries apples 2.5 at 1200 pending"
}
```

**Success Response:**
```json
{
  "status": "success",
  "message": "Command processed successfully via webhook",
  "authMethod": "Bearer token",
  "data": {
    "parsed": {
      "tab": "groceries",
      "item": "apples",
      "qty": 2.5,
      "price": 1200,
      "status": "pending"
    },
    "sheets_response": {...}
  }
}
```

### 🆕 `POST /voice-command` (Conversational AI)
Main endpoint for natural language voice commands.

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
  "command": "people purple dance keyboard pig groceries apples 2.5 at 1200 owes"
}
```

### 📋 Other Endpoints
- `POST /webhook/voice` - Secure webhook with Bearer token/PIN authentication
- `GET /health` - Health check
- `GET /config` - Configuration status

## 🔐 Webhook Authentication

The `/webhook/voice` endpoint supports three authentication methods with the following priority order:

### 🔑 Secret Phrase Authentication (Primary)

The most secure and convenient method. Simply include the secret phrase as your command:

```bash
curl -X POST http://localhost:3000/webhook/voice \
  -H "Content-Type: application/json" \
  -d '{"command": "purple people dance keyboard pig"}'
```

**Response:**
```json
{
  "status": "success",
  "message": "Command would be processed",
  "authMethod": "Secret phrase"
}
```

### 🎫 Bearer Token Authentication (Secondary)

Perfect for automated systems, IFTTT, Zapier, and API integrations:

```bash
curl -X POST http://localhost:3000/webhook/voice \
  -H "Authorization: Bearer your-secure-bearer-token" \
  -H "Content-Type: application/json" \
  -d '{"command": "people purple dance keyboard pig groceries milk 2 at 300 pending"}'
```

### 🗣️ Spoken-PIN Fallback

Ideal for voice assistants when other methods aren't easily configurable:

1. **PIN Authentication**: Send PIN command first
```json
{
  "command": "pin is 1279572380"
}
```

2. **Follow-up Command**: Session remains authenticated for 5 minutes
```json
{
  "command": "people purple dance keyboard pig groceries bread 1 at 200 owes"
}
```

**Alternative**: Include PIN directly in command
```json
{
  "command": "pin is 1279572380 people purple dance keyboard pig groceries eggs 12 at 400 pending"
}
```

## 🧪 Web Test Page

Access the interactive webhook test interface at `http://localhost:3000`:

### Features:
- **🎯 Real-time Testing**: Test webhook endpoints instantly
- **🔐 Authentication Testing**: Try secret phrase, Bearer token, and PIN methods
- **📊 JSON Response Display**: Beautiful syntax-highlighted responses
- **🔄 Quick Commands**: Pre-filled example commands for fast testing
- **🛠️ Developer Tools**: Perfect for debugging and integration

### Usage:
1. Start the server: `npm start`
2. Open `http://localhost:3000` in your browser
3. Test secret phrase, Bearer token, or PIN authentication
4. View real-time JSON responses

## 📱 Voice Assistant Integration

### 🍎 Siri Shortcuts Integration

Create a Siri Shortcut to send voice commands:

1. **Open Shortcuts App** → Create new shortcut
2. **Add Action** → "Get Contents of URL"
3. **Configure Request**:
   - **URL**: `http://your-server.com/webhook/voice`
   - **Method**: POST
   - **Headers**: `Authorization: Bearer your-token`
   - **Request Body**: 
   ```json
   {
     "command": "[Spoken Text from Siri]"
   }
   ```
4. **Add Voice Trigger**: "Add to grocery list"
5. **Test**: "Hey Siri, add to grocery list" → speak your command

### 🤖 Google Assistant via IFTTT

Set up Google Assistant integration using IFTTT:

1. **Create IFTTT Account** → New Applet
2. **If This**: Google Assistant
   - **Trigger**: "Say a phrase with a text ingredient"
   - **Phrase**: "Add $ to my grocery list"
3. **Then That**: Webhooks
   - **URL**: `http://your-server.com/webhook/voice`
   - **Method**: POST
   - **Content Type**: `application/json`
   - **Body**: 
   ```json
   {
     "command": "people purple dance keyboard pig groceries {{TextField}} 1 at 100 pending"
   }
   ```
4. **Headers**: `Authorization|||Bearer your-secure-token`
5. **Test**: "Hey Google, add apples to my grocery list"

### 🔊 Amazon Alexa Integration

Use Alexa Skills Kit or webhooks service:

1. **Alexa Developer Console** → Create Custom Skill
2. **Invocation Name**: "grocery manager"
3. **Intent**: AddItemIntent
4. **Sample Utterances**: "add {item} to my list"
5. **Endpoint**: HTTPS webhook to your `/webhook/voice` endpoint
6. **Test**: "Alexa, tell grocery manager to add bananas to my list"

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
- `SECRET_PHRASE`: Primary authentication phrase (default: "purple people dance keyboard pig")
- `SECRET_KEY`: Legacy authentication key (default: "pickle prince pepsi")
- `BEARER_TOKEN`: Secure token for webhook authentication
- `SPOKEN_PIN`: Numeric PIN for voice authentication fallback (default: "1279572380")

## 🧪 Testing

### Testing Google Apps Script

Test your Google Apps Script deployment directly:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"addRow","tabName":"test","item":"apple","qty":1,"pricePerKg":100,"status":"owes"}' \
  YOUR_GOOGLE_APPS_SCRIPT_URL
```

### Testing Conversational AI

Test the voice command endpoint:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"command":"add 2 kilos of bananas to grocery list"}' \
  http://localhost:3000/voice-command
```

### Testing Webhook Authentication

Test Bearer token authentication:

```bash
curl -X POST \
  -H "Authorization: Bearer test-bearer-token" \
  -H "Content-Type: application/json" \
  -d '{"command":"people purple dance keyboard pig groceries apples 2.5 at 1200 pending"}' \
  http://localhost:3000/webhook/voice
```

Test PIN authentication:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"command":"pin is 1279572380"}' \
  http://localhost:3000/webhook/voice
```

### Running Jest Test Suite

The application includes a comprehensive test suite with 35 tests covering:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test auth.test.js
npm test commands.test.js
```

**Test Coverage:**
- ✅ **Authentication Tests**: Bearer token, PIN, and legacy auth validation
- ✅ **Command Parsing Tests**: Voice command parsing with edge cases
- ✅ **Webhook Endpoint Tests**: End-to-end authentication and response testing
- ✅ **Utility Function Tests**: Individual function validation
- ✅ **Edge Case Testing**: Null, empty, invalid input handling

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
