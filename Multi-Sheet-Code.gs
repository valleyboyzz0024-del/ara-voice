/**
 * Multi-Sheet Google Apps Script for Ara Voice AI
 * Handles multiple Google Sheets for comprehensive data management
 */

// Configuration - Add your sheet IDs here
const SHEET_IDS = [
  '1CwV3uJ_fgs783230SQXvZs5kRGFFNmeaYRYYTT-yvkQ',
  '1aAb6jKRxisGKVQIex_HU59lX6X-Kkm4tTIH7qXfaEW0', 
  '1RIXQIyGZ9qfW3x3JdpwfBIMmoNf-r9zH7ffjk5jeYks',
  '1tGcU53sMpzuGrU3tDUilyj0KACnsjEfFY0t_5eW4pZM',
  '1dElu39ly3LNHAMZupg1OzWmAmoDZVMRWXX5x2ksw12Q'
];

// Sheet names mapping (customize as needed)
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
        result = getAllSheetNames();
        break;
      case 'addRow':
        result = addRowToSheet(data);
        break;
      case 'readSheet':
        result = readFromSheet(data);
        break;
      case 'updateRow':
        result = updateRowInSheet(data);
        break;
      case 'deleteRow':
        result = deleteRowFromSheet(data);
        break;
      case 'searchSheet':
        result = searchInSheet(data);
        break;
      case 'createSheet':
        result = createNewSheet(data);
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
 * Get all sheet names from all configured spreadsheets
 */
