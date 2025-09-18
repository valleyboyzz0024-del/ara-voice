document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const startButton = document.getElementById('startButton');
  const statusIndicator = document.getElementById('statusIndicator');
  const transcript = document.getElementById('transcript');
  const responseContainer = document.getElementById('responseContainer');
  
  // Speech recognition setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    updateStatus('error', 'Speech recognition not supported in this browser');
    startButton.disabled = true;
    return;
  }
  
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  
  let isListening = false;
  
  // Handlers
  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }
  
  function startListening() {
    try {
      recognition.start();
      isListening = true;
      updateStatus('listening', 'Listening...');
      startButton.classList.add('listening');
      startButton.querySelector('.button-text').textContent = 'Stop Listening';
    } catch (error) {
      console.error('Recognition error:', error);
      updateStatus('error', `Failed to start: ${error.message}`);
    }
  }
  
  function stopListening() {
    recognition.stop();
    isListening = false;
    startButton.classList.remove('listening');
    startButton.querySelector('.button-text').textContent = 'Start Listening';
  }
  
  function updateStatus(status, message) {
    statusIndicator.className = 'status-indicator';
    statusIndicator.classList.add(status);
    statusIndicator.textContent = message;
  }
  
  function parseVoiceCommand(text) {
    // Natural language processing - simply return the raw text
    // The backend will handle parsing with AI
    if (!text || text.trim().length === 0) {
      return null;
    }
    
    return {
      command: text.trim(),
      isNaturalLanguage: true
    };
  }
  
  async function processVoiceCommand(commandData) {
    try {
      updateStatus('processing', 'Processing command...');
      
      const response = await fetch('/voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: commandData.command,
          sessionId: 'web-session-' + Date.now()
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        updateStatus('success', 'Command processed successfully!');
        
        const interpretedAction = result.data.interpreted_action;
        const sheetsResponse = result.data.sheets_response;
        
        responseContainer.innerHTML = `
          <div class="success">
            <h3>✅ Success!</h3>
            <p><strong>Command:</strong> "${result.data.original_command}"</p>
            <p><strong>Action:</strong> ${interpretedAction.action}</p>
            ${interpretedAction.action === 'addRow' ? `
              <p><strong>Details:</strong> Added ${interpretedAction.qty}kg of ${interpretedAction.item} to ${interpretedAction.tabName}</p>
              <p><strong>Price:</strong> $${interpretedAction.pricePerKg}/kg | <strong>Status:</strong> ${interpretedAction.status}</p>
              ${interpretedAction.qty && interpretedAction.pricePerKg ? `<p><strong>Total:</strong> $${(interpretedAction.qty * interpretedAction.pricePerKg).toFixed(2)}</p>` : ''}
            ` : `
              <p><strong>Details:</strong> ${sheetsResponse.message || 'Operation completed successfully'}</p>
            `}
          </div>
        `;
        responseContainer.className = 'response-container success';
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing command:', error);
      updateStatus('error', `Error: ${error.message}`);
      
      let errorHTML = `
        <div class="error">
          <h3>❌ Error</h3>
          <p>${error.message}</p>
      `;
      
      // Handle specific error cases
      if (error.message.includes('OpenAI') || error.message.includes('AI processing')) {
        errorHTML += `
          <p><strong>Note:</strong> Natural language processing requires an OpenAI API key. 
          The system is currently using mock responses.</p>
        `;
      }
      
      errorHTML += `</div>`;
      responseContainer.innerHTML = errorHTML;
      responseContainer.className = 'response-container error';
    }
  }
  
  // Event listeners
  startButton.addEventListener('click', toggleListening);
  
  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    transcript.textContent = finalTranscript || interimTranscript;
    
    if (finalTranscript) {
      const commandData = parseVoiceCommand(finalTranscript);
      
      if (commandData) {
        processVoiceCommand(commandData);
      } else {
        updateStatus('error', 'No command detected. Please try speaking again.');
        responseContainer.innerHTML = `
          <div class="error">
            <h3>❌ No Command Detected</h3>
            <p>Please try speaking your command again. Use natural language like:</p>
            <ul>
              <li>"Add 2 kilos of apples to my grocery list"</li>
              <li>"Show me my shopping list"</li>
              <li>"Delete the last item I added"</li>
            </ul>
          </div>
        `;
        responseContainer.className = 'response-container error';
      }
      
      stopListening();
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    let errorMessage = 'Speech recognition error';
    
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not accessible. Check permissions.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Grant permission and try again.';
        break;
      case 'network':
        errorMessage = 'Network error. Check your connection.';
        break;
    }
    
    updateStatus('error', errorMessage);
    stopListening();
  };
  
  recognition.onend = () => {
    if (isListening) {
      stopListening();
      updateStatus('', 'Ready');
    }
  };
});