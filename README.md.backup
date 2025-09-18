# 🎤 Voice-to-Google-Sheets Application

A modern full-stack application that converts voice commands into Google Sheets data using speech recognition, Node.js backend, and Google Apps Script integration.

![Voice Controller Interface](https://github.com/user-attachments/assets/2b1c5e53-d115-44bf-b135-d6f45bf1b561)

## 🚀 Features

- **Voice Recognition**: Uses Web Speech API for real-time voice command processing
- **Smart Parsing**: Intelligently parses natural language commands into structured data
- **Google Sheets Integration**: Automatically updates Google Sheets via Google Apps Script
- **Modern UI**: Responsive design with visual feedback and error handling
- **Robust Error Handling**: Comprehensive error messages and retry mechanisms
- **Production Ready**: Structured code with configuration management and logging

## 🏗️ Architecture

```
Frontend (HTML/JS)          Backend (Node.js)          Google Apps Script
    ┌─────────────┐            ┌─────────────┐             ┌─────────────┐
    │ Speech API  │   POST     │   Express   │    POST     │  Web App    │
    │ Recognition │  ──────→   │   Server    │  ──────→    │   Script    │
    │             │            │             │             │             │
    └─────────────┘            └─────────────┘             └─────────────┘
                                       │                           │
                                       ▼                           ▼
                                 ┌─────────────┐             ┌─────────────┐
                                 │    Config   │             │   Google    │
                                 │ Management  │             │   Sheets    │
                                 └─────────────┘             └─────────────┘
```

## 📝 Command Format

The application expects voice commands in this specific format:

```
pickle prince pepsi [tab] [item] [quantity] at [price] [status]
```

### Examples:
- `"pickle prince pepsi groceries apples 2.5 at 1200 owes"`
- `"pickle prince pepsi inventory bananas 1.0 at 800 paid"`
- `"pickle prince pepsi expenses coffee 0.5 at 1500 pending"`

### Parameters:
- **tab**: The Google Sheets tab/worksheet name
- **item**: The item name
- **quantity**: Quantity in kilograms (decimal numbers supported)
- **price**: Price per kilogram in cents/smallest currency unit
- **status**: Status of the transaction (e.g., "owes", "paid", "pending")

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- A Google account with access to Google Drive and Google Sheets
- A modern web browser with Speech Recognition support (Chrome recommended)

### 1. Clone and Install

```bash
git clone https://github.com/valleyboyzz0024-del/ara-voice.git
cd ara-voice
npm install
```

### 2. Configure Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Replace the default `Code.gs` content with the provided `Code.gs` file
4. Create an `appsscript.json` file with the provided content
5. Deploy as a Web App:
   - Click "Deploy" → "New Deployment"
   - Choose "Web app" as the type
   - Set execute as "Me" and access to "Anyone"
   - Copy the generated URL

### 3. Environment Configuration

Create a `.env` file in the project root (use `.env.example` as a template):

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
PORT=10000
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
SECRET_KEY=pickle prince pepsi
REQUEST_TIMEOUT=10000
LOG_LEVEL=info
```

### 4. Start the Application

```bash
npm start
```

The server will start on `http://localhost:10000`

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
- `SECRET_KEY`: Authentication key for the voice commands
- `PORT`: Server port (usually set automatically by hosting platforms)
- `REQUEST_TIMEOUT`: Timeout for Google Apps Script requests (default: 10000ms)
- `LOG_LEVEL`: Logging level (default: info)

## 🔧 API Endpoints

### `POST /process-command`
Main endpoint for processing voice commands.

**Request:**
```json
{
  "command": "pickle prince pepsi groceries apples 2.5 at 1200 owes"
}
```

**Success Response:**
```json
{
  "status": "success",
  "message": "Command processed successfully",
  "data": {
    "tab": "groceries",
    "item": "apples",
    "qty": 2.5,
    "pricePerKg": 1200,
    "status": "owes",
    "total": 3000
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Bad format - use: pickle prince pepsi [tab] [item] [qty] at [price] [status]"
}
```

### `GET /health`
Health check endpoint for monitoring.

### `GET /config`
Returns current configuration (for debugging).

## 🐛 Troubleshooting

### Common Issues

#### 1. 411 Length Required Error
**Root Cause**: This typically occurs when the Google Apps Script Web App is not properly deployed or the URL is incorrect.

**Solutions**:
- Ensure your Google Apps Script is deployed as a Web App with "Anyone" access
- Verify the deployment URL is correct and ends with `/exec`
- Check that the script has the `doPost` function properly implemented
- Make sure the Web App is set to execute as the script owner

#### 2. Speech Recognition Not Working
**Causes**:
- Browser doesn't support Web Speech API
- Microphone permissions not granted
- HTTPS required for some browsers

**Solutions**:
- Use Chrome or another Chromium-based browser
- Ensure microphone permissions are granted
- Access the app via HTTPS in production

#### 3. Voice Commands Not Recognized
**Common Issues**:
- Incorrect command format
- Background noise affecting recognition
- Speaking too fast or unclear

**Solutions**:
- Follow the exact command format: `pickle prince pepsi [tab] [item] [qty] at [price] [status]`
- Speak clearly and at a moderate pace
- Ensure quiet environment for better recognition

#### 4. Google Sheets Not Updating
**Debugging Steps**:
1. Check the Google Apps Script logs in the Apps Script editor
2. Verify the spreadsheet permissions
3. Test the Web App URL directly with a POST request
4. Check the server logs for detailed error messages

### Testing the Google Apps Script

You can test your Google Apps Script deployment using curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"test","item":"apple","qty":1,"pricePerKg":100,"status":"owes"}' \
  YOUR_GOOGLE_APPS_SCRIPT_URL
```

## 📊 Data Structure

The application creates Google Sheets with the following columns:

| Column | Description | Format |
|--------|-------------|---------|
| Timestamp | When the entry was created | YYYY-MM-DD HH:MM:SS |
| Item | Product/item name| Text |
| Quantity (kg) | Amount in kilograms | Number (2 decimals) |
| Price per Kg | Price per kilogram | Currency format |
| Total | Calculated total price | Currency format |
| Status | Transaction status | Text |

## 🔒 Security Notes

- The authentication key ("pickle prince pepsi") is hardcoded for simplicity but should be changed in production
- Google Apps Script Web App runs with the deployer's permissions
- Consider implementing rate limiting for production use
- The application doesn't store any voice data locally

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Web Speech API for voice recognition capabilities
- Google Apps Script for seamless Google Sheets integration
- Express.js for the robust backend framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the Google Apps Script logs
3. Check the browser console for frontend errors
4. Verify your environment configuration

---

**Made with ❤️ for seamless voice-to-data workflows**