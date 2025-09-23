// --- CONFIGURATION ---
// IMPORTANT: Replace "12345" with the actual password you set in Render.
const APP_PASSWORD = "12345";
const API_ENDPOINT = "/command";

// --- DOM ELEMENTS ---
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const smartModeToggle = document.getElementById('smartMode');

let conversationHistory = [];

// --- EVENT LISTENERS ---
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// --- FUNCTIONS ---
function addMessageToUI(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
}

function showThinkingIndicator() {
    const thinkingElement = document.createElement('div');
    thinkingElement.classList.add('thinking');
    thinkingElement.innerHTML = `<span></span><span></span><span></span>`;
    chatMessages.appendChild(thinkingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return thinkingElement;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (text === '') return;

    addMessageToUI('user', text);
    conversationHistory.push({ role: 'user', content: text });
    userInput.value = ''; // Clear input field

    const thinkingIndicator = showThinkingIndicator();

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conversationHistory,
                smartMode: smartModeToggle.checked,
                password: APP_PASSWORD
            })
        });

        chatMessages.removeChild(thinkingIndicator);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'An unknown error occurred.');
        }

        const data = await response.json();
        const aiReply = data.reply;
        
        addMessageToUI('ai', aiReply);
        conversationHistory.push({ role: 'assistant', content: aiReply });

    } catch (error) {
        console.error('Error:', error);
        addMessageToUI('ai', `Error: ${error.message}`);
    }
}