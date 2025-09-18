/**
 * Google Apps Script Web App for Voice-to-Sheets Integration
 * 
 * This script receives POST requests from the Node.js backend and updates
 * a Google Sheet with voice command data.
 * 
 * Expected JSON payload:
 * {
 *   "tabName": "string",
 *   "item": "string", 
 *   "qty": number,
 *   "pricePerKg": number,
 *   "status": "string"
 * }
 */

/**
 * Main entry point for HTTP requests
 * Handles both GET and POST requests
 */
function doPost(e) {
  try {
    // Log the incoming request for debugging
    console.log('Received POST request:', e.postData.contents);
    
    // Parse the JSON payload
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error', 
          message: 'Invalid JSON format' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Validate required fields
    if (!data.tabName || !data.item || 
        typeof data.qty !== 'number' || 
        typeof data.pricePerKg !== 'number' || 
        !data.status) {
      console.error('Missing required fields:', data);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error', 
          message: 'Missing required fields: tabName, item, qty, pricePerKg, status' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Process the data and update the sheet
    const result = updateSheet(data);
    
    if (result.success) {
      console.log('Successfully updated sheet');
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'success', 
          message: 'Sheet updated successfully',
          data: result.data
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      console.error('Failed to update sheet:', result.error);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error', 
          message: result.error 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('Unexpected error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Internal server error' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing purposes)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'success', 
      message: 'Voice-to-Sheets Web App is running',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Update the Google Sheet with the provided data
 * @param {Object} data - The data to insert
 * @returns {Object} - Success/failure result
 */
function updateSheet(data) {
  try {
    // Get or create the spreadsheet
    let spreadsheet;
    try {
      // Try to get existing spreadsheet by ID (you'll need to set this)
      // For now, we'll create a new one or get by name
      const files = DriveApp.getFilesByName('Voice Commands Sheet');
      if (files.hasNext()) {
        spreadsheet = SpreadsheetApp.open(files.next());
      } else {
        spreadsheet = SpreadsheetApp.create('Voice Commands Sheet');
      }
    } catch (driveError) {
      console.error('Error accessing spreadsheet:', driveError);
      return { success: false, error: 'Could not access spreadsheet' };
    }
    
    // Get or create the tab/worksheet
    let sheet = spreadsheet.getSheetByName(data.tabName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(data.tabName);
      // Add headers for new sheets
      sheet.getRange(1, 1, 1, 6).setValues([
        ['Timestamp', 'Item', 'Quantity (kg)', 'Price per Kg', 'Total', 'Status']
      ]);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }
    
    // Calculate total price
    const total = data.qty * data.pricePerKg;
    
    // Prepare the row data
    const rowData = [
      new Date(), // Timestamp
      data.item,
      data.qty,
      data.pricePerKg,
      total,
      data.status
    ];
    
    // Find the next empty row
    const lastRow = sheet.getLastRow();
    const nextRow = lastRow + 1;
    
    // Insert the data
    sheet.getRange(nextRow, 1, 1, 6).setValues([rowData]);
    
    // Format the new row
    sheet.getRange(nextRow, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(nextRow, 3).setNumberFormat('0.00');
    sheet.getRange(nextRow, 4).setNumberFormat('$0.00');
    sheet.getRange(nextRow, 5).setNumberFormat('$0.00');
    
    console.log(`Successfully added row ${nextRow} to sheet ${data.tabName}`);
    
    return { 
      success: true, 
      data: {
        spreadsheetId: spreadsheet.getId(),
        sheetName: data.tabName,
        row: nextRow,
        total: total
      }
    };
    
  } catch (error) {
    console.error('Error updating sheet:', error);
    return { 
      success: false, 
      error: `Failed to update sheet: ${error.message}` 
    };
  }
}

/**
 * Test function for development
 */
function testUpdate() {
  const testData = {
    tabName: 'TestTab',
    item: 'apple',
    qty: 2.5,
    pricePerKg: 1000,
    status: 'owes'
  };
  
  const result = updateSheet(testData);
  console.log('Test result:', result);
}