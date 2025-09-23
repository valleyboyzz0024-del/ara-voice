# Ara Voice - Setup Guide

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   OPENAI_API_KEY=your_actual_openai_key_here
   GOOGLE_APPS_SCRIPT_URL=your_google_apps_script_url_here
   ```

3. **Start the app:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 🎤 How to Use

### Voice Commands (Natural Language)
- "Add 2 kilos of apples to my grocery list"
- "Put 1.5 kg of bananas in groceries at 800 per kilo, status owes" 
- "How much does John owe me in total?"
- "Show me all pending items"
- "Give me a breakdown of my expenses"
- "Create a new sheet for work projects"

### Mobile Usage
- Works on phones and tablets
- Touch-friendly interface
- Voice feedback can be toggled on/off
- Keep screen on option available

## 💰 Cost Optimization

The app automatically uses:
- **GPT-3.5 Turbo** for simple operations (~$0.003 per 1000 words)
- **GPT-4** only for complex analytics (~$0.03 per 1000 words)

**Estimated costs for 1000 commands/month: $3-5**

## 🔧 Advanced Setup

### Google Sheets API (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API and Google Drive API
4. Create OAuth2 credentials
5. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

### Google Apps Script (Fallback)
1. Create a Google Apps Script at [script.google.com](https://script.google.com)
2. Deploy as web app
3. Add the URL to `GOOGLE_APPS_SCRIPT_URL` in `.env`

## 🧪 Testing

Run tests:
```bash
npm test
```

Test webhook directly:
```bash
curl -X POST http://localhost:3000/voice-command \
  -H "Content-Type: application/json" \
  -d '{"command": "Add 2 apples to groceries", "sessionId": "test"}'
```

## 📱 Features

### ✅ Completed
- Natural language voice commands
- Cost-optimized AI processing
- Mobile-responsive design
- Session management
- Voice feedback
- Advanced analytics
- Google Sheets integration
- Authentication system

### 🎯 Voice Commands Supported
- **Add items**: "Add [quantity] [item] to [sheet] at [price] per kilo, status [status]"
- **Questions**: "How much does [person] owe me?", "Show me [status] items"
- **Analytics**: "Give me a breakdown", "What's my total expenses?"
- **Management**: "Delete the last item", "Create new sheet for [purpose]"

## 🔍 Troubleshooting

### Common Issues
1. **Speech recognition not working**: Check browser permissions for microphone
2. **Google Sheets not connecting**: Verify API keys and URLs in `.env`
3. **High costs**: App automatically optimizes, but check OpenAI usage dashboard

### Browser Support
- Chrome/Edge: Full support including speech recognition
- Firefox: Limited speech recognition support
- Safari: Basic functionality, limited speech features
- Mobile browsers: Optimized experience on all platforms

## 🆘 Support

The app includes comprehensive error handling and helpful error messages. Check the browser console for detailed debugging information.