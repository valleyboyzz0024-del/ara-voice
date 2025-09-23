/**
 * Google Sheets API Integration Module
 * 
 * Provides comprehensive Google Sheets operations using the official Google API
 * with OAuth2 authentication and full CRUD capabilities.
 */

const { google } = require('googleapis');
require('dotenv').config();

class GoogleSheetsAPI {
  constructor() {
    this.oauth2Client = null;
    this.sheets = null;
    this.drive = null;
    this.initialized = false;
    
    this.setupCredentials();
  }

  setupCredentials() {
    try {
      // OAuth2 Client setup for user authentication
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        this.oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
        );

        // If we have a refresh token, set it
        if (process.env.GOOGLE_REFRESH_TOKEN) {
          this.oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
          });
        }

        this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        this.initialized = true;
      }
      // Service Account setup (alternative)
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        const auth = new google.auth.GoogleAuth({
          credentials: serviceAccountKey,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file'
          ]
        });

        this.sheets = google.sheets({ version: 'v4', auth });
        this.drive = google.drive({ version: 'v3', auth });
        this.initialized = true;
      } else {
        console.warn('Google Sheets API: No credentials configured. Using fallback mode.');
      }
    } catch (error) {
      console.error('Error setting up Google Sheets API credentials:', error);
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not configured');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Check if API is properly initialized and authenticated
   */
  async isAuthenticated() {
    if (!this.initialized || !this.oauth2Client) {
      return false;
    }

    try {
      const { credentials } = this.oauth2Client;
      if (!credentials || !credentials.access_token) {
        return false;
      }

      // Test with a simple API call
      await this.sheets.spreadsheets.get({
        spreadsheetId: '1mNHBvHl4kJ8XfO5jzqQR5lGcGfE0j6r4YdnDjqE9f-8', // Test spreadsheet
        includeGridData: false
      });
      
      return true;
    } catch (error) {
      console.log('Authentication test failed:', error.message);
      return false;
    }
  }

  /**
   * Get or create a spreadsheet by name
   */
  async getOrCreateSpreadsheet(name = 'Ara Voice Data') {
    if (!this.initialized) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      // Search for existing spreadsheet
      const searchResponse = await this.drive.files.list({
        q: `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet'`,
        fields: 'files(id, name)'
      });

      if (searchResponse.data.files.length > 0) {
        const spreadsheetId = searchResponse.data.files[0].id;
        console.log(`Found existing spreadsheet: ${name} (${spreadsheetId})`);
        return spreadsheetId;
      }

      // Create new spreadsheet
      const createResponse = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title: name
          },
          sheets: [{
            properties: {
              title: 'groceries'
            }
          }]
        }
      });

      const spreadsheetId = createResponse.data.spreadsheetId;
      console.log(`Created new spreadsheet: ${name} (${spreadsheetId})`);

      // Add headers to the default sheet
      await this.addHeaders(spreadsheetId, 'groceries');

      return spreadsheetId;
    } catch (error) {
      console.error('Error getting/creating spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Add headers to a sheet
   */
  async addHeaders(spreadsheetId, sheetName, headers = ['Timestamp', 'Item', 'Quantity', 'Price/kg', 'Status', 'Person']) {
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:F1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });

      // Format headers
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0, // Assuming first sheet
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true
                  },
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9
                  }
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
          }]
        }
      });

      return response;
    } catch (error) {
      console.error('Error adding headers:', error);
      throw error;
    }
  }

  /**
   * Read all data from a spreadsheet
   */
  async readAllData(spreadsheetId) {
    if (!this.initialized) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      // Get spreadsheet info to find all sheets
      const spreadsheetInfo = await this.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      });

      const sheets = spreadsheetInfo.data.sheets;
      const allData = {};

      for (const sheet of sheets) {
        const sheetName = sheet.properties.title;
        
        try {
          const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: sheetName,
          });

          const values = response.data.values || [];
          if (values.length > 0) {
            const headers = values[0];
            const rows = values.slice(1);
            
            allData[sheetName] = rows.map(row => {
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });
          } else {
            allData[sheetName] = [];
          }
        } catch (error) {
          console.warn(`Could not read sheet ${sheetName}:`, error.message);
          allData[sheetName] = [];
        }
      }

      return allData;
    } catch (error) {
      console.error('Error reading spreadsheet data:', error);
      throw error;
    }
  }

  /**
   * Add a row to a specific sheet
   */
  async addRow(spreadsheetId, sheetName, data) {
    if (!this.initialized) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      const timestamp = new Date().toISOString();
      const values = [[
        timestamp,
        data.item || '',
        data.qty || 0,
        data.pricePerKg || 0,
        data.status || 'pending',
        data.person || 'User'
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:F`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values
        }
      });

      console.log(`Added row to ${sheetName}:`, values[0]);
      return response.data;
    } catch (error) {
      console.error('Error adding row:', error);
      throw error;
    }
  }

  /**
   * Update a row in a sheet
   */
  async updateRow(spreadsheetId, sheetName, rowIndex, data) {
    if (!this.initialized) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      const values = [[
        data.timestamp || new Date().toISOString(),
        data.item || '',
        data.qty || 0,
        data.pricePerKg || 0,
        data.status || 'pending',
        data.person || 'User'
      ]];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${rowIndex + 1}:F${rowIndex + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values
        }
      });

      console.log(`Updated row ${rowIndex + 1} in ${sheetName}`);
      return response.data;
    } catch (error) {
      console.error('Error updating row:', error);
      throw error;
    }
  }

  /**
   * Delete a row from a sheet
   */
  async deleteRow(spreadsheetId, sheetId, rowIndex) {
    if (!this.initialized) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      });

      console.log(`Deleted row ${rowIndex + 1} from sheet ${sheetId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting row:', error);
      throw error;
    }
  }

  /**
   * Create a new sheet/tab
   */
  async createSheet(spreadsheetId, sheetName) {
    if (!this.initialized) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName
              }
            }
          }]
        }
      });

      const sheetId = response.data.replies[0].addSheet.properties.sheetId;
      console.log(`Created new sheet: ${sheetName} (ID: ${sheetId})`);

      // Add headers to the new sheet
      await this.addHeaders(spreadsheetId, sheetName);

      return { sheetId, sheetName };
    } catch (error) {
      console.error('Error creating sheet:', error);
      throw error;
    }
  }

  /**
   * Search for rows matching criteria
   */
  async findRows(spreadsheetId, sheetName, searchCriteria) {
    if (!this.initialized) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      const allData = await this.readAllData(spreadsheetId);
      const sheetData = allData[sheetName] || [];

      const matchingRows = sheetData.filter(row => {
        return Object.keys(searchCriteria).every(key => {
          const value = row[key];
          const searchValue = searchCriteria[key];
          
          if (typeof searchValue === 'string') {
            return value && value.toLowerCase().includes(searchValue.toLowerCase());
          }
          return value == searchValue;
        });
      });

      return matchingRows;
    } catch (error) {
      console.error('Error finding rows:', error);
      throw error;
    }
  }
}

module.exports = GoogleSheetsAPI;