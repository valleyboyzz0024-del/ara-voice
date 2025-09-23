document.addEventListener('DOMContentLoaded', () => {
<<<<<<< HEAD
    const chatLog = document.getElementById('chat-log');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const recordButton = document.getElementById('record-button');
    const status = document.getElementById('status');

    let mediaRecorder;
    let audioChunks = [];

    // --- UPDATED AUDIO PLAYER ---
    const playAudio = async (text) => {
        console.log("Attempting to play audio for text:", text); // New log
        try {
            const response = await fetch('/speak', {
=======
    const commandInput = document.getElementById('command-input');
    const micButton = document.getElementById('mic-button');
    const chatHistory = document.getElementById('chat-history');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // --- Core Functions ---

    /**
     * Adds a message to the chat history UI.
     * @param {string} message - The text content of the message.
     * @param {string} sender - 'user' or 'ai'.
     */
    function addMessageToHistory(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = message;
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll to the latest message
    }

    /**
     * Sends a text message to the server.
     * @param {string} text - The text to send.
     */
    async function sendTextMessage(text) {
        if (!text.trim()) return;

        addMessageToHistory(text, 'user');
        commandInput.value = '';

        try {
            const response = await fetch('/chat', {
>>>>>>> 2fb3111eff2ff9d8dde581e7e40e587517e411dd
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

<<<<<<< HEAD
            console.log("Received response from /speak endpoint. Status:", response.status); // New log

            if (!response.ok) {
                // Try to get more info from the server error
                const errorBody = await response.text();
                throw new Error(`Failed to fetch audio. Server responded with ${response.status}: ${errorBody}`);
            }

            const audioBlob = await response.blob();
            // Check if we actually got an audio file
            if (audioBlob.size === 0 || !audioBlob.type.startsWith('audio/')) {
                throw new Error(`Invalid audio file received from server. Type: ${audioBlob.type}, Size: ${audioBlob.size}`);
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // *** THIS IS THE CRITICAL CHANGE ***
            // We use a Promise to handle both successful playback and potential errors.
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("Audio playback started successfully."); // Success!
                }).catch(error => {
                    // This will now catch the autoplay error!
                    console.error("Audio playback failed:", error);
                    appendMessage('system-error', "Browser blocked audio playback. Click the page and try again.");
                });
            }

        } catch (error) {
            console.error('Error in playAudio function:', error);
            appendMessage('system-error', "Couldn't generate or play audio due to an error.");
        }
    };

    const appendMessage = (sender, message) => {
        const messageElement = document.createElement('div');
        // Added a new class for system-error
        messageElement.classList.add('message', `${sender}-message`);
        const formattedMessage = message.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        });
        messageElement.innerHTML = formattedMessage;
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight;

        if (sender === 'assistant') {
            playAudio(message);
        }
    };

    const handleSend = async () => {
        const message = userInput.value.trim();
        if (!message) return;
        appendMessage('user', message);
        userInput.value = '';
        status.textContent = 'Ara is thinking...';
        status.classList.remove('status-hidden');
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'The server returned an error.');
            }
            const data = await response.json();
            appendMessage('assistant', data.reply);
        } catch (error) {
            console.error('Fetch error:', error);
            appendMessage('assistant', `Sorry, I ran into a problem: ${error.message}`);
        } finally {
            status.classList.add('status-hidden');
        }
    };

    // --- No changes to the recording functions below this line ---

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();
            audioChunks = [];
            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
            mediaRecorder.addEventListener('stop', handleStop);
            recordButton.textContent = '🛑';
            status.textContent = 'Recording...';
            status.classList.remove('status-hidden');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            status.textContent = 'Microphone access denied.';
        }
    };

    const handleStop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('voice', audioBlob, 'recording.webm');

        status.textContent = 'Transcribing...';
        status.classList.remove('status-hidden');
=======
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const result = await response.json();
            addMessageToHistory(result.reply, 'ai');

        } catch (error) {
            console.error('Error sending text message:', error);
            addMessageToHistory('Sorry, I had trouble connecting. Please try again.', 'ai');
        }
    }

    /**
     * Sends an audio blob to the server for transcription and processing.
     * @param {Blob} audioBlob - The recorded audio data.
     */
    async function sendAudioMessage(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
>>>>>>> 2fb3111eff2ff9d8dde581e7e40e587517e411dd

        try {
            const response = await fetch('/voice', {
                method: 'POST',
                body: formData,
            });
<<<<<<< HEAD
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'The server returned an error.');
            }
            const data = await response.json();
            appendMessage('user', `🎤: "${data.transcribedText}"`);
            appendMessage('assistant', data.reply);
        } catch (error) {
            console.error('Voice fetch error:', error);
            appendMessage('assistant', `Sorry, I ran into a problem with voice: ${error.message}`);
        } finally {
            status.classList.add('status-hidden');
        }
    };

    const stopRecording = () => {
        mediaRecorder.stop();
        recordButton.textContent = '🎙️';
        status.classList.add('status-hidden');
    };

    recordButton.addEventListener('click', () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            startRecording();
        } else {
            stopRecording();
        }
    });

    sendButton.addEventListener('click', handleSend);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') handleSend();
    });
=======

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Display the transcribed text and the AI's reply
            if (result.transcription) {
                addMessageToHistory(result.transcription, 'user');
            }
            if (result.reply) {
                addMessageToHistory(result.reply, 'ai');
            }

        } catch (error) {
            console.error('Error sending audio message:', error);
            addMessageToHistory('Sorry, I had trouble understanding that. Please try again.', 'ai');
        }
    }


    // --- Voice Recording Logic ---

    /**
     * Toggles the microphone recording state.
     */
    async function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    }

    /**
     * Starts the audio recording process.
     */
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudioMessage(audioBlob);
                audioChunks = []; // Reset for the next recording
            };

            mediaRecorder.start();
            isRecording = true;
            micButton.classList.add('is-recording'); // Visual feedback

        } catch (error) {
            console.error('Error accessing microphone:', error);
            addMessageToHistory('Could not access the microphone. Please check permissions.', 'ai');
        }
    }

    /**
     * Stops the audio recording.
     */
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            isRecording = false;
            micButton.classList.remove('is-recording');
        }
    }

    // --- Event Listeners ---

    // Send message when Enter is pressed in the input field
    commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendTextMessage(commandInput.value);
        }
    });

    // Toggle recording when the mic button is clicked
    micButton.addEventListener('click', toggleRecording);

    // Initial greeting
    addMessageToHistory('Hello! How can I assist you today?', 'ai');
>>>>>>> 2fb3111eff2ff9d8dde581e7e40e587517e411dd
});