import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

async function executeSheetCommand(command) {
    if (!APPS_SCRIPT_URL) {
        throw new Error("APPS_SCRIPT_URL is not configured on the server.");
    }
    const response = await axios.post(APPS_SCRIPT_URL, command);
    if (response.data.status === 'error') {
        throw new Error(`Google Sheets Error: ${response.data.message}`);
    }
    return response.data.message || 'Task completed successfully.';
}

async function getAllSheetDataForContext() {
    if (!APPS_SCRIPT_URL) return null;
    const response = await axios.post(APPS_SCRIPT_URL, { action: 'readAllSheets' });
    if (response.data.status === 'success') {
        return response.data.data;
    }
    return null;
}

async function handleCommand(messages, smartMode) {
    const userMessage = messages[messages.length - 1].content;
    const model = smartMode ? 'gpt-4o' : 'gpt-3.5-turbo';

    const intentResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
            role: 'system',
            content: `Analyze the user's message. Does the user want to perform a specific action on a spreadsheet (add, update, delete, find, read, create, summarize, analyze data, etc.)? Respond with only "YES" or "NO".`
        }, {
            role: 'user',
            content: userMessage
        }],
        max_tokens: 3,
    });
    const isSheetCommand = intentResponse.choices[0].message.content.trim().toUpperCase() === 'YES';

    if (isSheetCommand) {
        const sheetDataContext = await getAllSheetDataForContext();

        const commandSystemPrompt = `You are an expert-level Google Sheets AI assistant. Your task is to convert the user's command into a precise JSON object for our API.
        Available actions: "addRow", "updateRow", "deleteRow", "findRow", "readSheet", "readAllSheets", "createSheetWithData".
        - For "updateRow" or "deleteRow", you must infer a "criteria" object to find the correct row(s). Example: {"criteria": {"Item": "Apples"}}
        - For "addRow", the data should be in a "newData" object. Example: {"newData": {"Item": "Milk", "Status": "Pending"}}
        - Do not add conversational text. Respond ONLY with the JSON object.
        - The user may not know the exact tab name. Use the sheet data context to infer the correct "tabName".
        
        Sheet Data Context: ${JSON.stringify(sheetDataContext)}
        
        User Command: "${userMessage}"`;

        const commandResponse = await openai.chat.completions.create({
            model: model,
            messages: [{ role: 'system', content: commandSystemPrompt }],
            response_format: { type: 'json_object' },
        });

        const commandJson = JSON.parse(commandResponse.choices[0].message.content);
        return await executeSheetCommand(commandJson);

    } else {
        const chatSystemPrompt = {
            role: 'system',
            content: 'You are Ara, a helpful and friendly AI assistant. Engage in a natural conversation.'
        };

        const chatResponse = await openai.chat.completions.create({
            model: model,
            messages: [chatSystemPrompt, ...messages],
        });
        return chatResponse.choices[0].message.content;
    }
}

export { handleCommand };