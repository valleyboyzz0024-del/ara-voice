/**
 * FINAL GOOGLE APPS SCRIPT FOR ARA VOICE AI
 * This script is 100% compatible with your server
 * 
 * IMPORTANT: Replace your entire Google Apps Script with this code
 */

// Your sheet IDs - UPDATE THESE WITH YOUR ACTUAL SHEET IDS
const SHEET_IDS = [
  '1CwV3uJ_fgs783230SQXvZs5kRGFFNmeaYRYYTT-yvkQ',
  '1aAb6jKRxisGKVQIex_HU59lX6X-Kkm4tTIH7qXfaEW0', 
  '1RIXQIyGZ9qfW3x3JdpwfBIMmoNf-r9zH7ffjk5jeYks',
  '1tGcU53sMpzuGrU3tDUilyj0KACnsjEfFY0t_5eW4pZM',
  '1dElu39ly3LNHAMZupg1OzWmAmoDZVMRWXX5x2ksw12Q'
];

// Sheet friendly names
const SHEET_NAMES = {
  '1CwV3uJ_fgs783230SQXvZs5kRGFFNmeaYRYYTT-yvkQ': 'Groceries',
  '1aAb6jKRxisGKVQIex_HU59lX6X-Kkm4tTIH7qXfaEW0': 'Expenses',
  '1RIXQIyGZ9qfW3x3JdpwfBIMmoNf-r9zH7ffjk5jeYks': 'Tasks',
  '1tGcU53sMpzuGrU3tDUilyj0KACnsjEfFY0t_5eW4pZM': 'Shopping',
  '1dElu39ly3LNHAMZupg1OzWmAmoDZVMRWXX5x2ksw12Q': 'Budget'
};

/**
 * Main entry point for HTTP requests
 */
function doPost(e) {
  try {
    console.log('📥 Received request:', e.postData.contents);
    
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      return createResponse({
        status: 'error',
        message: 'Invalid JSON format'
      });
    }
    
    const action = data.action || 'getSheetNames';
    console.log('🎯 Processing action:', action);
    
    let result;
    
    switch (action) {
      case 'getSheetNames':
        result = getSheetNames();
        break;
      case 'addRow':
        result = addRow(data);
        break;
      case 'readSheet':
        result = readSheet(data);
        break;
      default:
        result = {
          status: 'error',
          message: `Unknown action: ${action}`
        };
    }
    
    console.log('✅ Result:', JSON.stringify(result));
    return createResponse(result);
    
  } catch (error) {
    console.error('💥 Error in doPost:', error);
    return createResponse({
      status: 'error',
      message: `Server error: ${error.toString()}`
    });
  }
}

/**
 * Get all available sheet names from all spreadsheets
 */
function getSheetNames() {
  try {
    const allSheets = [];
    
    SHEET_IDS.forEach(sheetId => {
      try {
        const spreadsheet = SpreadsheetApp.openById(sheetId);
        const sheets = spreadsheet.getSheets();
        const friendlyName = SHEET_NAMES[sheetId] || `Sheet_${sheetId.substring(0, 8)}`;
        
        sheets.forEach(sheet => {
          allSheets.push(friendlyName + "_" + sheet.getName());
        });
        
        console.log(`✅ Loaded sheets from ${friendlyName}`);
      } catch (sheetError) {
        console.error(`❌ Error loading sheet ${sheetId}:`, sheetError);
      }
    });
    
    return {
      status: 'success',
      sheetNames: allSheets,
      totalSheets: allSheets.length
    };
  } catch (error) {
    console.error('❌ Error getting sheet names:', error);
    return {
      status: 'error',
      message: `Failed to get sheet names: ${error.toString()}`
    };
  }
}

/**
 * Add a row to a sheet - Compatible with your server
 */
