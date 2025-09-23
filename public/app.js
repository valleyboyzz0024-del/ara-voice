/**
 * Enhanced Frontend for Ara Voice - Google Sheets God
 * Integrates with enhanced backend featuring session management, 
 * Google Sheets API, and conversational AI
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const startButton = document.getElementById('startButton');
  const statusIndicator = document.getElementById('statusIndicator');
  const transcript = document.getElementById('transcript');
  const responseContainer = document.getElementById('responseContainer');
  
  // Webhook test elements
  const bearerTokenInput = document.getElementById('bearerToken');
  const commandInput = document.getElementById('commandInput');
  const pinInput = document.getElementById('pinInput');
  const sendCommandButton = document.getElementById('sendCommand');
  const sendPinButton = document.getElementById('sendPin');
  const responseOutput = document.getElementById('responseOutput');
  
  // Session management
  let sessionId = 'web-session-' + Date.now();
  let isAuthenticated = false;
  let conversationHistory = [];
  
  // Initialize app
  initializeApp();
  
  async function initializeApp() {
    // Check health and session status
    await checkHealthStatus();
    await checkSessionStatus();
    
    // Initialize session info display
    createSessionInfoPanel();
    
    // Check for auth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      showSuccessMessage('Google Sheets authentication successful!');
      await checkSessionStatus();
    } else if (urlParams.get('auth') === 'error') {
      showErrorMessage('Google Sheets authentication failed. Please try again.');
    }
  }
  
  function createSessionInfoPanel() {
    const existingPanel = document.getElementById('sessionInfo');
    if (!existingPanel) {
      const sessionPanel = document.createElement('div');
      sessionPanel.id = 'sessionInfo';
      sessionPanel.className = 'session-info';
      sessionPanel.innerHTML = `
        <h3>🔧 Session Status</h3>
        <div id="sessionDetails">
          <p>Session ID: <span id="currentSessionId">${sessionId}</span></p>
          <p>Status: <span id="sessionStatus">Initializing...</span></p>
          <p>Google Sheets: <span id="sheetsStatus">Not connected</span></p>
          <p>AI Processing: <span id="aiStatus">Unknown</span></p>
          <div id="sessionActions">
            <button id="connectGoogleSheets" class="action-button">Connect Google Sheets</button>
            <button id="clearSession" class="action-button secondary">Clear Session</button>
            <button id="refreshStatus" class="action-button secondary">Refresh</button>
          </div>
        </div>
      `;
      
      const mainContainer = document.querySelector('.container');
      const voiceController = mainContainer.querySelector('.voice-controller');
      if (voiceController) {
        mainContainer.insertBefore(sessionPanel, voiceController);
      } else {
        // Fallback: append to main container if voice controller not found
        mainContainer.appendChild(sessionPanel);
      }
    }
    
    // Add event listeners (use setTimeout to ensure elements are rendered)
    setTimeout(() => {
      const connectBtn = document.getElementById('connectGoogleSheets');
      const clearBtn = document.getElementById('clearSession');
      const refreshBtn = document.getElementById('refreshStatus');
      
      if (connectBtn) connectBtn.addEventListener('click', authenticateGoogleSheets);
      if (clearBtn) clearBtn.addEventListener('click', clearSession);
      if (refreshBtn) refreshBtn.addEventListener('click', checkSessionStatus);
    }, 100);
  }
  
  async function checkHealthStatus() {
    try {
      const response = await fetch('/health');
      const health = await response.json();
      
      updateSessionDisplay('aiStatus', health.config.openaiConfigured ? 'Configured' : 'Mock AI');
      updateSessionDisplay('sheetsStatus', 
        health.config.googleSheetsAPIConfigured ? 'API Ready' : 'Apps Script Only'
      );
      
    } catch (error) {
      console.error('Health check failed:', error);
      showErrorMessage('Server connection failed');
    }
  }
  
  async function checkSessionStatus() {
    try {
      const response = await fetch('/session/status');
      const status = await response.json();
      
      if (status.authenticated) {
        isAuthenticated = true;
        updateSessionDisplay('sessionStatus', 'Authenticated');
        updateSessionDisplay('sheetsStatus', 'Connected');
        
        const connectButton = document.getElementById('connectGoogleSheets');
        connectButton.textContent = 'Reconnect Google Sheets';
        connectButton.className = 'action-button success';
      } else {
        updateSessionDisplay('sessionStatus', 'Active');
      }
      
      if (status.totalInteractions > 0) {
        updateSessionDisplay('sessionStatus', 
          `Active (${status.totalInteractions} interactions)`
        );
      }
      
    } catch (error) {
      console.error('Session status check failed:', error);
      updateSessionDisplay('sessionStatus', 'Error');
    }
  }
  
  function updateSessionDisplay(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }
  
  async function authenticateGoogleSheets() {
    try {
      window.location.href = '/auth/google';
    } catch (error) {
      showErrorMessage('Authentication redirect failed: ' + error.message);
    }
  }
  
  async function clearSession() {
    try {
      const response = await fetch('/session/clear', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        showSuccessMessage('Session cleared successfully');
        conversationHistory = [];
        sessionId = 'web-session-' + Date.now();
        document.getElementById('currentSessionId').textContent = sessionId;
        await checkSessionStatus();
      }
    } catch (error) {
      showErrorMessage('Failed to clear session: ' + error.message);
    }
  }
  
  // Enhanced webhook test functionality
  async function sendWebhookCommand(command, token = null) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Add session ID header for webhook
      headers['X-Session-ID'] = sessionId;
      
      const response = await fetch('/webhook/voice', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          command: command
        })
      });
      
      const result = await response.json();
      responseOutput.textContent = JSON.stringify(result, null, 2);
      
      if (response.ok) {
        responseOutput.style.color = '#28a745';
        await checkSessionStatus(); // Update session status after successful command
      } else {
        responseOutput.style.color = '#dc3545';
      }
      
    } catch (error) {
      responseOutput.textContent = `Error: ${error.message}`;
      responseOutput.style.color = '#dc3545';
    }
  }
  
  // Event listeners for webhook testing
  if (sendCommandButton) {
    sendCommandButton.addEventListener('click', () => {
      const command = commandInput.value.trim();
      const token = bearerTokenInput.value.trim();
      
      if (!command) {
        responseOutput.textContent = 'Please enter a command';
        responseOutput.style.color = '#dc3545';
        return;
      }
      
      sendWebhookCommand(command, token);
    });
  }
  
  if (sendPinButton) {
    sendPinButton.addEventListener('click', () => {
      const pinCommand = pinInput.value.trim();
      
      if (!pinCommand) {
        responseOutput.textContent = 'Please enter a PIN command';
        responseOutput.style.color = '#dc3545';
        return;
      }
      
      sendWebhookCommand(pinCommand);
    });
  }
  
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
  let currentCommand = '';
  
  // Enhanced handlers
  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }
  
  function startListening() {
    if (isListening) return;
    
    try {
      recognition.start();
      isListening = true;
      updateStatus('listening', 'Listening... Speak your command');
      startButton.textContent = '🛑 Stop Listening';
      startButton.className = 'mic-button listening';
      transcript.textContent = '';
      
      // Clear previous responses
      responseContainer.innerHTML = '';
      responseContainer.className = 'response-container';
      
    } catch (error) {
      console.error('Speech recognition error:', error);
      updateStatus('error', 'Failed to start speech recognition');
      isListening = false;
    }
  }
  
  function stopListening() {
    if (!isListening) return;
    
    try {
      recognition.stop();
      isListening = false;
      updateStatus('processing', 'Processing...');
      startButton.textContent = '🎤 Start Listening';
      startButton.className = 'mic-button';
      
    } catch (error) {
      console.error('Error stopping recognition:', error);
      isListening = false;
    }
  }
  
  function updateStatus(status, message) {
    statusIndicator.textContent = message;
    statusIndicator.className = `status-indicator ${status}`;
  }
  
  function parseVoiceCommand(text) {
    // Enhanced natural language processing - simply return the raw text
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
    if (!commandData || !commandData.command) {
      updateStatus('error', 'No valid command detected');
      return;
    }
    
    try {
      updateStatus('processing', 'Processing your command...');
      
      const response = await fetch('/voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: commandData.command,
          sessionId: sessionId
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // Add to conversation history
        conversationHistory.push({
          command: commandData.command,
          response: result,
          timestamp: new Date()
        });
        
        updateStatus('success', 'Command processed successfully!');
        displayEnhancedResponse(result);
        
        // Update session status
        await checkSessionStatus();
        
        // Auto-prepare for next command after a successful response
        setTimeout(waitForNextCommand, 2000);
        
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing command:', error);
      updateStatus('error', `Error: ${error.message}`);
      displayErrorResponse(error);
    }
  }
  
  function displayEnhancedResponse(result) {
    let responseHTML = '';
    
    if (result.type === 'answer') {
      // Q&A Response
      responseHTML = `
        <div class="response-success">
          <h3>💬 AI Response</h3>
          <div class="command-display">
            <strong>You asked:</strong> "${result.data.original_command}"
          </div>
          <div class="ai-response">
            <p>${result.data.answer}</p>
          </div>
          ${result.data.sheets_api_response ? `
            <div class="api-info">
              <small>✅ Using Google Sheets API</small>
            </div>
          ` : ''}
        </div>
      `;
    } else if (result.type === 'action') {
      // Action Response
      const interpretedAction = result.data.interpreted_action;
      const hasApiResponse = result.data.sheets_api_response;
      const hasError = result.data.sheets_error;
      
      responseHTML = `
        <div class="response-success">
          <h3>⚡ Action Completed</h3>
          <div class="command-display">
            <strong>You said:</strong> "${result.data.original_command}"
          </div>
          <div class="action-details">
            <h4>📝 Action Details</h4>
            <p><strong>Action:</strong> ${interpretedAction.action}</p>
            <p><strong>Sheet:</strong> ${interpretedAction.tabName}</p>
            <p><strong>Item:</strong> ${interpretedAction.item}</p>
            <p><strong>Quantity:</strong> ${interpretedAction.qty}kg</p>
            <p><strong>Price:</strong> $${interpretedAction.pricePerKg}/kg</p>
            <p><strong>Status:</strong> ${interpretedAction.status}</p>
            ${interpretedAction.qty && interpretedAction.pricePerKg ? `
              <p><strong>Total Value:</strong> $${(interpretedAction.qty * interpretedAction.pricePerKg).toFixed(2)}</p>
            ` : ''}
          </div>
          <div class="result-status ${hasError ? 'error' : 'success'}">
            <p><strong>Result:</strong> ${result.message}</p>
            ${hasApiResponse ? `
              <small>✅ Processed via Google Sheets API</small>
            ` : `
              <small>📄 Processed via Google Apps Script</small>
            `}
            ${hasError ? `
              <div class="error-details">
                <small>❌ Error: ${result.data.sheets_error}</small>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    responseContainer.innerHTML = responseHTML;
    responseContainer.className = 'response-container success';
    
    // Show conversation history button if we have history
    if (conversationHistory.length > 1) {
      addConversationHistoryButton();
    }
  }
  
  function displayErrorResponse(error) {
    let errorHTML = `
      <div class="response-error">
        <h3>❌ Error</h3>
        <p>${error.message}</p>
    `;
    
    // Handle specific error cases
    if (error.message.includes('OpenAI') || error.message.includes('AI processing')) {
      errorHTML += `
        <div class="help-info">
          <p><strong>Note:</strong> Natural language processing requires an OpenAI API key. 
          The system is currently using mock responses.</p>
        </div>
      `;
    }
    
    if (error.message.includes('authentication') || error.message.includes('Google')) {
      errorHTML += `
        <div class="help-info">
          <p><strong>Tip:</strong> Try connecting your Google Sheets account for full functionality.</p>
          <button onclick="authenticateGoogleSheets()" class="action-button">Connect Google Sheets</button>
        </div>
      `;
    }
    
    errorHTML += `</div>`;
    responseContainer.innerHTML = errorHTML;
    responseContainer.className = 'response-container error';
  }
  
  function addConversationHistoryButton() {
    const existingButton = document.getElementById('showHistory');
    if (!existingButton) {
      const historyButton = document.createElement('button');
      historyButton.id = 'showHistory';
      historyButton.textContent = `Show Conversation History (${conversationHistory.length})`;
      historyButton.className = 'action-button secondary';
      historyButton.addEventListener('click', showConversationHistory);
      
      responseContainer.appendChild(historyButton);
    } else {
      existingButton.textContent = `Show Conversation History (${conversationHistory.length})`;
    }
  }
  
  function showConversationHistory() {
    const historyHTML = `
      <div class="conversation-history">
        <h3>💬 Conversation History</h3>
        ${conversationHistory.map((entry, index) => `
          <div class="history-entry">
            <div class="history-command">
              <strong>${index + 1}. You:</strong> "${entry.command}"
            </div>
            <div class="history-response">
              <strong>AI:</strong> ${
                entry.response.type === 'answer' 
                  ? entry.response.data.answer 
                  : `${entry.response.message} (${entry.response.data.interpreted_action?.action})`
              }
            </div>
            <div class="history-time">
              <small>${entry.timestamp.toLocaleTimeString()}</small>
            </div>
          </div>
        `).join('')}
        <button onclick="hideConversationHistory()" class="action-button secondary">Hide History</button>
      </div>
    `;
    
    responseContainer.innerHTML = historyHTML;
  }
  
  function hideConversationHistory() {
    if (conversationHistory.length > 0) {
      const lastEntry = conversationHistory[conversationHistory.length - 1];
      displayEnhancedResponse(lastEntry.response);
    }
  }
  
  // Make functions globally available
  window.hideConversationHistory = hideConversationHistory;
  window.authenticateGoogleSheets = authenticateGoogleSheets;
  
  function waitForNextCommand() {
    if (!isListening) {
      updateStatus('ready', 'Ready for next command. Click to speak again.');
      
      // Auto-highlight the start button
      startButton.classList.add('pulse');
      setTimeout(() => {
        startButton.classList.remove('pulse');
      }, 3000);
    }
  }
  
  function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
  
  function showErrorMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
  
  // Event listeners
  startButton.addEventListener('click', toggleListening);
  
  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptText = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcriptText;
      } else {
        interimTranscript += transcriptText;
      }
    }
    
    transcript.textContent = finalTranscript || interimTranscript;
    currentCommand = finalTranscript || interimTranscript;
    
    if (finalTranscript) {
      const commandData = parseVoiceCommand(finalTranscript);
      
      if (commandData) {
        stopListening();
        processVoiceCommand(commandData);
      } else {
        updateStatus('error', 'No command detected. Please try speaking again.');
        responseContainer.innerHTML = `
          <div class="response-error">
            <h3>🤔 No Command Detected</h3>
            <p>I couldn't understand what you said. Please try again with a clear command.</p>
            <div class="help-info">
              <p><strong>Examples:</strong></p>
              <ul>
                <li>"Add 2 kilos of apples to my grocery list"</li>
                <li>"How much does John owe me?"</li>
                <li>"Show me my pending items"</li>
              </ul>
            </div>
          </div>
        `;
        responseContainer.className = 'response-container error';
        
        setTimeout(() => {
          updateStatus('ready', 'Ready to try again');
        }, 3000);
      }
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    startButton.textContent = '🎤 Start Listening';
    startButton.className = 'mic-button';
    
    let errorMessage = 'Speech recognition error';
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not accessible. Please check permissions.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone permission denied. Please allow access.';
        break;
      case 'network':
        errorMessage = 'Network error. Please check your connection.';
        break;
      default:
        errorMessage = `Speech recognition error: ${event.error}`;
    }
    
    updateStatus('error', errorMessage);
  };
  
  recognition.onend = () => {
    isListening = false;
    startButton.textContent = '🎤 Start Listening';
    startButton.className = 'mic-button';
    
    if (currentCommand && currentCommand.trim()) {
      // Command was processed, status will be updated by processVoiceCommand
    } else {
      updateStatus('ready', 'Ready for voice command');
    }
  };
  
  // Keyboard shortcut for voice activation
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && event.ctrlKey) {
      event.preventDefault();
      toggleListening();
    }
  });
  
  console.log('🎤 Ara Voice - Google Sheets God frontend initialized');
  console.log('💡 Press Ctrl+Space to start/stop voice recognition');
});