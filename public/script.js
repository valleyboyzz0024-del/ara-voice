const API_ENDPOINT = "/command";
const SPEAK_ENDPOINT = "/speak"; // New endpoint
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('userInput');
// ... (all other DOM element variables are the same)

let conversationHistory = [];
let abortController = null;

// --- VOICE & SPEECH SETUP ---
function populateVoiceList() {
    voiceSelector.innerHTML = '';
    // OpenAI's high-quality voices
    const openAIVoices = [
        { name: 'Nova (Friendly Female)', value: 'nova' },
        { name: 'Alloy (Neutral Male)', value: 'alloy' },
        { name: 'Echo (Dramatic Male)', value: 'echo' },
        { name: 'Fable (Storyteller Male)', value: 'fable' },
        { name: 'Onyx (Deep Male)', value: 'onyx' },
        { name: 'Shimmer (Warm Female)', value: 'shimmer' }
    ];
    openAIVoices.forEach(v => {
        const option = document.createElement('option');
        option.textContent = v.name;
        option.value = v.value;
        voiceSelector.appendChild(option);
    });
}

// Replaced browser speech synthesis with OpenAI TTS
async function speakText(text) {
    try {
        const selectedVoice = voiceSelector.value || 'nova';
        const response = await fetch(SPEAK_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, voice: selectedVoice }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch audio from server.');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

// --- All other functions (loadConversation, sendMessage, event listeners, etc.) ---
// The rest of your script.js remains the same as the last version.
// Just ensure the new speakText and populateVoiceList functions replace the old ones.

// --- The full, final script.js for clarity ---
const smartModeToggle = document.getElementById('smartMode');
const voiceSelector = document.getElementById('voiceSelector');
const aiStatus = document.getElementById('ai-status');

populateVoiceList();

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => { userInput.value = event.results[0][0].transcript; sendMessage(); };
    recognition.onerror = (event) => updateAIStatus(`Speech error: ${event.error}`);
    recognition.onend = () => micButton.classList.remove('recording');
} else {
    micButton.style.display = 'none';
}

sendButton.addEventListener('click', sendMessage);
stopButton.addEventListener('click', stopAI);
userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
micButton.addEventListener('click', () => { if (recognition) { micButton.classList.add('recording'); recognition.start(); } });
window.addEventListener('load', loadConversation);

function saveConversation() { localStorage.setItem('araConversationHistory', JSON.stringify(conversationHistory)); }
function loadConversation() {
    const savedHistory = localStorage.getItem('araConversationHistory');
    chatMessages.innerHTML = '';
    if (savedHistory && JSON.parse(savedHistory).length > 0) {
        conversationHistory = JSON.parse(savedHistory);
        conversationHistory.forEach(message => { addMessageToUI(message.role, message.content); });
    } else {
        const welcomeText = "Hello! I'm Ara, your ultimate AI assistant. How can I help you today?";
        addMessageToUI('assistant', welcomeText);
        conversationHistory.push({ role: 'assistant', content: welcomeText });
        speakText(welcomeText);
    }
}
function toggleInput(isGenerating) {
    userInput.disabled = isGenerating;
    sendButton.style.display = isGenerating ? 'none' : 'block';
    micButton.style.display = isGenerating ? 'none' : 'block';
    stopButton.style.display = isGenerating ? 'block' : 'none';
}
function stopAI() {
    if (abortController) { abortController.abort(); }
    // For audio, we can't easily stop it once it starts playing, but new speech will cancel old.
    updateAIStatus("Stopped.");
}
function updateAIStatus(text) {
    aiStatus.textContent = text;
}
function addMessageToUI(sender, text = '') {
    const messageElement = document.createElement('div');
    const role = (sender === 'user') ? 'user' : 'assistant';
    messageElement.classList.add('message', `${role}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
}
async function sendMessage() {
    const text = userInput.value.trim();
    if (text === '') return;
    addMessageToUI('user', text);
    conversationHistory.push({ role: 'user', content: text });
    saveConversation();
    userInput.value = '';
    toggleInput(true);
    abortController = new AbortController();
    const aiMessageElement = addMessageToUI('assistant', '');
    let fullReply = "";
    try {
        updateAIStatus('Thinking...');
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            signal: abortController.signal,
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ messages: conversationHistory, smartMode: !smartModeToggle.checked })
        });
        if (response.status === 401) { window.location.href = "/"; return; }
        updateAIStatus('Receiving response...');
        const data = await response.json();
        if (!response.ok) { throw new Error(data.error || 'An unknown error occurred.'); }
        fullReply = data.reply;
        aiMessageElement.textContent = fullReply;
    } catch (error) {
        if (error.name === 'AbortError') { fullReply = "[Response stopped]"; }
        else { fullReply = `Error: ${error.message}.`; }
        aiMessageElement.textContent = fullReply;
    } finally {
        updateAIStatus('Ready');
        conversationHistory.push({ role: 'assistant', content: fullReply });
        saveConversation();
        if (fullReply !== "[Response stopped]") {
            updateAIStatus('Speaking...');
            await speakText(fullReply);
            updateAIStatus('Ready');
        }
        toggleInput(false);
        abortController = null;
    }
}