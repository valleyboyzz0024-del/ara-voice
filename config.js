/**
 * Configuration management for the Voice-to-Sheets application
 */

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 10000,
    host: process.env.HOST || 'localhost'
  },
  
  // Authentication
  auth: {
    secretKey: process.env.SECRET_KEY || 'pickle prince pepsi'
  },
  
  // Google Apps Script configuration
  googleAppsScript: {
    // Replace this URL with your deployed Google Apps Script Web App URL
    url: process.env.GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxMVX5F3_JE8aoVXJUgbXLPx6qYPDxqKeUvdz7dxAZlhCEUyZiOA_DYcbudJN3ZG4pOeA/exec',
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000 // 10 seconds
  },
  
  // Voice command parsing configuration
  voice: {
    expectedFormat: 'pickle prince pepsi [tab] [item] [qty] at [price] [status]',
    minimumWords: 8
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true
  }
};

module.exports = config;