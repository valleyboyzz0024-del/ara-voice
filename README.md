# Ara Voice - AI-Enhanced Inventory Management

A voice-controlled inventory management system with AI-powered natural language processing for easier and more flexible voice commands.

## 🚀 Features

### Core Functionality
- Voice-controlled inventory updates
- Google Sheets integration
- RESTful API endpoints
- Real-time logging and monitoring

### AI Enhancements
- **Smart Voice Parsing**: Uses OpenAI GPT to understand natural language commands
- **Intelligent Error Handling**: Provides helpful suggestions when commands fail
- **Data Validation & Correction**: Automatically validates and corrects common errors
- **Flexible Command Format**: Understands variations in voice commands
- **Fallback System**: Falls back to legacy parsing if AI is unavailable

### Configuration-Driven
- Easy configuration updates without code changes
- Environment-based settings
- Feature flags for easy enable/disable
- Validation rules configuration
- Custom response messages

## 📋 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
Copy the example environment file and configure:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Required
API_KEY=your_secure_api_key
GOOGLE_SCRIPT_URL=your_google_script_url

# Optional (for AI features)
OPENAI_API_KEY=your_openai_api_key
```

### 3. Start the Server
```bash
npm start
```

The server will start on port 10000 (or your configured PORT).

## 🎯 API Endpoints

### POST /voice
Process voice commands and update inventory.

**Request:**
```json
{
  "key": "your_api_key",
  "transcript": "Ara Hulk starburst two at 2100 owes"
}
```

**Response:**
```json
{
  "message": "Logged to sheet",
  "data": {
    "tab": "hulk",
    "item": "starburst",
    "qty": 2,
    "price": 2100,
    "status": "owes"
  },
  "originalTranscript": "Ara Hulk starburst two at 2100 owes"
}
```

### POST /ara
Direct inventory update with structured data.

**Request:**
```json
{
  "key": "your_api_key",
  "tab": "hulk",
  "item": "starburst",
  "qty": 2,
  "price": 2100,
  "status": "owes"
}
```

### GET /health
Check server health and feature status.

### GET /config?key=your_api_key
Get current configuration (requires API key).

## 🤖 AI Features

### Smart Voice Parsing
The AI can understand various ways of expressing the same command:

**Traditional format:**
- "Ara Hulk starburst one at 2100 owes"

**AI understands variations:**
- "Ara hulk starbursts 1 at twenty one hundred owes"
- "Add one kilogram of starburst to hulk tab at $21 per kg, customer owes"
- "Hulk starburst, quantity one, price 2100, status owes"

### Intelligent Error Messages
Instead of generic error messages, AI provides helpful suggestions:

**Input:** "Ara hulk starburst at 2100"
**AI Response:** "Missing quantity. Try: 'Ara hulk starburst one at 2100 owes'"

### Data Validation & Correction
- Standardizes item names ("starbursts" → "starburst")
- Corrects status values ("owe" → "owes", "payed" → "paid")
- Validates reasonable prices and quantities
- Provides warnings for unusual values

## ⚙️ Configuration

### Environment Variables
```env
# Server
PORT=10000
API_KEY=your_secure_key

# AI Features
OPENAI_API_KEY=your_openai_key
AI_MODEL=gpt-3.5-turbo

# Google Sheets
GOOGLE_SCRIPT_URL=your_script_url

# Logging
LOG_LEVEL=info
```

### Feature Flags
Enable/disable features in `config.js`:
```javascript
features: {
  aiParsing: true,           // Use AI for voice parsing
  dataValidation: true,      // AI data validation
  smartSuggestions: true,    // AI error suggestions
  extendedLogging: false,    // Detailed logging
  webhookSupport: false,     // Future: webhook notifications
  bulkOperations: false      // Future: bulk updates
}
```

### Validation Rules
Configure validation in `config.js`:
```javascript
validation: {
  validStatuses: ['owes', 'paid', 'pending', 'cancelled'],
  priceRange: { min: 1, max: 10000 },
  quantityRange: { min: 0.1, max: 1000 },
  validTabs: { allowed: [], maxLength: 20 }
}
```

## 🔧 Customization

### Adding New Voice Command Formats
1. Update the AI system prompt in `ai-service.js`
2. Add validation rules in `config.js`
3. Test with various voice inputs

### Custom Error Messages
Update `config.js` messages section:
```javascript
messages: {
  errors: {
    wrongKey: 'Custom auth error message',
    badFormat: 'Custom format error message'
  }
}
```

### Adding New Endpoints
The modular structure makes it easy to add new endpoints:
1. Create endpoint in `index.js`
2. Use configuration helpers: `getConfig()`, `validateInventoryData()`
3. Leverage AI services as needed

## 🛠️ Development

### Testing Voice Commands
Use curl or Postman to test voice commands:
```bash
curl -X POST http://localhost:10000/voice \
  -H "Content-Type: application/json" \
  -d '{
    "key": "your_api_key",
    "transcript": "Ara hulk starburst two at 2100 owes"
  }'
```

### Monitoring
- Check `/health` endpoint for system status
- Review console logs for AI parsing results
- Monitor Google Sheets integration

### Without AI
The system works perfectly without OpenAI:
- Set `OPENAI_API_KEY` to empty or don't set it
- System falls back to legacy parsing
- All other features remain functional

## 📊 Benefits of AI Integration

### For Users
- **More Natural**: Speak naturally instead of remembering exact formats
- **Error Recovery**: Get helpful suggestions when commands fail
- **Flexibility**: Various ways to express the same command work

### For Administrators
- **Easy Updates**: Configuration-driven system
- **Better Logging**: Understand what users are saying vs. what's parsed
- **Data Quality**: AI validates and corrects common input errors
- **Scalability**: Easy to add new command types and validation rules

### For Developers
- **Modular Design**: AI features are optional and isolated
- **Fallback System**: Robust system that works with or without AI
- **Configuration-Driven**: Easy to modify behavior without code changes
- **Extensible**: Easy to add new AI features and endpoints

## 🔒 Security Considerations

- API key authentication on all endpoints
- Environment variable configuration for secrets
- Input validation and sanitization
- Rate limiting considerations for AI API calls
- Secure Google Sheets integration

## 🚀 Future Enhancements

The modular design makes it easy to add:
- Webhook notifications
- Bulk operations
- Voice response generation
- Multi-language support
- Advanced analytics
- Custom AI models
- Integration with other inventory systems

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the modular pattern
4. Test with and without AI features
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.