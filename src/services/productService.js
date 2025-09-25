import { db } from '../database/database';

export const getProducts = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM products ORDER BY name;',
        [],
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => {
          console.error('Error fetching products:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getProductById = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM products WHERE id = ?;',
        [id],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows._array[0]);
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error('Error fetching product by id:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getProductByBarcode = (barcode) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM products WHERE barcode = ?;',
        [barcode],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows._array[0]);
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error('Error fetching product by barcode:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const searchProducts = (query) => {
  const searchTerm = `%${query}%`;
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM products WHERE name LIKE ? OR category LIKE ? OR type LIKE ? OR description LIKE ?;',
        [searchTerm, searchTerm, searchTerm, searchTerm],
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => {
          console.error('Error searching products:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const updateProductStock = (id, newStock) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE products SET stock = ? WHERE id = ?;',
        [newStock, id],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error('Error updating product stock:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const addProduct = (product) => {
  const { name, category, type, thc, cbd, price, stock, barcode, image, description } = product;
  
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO products (name, category, type, thc, cbd, price, stock, barcode, image, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [name, category, type, thc, cbd, price, stock, barcode, image, description],
        (_, { insertId }) => {
          resolve(insertId);
        },
        (_, error) => {
          console.error('Error adding product:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const updateProduct = (product) => {
  const { id, name, category, type, thc, cbd, price, stock, barcode, image, description } = product;
  
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE products 
         SET name = ?, category = ?, type = ?, thc = ?, cbd = ?, price = ?, 
             stock = ?, barcode = ?, image = ?, description = ?
         WHERE id = ?;`,
        [name, category, type, thc, cbd, price, stock, barcode, image, description, id],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error('Error updating product:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const deleteProduct = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM products WHERE id = ?;',
        [id],
        (_, { rowsAffected }) => {
          resolve(rowsAffected > 0);
        },
        (_, error) => {
          console.error('Error deleting product:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};