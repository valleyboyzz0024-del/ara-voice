const API_ENDPOINT = "/command";
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const micButton = document.getElementById('micButton');
const stopButton = document.getElementById('stopButton');
const smartModeToggle = document.getElementById('smartMode');
const voiceSelector = document.getElementById('voiceSelector');
const aiStatus = document.getElementById('ai-status');

let conversationHistory = [];
let voices = [];
let abortController = null;

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

function populateVoiceList() {
    voices = window.speechSynthesis.getVoices();
    if (voiceSelector.options.length > 3) return;
    voiceSelector.innerHTML = '';
    const characterVoices = [{ name: 'Ara (Default)', value: 'default' }, { name: 'The Boxer', value: 'boxer' }, { name: 'The Count', value: 'count' }];
    characterVoices.forEach(c => { const o = document.createElement('option'); o.textContent = c.name; o.value = c.value; voiceSelector.appendChild(o); });
    voices.forEach((v, i) => { if (v.lang.startsWith('en')) { const o = document.createElement('option'); o.textContent = `${v.name} (${v.lang})`; o.value = i; voiceSelector.appendChild(o); } });
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
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

function toggleInput(isGenerating) {
    userInput.disabled = isGenerating;
    sendButton.style.display = isGenerating ? 'none' : 'block';
    micButton.style.display = isGenerating ? 'none' : 'block';
    stopButton.style.display = isGenerating ? 'block' : 'none';
}

function stopAI() {
    if (abortController) { abortController.abort(); }
    window.speechSynthesis.cancel();
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

function speakText(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoiceValue = voiceSelector.value;
    if (selectedVoiceValue === 'boxer') { utterance.pitch = 0.8; utterance.rate = 1.1; }
    else if (selectedVoiceValue === 'count') { utterance.pitch = 0.4; utterance.rate = 0.9; }
    else if (selectedVoiceValue !== 'default') { utterance.voice = voices[parseInt(selectedVoiceValue)]; }
    window.speechSynthesis.speak(utterance);
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
            body: JSON.stringify({ messages: conversationHistory, smartMode: !smartModeToggle.checked }) // Inverted smartMode logic for clarity
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
        if (fullReply !== "[Response stopped]") { speakText(fullReply); }
        toggleInput(false);
        abortController = null;
    }
}