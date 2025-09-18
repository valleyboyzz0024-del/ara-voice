/**
 * Google Apps Script Web App for Voice-to-Sheets Integration - "Google Sheets God" Edition
 * 
 * This enhanced script receives POST requests from the Node.js backend and performs
 * various Google Sheets operations based on conversational AI commands.
 * 
 * Supported Actions:
 * - addRow: Add a new row to a sheet
 * - updateRow: Update an existing row  
 * - deleteRow: Delete a row
 * - findRow: Search for rows
 * - readSheet: Read sheet contents
 * - createSheet: Create a new sheet
 * - formatCell: Format cells
 */

/**
 * Main entry point for HTTP requests - Enhanced Router
 * Handles both GET and POST requests with intelligent action routing
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
    
    // Route based on action type
    const action = data.action || 'addRow'; // default to addRow for backwards compatibility
    console.log('Processing action:', action);
    
    let result;
    
    switch (action) {
      case 'addRow':
        result = addRowToSheet(data);
        break;
      case 'updateRow':
        result = updateRowInSheet(data);
        break;
      case 'deleteRow':
        result = deleteRowFromSheet(data);
        break;
      case 'findRow':
        result = findRowInSheet(data);
        break;
      case 'readSheet':
        result = readSheetContents(data);
        break;
      case 'createSheet':
        result = createNewSheet(data);
        break;
      case 'formatCell':
        result = formatCellRange(data);
        break;
      default:
        // Fallback to legacy addRow behavior
        result = addRowToSheet(data);
    }
    
    if (result.success) {
      console.log('Successfully processed action:', action);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'success', 
          message: result.message || 'Action completed successfully',
          data: result.data,
          action: action
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      console.error('Failed to process action:', action, result.error);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: 'error', 
          message: result.error,
          action: action
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('Unexpected error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Internal server error',
        details: error.toString()
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
 * Update the Google Sheet with the provided data (Legacy function for backwards compatibility)
 * @param {Object} data - The data to insert
 * @returns {Object} - Success/failure result
 */
function updateSheet(data) {
  // Redirect to new addRowToSheet function
  return addRowToSheet(data);
}

/**
 * Get or create a spreadsheet by name
 * @param {string} sheetName - Name of the sheet/tab
 * @returns {Object} - {spreadsheet, sheet, success, error}
 */
