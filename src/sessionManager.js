/**
 * Session Management for Conversational Context
 * 
 * Manages user sessions, conversation history, and context for the AI assistant.
 */

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxSessionAge = 30 * 60 * 1000; // 30 minutes
    this.maxHistoryLength = 50; // Keep last 50 interactions per session
    
    // Clean up old sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Get or create a session
   */
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date(),
        lastActivity: new Date(),
        history: [],
        context: {
          currentSpreadsheetId: null,
          preferredSheetName: 'groceries',
          lastActions: [],
          userPreferences: {}
        },
        userData: {
          authenticated: false,
          googleTokens: null,
          name: null
        }
      });
    }

    const session = this.sessions.get(sessionId);
    session.lastActivity = new Date();
    return session;
  }

  /**
   * Add an interaction to session history
   */
  addInteraction(sessionId, interaction) {
    const session = this.getSession(sessionId);
    
    const entry = {
      timestamp: new Date(),
      command: interaction.command,
      response: interaction.response,
      type: interaction.type || 'unknown',
      success: interaction.success !== false
    };

    session.history.push(entry);

    // Keep only the last N interactions
    if (session.history.length > this.maxHistoryLength) {
      session.history = session.history.slice(-this.maxHistoryLength);
    }

    // Update context based on the interaction
    this.updateContext(session, entry);
  }

  /**
   * Update session context based on interaction
   */
  updateContext(session, interaction) {
    if (interaction.type === 'action' && interaction.response && interaction.response.data) {
      // Track recent actions for reference
      const action = {
        timestamp: interaction.timestamp,
        action: interaction.response.data.interpreted_action?.action,
        item: interaction.response.data.interpreted_action?.item,
        tabName: interaction.response.data.interpreted_action?.tabName
      };

      session.context.lastActions.unshift(action);
      
      // Keep only last 10 actions
      if (session.context.lastActions.length > 10) {
        session.context.lastActions = session.context.lastActions.slice(0, 10);
      }

      // Update preferred sheet if specified
      if (action.tabName) {
        session.context.preferredSheetName = action.tabName;
      }
    }
  }

  /**
   * Get conversation context for AI processing
   */
  getConversationContext(sessionId) {
    const session = this.getSession(sessionId);
    
    const recentHistory = session.history.slice(-5); // Last 5 interactions
    const recentActions = session.context.lastActions.slice(0, 3); // Last 3 actions

    return {
      sessionId,
      recentHistory: recentHistory.map(h => ({
        command: h.command,
        type: h.type,
        success: h.success,
        timestamp: h.timestamp
      })),
      recentActions,
      preferredSheetName: session.context.preferredSheetName,
      currentSpreadsheetId: session.context.currentSpreadsheetId,
      userPreferences: session.context.userPreferences
    };
  }

  /**
   * Set user authentication status
   */
  setUserAuth(sessionId, tokens, userData = {}) {
    const session = this.getSession(sessionId);
    session.userData.authenticated = true;
    session.userData.googleTokens = tokens;
    session.userData.name = userData.name || null;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(sessionId) {
    const session = this.sessions.get(sessionId);
    return session && session.userData.authenticated && session.userData.googleTokens;
  }

  /**
   * Get user's Google tokens
   */
  getUserTokens(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.userData.googleTokens : null;
  }

  /**
   * Set current spreadsheet for session
   */
  setCurrentSpreadsheet(sessionId, spreadsheetId) {
    const session = this.getSession(sessionId);
    session.context.currentSpreadsheetId = spreadsheetId;
  }

  /**
   * Get current spreadsheet for session
   */
  getCurrentSpreadsheet(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.context.currentSpreadsheetId : null;
  }

  /**
   * Set user preference
   */
  setUserPreference(sessionId, key, value) {
    const session = this.getSession(sessionId);
    session.context.userPreferences[key] = value;
  }

  /**
   * Get user preference
   */
  getUserPreference(sessionId, key, defaultValue = null) {
    const session = this.sessions.get(sessionId);
    return session && session.context.userPreferences[key] !== undefined 
      ? session.context.userPreferences[key] 
      : defaultValue;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const totalInteractions = session.history.length;
    const successfulActions = session.history.filter(h => h.type === 'action' && h.success).length;
    const questions = session.history.filter(h => h.type === 'answer').length;

    return {
      sessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      totalInteractions,
      successfulActions,
      questions,
      authenticated: session.userData.authenticated,
      currentSpreadsheet: session.context.currentSpreadsheetId
    };
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions() {
    const now = new Date();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity;
      if (age > this.maxSessionAge) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      console.log(`Cleaning up expired session: ${sessionId}`);
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Get all active sessions (for admin/debug)
   */
  getActiveSessions() {
    return Array.from(this.sessions.keys()).map(sessionId => 
      this.getSessionStats(sessionId)
    );
  }

  /**
   * Clear session data
   */
  clearSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Analyze conversation patterns (for improving AI responses)
   */
  analyzeConversationPatterns(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const patterns = {
      commonCommands: {},
      frequentItems: {},
      preferredSheets: {},
      timePatterns: {}
    };

    session.history.forEach(interaction => {
      // Track command patterns
      const commandWords = interaction.command.toLowerCase().split(' ');
      commandWords.forEach(word => {
        if (word.length > 3) { // Ignore short words
          patterns.commonCommands[word] = (patterns.commonCommands[word] || 0) + 1;
        }
      });

      // Track items mentioned
      if (interaction.response && interaction.response.data && interaction.response.data.interpreted_action) {
        const item = interaction.response.data.interpreted_action.item;
        const tabName = interaction.response.data.interpreted_action.tabName;
        
        if (item) {
          patterns.frequentItems[item] = (patterns.frequentItems[item] || 0) + 1;
        }
        
        if (tabName) {
          patterns.preferredSheets[tabName] = (patterns.preferredSheets[tabName] || 0) + 1;
        }
      }

      // Track time patterns
      const hour = interaction.timestamp.getHours();
      patterns.timePatterns[hour] = (patterns.timePatterns[hour] || 0) + 1;
    });

    return patterns;
  }

  /**
   * Destroy the session manager and clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

module.exports = SessionManager;