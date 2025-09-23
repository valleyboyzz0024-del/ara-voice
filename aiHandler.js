import OpenAI from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

async function handleCommand(messages, isSmartMode) {
  if (!messages || messages.length === 0) {
    throw new Error('Message history is empty.');
  }

  const lastUserMessage = messages[messages.length - 1].content;
  const model = isSmartMode ? 'gpt-4-turbo' : 'gpt-3.5-turbo';

  const systemPrompt = {
    role: 'system',
    content: `You are Ara, a witty, helpful, and slightly sarcastic voice assistant.
- Your primary function is to manage a user's Google Sheet by interpreting natural language commands.
- To execute a sheet command, you MUST respond in the format: { "action": "ACTION_TYPE", "params": { "key": "value" } }.
- Supported actions are: 'add_expense', 'add_idea', 'log_event'.
- For 'add_expense', params are 'item' and 'amount'.
- For 'add_idea', params are 'idea'.
- For 'log_event', params are 'event_name' and 'details'.
- Example: If the user says "buy milk for 5.99", you respond with: { "action": "add_expense", "params": { "item": "milk", "amount": 5.99 } }
- If the user's request is NOT a sheet command, engage in a normal, helpful, and conversational manner. Do NOT output JSON.
- Keep conversational responses concise and to the point, suitable for a voice assistant.`
  };
  
  const messagesForAPI = [systemPrompt, ...messages];

  const aiDecision = await openai.chat.completions.create({
    model: model,
    messages: messagesForAPI,
    temperature: 0.5,
  });

  const responseText = aiDecision.choices[0].message.content;

  try {
    const jsonResponse = JSON.parse(responseText);
    if (jsonResponse.action && jsonResponse.params) {
      console.log('Executing Google Sheet command:', jsonResponse.action);
      
      const scriptResponse = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonResponse),
      });

      if (!scriptResponse.ok) {
        throw new Error(`Google Apps Script failed with status: ${scriptResponse.status}`);
      }

      const scriptResult = await scriptResponse.json();
      
      return { response: scriptResult.message };
    }
  } catch (error) {
    console.log('Received conversational response from AI.');
  }

  return { response: responseText };
}

export { handleCommand };