function addRow(data) {
  try {
    console.log('📝 Adding row with data:', JSON.stringify(data));
    
    // Check required fields
    if (!data.item) {
      return {
        status: 'error',
        message: 'Missing required field: item'
      };
    }
    
    // Get values from data
    const item = data.item || 'Unknown Item';
    const qty = data.qty || 1;
    const price = data.pricePerKg || 0;
    const status = data.status || 'pending';
    const tabName = data.tabName || 'Sheet1';
    
    console.log(`📊 Parsed: item=${item}, qty=${qty}, price=${price}, status=${status}, tabName=${tabName}`);
    
    // Determine which spreadsheet to use based on item type
    let targetSheetId = SHEET_IDS[0]; // Default to first sheet
    
    // Choose sheet based on item content
    const itemLower = item.toLowerCase();
    if (itemLower.includes('apple') || itemLower.includes('banana') || itemLower.includes('food') || itemLower.includes('grocery')) {
      targetSheetId = SHEET_IDS[0]; // Groceries
    } else if (itemLower.includes('expense') || itemLower.includes('cost') || itemLower.includes('money')) {
      targetSheetId = SHEET_IDS[1]; // Expenses
    } else if (itemLower.includes('task') || itemLower.includes('todo')) {
      targetSheetId = SHEET_IDS[2]; // Tasks
    } else if (itemLower.includes('shop') || itemLower.includes('buy')) {
      targetSheetId = SHEET_IDS[3]; // Shopping
    } else if (itemLower.includes('budget')) {
      targetSheetId = SHEET_IDS[4]; // Budget
    }
    
    console.log(`🎯 Using sheet ID: ${targetSheetId}`);
    
    const spreadsheet = SpreadsheetApp.openById(targetSheetId);
    let sheet = spreadsheet.getSheetByName(tabName);
    
    // If sheet doesn't exist, use the first sheet
    if (!sheet) {
      const sheets = spreadsheet.getSheets();
      if (sheets.length > 0) {
        sheet = sheets[0];
        console.log(`📋 Using first available sheet: ${sheet.getName()}`);
      } else {
        throw new Error('No sheets found in spreadsheet');
      }
    }
    
    // Add the row with timestamp
    const timestamp = new Date().toLocaleString();
    const rowData = [item, qty, price, status, timestamp];
    
    sheet.appendRow(rowData);
    
    return {
      status: 'success',
      message: `Added "${item}" to ${SHEET_NAMES[targetSheetId] || 'sheet'} successfully`,
      data: {
        item: item,
        qty: qty,
        price: price,
        status: status,
        timestamp: timestamp,
        sheetName: SHEET_NAMES[targetSheetId] || 'Unknown'
      }
    };
  } catch (error) {
    console.error('❌ Error adding row:', error);
    return {
      status: 'error',
      message: `Failed to add row: ${error.toString()}`
    };
  }
}

/**
 * Read data from a sheet
 */
function readSheet(data) {
  try {
    // Default to first sheet if no sheet name provided
    const sheetName = data.sheetName || SHEET_NAMES[SHEET_IDS[0]];
    console.log('📖 Reading from sheet:', sheetName);
    
    // Determine which spreadsheet to use
    let targetSheetId = SHEET_IDS[0]; // Default to first sheet
    
    // Find the matching sheet ID
    for (const [sheetId, name] of Object.entries(SHEET_NAMES)) {
      if (sheetName.includes(name)) {
        targetSheetId = sheetId;
        break;
      }
    }
    
    const spreadsheet = SpreadsheetApp.openById(targetSheetId);
    let sheet = spreadsheet.getSheets()[0]; // Default to first tab
    
    // Try to find the specified tab if provided
    if (data.tabName) {
      const specificSheet = spreadsheet.getSheetByName(data.tabName);
      if (specificSheet) {
        sheet = specificSheet;
      }
    }
    
    const values = sheet.getDataRange().getValues();
    if (values.length === 0) {
      return {
        status: 'success',
        message: 'Sheet is empty',
        data: [],
        headers: []
      };
    }
    
    const headers = values[0];
    const jsonData = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowData = {};
      
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      
      jsonData.push(rowData);
    }
    
    return {
      status: 'success',
      message: `Read ${jsonData.length} rows from ${SHEET_NAMES[targetSheetId] || 'sheet'}`,
      headers: headers,
      data: jsonData,
      sheetName: SHEET_NAMES[targetSheetId] || 'Unknown'
    };
  } catch (error) {
    console.error('❌ Error reading sheet:', error);
    return {
      status: 'error',
      message: `Failed to read sheet: ${error.toString()}`
    };
  }
}

/**
 * Create standardized response
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle GET requests
 */
function doGet() {
  return createResponse({
    status: 'success',
    message: 'Ara Voice AI API is running',
    version: 'FINAL',
    connectedSheets: SHEET_IDS.length,
    availableActions: ['getSheetNames', 'addRow', 'readSheet']
  });
}