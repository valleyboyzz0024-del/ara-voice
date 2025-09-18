#!/usr/bin/env node

/**
 * Demo script showing AI enhancements for ara-voice
 * Run with: node demo.js
 */

const AIService = require('./ai-service');
const { validateInventoryData } = require('./config');

console.log('🎯 Ara-Voice AI Enhancement Demo\n');

async function demonstrateAIFeatures() {
  const aiService = new AIService();
  
  console.log('1. 📝 Voice Parsing Comparison\n');
  
  const testTranscripts = [
    "Ara Hulk starburst one at 2100 owes",           // Original format
    "Ara hulk starbursts 1 at twenty one hundred owes", // Variations
    "Add hulk starburst two at 2100 paid",          // Different format
    "Ara thor candy 0.5 at 1500 pending",           // Decimal quantity
    "Ara hulk invalid command",                      // Invalid format
  ];
  
  for (const transcript of testTranscripts) {
    console.log(`Input: "${transcript}"`);
    
    // Try legacy parsing
    const legacyResult = aiService.legacyParsing(transcript);
    console.log(`Legacy: ${legacyResult ? JSON.stringify(legacyResult) : 'FAILED'}`);
    
    // Try AI parsing (will fall back to legacy if no OpenAI key)
    try {
      const aiResult = await aiService.parseVoiceCommand(transcript);
      console.log(`AI: ${aiResult ? JSON.stringify(aiResult) : 'FAILED'}`);
    } catch (error) {
      console.log(`AI: ERROR - ${error.message}`);
    }
    
    console.log('---');
  }
  
  console.log('\n2. ✅ Data Validation Demo\n');
  
  const testData = [
    { tab: "hulk", item: "starburst", qty: 2, price: 2100, status: "owes" },     // Valid
    { tab: "hulk", item: "starburst", qty: -1, price: 99999, status: "invalid" }, // Invalid
    { tab: "thor", item: "candy", qty: 0.5, price: 1500, status: "paid" },      // Valid
  ];
  
  for (const data of testData) {
    console.log(`Data: ${JSON.stringify(data)}`);
    const validation = validateInventoryData(data);
    console.log(`Valid: ${validation.success}`);
    if (!validation.success) {
      console.log(`Errors: ${validation.errors.join(', ')}`);
    }
    console.log('---');
  }
  
  console.log('\n3. 🔧 Configuration Features\n');
  
  const { getConfig } = require('./config');
  console.log(`Server Port: ${getConfig('server.port')}`);
  console.log(`AI Enabled: ${getConfig('ai.enabled')}`);
  console.log(`Valid Statuses: ${getConfig('validation.validStatuses').join(', ')}`);
  console.log(`Price Range: $${getConfig('validation.priceRange.min')}-$${getConfig('validation.priceRange.max')}`);
  
  console.log('\n4. 🚨 Error Message Enhancement\n');
  
  const invalidTranscript = "Ara hulk starburst at 2100";
  console.log(`Invalid Input: "${invalidTranscript}"`);
  
  try {
    const suggestion = await aiService.generateErrorSuggestion(invalidTranscript);
    console.log(`AI Suggestion: "${suggestion}"`);
  } catch (error) {
    console.log(`Fallback Message: "Bad format - use: Ara [tab] [item] [quantity] at [price] [status]"`);
  }
  
  console.log('\n✨ Demo completed! The system provides:');
  console.log('• Flexible voice command parsing');
  console.log('• Intelligent data validation');
  console.log('• Configuration-driven behavior');
  console.log('• Enhanced error messages');
  console.log('• Backwards compatibility');
  console.log('• Graceful AI service failures');
}

// Run the demo
demonstrateAIFeatures().catch(console.error);