function getAllSheetNames() {
  try {
    const allSheets = [];
    
    SHEET_IDS.forEach(sheetId => {
      try {
        const spreadsheet = SpreadsheetApp.openById(sheetId);
        const sheets = spreadsheet.getSheets();
        const friendlyName = SHEET_NAMES[sheetId] || `Sheet_${sheetId.substring(0, 8)}`;
        
        sheets.forEach(sheet => {
          allSheets.push({
            name: `${friendlyName}_${sheet.getName()}`,
            sheetId: sheetId,
            tabName: sheet.getName(),
            friendlyName: friendlyName
          });
        });
        
        console.log(`✅ Loaded sheets from ${friendlyName}`);
      } catch (sheetError) {
        console.error(`❌ Error loading sheet ${sheetId}:`, sheetError);
      }
    });
    
    const sheetNames = allSheets.map(s => s.name);
    
    return {
      status: 'success',
      sheetNames: sheetNames,
      sheetDetails: allSheets,
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
 * Add a row to a specific sheet
 */
function addRowToSheet(data) {
  try {
    if (!data.sheetName || !data.data) {
      return {
        status: 'error',
        message: 'Sheet name and data are required'
      };
    }
    
    const sheetInfo = parseSheetName(data.sheetName);
    if (!sheetInfo) {
      return {
        status: 'error',
        message: `Invalid sheet name: ${data.sheetName}`
      };
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetInfo.sheetId);
    let sheet = spreadsheet.getSheetByName(sheetInfo.tabName);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetInfo.tabName);
      console.log(`📝 Created new sheet: ${sheetInfo.tabName}`);
    }
    
    // Add timestamp if not provided
    const rowData = Array.isArray(data.data) ? data.data : [data.data];
    rowData.push(new Date().toLocaleString());
    
    sheet.appendRow(rowData);
    
    return {
      status: 'success',
      message: `Added row to ${data.sheetName}`,
      data: rowData,
      sheetId: sheetInfo.sheetId,
      tabName: sheetInfo.tabName
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
 * Read data from a specific sheet
 */
function readFromSheet(data) {
  try {
    if (!data.sheetName) {
      return {
        status: 'error',
        message: 'Sheet name is required'
      };
    }
    
    const sheetInfo = parseSheetName(data.sheetName);
    if (!sheetInfo) {
      return {
        status: 'error',
        message: `Invalid sheet name: ${data.sheetName}`
      };
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetInfo.sheetId);
    const sheet = spreadsheet.getSheetByName(sheetInfo.tabName);
    
    if (!sheet) {
      return {
        status: 'error',
        message: `Sheet not found: ${data.sheetName}`
      };
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
      message: `Read ${jsonData.length} rows from ${data.sheetName}`,
      headers: headers,
      data: jsonData,
      sheetId: sheetInfo.sheetId,
      tabName: sheetInfo.tabName
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
 * Search for data in sheets
 */
function searchInSheet(data) {
  try {
    const { query, sheetName } = data;
    if (!query) {
      return {
        status: 'error',
        message: 'Search query is required'
      };
    }
    
    const results = [];
    const sheetsToSearch = sheetName ? [sheetName] : getAllSheetNames().sheetNames;
    
    sheetsToSearch.forEach(name => {
      try {
        const readResult = readFromSheet({ sheetName: name });
        if (readResult.status === 'success' && readResult.data) {
          const matches = readResult.data.filter(row => {
            return Object.values(row).some(value => 
              String(value).toLowerCase().includes(query.toLowerCase())
            );
          });
          
          if (matches.length > 0) {
            results.push({
              sheetName: name,
              matches: matches,
              count: matches.length
            });
          }
        }
      } catch (searchError) {
        console.error(`❌ Error searching in ${name}:`, searchError);
      }
    });
    
    return {
      status: 'success',
      message: `Found ${results.reduce((sum, r) => sum + r.count, 0)} matches`,
      results: results,
      query: query
    };
  } catch (error) {
    console.error('❌ Error searching:', error);
    return {
      status: 'error',
      message: `Search failed: ${error.toString()}`
    };
  }
}

/**
 * Update a row in a sheet
 */
function updateRowInSheet(data) {
  try {
    const { sheetName, rowIndex, data: newData } = data;
    if (!sheetName || !rowIndex || !newData) {
      return {
        status: 'error',
        message: 'Sheet name, row index, and data are required'
      };
    }
    
    const sheetInfo = parseSheetName(sheetName);
    if (!sheetInfo) {
      return {
        status: 'error',
        message: `Invalid sheet name: ${sheetName}`
      };
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetInfo.sheetId);
    const sheet = spreadsheet.getSheetByName(sheetInfo.tabName);
    
    if (!sheet) {
      return {
        status: 'error',
        message: `Sheet not found: ${sheetName}`
      };
    }
    
    const range = sheet.getRange(parseInt(rowIndex), 1, 1, newData.length);
    range.setValues([newData]);
    
    return {
      status: 'success',
      message: `Updated row ${rowIndex} in ${sheetName}`,
      rowIndex: rowIndex,
      data: newData
    };
  } catch (error) {
    console.error('❌ Error updating row:', error);
    return {
      status: 'error',
      message: `Failed to update row: ${error.toString()}`
    };
  }
}

/**
 * Delete a row from a sheet
 */
function deleteRowFromSheet(data) {
  try {
    const { sheetName, rowIndex } = data;
    if (!sheetName || !rowIndex) {
      return {
        status: 'error',
        message: 'Sheet name and row index are required'
      };
    }
    
    const sheetInfo = parseSheetName(sheetName);
    if (!sheetInfo) {
      return {
        status: 'error',
        message: `Invalid sheet name: ${sheetName}`
      };
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetInfo.sheetId);
    const sheet = spreadsheet.getSheetByName(sheetInfo.tabName);
    
    if (!sheet) {
      return {
        status: 'error',
        message: `Sheet not found: ${sheetName}`
      };
    }
    
    sheet.deleteRow(parseInt(rowIndex));
    
    return {
      status: 'success',
      message: `Deleted row ${rowIndex} from ${sheetName}`,
      rowIndex: rowIndex
    };
  } catch (error) {
    console.error('❌ Error deleting row:', error);
    return {
      status: 'error',
      message: `Failed to delete row: ${error.toString()}`
    };
  }
}

/**
 * Create a new sheet
 */
function createNewSheet(data) {
  try {
    const { sheetName, headers, sheetId } = data;
    if (!sheetName) {
      return {
        status: 'error',
        message: 'Sheet name is required'
      };
    }
    
    const targetSheetId = sheetId || SHEET_IDS[0]; // Use first sheet as default
    const spreadsheet = SpreadsheetApp.openById(targetSheetId);
    
    let sheet;
    try {
      sheet = spreadsheet.getSheetByName(sheetName);
    } catch (e) {
      // Sheet doesn't exist
    }
    
    if (sheet) {
      return {
        status: 'success',
        message: `Sheet already exists: ${sheetName}`
      };
    }
    
    sheet = spreadsheet.insertSheet(sheetName);
    
    if (headers && Array.isArray(headers)) {
      sheet.appendRow(headers);
    }
    
    return {
      status: 'success',
      message: `Created new sheet: ${sheetName}`,
      sheetId: targetSheetId,
      sheetName: sheetName
    };
  } catch (error) {
    console.error('❌ Error creating sheet:', error);
    return {
      status: 'error',
      message: `Failed to create sheet: ${error.toString()}`
    };
  }
}

/**
 * Parse sheet name to extract sheet ID and tab name
 */
function parseSheetName(sheetName) {
  // Handle different formats: "FriendlyName_TabName" or just "TabName"
  const parts = sheetName.split('_');
  
  if (parts.length >= 2) {
    const friendlyName = parts[0];
    const tabName = parts.slice(1).join('_');
    
    // Find sheet ID by friendly name
    for (const [sheetId, name] of Object.entries(SHEET_NAMES)) {
      if (name === friendlyName) {
        return { sheetId, tabName };
      }
    }
  }
  
  // Fallback: use first sheet and treat as tab name
  return {
    sheetId: SHEET_IDS[0],
    tabName: sheetName
  };
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
    version: '2.0.0',
    connectedSheets: SHEET_IDS.length,
    availableActions: [
      'getSheetNames',
      'addRow', 
      'readSheet',
      'updateRow',
      'deleteRow',
      'searchSheet',
      'createSheet'
    ]
  });
}