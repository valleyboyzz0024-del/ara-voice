// --- CONFIGURATION ---
// IMPORTANT: Replace "12345" with the actual password you set in Render.
const APP_PASSWORD = "12345"; 
const API_ENDPOINT = "/command";

// --- DOM ELEMENTS ---
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const micBtn = document.getElementById('mic-btn');
const typingIndicator = document.getElementById('typing-indicator');
const smartModeToggle = document.getElementById('smart-mode-toggle');

// --- CONVERSATION MEMORY ---
let conversationHistory = [];

// --- SPEECH RECOGNITION & SYNTHESIS SETUP ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
}

// --- EVENT LISTENERS ---

chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && chatInput.value.trim() !== '') {
        const command = chatInput.value.trim();
        chatInput.value = '';
        handleUserCommand(command);
    }
});

micBtn.addEventListener('click', () => {
    if (!recognition) {
        return alert("Sorry, your browser doesn't support voice recognition.");
    }
    micBtn.classList.contains('listening') ? recognition.stop() : recognition.start();
});

if (recognition) {
    recognition.onstart = () => micBtn.classList.add('listening');
    recognition.onend = () => micBtn.classList.remove('listening');
    recognition.onresult = (event) => handleUserCommand(event.results[0][0].transcript);
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        micBtn.classList.remove('listening');
    };
}

// --- CORE FUNCTIONS ---

async function handleUserCommand(command) {
    addMessage(command, 'user-message');
    conversationHistory.push({ role: 'user', content: command });

    showTypingIndicator(true);

    const isSmartMode = smartModeToggle.checked;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${APP_PASSWORD}`
            },
            body: JSON.stringify({
                messages: conversationHistory,
                isSmartMode: isSmartMode
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.response || "I'm not sure how to respond to that.";

        addMessage(aiResponse, 'ai-message');
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        speakText(aiResponse);

    } catch (error) {
        console.error('Error sending command:', error);
        const errorMessage = "Sorry, I ran into an error. Please check the server logs.";
        addMessage(errorMessage, 'ai-message');
        conversationHistory.push({ role: 'assistant', content: errorMessage });
        speakText(errorMessage);
    } finally {
        showTypingIndicator(false);
    }
}

// --- UI & BROWSER HELPER FUNCTIONS ---

function addMessage(text, className) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', className);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator(show) {
    typingIndicator.classList.toggle('hidden', !show);
    if (show) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function speakText(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

window.onload = () => {
    const welcomeText = "Hello! I am Ara. Our conversation will now be remembered. How can I assist you?";
    addMessage(welcomeText, 'ai-message');
    conversationHistory.push({ role: 'assistant', content: welcomeText });
    speakText(welcomeText);
};