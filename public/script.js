// --- CONFIGURATION ---
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
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// --- FUNCTIONS ---
function addMessageToUI(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    userInput.value = '';

    const thinkingIndicator = showThinkingIndicator();

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest' // Tells the server this is an API call
            },
            body: JSON.stringify({
                messages: conversationHistory,
                smartMode: smartModeToggle.checked,
            })
        });

        chatMessages.removeChild(thinkingIndicator);

        // If the session has expired, the server will send a 401 status.
        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            window.location.href = "/"; // Redirect to the login page
            return;
        }
        
        // This is the line that was causing the error before.
        // Now it will only run if the response is not an error.
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An unknown error occurred.');
        }

        const aiReply = data.reply;
        
        addMessageToUI('ai', aiReply);
        conversationHistory.push({ role: 'assistant', content: aiReply });

    } catch (error) {
        console.error('Error:', error);
        // This will now catch the "Unexpected token '<'" error gracefully
        // if it ever happens again.
        addMessageToUI('ai', `Error: ${error.message}. You may need to log in again.`);
    }
}