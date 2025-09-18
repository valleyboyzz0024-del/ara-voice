const OpenAI = require('openai');

class AIService {
  constructor() {
    this.client = null;
    this.initialize();
  }

  initialize() {
    // Initialize OpenAI client if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Parse voice transcript using AI to extract inventory data
   * @param {string} transcript - The voice transcript
   * @returns {Object} Parsed inventory data or null if parsing fails
   */
  async parseVoiceCommand(transcript) {
    // Fallback to legacy parsing if OpenAI is not available
    if (!this.client) {
      return this.legacyParsing(transcript);
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an inventory management assistant. Parse voice commands into structured data.
            
Expected format: "Ara [tab] [item] [quantity] at [price] [status]"
Example: "Ara Hulk starburst one at 2100 owes"

Extract:
- tab: The tab/category name (e.g., "Hulk")  
- item: The product name (e.g., "starburst")
- qty: The quantity as a number (e.g., 1 from "one")
- price: The price per kg as a number (e.g., 2100)
- status: The status (e.g., "owes", "paid", "pending")

Respond ONLY with valid JSON in this exact format:
{"tab": "string", "item": "string", "qty": number, "price": number, "status": "string"}

If parsing fails, respond with: {"error": "parsing_failed", "reason": "description"}`
          },
          {
            role: "user",
            content: transcript
          }
        ],
        temperature: 0.1,
        max_tokens: 150
      });

      const response = completion.choices[0].message.content.trim();
      const parsed = JSON.parse(response);
      
      // Validate the parsed response
      if (parsed.error) {
        console.log('AI parsing failed:', parsed.reason);
        return this.legacyParsing(transcript);
      }

      // Validate required fields
      if (!parsed.tab || !parsed.item || typeof parsed.qty !== 'number' || 
          typeof parsed.price !== 'number' || !parsed.status) {
        throw new Error('Invalid parsed format');
      }

      console.log('AI parsed successfully:', parsed);
      return parsed;

    } catch (error) {
      console.log('AI parsing error:', error.message);
      // Fallback to legacy parsing
      return this.legacyParsing(transcript);
    }
  }

  /**
   * Legacy parsing method (original logic as fallback)
   * @param {string} transcript - The voice transcript
   * @returns {Object} Parsed inventory data or null
   */
  legacyParsing(transcript) {
    try {
      const words = transcript.toLowerCase().split(' ');
      const tab = words[1];
      const item = words[2];
      const qty = this.parseQuantity(words[3]);
      const price = parseInt(words[5]);
      const status = words[6];

      if (!tab || !item || isNaN(qty) || isNaN(price) || !status) {
        return null;
      }

      console.log('Legacy parsed successfully:', { tab, item, qty, price, status });
      return { tab, item, qty, price, status };

    } catch (error) {
      console.log('Legacy parsing failed:', error.message);
      return null;
    }
  }

  /**
   * Convert word numbers to numeric values
   * @param {string} word - The word to convert
   * @returns {number} Numeric value
   */
  parseQuantity(word) {
    const numberWords = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
    };

    if (numberWords.hasOwnProperty(word)) {
      return numberWords[word];
    }

    const num = parseFloat(word);
    return isNaN(num) ? null : num;
  }

  /**
   * Generate intelligent error messages and suggestions
   * @param {string} transcript - The original transcript
   * @returns {string} Helpful error message
   */
  async generateErrorSuggestion(transcript) {
    if (!this.client) {
      return 'Bad format - use: Ara [tab] [item] [quantity] at [price] [status]';
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant for voice-controlled inventory management. 
            When users provide incorrect voice commands, suggest corrections.
            
            Expected format: "Ara [tab] [item] [quantity] at [price] [status]"
            Example: "Ara Hulk starburst one at 2100 owes"
            
            Provide a helpful, concise correction suggestion.`
          },
          {
            role: "user",
            content: `The user said: "${transcript}". This couldn't be parsed. What should they say instead?`
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      });

      return completion.choices[0].message.content.trim();

    } catch (error) {
      return 'Bad format - use: Ara [tab] [item] [quantity] at [price] [status]';
    }
  }

  /**
   * Validate and correct data using AI
   * @param {Object} data - The parsed data to validate
   * @returns {Object} Validated/corrected data
   */
  async validateAndCorrectData(data) {
    if (!this.client) {
      return data; // Return as-is if no AI
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a data validator for inventory management. Review and suggest corrections for inventory data.
            
            Common corrections:
            - Standardize item names (e.g., "starbursts" -> "starburst")
            - Validate reasonable prices (alert if extremely high/low)
            - Standardize status values ("owe" -> "owes", "payed" -> "paid")
            - Ensure tab names are consistent
            
            Respond with JSON in this format:
            {"corrected": true/false, "data": {corrected_data}, "warnings": ["warning1", "warning2"]}`
          },
          {
            role: "user",
            content: `Please validate this inventory data: ${JSON.stringify(data)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const response = JSON.parse(completion.choices[0].message.content.trim());
      
      if (response.warnings && response.warnings.length > 0) {
        console.log('Data validation warnings:', response.warnings);
      }

      return response.corrected ? response.data : data;

    } catch (error) {
      console.log('Data validation error:', error.message);
      return data; // Return original data if validation fails
    }
  }
}

module.exports = AIService;