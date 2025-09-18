const request = require('supertest');
const express = require('express');
const config = require('../config');
const { validateAuth, validateBearerToken, validateSpokenPin } = require('../index');

// Import server app - we need to create a test version
const app = express();
app.use(express.json());

// Add the webhook endpoint for testing
app.post('/webhook/voice', async (req, res) => {
  try {
    let isAuthenticated = false;
    let authMethod = '';
    const sessionId = req.headers['x-session-id'] || 'default';
    
    // Primary authentication: Bearer token
    if (validateBearerToken(req.headers.authorization)) {
      isAuthenticated = true;
      authMethod = 'Bearer token';
    }
    // Backup authentication: Spoken PIN in command
    else if (req.body.command && typeof req.body.command === 'string') {
      const words = req.body.command.toLowerCase().trim().split(/\s+/);
      
      // Check if command starts with "pin is [PIN]"
      if (words.length >= 3 && words[0] === 'pin' && words[1] === 'is') {
        const spokenPin = words[2];
        if (validateSpokenPin(spokenPin)) {
          return res.json({
            status: 'success',
            message: 'PIN authenticated. You can now send your voice command.',
            authMethod: 'Spoken PIN'
          });
        } else {
          return res.status(401).json({
            status: 'error',
            message: 'Invalid PIN'
          });
        }
      }
    }
    
    if (!isAuthenticated) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Provide Bearer token in Authorization header or spoken PIN with "pin is 1234".',
        authMethods: ['Bearer token in Authorization header', 'Spoken PIN: "pin is [PIN]"']
      });
    }
    
    // If authenticated, return success (we won't test the full command processing here)
    res.json({ 
      status: 'success', 
      message: 'Command would be processed',
      authMethod: authMethod
    });
    
  } catch (error) {
    console.error('Unexpected error in /webhook/voice:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
});

describe('Authentication Tests', () => {
  
  describe('validateAuth function', () => {
    test('should return true for correct secret key', () => {
      expect(validateAuth('test-secret-key')).toBe(true);
    });
    
    test('should return false for incorrect secret key', () => {
      expect(validateAuth('wrong-key')).toBe(false);
    });
    
    test('should return false for empty key', () => {
      expect(validateAuth('')).toBe(false);
    });
  });
  
  describe('validateBearerToken function', () => {
    test('should return true for correct bearer token', () => {
      expect(validateBearerToken('Bearer test-bearer-token')).toBe(true);
    });
    
    test('should return false for incorrect bearer token', () => {
      expect(validateBearerToken('Bearer wrong-token')).toBe(false);
    });
    
    test('should return false for malformed authorization header', () => {
      expect(validateBearerToken('test-bearer-token')).toBe(false);
    });
    
    test('should return false for empty header', () => {
      expect(validateBearerToken('')).toBe(false);
    });
    
    test('should return false for null header', () => {
      expect(validateBearerToken(null)).toBe(false);
    });
  });
  
  describe('validateSpokenPin function', () => {
    test('should return true for correct PIN', () => {
      expect(validateSpokenPin('1234')).toBe(true);
    });
    
    test('should return false for incorrect PIN', () => {
      expect(validateSpokenPin('9999')).toBe(false);
    });
    
    test('should return false for empty PIN', () => {
      expect(validateSpokenPin('')).toBe(false);
    });
  });
  
  describe('/webhook/voice endpoint authentication', () => {
    test('should return 401 when no authentication provided', async () => {
      const response = await request(app)
        .post('/webhook/voice')
        .send({ command: 'test command' });
      
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Authentication required');
    });
    
    test('should return 401 when invalid bearer token provided', async () => {
      const response = await request(app)
        .post('/webhook/voice')
        .set('Authorization', 'Bearer wrong-token')
        .send({ command: 'test command' });
      
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });
    
    test('should return 200 when valid bearer token provided', async () => {
      const response = await request(app)
        .post('/webhook/voice')
        .set('Authorization', 'Bearer test-bearer-token')
        .send({ command: 'test command' });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.authMethod).toBe('Bearer token');
    });
    
    test('should authenticate with correct spoken PIN', async () => {
      const response = await request(app)
        .post('/webhook/voice')
        .send({ command: 'pin is 1234' });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.authMethod).toBe('Spoken PIN');
      expect(response.body.message).toContain('PIN authenticated');
    });
    
    test('should reject incorrect spoken PIN', async () => {
      const response = await request(app)
        .post('/webhook/voice')
        .send({ command: 'pin is 9999' });
      
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid PIN');
    });
  });
});