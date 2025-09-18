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
    // Expected format: "pickle prince pepsi [tab] [item] [qty] at [price] [status]"
    const words = text.toLowerCase().trim().split(/\s+/);
    
    if (words.length < 8 || words[0] !== 'pickle' || words[1] !== 'prince' || words[2] !== 'pepsi') {
      return null;
    }
    
    const atIndex = words.indexOf('at');
    if (atIndex === -1 || atIndex < 5) {
      return null;
    }
    
    const tabName = words[3];
    const item = words.slice(4, atIndex - 1).join(' ');
    const qty = parseFloat(words[atIndex - 1]);
    const pricePerKg = parseFloat(words[atIndex + 1]);
    const status = words.slice(atIndex + 2).join(' ');
    
    if (isNaN(qty) || isNaN(pricePerKg)) {
      return null;
    }
    
    return {
      tabName,
      item,
      qty,
      pricePerKg,
      status
    };
  }
  
  async function processVoiceCommand(commandData) {
    try {
      updateStatus('processing', 'Processing command...');
      
      const response = await fetch('/api/voice-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commandData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        updateStatus('success', 'Command processed successfully!');
        responseContainer.innerHTML = `
          <div class="success">
            <h3>✅ Success!</h3>
            <p>Added ${commandData.qty}kg of ${commandData.item} to ${commandData.tabName}</p>
            <p>Price: $${commandData.pricePerKg}/kg | Status: ${commandData.status}</p>
            <p>Total: $${(commandData.qty * commandData.pricePerKg).toFixed(2)}</p>
          </div>
        `;
        responseContainer.className = 'response-container success';
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing command:', error);
      updateStatus('error', `Error: ${error.message}`);
      responseContainer.innerHTML = `
        <div class="error">
          <h3>❌ Error</h3>
          <p>${error.message}</p>
        </div>
      `;
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
        updateStatus('error', 'Command format not recognized. Please try again.');
        responseContainer.innerHTML = `
          <div class="error">
            <h3>❌ Format Error</h3>
            <p>Please use the format: "pickle prince pepsi [tab] [item] [qty] at [price] [status]"</p>
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