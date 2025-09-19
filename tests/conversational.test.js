const request = require('supertest');
const express = require('express');

// Mock the server without starting it
jest.mock('../config', () => ({
  googleAppsScriptUrl: 'https://test-mode/fake-url',
  port: 3000,
  requestTimeout: 5000
}));

// Import the app after mocking config
let app;

describe('Conversational Data Assistant Tests', () => {
  beforeAll(() => {
    // Import server after mocking to avoid starting it
    delete require.cache[require.resolve('../server')];
    process.env.NODE_ENV = 'test';
    app = require('../server');
  });

  describe('/voice-command endpoint', () => {
    test('should answer questions about data (mock AI)', async () => {
      const response = await request(app)
        .post('/voice-command')
        .send({
          command: 'How much does Hulk owe in total?',
          sessionId: 'test-session'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.type).toBe('answer');
      expect(response.body.data.answer).toContain('Hulk owes');
      expect(response.body.data.action_type).toBe('answer');
    });

    test('should handle "what items do I have" questions', async () => {
      const response = await request(app)
        .post('/voice-command')
        .send({
          command: 'What items do I have in my list?',
          sessionId: 'test-session'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.type).toBe('answer');
      expect(response.body.data.answer).toContain('apples');
    });

    test('should handle "show pending items" questions', async () => {
      const response = await request(app)
        .post('/voice-command')
        .send({
          command: 'Show me all pending items',
          sessionId: 'test-session'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.type).toBe('answer');
      expect(response.body.data.answer).toContain('pending');
    });

    test('should still handle adding data commands', async () => {
      const response = await request(app)
        .post('/voice-command')
        .send({
          command: 'Add 3 kilos of oranges to groceries',
          sessionId: 'test-session'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.type).toBe('action');
      expect(response.body.data.interpreted_action.action).toBe('addRow');
      expect(response.body.data.interpreted_action.item).toBe('oranges');
      expect(response.body.data.interpreted_action.qty).toBe(3);
    });

    test('should provide helpful response for unrecognized questions', async () => {
      const response = await request(app)
        .post('/voice-command')
        .send({
          command: 'What is the meaning of life?',
          sessionId: 'test-session'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.type).toBe('answer');
      expect(response.body.data.answer).toContain('help you with questions');
    });

    test('should reject empty commands', async () => {
      const response = await request(app)
        .post('/voice-command')
        .send({
          sessionId: 'test-session'
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('No valid command provided');
    });

    test('should handle session IDs properly', async () => {
      const response1 = await request(app)
        .post('/voice-command')
        .send({
          command: 'How much do I owe?',
          sessionId: 'session-1'
        });

      const response2 = await request(app)
        .post('/voice-command')
        .send({
          command: 'How much do I owe?',
          sessionId: 'session-2'
        });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      // Both should get the same answer but in different sessions
      expect(response1.body.type).toBe('answer');
      expect(response2.body.type).toBe('answer');
    });
  });

  describe('Conversational Intelligence Tests', () => {
    test('should distinguish between questions and commands', async () => {
      // Question
      const questionResponse = await request(app)
        .post('/voice-command')
        .send({
          command: 'How much money do I owe?',
          sessionId: 'test'
        });

      // Command
      const commandResponse = await request(app)
        .post('/voice-command')
        .send({
          command: 'Add 2 kilos of bananas to groceries',
          sessionId: 'test'
        });

      expect(questionResponse.body.type).toBe('answer');
      expect(commandResponse.body.type).toBe('action');
    });

    test('should handle complex questions about specific people/items', async () => {
      const response = await request(app)
        .post('/voice-command')
        .send({
          command: 'How much does Hulk owe me in total?',
          sessionId: 'test'
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('answer');
      expect(response.body.data.answer).toContain('Hulk');
      expect(response.body.data.answer).toContain('$3,000');
    });
  });
});