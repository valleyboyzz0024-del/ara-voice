import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const GOOGLE_SHEET_CONFIG = JSON.parse(process.env.GOOGLE_SHEET_CONFIG || '[]');

async function executeSheetCommand(command) {
    if (!APPS_SCRIPT_URL) { throw new Error("APPS_SCRIPT_URL is not configured."); }
    const response = await axios.post(APPS_SCRIPT_URL, command);
    if (response.data.status === 'error') { throw new Error(`Google Sheets Error: ${response.data.message}`); }
    return response.data.message || 'Task completed successfully.';
}

async function getAllSheetDataForContext() {
    if (!APPS_SCRIPT_URL || GOOGLE_SHEET_CONFIG.length === 0) return null;
    const allSheetsData = {};
    for (const sheetConfig of GOOGLE_SHEET_CONFIG) {
        try {
            const response = await axios.post(APPS_SCRIPT_URL, { action: 'readAllSheets', spreadsheetId: sheetConfig.id });
            if (response.data.status === 'success') {
                allSheetsData[sheetConfig.name] = response.data.data;
            }
        } catch (error) {
            console.error(`Failed to fetch data for sheet: ${sheetConfig.name}`);
            allSheetsData[sheetConfig.name] = `Error fetching data for this sheet.`;
        }
    }
    return allSheetsData;
}

async function handleCommand(messages, smartMode) {
    const userMessage = messages[messages.length - 1].content;
    const casualModel = 'gpt-3.5-turbo';
    const smartModel = 'gpt-4o';

    const isSheetCommandResponse = await openai.chat.completions.create({
        model: casualModel,
        messages: [{
            role: 'system',
            content: `Analyze the user's message. Does it explicitly ask to perform an action on a spreadsheet (add, update, delete, find, read, create, summarize, analyze data, etc.)? Respond with only "YES" or "NO".`
        }, {
            role: 'user',
            content: userMessage
        }],
        max_tokens: 3,
    });
    const isSheetCommand = isSheetCommandResponse.choices[0].message.content.trim().toUpperCase() === 'YES';

    if (isSheetCommand) {
        const sheetDataContext = await getAllSheetDataForContext();
        const availableSheetsForAI = GOOGLE_SHEET_CONFIG.map(s => ({ name: s.name, id: s.id }));
        const commandSystemPrompt = `You are Ara, an exceptionally intelligent AI assistant for Google Sheets. Your primary goal is to perform complex, multi-step tasks with flawless accuracy.
        **STANDARD OPERATING PROCEDURES (SOPs):**
        1.  **Chain-of-Thought Reasoning:** Before generating the final JSON, you MUST first create a step-by-step "plan" outlining how you will fulfill the user's request. This plan is for your internal use and should not be in the final JSON output.
        2.  **Sample Tracking SOP:** A "Sample" is checked out by a "Customer" from a "Vendor". A single user command like "Customer John is taking sample X from Vendor Y" requires TWO actions in a 'batch'. Action 1: Update the main 'Inventory' sheet to mark sample X as 'Checked Out' to 'Customer John'. Action 2: Add a new row to the tab named after 'Vendor Y' to log the transaction. A command like "Customer John returned sample X" requires reversing these two actions.
        3.  **Data Cleaning SOP:** If the user provides a messy sheet and asks you to "clean it up," your plan should be: Step 1: Analyze the messy data to identify the intended columns and data types. Step 2: Formulate a clean, standardized version of the data in your internal plan. Step 3: Generate a single 'createSheetWithData' action to implement this clean data in a new tab.
        **AVAILABLE SPREADSHEETS:**
        ${JSON.stringify(availableSheetsForAI, null, 2)}
        **AVAILABLE ACTIONS:** "addRow", "updateRow", "deleteRow", "findRow", "readSheet", "readAllSheets", "createSheetWithData", "batch" (for multiple actions).
        **RESPONSE FORMAT:** You MUST respond ONLY with the final JSON object. Do not include your plan or any conversational text. For multiple actions, use the "batch" action format: { "action": "batch", "spreadsheetId": "ID_OF_TARGET_SHEET", "actions": [ { "action": "action1", ... }, { "action": "action2", ... } ] }
        **CONTEXT (DATA FROM ALL SHEETS):**
        ${JSON.stringify(sheetDataContext, null, 2)}
        **USER COMMAND:** "${userMessage}"`;

        const commandResponse = await openai.chat.completions.create({
            model: smartModel, // Always use the smartest model for sheet tasks
            messages: [{ role: 'system', content: commandSystemPrompt }],
            response_format: { type: 'json_object' },
        });
        const commandJson = JSON.parse(commandResponse.choices[0].message.content);
        return await executeSheetCommand(commandJson);
    } else {
        const model = smartMode ? smartModel : casualModel;
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