function getOrCreateSpreadsheet(sheetName = 'Voice Commands Sheet') {
  try {
    let spreadsheet;
    
    // Try to get existing spreadsheet by name
    const files = DriveApp.getFilesByName('Voice Commands Sheet');
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      // Create new spreadsheet
      spreadsheet = SpreadsheetApp.create('Voice Commands Sheet');
      console.log('Created new spreadsheet:', spreadsheet.getId());
    }
    
    // Get or create the specific sheet/tab
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      // Add headers for new sheets
      sheet.getRange('A1:E1').setValues([['Timestamp', 'Item', 'Quantity', 'Price/kg', 'Status']]);
      sheet.getRange('A1:E1').setFontWeight('bold');
      console.log('Created new sheet:', sheetName);
    }
    
    return { spreadsheet, sheet, success: true };
    
  } catch (error) {
    console.error('Error accessing spreadsheet:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Add a row to the sheet (enhanced version of original updateSheet)
 * @param {Object} data - The data to insert
 * @returns {Object} - Success/failure result
 */
function addRowToSheet(data) {
  try {
    // Validate required fields for addRow
    if (!data.tabName || !data.item) {
      return { 
        success: false, 
        error: 'Missing required fields: tabName and item are required for addRow' 
      };
    }
    
    const { spreadsheet, sheet, success, error } = getOrCreateSpreadsheet(data.tabName);
    if (!success) return { success: false, error };
    
    // Prepare row data with defaults
    const timestamp = new Date().toLocaleString();
    const qty = data.qty || 1;
    const pricePerKg = data.pricePerKg || 0;
    const status = data.status || 'pending';
    const total = qty * pricePerKg;
    
    const rowData = [timestamp, data.item, qty, pricePerKg, status];
    
    // Add the row
    sheet.appendRow(rowData);
    
    console.log('Added row to sheet:', data.tabName, rowData);
    
    return { 
      success: true, 
      message: `Added "${data.item}" to ${data.tabName}`,
      data: { 
        item: data.item, 
        qty, 
        pricePerKg, 
        status, 
        total,
        timestamp 
      } 
    };
    
  } catch (error) {
    console.error('Error adding row to sheet:', error);
    return { 
      success: false, 
      error: `Failed to add row: ${error.message}` 
    };
  }
}

/**
 * Update an existing row in the sheet
 * @param {Object} data - The data containing rowIndex and updates
 * @returns {Object} - Success/failure result
 */
function updateRowInSheet(data) {
  try {
    if (!data.tabName || typeof data.rowIndex !== 'number') {
      return {
        success: false,
        error: 'Missing required fields: tabName and rowIndex'
      };
    }
    
    const { spreadsheet, sheet, success, error } = getOrCreateSpreadsheet(data.tabName);
    if (!success) return { success: false, error };
    
    const rowIndex = data.rowIndex + 1; // Convert to 1-based indexing
    const lastRow = sheet.getLastRow();
    
    if (rowIndex > lastRow || rowIndex < 2) {
      return {
        success: false,
        error: `Invalid row index: ${data.rowIndex}. Sheet has ${lastRow - 1} data rows.`
      };
    }
    
    // Get current row data
    const currentRow = sheet.getRange(rowIndex, 1, 1, 5).getValues()[0];
    
    // Update specific fields
    if (data.item) currentRow[1] = data.item;
    if (data.qty) currentRow[2] = data.qty;
    if (data.pricePerKg) currentRow[3] = data.pricePerKg;
    if (data.status) currentRow[4] = data.status;
    
    // Update timestamp
    currentRow[0] = new Date().toLocaleString();
    
    // Write updated row back
    sheet.getRange(rowIndex, 1, 1, 5).setValues([currentRow]);
    
    console.log('Updated row', data.rowIndex, 'in sheet:', data.tabName);
    
    return {
      success: true,
      message: `Updated row ${data.rowIndex} in ${data.tabName}`,
      data: { updatedRow: currentRow }
    };
    
  } catch (error) {
    console.error('Error updating row:', error);
    return {
      success: false,
      error: `Failed to update row: ${error.message}`
    };
  }
}

/**
 * Delete a row from the sheet
 * @param {Object} data - The data containing rowIndex or position
 * @returns {Object} - Success/failure result
 */
function deleteRowFromSheet(data) {
  try {
    if (!data.tabName) {
      return {
        success: false,
        error: 'Missing required field: tabName'
      };
    }
    
    const { spreadsheet, sheet, success, error } = getOrCreateSpreadsheet(data.tabName);
    if (!success) return { success: false, error };
    
    const lastRow = sheet.getLastRow();
    let rowToDelete;
    
    if (data.position === 'last') {
      rowToDelete = lastRow;
    } else if (typeof data.rowIndex === 'number') {
      rowToDelete = data.rowIndex + 1; // Convert to 1-based indexing
    } else {
      return {
        success: false,
        error: 'Must specify either rowIndex or position: "last"'
      };
    }
    
    if (rowToDelete < 2 || rowToDelete > lastRow) {
      return {
        success: false,
        error: `Invalid row to delete: ${rowToDelete - 1}. Sheet has ${lastRow - 1} data rows.`
      };
    }
    
    // Get the data before deleting for response
    const deletedData = sheet.getRange(rowToDelete, 1, 1, 5).getValues()[0];
    
    // Delete the row
    sheet.deleteRow(rowToDelete);
    
    console.log('Deleted row', rowToDelete - 1, 'from sheet:', data.tabName);
    
    return {
      success: true,
      message: `Deleted row from ${data.tabName}`,
      data: { deletedRow: deletedData }
    };
    
  } catch (error) {
    console.error('Error deleting row:', error);
    return {
      success: false,
      error: `Failed to delete row: ${error.message}`
    };
  }
}

/**
 * Find rows in the sheet based on query
 * @param {Object} data - The search parameters
 * @returns {Object} - Success/failure result with found rows
 */
function findRowInSheet(data) {
  try {
    if (!data.tabName || !data.query) {
      return {
        success: false,
        error: 'Missing required fields: tabName and query'
      };
    }
    
    const { spreadsheet, sheet, success, error } = getOrCreateSpreadsheet(data.tabName);
    if (!success) return { success: false, error };
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return {
        success: true,
        message: `No data found in ${data.tabName}`,
        data: { rows: [] }
      };
    }
    
    // Get all data
    const allData = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    const query = data.query.toLowerCase();
    
    // Search through rows
    const matchingRows = [];
    allData.forEach((row, index) => {
      const rowText = row.join(' ').toLowerCase();
      if (rowText.includes(query)) {
        matchingRows.push({
          rowIndex: index,
          data: row
        });
      }
    });
    
    console.log('Found', matchingRows.length, 'matching rows for query:', data.query);
    
    return {
      success: true,
      message: `Found ${matchingRows.length} matching rows`,
      data: { rows: matchingRows, query: data.query }
    };
    
  } catch (error) {
    console.error('Error finding rows:', error);
    return {
      success: false,
      error: `Failed to find rows: ${error.message}`
    };
  }
}

/**
 * Read entire sheet contents
 * @param {Object} data - The sheet name
 * @returns {Object} - Success/failure result with sheet data
 */
function readSheetContents(data) {
  try {
    if (!data.tabName) {
      return {
        success: false,
        error: 'Missing required field: tabName'
      };
    }
    
    const { spreadsheet, sheet, success, error } = getOrCreateSpreadsheet(data.tabName);
    if (!success) return { success: false, error };
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return {
        success: true,
        message: `Sheet ${data.tabName} is empty`,
        data: { 
          headers: ['Timestamp', 'Item', 'Quantity', 'Price/kg', 'Status'],
          rows: [] 
        }
      };
    }
    
    // Get headers and data
    const headers = sheet.getRange(1, 1, 1, 5).getValues()[0];
    const allData = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    
    console.log('Read', allData.length, 'rows from sheet:', data.tabName);
    
    return {
      success: true,
      message: `Retrieved ${allData.length} rows from ${data.tabName}`,
      data: {
        headers: headers,
        rows: allData,
        rowCount: allData.length
      }
    };
    
  } catch (error) {
    console.error('Error reading sheet:', error);
    return {
      success: false,
      error: `Failed to read sheet: ${error.message}`
    };
  }
}

