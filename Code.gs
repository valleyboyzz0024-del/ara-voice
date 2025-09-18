/**
 * Google Apps Script for Ara Voice - Voice to Google Sheets
 * This script receives JSON commands from the backend and executes them on Google Sheets
 */

// Configuration - Update these with your Google Sheet details
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your actual spreadsheet ID
const DEFAULT_SHEET_NAME = 'Inventory'; // Default sheet name if not specified

/**
 * Main function that handles POST requests from the backend
 */
function doPost(e) {
  try {
    // Log the incoming request for debugging
    console.log('Received POST request:', e.postData.contents);
    
    // Parse the JSON payload
    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return ContentService
        .createTextOutput('Invalid JSON payload: ' + parseError.message)
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
    // Validate required fields
    const validationError = validateRequestData(requestData);
    if (validationError) {
      console.error('Validation error:', validationError);
      return ContentService
        .createTextOutput('Validation error: ' + validationError)
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
    // Process the command
    const result = processCommand(requestData);
    
    if (result.success) {
      console.log('Command processed successfully:', result.message);
      return ContentService
        .createTextOutput(result.message)
        .setMimeType(ContentService.MimeType.TEXT);
    } else {
      console.error('Command processing failed:', result.error);
      return ContentService
        .createTextOutput('Error: ' + result.error)
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
  } catch (error) {
    console.error('Unexpected error in doPost:', error);
    return ContentService
      .createTextOutput('Server error: ' + error.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Validate the incoming request data
 */
function validateRequestData(data) {
  if (!data) {
    return 'Request data is empty';
  }
  
  if (!data.action) {
    return 'Missing required field: action';
  }
  
  if (!data.item) {
    return 'Missing required field: item';
  }
  
  if (data.quantity === undefined || data.quantity === null) {
    return 'Missing required field: quantity';
  }
  
  if (typeof data.quantity !== 'number' || isNaN(data.quantity)) {
    return 'Invalid quantity: must be a number';
  }
  
  if (data.pricePerUnit !== undefined && (typeof data.pricePerUnit !== 'number' || isNaN(data.pricePerUnit))) {
    return 'Invalid pricePerUnit: must be a number';
  }
  
  return null; // No validation errors
}

/**
 * Process the command based on the action type
 */
function processCommand(data) {
  try {
    const action = data.action.toLowerCase();
    
    switch (action) {
      case 'add':
        return addItemToSheet(data);
      case 'update':
        return updateItemInSheet(data);
      case 'delete':
        return deleteItemFromSheet(data);
      default:
        return { success: false, error: `Unsupported action: ${action}` };
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Add a new item to the Google Sheet
 */
function addItemToSheet(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = data.tabName || DEFAULT_SHEET_NAME;
    
    // Get or create the sheet
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      // Add headers if it's a new sheet
      const headers = ['Timestamp', 'Item', 'Quantity', 'Price Per Unit', 'Total Value', 'Status', 'Notes'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
    
    // Prepare the row data
    const timestamp = new Date();
    const item = data.item;
    const quantity = data.quantity;
    const pricePerUnit = data.pricePerUnit || 0;
    const totalValue = quantity * pricePerUnit;
    const status = data.status || 'added';
    const notes = data.notes || '';
    
    // Add the new row
    const newRow = [timestamp, item, quantity, pricePerUnit, totalValue, status, notes];
    sheet.appendRow(newRow);
    
    // Format the new row (optional)
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss'); // Format timestamp
    sheet.getRange(lastRow, 4).setNumberFormat('$#,##0.00'); // Format price
    sheet.getRange(lastRow, 5).setNumberFormat('$#,##0.00'); // Format total value
    
    const message = `Added ${quantity} units of "${item}" to sheet "${sheetName}"`;
    return { success: true, message: message };
    
  } catch (error) {
    return { success: false, error: `Failed to add item: ${error.message}` };
  }
}

/**
 * Update an existing item in the Google Sheet
 */
function updateItemInSheet(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = data.tabName || DEFAULT_SHEET_NAME;
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return { success: false, error: `Sheet "${sheetName}" not found` };
    }
    
    // Find the item in the sheet (search in the Item column)
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Start from 1 to skip headers
      if (values[i][1] && values[i][1].toString().toLowerCase() === data.item.toLowerCase()) {
        rowIndex = i + 1; // Convert to 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: `Item "${data.item}" not found in sheet "${sheetName}"` };
    }
    
    // Update the row
    const timestamp = new Date();
    const quantity = data.quantity;
    const pricePerUnit = data.pricePerUnit || values[rowIndex - 1][3]; // Use existing price if not provided
    const totalValue = quantity * pricePerUnit;
    const status = data.status || values[rowIndex - 1][5]; // Use existing status if not provided
    const notes = data.notes || values[rowIndex - 1][6]; // Use existing notes if not provided
    
    sheet.getRange(rowIndex, 1).setValue(timestamp); // Update timestamp
    sheet.getRange(rowIndex, 3).setValue(quantity); // Update quantity
    sheet.getRange(rowIndex, 4).setValue(pricePerUnit); // Update price
    sheet.getRange(rowIndex, 5).setValue(totalValue); // Update total value
    sheet.getRange(rowIndex, 6).setValue(status); // Update status
    sheet.getRange(rowIndex, 7).setValue(notes); // Update notes
    
    const message = `Updated "${data.item}" in sheet "${sheetName}" - new quantity: ${quantity}`;
    return { success: true, message: message };
    
  } catch (error) {
    return { success: false, error: `Failed to update item: ${error.message}` };
  }
}

/**
 * Delete an item from the Google Sheet
 */
function deleteItemFromSheet(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = data.tabName || DEFAULT_SHEET_NAME;
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return { success: false, error: `Sheet "${sheetName}" not found` };
    }
    
    // Find the item in the sheet
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Start from 1 to skip headers
      if (values[i][1] && values[i][1].toString().toLowerCase() === data.item.toLowerCase()) {
        rowIndex = i + 1; // Convert to 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: `Item "${data.item}" not found in sheet "${sheetName}"` };
    }
    
    // Delete the row
    sheet.deleteRow(rowIndex);
    
    const message = `Deleted "${data.item}" from sheet "${sheetName}"`;
    return { success: true, message: message };
    
  } catch (error) {
    return { success: false, error: `Failed to delete item: ${error.message}` };
  }
}

/**
 * Handle legacy format requests for backward compatibility
 */
function handleLegacyRequest(data) {
  // Convert legacy format to new format
  const convertedData = {
    action: 'add',
    tabName: data.tabName,
    item: data.item,
    quantity: data.qty,
    pricePerUnit: data.pricePerKg,
    status: data.status
  };
  
  return processCommand(convertedData);
}

/**
 * Test function for debugging (can be run from Apps Script editor)
 */
function testAddItem() {
  const testData = {
    action: 'add',
    tabName: 'Test',
    item: 'Test Item',
    quantity: 5,
    pricePerUnit: 2.50,
    status: 'in_stock',
    notes: 'Test entry from Apps Script'
  };
  
  const result = processCommand(testData);
  console.log('Test result:', result);
  return result;
}

/**
 * Function to initialize a new spreadsheet with proper structure
 */
function initializeSpreadsheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DEFAULT_SHEET_NAME) || 
                  spreadsheet.insertSheet(DEFAULT_SHEET_NAME);
    
    // Set up headers
    const headers = ['Timestamp', 'Item', 'Quantity', 'Price Per Unit', 'Total Value', 'Status', 'Notes'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
    
    console.log('Spreadsheet initialized successfully');
    return { success: true, message: 'Spreadsheet initialized' };
    
  } catch (error) {
    console.error('Failed to initialize spreadsheet:', error);
    return { success: false, error: error.message };
  }
}