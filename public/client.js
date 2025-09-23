document.addEventListener('DOMContentLoaded', () => {
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

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

        try {
            const response = await fetch('/voice', {
                method: 'POST',
                body: formData,
            });
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
});