/**
 * Create a new sheet/tab
 * @param {Object} data - The sheet name and optional headers
 * @returns {Object} - Success/failure result
 */
function createNewSheet(data) {
  try {
    if (!data.tabName) {
      return {
        success: false,
        error: 'Missing required field: tabName'
      };
    }
    
    // Get the main spreadsheet
    let spreadsheet;
    const files = DriveApp.getFilesByName('Voice Commands Sheet');
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      spreadsheet = SpreadsheetApp.create('Voice Commands Sheet');
    }
    
    // Check if sheet already exists
    if (spreadsheet.getSheetByName(data.tabName)) {
      return {
        success: false,
        error: `Sheet "${data.tabName}" already exists`
      };
    }
    
    // Create new sheet
    const newSheet = spreadsheet.insertSheet(data.tabName);
    
    // Add headers (use custom headers if provided, otherwise default)
    const headers = data.headers || ['Timestamp', 'Item', 'Quantity', 'Price/kg', 'Status'];
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    newSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    
    console.log('Created new sheet:', data.tabName);
    
    return {
      success: true,
      message: `Created new sheet: ${data.tabName}`,
      data: {
        sheetName: data.tabName,
        headers: headers
      }
    };
    
  } catch (error) {
    console.error('Error creating sheet:', error);
    return {
      success: false,
      error: `Failed to create sheet: ${error.message}`
    };
  }
}

/**
 * Format cells in a range
 * @param {Object} data - The format parameters
 * @returns {Object} - Success/failure result
 */
function formatCellRange(data) {
  try {
    if (!data.tabName || !data.range) {
      return {
        success: false,
        error: 'Missing required fields: tabName and range'
      };
    }
    
    const { spreadsheet, sheet, success, error } = getOrCreateSpreadsheet(data.tabName);
    if (!success) return { success: false, error };
    
    const range = sheet.getRange(data.range);
    
    // Apply formatting based on provided options
    if (data.bold) range.setFontWeight('bold');
    if (data.italic) range.setFontStyle('italic');
    if (data.backgroundColor) range.setBackground(data.backgroundColor);
    if (data.fontColor) range.setFontColor(data.fontColor);
    if (data.fontSize) range.setFontSize(data.fontSize);
    if (data.numberFormat) range.setNumberFormat(data.numberFormat);
    
    console.log('Applied formatting to range', data.range, 'in sheet:', data.tabName);
    
    return {
      success: true,
      message: `Applied formatting to ${data.range} in ${data.tabName}`,
      data: {
        range: data.range,
        formatting: data
      }
    };
    
  } catch (error) {
    console.error('Error formatting cells:', error);
    return {
      success: false,
      error: `Failed to format cells: ${error.message}`
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