const API_ENDPOINT = "/command";
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const micButton = document.getElementById('micButton');
const stopButton = document.getElementById('stopButton');
const smartModeToggle = document.getElementById('smartMode');
const voiceSelector = document.getElementById('voiceSelector');
const aiStatus = document.getElementById('ai-status');
const micVisualizer = document.getElementById('mic-visualizer');
const visualizerContext = micVisualizer.getContext('2d');

let conversationHistory = [];
let voices = [];
let abortController = null;
let audioContext, analyser, dataArray, sourceNode;

function saveConversation() { localStorage.setItem('araConversationHistory', JSON.stringify(conversationHistory)); }

function loadConversation() {
    const savedHistory = localStorage.getItem('araConversationHistory');
    if (savedHistory && JSON.parse(savedHistory).length > 0) {
        conversationHistory = JSON.parse(savedHistory);
        chatMessages.innerHTML = '';
        conversationHistory.forEach(message => { addMessageToUI(message.role, message.content); });
    } else {
        const welcomeText = "Hello! I'm Ara, your ultimate AI assistant. How can I revolutionize your workflow today?";
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
    voices.forEach((v, i) => { if (v.lang.startsWith('en')) { const o = document.createElement('option'); o.textContent = `${v.name}