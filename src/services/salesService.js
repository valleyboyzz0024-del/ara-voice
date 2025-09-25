import { db } from '../database/database';
import { updateProductStock } from './productService';

export const createSale = async (saleData, cartItems, userId) => {
  const { date, total, paymentMethod } = saleData;
  
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Insert the sale record
      tx.executeSql(
        'INSERT INTO sales (date, total, payment_method, user_id) VALUES (?, ?, ?, ?);',
        [date, total, paymentMethod, userId],
        async (_, { insertId }) => {
          const saleId = insertId;
          
          // Insert each cart item as a sale item
          try {
            for (const item of cartItems) {
              await new Promise((resolveItem, rejectItem) => {
                tx.executeSql(
                  'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?);',
                  [saleId, item.id, item.quantity, item.price],
                  () => {
                    // Update product stock
                    tx.executeSql(
                      'UPDATE products SET stock = stock - ? WHERE id = ?;',
                      [item.quantity, item.id],
                      () => { resolveItem(); },
                      (_, error) => { 
                        console.error('Error updating product stock:', error);
                        rejectItem(error);
                        return false;
                      }
                    );
                  },
                  (_, error) => {
                    console.error('Error inserting sale item:', error);
                    rejectItem(error);
                    return false;
                  }
                );
              });
            }
            
            // Update cash float with the sale total
            const today = new Date().toISOString().split('T')[0];
            tx.executeSql(
              'UPDATE cash_float SET total_sales = total_sales + ? WHERE date = ?;',
              [total, today],
              () => { resolve(saleId); },
              (_, error) => {
                console.error('Error updating cash float:', error);
                reject(error);
                return false;
              }
            );
          } catch (error) {
            reject(error);
          }
        },
        (_, error) => {
          console.error('Error creating sale:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getSales = (startDate, endDate) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      let query = 'SELECT * FROM sales';
      const params = [];
      
      if (startDate && endDate) {
        query += ' WHERE date >= ? AND date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' WHERE date >= ?';
        params.push(startDate);
      } else if (endDate) {
        query += ' WHERE date <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY date DESC;';
      
      tx.executeSql(
        query,
        params,
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => {
          console.error('Error fetching sales:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getSaleDetails = (saleId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Get the sale record
      tx.executeSql(
        'SELECT * FROM sales WHERE id = ?;',
        [saleId],
        (_, { rows: saleRows }) => {
          if (saleRows.length === 0) {
            resolve(null);
            return;
          }
          
          const sale = saleRows._array[0];
          
          // Get the sale items
          tx.executeSql(
            `SELECT si.*, p.name, p.category, p.type 
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = ?;`,
            [saleId],
            (_, { rows: itemRows }) => {
              sale.items = itemRows._array;
              resolve(sale);
            },
            (_, error) => {
              console.error('Error fetching sale items:', error);
              reject(error);
              return false;
            }
          );
        },
        (_, error) => {
          console.error('Error fetching sale:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getTodaySales = () => {
  const today = new Date().toISOString().split('T')[0];
  return getSales(today, today);
};

export const getDailySalesSummary = (startDate, endDate) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      let query = `
        SELECT 
          date,
          COUNT(*) as transaction_count,
          SUM(total) as total_sales
        FROM sales
      `;
      
      const params = [];
      
      if (startDate && endDate) {
        query += ' WHERE date >= ? AND date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' WHERE date >= ?';
        params.push(startDate);
      } else if (endDate) {
        query += ' WHERE date <= ?';
        params.push(endDate);
      }
      
      query += ' GROUP BY date ORDER BY date DESC;';
      
      tx.executeSql(
        query,
        params,
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => {
          console.error('Error fetching sales summary:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getTopSellingProducts = (limit = 10, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      let query = `
        SELECT 
          p.id,
          p.name,
          p.category,
          p.type,
          SUM(si.quantity) as total_quantity,
          SUM(si.quantity * si.price) as total_sales
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
      `;
      
      const params = [];
      
      if (startDate && endDate) {
        query += ' WHERE s.date >= ? AND s.date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' WHERE s.date >= ?';
        params.push(startDate);
      } else if (endDate) {
        query += ' WHERE s.date <= ?';
        params.push(endDate);
      }
      
      query += ' GROUP BY p.id ORDER BY total_quantity DESC LIMIT ?;';
      params.push(limit);
      
      tx.executeSql(
        query,
        params,
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => {
          console.error('Error fetching top selling products:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};