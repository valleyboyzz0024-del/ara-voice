import { db } from '../database/database';

export const initializeDailyFloat = (amount, date = new Date().toISOString().split('T')[0]) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Check if a float already exists for today
      tx.executeSql(
        'SELECT * FROM cash_float WHERE date = ?;',
        [date],
        (_, { rows }) => {
          if (rows.length > 0) {
            // Update existing float
            tx.executeSql(
              'UPDATE cash_float SET starting_amount = ? WHERE date = ?;',
              [amount, date],
              (_, { rowsAffected }) => {
                resolve(rowsAffected > 0);
              },
              (_, error) => {
                console.error('Error updating cash float:', error);
                reject(error);
                return false;
              }
            );
          } else {
            // Create new float
            tx.executeSql(
              'INSERT INTO cash_float (date, starting_amount, ending_amount, total_sales, notes) VALUES (?, ?, NULL, 0, ?);',
              [date, amount, 'Daily float initialization'],
              (_, { insertId }) => {
                resolve(insertId);
              },
              (_, error) => {
                console.error('Error initializing cash float:', error);
                reject(error);
                return false;
              }
            );
          }
        },
        (_, error) => {
          console.error('Error checking cash float:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const closeDailyFloat = (endingAmount, notes = '', date = new Date().toISOString().split('T')[0]) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE cash_float SET ending_amount = ?, notes = ? WHERE date = ?;',
        [endingAmount, notes, date],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error('Error closing cash float:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getTodayFloat = () => {
  const today = new Date().toISOString().split('T')[0];
  return getFloatByDate(today);
};

export const getFloatByDate = (date) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM cash_float WHERE date = ?;',
        [date],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows._array[0]);
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error('Error fetching cash float:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getFloatHistory = (limit = 30) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM cash_float ORDER BY date DESC LIMIT ?;',
        [limit],
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => {
          console.error('Error fetching cash float history:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const updateFloatNotes = (date, notes) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE cash_float SET notes = ? WHERE date = ?;',
        [notes, date],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error('Error updating cash float notes:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const calculateExpectedEndingAmount = async (date = new Date().toISOString().split('T')[0]) => {
  try {
    const floatData = await getFloatByDate(date);
    if (!floatData) {
      throw new Error('No float data found for the specified date');
    }
    
    const expectedEndingAmount = floatData.starting_amount + floatData.total_sales;
    return expectedEndingAmount;
  } catch (error) {
    console.error('Error calculating expected ending amount:', error);
    throw error;
  }
};

export const autoCloseFloat = async (date = new Date().toISOString().split('T')[0]) => {
  try {
    const expectedEndingAmount = await calculateExpectedEndingAmount(date);
    await closeDailyFloat(expectedEndingAmount, 'Auto-closed by system', date);
    return expectedEndingAmount;
  } catch (error) {
    console.error('Error auto-closing float:', error);
    throw error;
  }
};