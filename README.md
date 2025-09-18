# Ara Voice - AI Data Entry Assistant

A user-friendly, secure voice-controlled data entry system for Google Sheets. Speak naturally and let Ara handle the data entry for you!

## 🎤 Features

- **Natural Language Processing**: Speak naturally - no need to remember exact formats
- **Multiple Command Formats**: Flexible voice command recognition
- **Secure Authentication**: Environment variable support for API keys
- **Comprehensive Validation**: Data sanitization and validation
- **User-Friendly Errors**: Helpful error messages with examples
- **Google Sheets Integration**: Direct integration with Google Apps Script
- **Detailed Logging**: Complete request/response logging for debugging

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Security** (Optional but recommended)
   ```bash
   cp .env.example .env
   # Edit .env with your secure API key
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Test Voice Commands**
   ```bash
   curl -X POST http://localhost:10000/voice \
     -H "Content-Type: application/json" \
     -d '{"key": "Bruins", "transcript": "ara hulk chocolate 2.5 at 1800 paid"}'
   ```

## 🗣️ Voice Command Examples

Ara understands natural speech patterns:

### Standard Format
```
"ara hulk chocolate 2.5 at 1800 paid"
"ara fruits bananas 3 kg for 600 delivered"
```

### Natural "Add To" Format
```
"add chocolate to hulk 2.5 kg at 1800 paid"
"put bananas in fruits 3 kilos for 600 delivered"
```

### Simplified Format
```
"hulk chocolate 2.5 at 1800 paid"
"fruits bananas 3 for 600 delivered"
```

### Flexible Words
- **Quantity**: kg, kilos, kilo (optional)
- **Price**: at, for, dollars, bucks, per kg
- **Actions**: add, put, enter
- **Status**: paid, owes, delivered, pending, processing, shipped

## 🔧 API Endpoints

### Voice Processing
```http
POST /voice
Content-Type: application/json

{
  "key": "your-api-key",
  "transcript": "ara hulk chocolate 2.5 at 1800 paid"
}
```

### Direct Data Entry
```http
POST /ara
Content-Type: application/json

{
  "key": "your-api-key",
  "tab": "hulk",
  "item": "chocolate",
  "qty": 2.5,
  "price": 1800,
  "status": "paid"
}
```

### Help & Documentation
```http
GET /help
GET /
```

## 🔒 Security Features

- **Environment Variables**: Use `ARA_API_KEY` environment variable
- **Input Sanitization**: All inputs are cleaned and validated
- **Data Validation**: Comprehensive checks for all data types
- **Error Handling**: Secure error messages without data leakage

## 📊 Google Sheets Integration

The system automatically sends data to your Google Apps Script. Make sure your script accepts:

```javascript
{
  "tabName": "sheet-tab-name",
  "item": "item-name", 
  "qty": 2.5,
  "pricePerKg": 1800,
  "status": "paid"
}
```

## 🐛 Troubleshooting

### Voice Not Understood
- Speak clearly and use simple words
- Include all required fields: tab, item, quantity, price, status
- Try different formats if one doesn't work

### Sheets Not Updating
- Check your Google Apps Script URL and permissions
- Verify the script is deployed and accessible
- Check server logs for detailed error messages

### Authentication Failed
- Verify your API key matches the server configuration
- Check if using environment variable or default key

## 🔧 Development

### Environment Setup
```bash
# Development with default key
npm start

# Production with custom key
ARA_API_KEY=your-secure-key npm start
```

### Testing
```bash
# Test voice endpoint
curl -X POST http://localhost:10000/voice \
  -H "Content-Type: application/json" \
  -d '{"key": "Bruins", "transcript": "test command"}'

# Test direct endpoint  
curl -X POST http://localhost:10000/ara \
  -H "Content-Type: application/json" \
  -d '{"key": "Bruins", "tab": "test", "item": "item", "qty": 1, "price": 100, "status": "test"}'
```

## 📝 Version History

### v2.0.0 - Enhanced User Experience
- Natural language processing for voice commands
- Multiple flexible command formats
- Comprehensive error handling with examples
- Secure API key management
- Input validation and sanitization
- Detailed documentation and help system

### v1.0.0 - Initial Release
- Basic voice command processing
- Google Sheets integration
- Simple authentication