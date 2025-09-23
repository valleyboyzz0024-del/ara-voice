/**
 * Webhook Handler for Ara Voice Application
 * 
 * Handles webhook requests with authentication and command processing.
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * Main webhook handler function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export default function webhookHandler(req, res) {
  try {
    console.log('Webhook request received:', {
      headers: req.headers,
      body: req.body,
      method: req.method
    });

    // Extract command from request body
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        status: 'error',
        message: 'No command provided'
      });
    }

    // Basic response for now - will be enhanced in Phase 2
    res.json({
      status: 'success',
      message: 'Webhook received successfully',
      command: command,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
}