/**
 * Simplified Google Apps Script for Ara Voice AI
 * Compatible with existing sheet structure and expectations
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
      case 'getSheetData':
        result = getSheetData(data);
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
          allSheets.push(`${friendlyName}_${sheet.getName()}`);
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
 * Add a row to a sheet - Compatible with existing expectations
 */
function addRow(data) {
  try {
    console.log('📝 Adding row with data:', JSON.stringify(data));
    
    // Handle both old and new formats
    const item = data.item || (data.data && data.data[0]) || 'Unknown Item';
    const qty = data.qty || (data.data && data.data[1]) || 1;
    const price = data.pricePerKg || data.price || (data.data && data.data[2]) || 0;
    const status = data.status || (data.data && data.data[3]) || 'pending';
    const tabName = data.tabName || data.sheetName || 'Sheet1';
    
    console.log(`📊 Parsed: item=${item}, qty=${qty}, price=${price}, status=${status}, tabName=${tabName}`);
    
    // Determine which spreadsheet to use based on sheet name
    let targetSheetId = SHEET_IDS[0]; // Default to first sheet
    let actualTabName = tabName;
    
    // If tabName contains friendly name, extract it
    if (tabName.includes('_')) {
      const parts = tabName.split('_');
      const friendlyName = parts[0];
      actualTabName = parts.slice(1).join('_');
      
      // Find the sheet ID for this friendly name
      for (const [sheetId, name] of Object.entries(SHEET_NAMES)) {
        if (name === friendlyName) {
          targetSheetId = sheetId;
          break;
        }
      }
    } else {
      // Determine sheet based on item type
      const itemLower = item.toLowerCase();
      if (itemLower.includes('apple') || itemLower.includes('banana') || itemLower.includes('food') || itemLower.includes('grocery')) {
        targetSheetId = SHEET_IDS[0]; // Groceries
        actualTabName = 'Sheet1';
      } else if (itemLower.includes('expense') || itemLower.includes('cost') || itemLower.includes('money')) {
        targetSheetId = SHEET_IDS[1]; // Expenses
        actualTabName = 'Sheet1';
      } else if (itemLower.includes('task') || itemLower.includes('todo')) {
        targetSheetId = SHEET_IDS[2]; // Tasks
        actualTabName = 'Sheet1';
      }
    }
    
    console.log(`🎯 Using sheet ID: ${targetSheetId}, tab: ${actualTabName}`);
    
    const spreadsheet = SpreadsheetApp.openById(targetSheetId);
    let sheet = spreadsheet.getSheetByName(actualTabName);
    
    // If sheet doesn't exist, try the first sheet
    if (!sheet) {
      const sheets = spreadsheet.getSheets();
      if (sheets.length > 0) {
        sheet = sheets[0];
        actualTabName = sheet.getName();
        console.log(`📋 Using first available sheet: ${actualTabName}`);
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
        sheetId: targetSheetId,
        tabName: actualTabName
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
    const sheetName = data.sheetName || data.tabName || 'Sheet1';
    console.log('📖 Reading from sheet:', sheetName);
    
    // Determine which spreadsheet to use
    let targetSheetId = SHEET_IDS[0];
    let actualTabName = sheetName;
    
    if (sheetName.includes('_')) {
      const parts = sheetName.split('_');
      const friendlyName = parts[0];
      actualTabName = parts.slice(1).join('_');
      
      for (const [sheetId, name] of Object.entries(SHEET_NAMES)) {
        if (name === friendlyName) {
          targetSheetId = sheetId;
          break;
        }
      }
    }
    
    const spreadsheet = SpreadsheetApp.openById(targetSheetId);
    let sheet = spreadsheet.getSheetByName(actualTabName);
    
    if (!sheet) {
      const sheets = spreadsheet.getSheets();
      if (sheets.length > 0) {
        sheet = sheets[0];
        actualTabName = sheet.getName();
      } else {
        throw new Error('No sheets found');
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
      sheetId: targetSheetId,
      tabName: actualTabName
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
 * Get sheet data (alias for readSheet for compatibility)
 */
function getSheetData(data) {
  return readSheet(data);
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
    message: 'Ara Voice AI Multi-Sheet API is running',
    version: '3.0.0',
    connectedSheets: SHEET_IDS.length,
    availableActions: ['getSheetNames', 'addRow', 'readSheet', 'getSheetData']
  });
}