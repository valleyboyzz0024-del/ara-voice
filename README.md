# Ara Voice - Voice to Google Sheets Application

A voice-to-Google-Sheets application that allows users to speak commands which are transcribed, processed using AI, and automatically updated in Google Sheets.

## Architecture

**Frontend (index.html)** → **Backend (server.js)** → **Gemini AI** → **Google Apps Script** → **Google Sheets**

### Data Flow
1. **Frontend**: Captures user voice using Browser Speech Recognition API and transcribes to text
2. **Backend**: Receives transcribed text via POST to `/process-command` endpoint
3. **Gemini AI**: Converts natural language to structured JSON command payload
4. **Google Apps Script**: Receives JSON payload and executes commands on Google Sheets

## Components

### 1. Frontend (index.html)
- HTML5 Speech Recognition API integration
- Real-time voice transcription
- Manual text input fallback
- Status feedback and error handling
- Responsive design

### 2. Backend (server.js)
- Express.js server
- Gemini AI API integration for natural language processing
- Google Apps Script communication
- Environment variable configuration
- Comprehensive error handling and logging

### 3. Google Apps Script (Code.gs)
- Handles CRUD operations on Google Sheets
- Validates incoming JSON payloads
- Supports multiple sheet tabs
- Automatic sheet creation and formatting
- Legacy format compatibility

## Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- Google Cloud Platform account (for Gemini API)
- Google account (for Apps Script and Sheets)

### 1. Backend Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in your deployment platform (Render, Heroku, etc.):
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   APPS_SCRIPT_URL=your_deployed_apps_script_url_here
   ```

4. Deploy to your hosting platform (Render recommended)

### 2. Google Apps Script Setup

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Replace the default code with the contents of `Code.gs`
4. Update the `SPREADSHEET_ID` constant with your Google Sheets ID
5. Deploy as a Web App:
   - **Execute as**: Me (your Google account)
   - **Who has access**: Anyone
6. Copy the deployment URL and set it as `APPS_SCRIPT_URL` environment variable

### 3. Google Sheets Setup

1. Create a new Google Spreadsheet
2. Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
3. Update the `SPREADSHEET_ID` in your `Code.gs` file
4. The script will automatically create sheets and headers as needed

### 4. Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Set it as the `GEMINI_API_KEY` environment variable

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini AI API key | Yes |
| `APPS_SCRIPT_URL` | Deployed Google Apps Script web app URL | Yes |
| `PORT` | Server port (default: 10000) | No |

## Usage

### Voice Commands
Speak natural language commands like:
- "Add 5 units of apples at $2.50 each to inventory"
- "Update bananas quantity to 10 in fruits tab"
- "Remove oranges from the produce sheet"

### Manual Input
Use the manual input field as a fallback for text-based commands.

### API Endpoints

#### `POST /process-command`
Main endpoint for processing voice commands.

**Request Body**:
```json
{
  "transcript": "Add 5 apples at $2 each to inventory",
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

#### `GET /health`
Health check endpoint showing server status and configuration.

#### Legacy Endpoints
- `POST /ara` - Legacy structured command endpoint
- `POST /voice` - Legacy voice processing endpoint

## Troubleshooting

### Common Issues

1. **"Server configuration error: Missing Gemini API key"**
   - Ensure `GEMINI_API_KEY` environment variable is set
   - Verify the API key is valid and has necessary permissions

2. **"Apps Script error: HTTP 403"**
   - Check Apps Script deployment permissions
   - Ensure "Who has access" is set to "Anyone"
   - Verify the Apps Script URL is correct

3. **"Speech recognition not supported"**
   - Use Chrome, Edge, or Safari browsers
   - Ensure HTTPS connection (required for Speech API)
   - Check microphone permissions

4. **"Invalid JSON payload"**
   - Check Gemini API response format
   - Verify the natural language processing is working correctly

### Debugging

1. Check server logs for detailed error messages
2. Use `/health` endpoint to verify configuration
3. Test individual components separately
4. Use Apps Script editor logs for debugging sheet operations

## Development

### Local Development
```bash
# Set environment variables
export GEMINI_API_KEY=your_key_here
export APPS_SCRIPT_URL=your_url_here

# Start the server
npm run dev
```

### Testing
- Use the manual input field for testing without voice recognition
- Check browser console for frontend errors
- Monitor server logs for backend debugging
- Use Apps Script execution logs for Google Sheets debugging

## Deployment

### Render Deployment
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy with Node.js build environment
4. Use `npm start` as the start command

### Other Platforms
The application can be deployed to any Node.js hosting platform (Heroku, Railway, etc.) with proper environment variable configuration.

## Security Notes

- Apps Script deployment is set to "Anyone" for access - consider security implications
- API keys should be kept secure and not committed to version control
- Consider implementing rate limiting for production use
- Validate and sanitize all inputs in production environments

## License

MIT License - see LICENSE file for details