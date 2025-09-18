# 🚀 Ara Voice - Enhanced AI-Powered Voice Command System

An advanced voice-controlled system for seamless Google Sheets operations with natural language processing and AI-powered spreadsheet merging capabilities.

## 🔑 Secret Activation Word

**"Bruins"** - Your secret word to activate the service and authenticate all requests.

## ✨ Features

### 🎯 Core Capabilities
- **Natural Language Processing**: Understand voice commands in conversational English
- **AI-Powered Command Parsing**: Intelligent interpretation of user intentions
- **Spreadsheet Merging with AI**: Automatically merge old spreadsheets with new data
- **Comprehensive Google Sheets Operations**: Add, update, delete, query, and merge data
- **Enhanced Error Handling**: Detailed feedback and suggestions for failed commands
- **Real-time Logging**: Monitor all operations with detailed timestamps

### 🎙️ Voice Command Examples

#### Traditional Format (Backwards Compatible)
```
"Ara Hulk starburst one at 2100 owes"
```

#### Natural Language Commands
```
"Add chicken 2.5 kilos at 1500 paid"
"Update customer John status to paid" 
"Delete order for starburst"
"Show all pending orders"
"Merge old inventory with current data"
"Copy yesterday's data to today's sheet"
```

## 🛠️ API Endpoints

### POST `/voice` - Natural Language Voice Commands
Process voice commands with AI-powered natural language understanding.

**Request:**
```json
{
  "key": "Bruins",
  "transcript": "Add chicken 2.5 kilos at 1500 paid"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Entry logged successfully", 
  "command": "add_entry",
  "data": "Entry added to sheet"
}
```

### POST `/ara` - Direct Structured Commands
Execute direct commands with structured data input.

**Request:**
```json
{
  "key": "Bruins",
  "tab": "hulk",
  "item": "starburst", 
  "qty": 1,
  "price": 2100,
  "status": "owes"
}
```

### POST `/merge` - AI-Powered Spreadsheet Merging
Merge spreadsheets using AI to handle data conflicts and duplicates.

**Request:**
```json
{
  "key": "Bruins",
  "sourceSheet": "old_inventory.xlsx",
  "targetSheet": "current_inventory",
  "mergeType": "smart"
}
```

### POST `/test` - Command Testing
Test voice command parsing without executing operations.

**Request:**
```json
{
  "key": "Bruins",
  "transcript": "Ara Hulk starburst one at 2100 owes"
}
```

### GET `/health` - Health Check
Check service status and available features.

### GET `/status?key=Bruins` - Detailed Status
Get comprehensive server status with authentication.

## 🧠 AI Command Intelligence

### Natural Language Understanding
The system uses advanced pattern matching and contextual analysis to understand:

- **Action Intent**: Add, update, delete, merge, query operations
- **Data Extraction**: Automatically extracts quantities, prices, items, and status
- **Context Awareness**: Understands variations in phrasing and terminology
- **Confidence Scoring**: Ensures high-confidence interpretation before execution

### Smart Data Parsing
- **Number Words**: Converts "one", "two", "half" to numeric values
- **Flexible Quantities**: Handles decimals, fractions, and word numbers
- **Context-Aware Fields**: Intelligent field extraction from natural speech
- **Error Recovery**: Provides helpful suggestions for unclear commands

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18.x or higher
- Google Apps Script URL for Sheets integration

### Quick Start
```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will start on port 10000 with full logging and status information.

### Environment Configuration
Create a `.env` file for production configuration:
```
PORT=10000
GOOGLE_SCRIPT_URL=your_apps_script_url
SECRET_WORD=Bruins
LOG_LEVEL=info
```

## 📊 Google Sheets Integration

### Supported Operations
1. **Add Entry**: Insert new data rows with validation
2. **Update Data**: Modify existing entries by criteria
3. **Delete Data**: Remove entries matching conditions
4. **Query Data**: Retrieve and filter information
5. **Merge Sheets**: AI-powered data consolidation
6. **Bulk Operations**: Process multiple commands efficiently

### Data Structure
The system works with structured data including:
- **Tab/Sheet Name**: Target worksheet
- **Item**: Product or service identifier
- **Quantity**: Numeric values with unit support
- **Price**: Pricing information per unit
- **Status**: Order/payment status tracking
- **Timestamp**: Automatic operation logging

## 🔒 Security Features

- **Authentication**: All endpoints require "Bruins" secret key
- **Input Validation**: Comprehensive data sanitization
- **Error Handling**: Secure error messages without data exposure
- **Rate Limiting**: Built-in protection against abuse
- **Audit Logging**: Complete operation history

## 🚨 Error Handling

The system provides detailed error messages and suggestions:

```json
{
  "status": "error",
  "message": "Could not understand command with sufficient confidence",
  "suggestion": "Try: 'Ara Hulk starburst one at 2100 owes' or 'merge old spreadsheet with current data'",
  "parsed": {
    "action": "unknown",
    "confidence": 0.3
  }
}
```

## 📈 Performance & Monitoring

### Real-time Monitoring
- **Health Checks**: `/health` endpoint for status monitoring
- **Performance Metrics**: Memory usage and uptime tracking
- **Operation Logging**: Detailed logs for all voice commands
- **Error Tracking**: Comprehensive error reporting and analysis

### Scalability Features
- **Async Processing**: Non-blocking command execution
- **Connection Pooling**: Efficient Google Sheets API usage
- **Caching**: Smart caching for improved response times
- **Load Balancing**: Ready for horizontal scaling

## 🎯 Use Cases

### Business Operations
- **Inventory Management**: Voice-controlled stock updates
- **Order Processing**: Hands-free order entry and status updates
- **Customer Management**: Quick customer record updates
- **Financial Tracking**: Voice-activated payment status changes

### Data Management
- **Spreadsheet Consolidation**: AI-powered merging of multiple sheets
- **Data Migration**: Seamless transfer between old and new systems
- **Bulk Updates**: Process multiple records with single commands
- **Report Generation**: Voice-activated data retrieval and analysis

## 🔮 Future Enhancements

- **Multi-language Support**: Voice commands in multiple languages
- **Advanced AI Models**: Integration with GPT-4 for enhanced understanding
- **Voice Response**: Text-to-speech confirmation of operations
- **Mobile App**: Dedicated mobile interface for voice commands
- **Dashboard**: Web-based monitoring and management interface

## 🐛 Troubleshooting

### Common Issues

**Command Not Recognized**
- Ensure "Bruins" is included in the request
- Check command format and spelling
- Use `/test` endpoint to verify parsing

**Google Sheets Connection Failed**
- Verify Google Apps Script URL
- Check internet connectivity
- Confirm Apps Script permissions

**Parsing Confidence Low**
- Speak clearly and use supported command formats
- Include all required information (item, quantity, price, status)
- Refer to example commands for proper syntax

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

---

**Made with ❤️ for seamless voice-controlled spreadsheet operations**