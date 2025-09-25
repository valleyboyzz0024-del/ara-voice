import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('cannabis_pos.db');

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Create users table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL
        );`,
        [],
        () => {},
        (_, error) => { console.error('Error creating users table:', error); reject(error); return false; }
      );

      // Create products table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          type TEXT NOT NULL,
          thc REAL,
          cbd REAL,
          price REAL NOT NULL,
          stock REAL NOT NULL,
          barcode TEXT,
          image TEXT,
          description TEXT
        );`,
        [],
        () => {},
        (_, error) => { console.error('Error creating products table:', error); reject(error); return false; }
      );

      // Create sales table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          total REAL NOT NULL,
          payment_method TEXT NOT NULL,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users (id)
        );`,
        [],
        () => {},
        (_, error) => { console.error('Error creating sales table:', error); reject(error); return false; }
      );

      // Create sale_items table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity REAL NOT NULL,
          price REAL NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES sales (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        );`,
        [],
        () => {},
        (_, error) => { console.error('Error creating sale_items table:', error); reject(error); return false; }
      );

      // Create cash_float table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS cash_float (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          starting_amount REAL NOT NULL,
          ending_amount REAL,
          total_sales REAL,
          notes TEXT
        );`,
        [],
        () => {},
        (_, error) => { console.error('Error creating cash_float table:', error); reject(error); return false; }
      );

      // Insert default admin user if not exists
      tx.executeSql(
        `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?);`,
        ['admin', 'admin123', 'admin'],
        () => {},
        (_, error) => { console.error('Error inserting default user:', error); reject(error); return false; }
      );

      // Insert sample products if not exists
      const sampleProducts = [
        ['Blue Dream', 'Flower', 'Sativa', 18.5, 0.5, 12.0, 100, 'BD001', null, 'A popular sativa-dominant hybrid'],
        ['OG Kush', 'Flower', 'Indica', 22.0, 0.3, 14.0, 80, 'OGK001', null, 'A classic indica strain'],
        ['Sour Diesel', 'Flower', 'Sativa', 20.0, 0.2, 13.0, 90, 'SD001', null, 'Energetic and uplifting sativa'],
        ['Girl Scout Cookies', 'Flower', 'Hybrid', 24.0, 0.7, 15.0, 75, 'GSC001', null, 'Sweet and earthy hybrid'],
        ['Purple Punch', 'Flower', 'Indica', 19.0, 1.0, 13.5, 85, 'PP001', null, 'Relaxing indica with berry notes'],
        ['Jack Herer', 'Flower', 'Sativa', 18.0, 0.4, 12.5, 95, 'JH001', null, 'Clear-headed sativa'],
        ['Northern Lights', 'Flower', 'Indica', 16.0, 0.3, 11.0, 70, 'NL001', null, 'Classic relaxing indica'],
        ['Pineapple Express', 'Flower', 'Hybrid', 17.5, 0.5, 13.0, 80, 'PE001', null, 'Tropical hybrid strain'],
        ['CBD Oil', 'Concentrate', 'CBD', 1.0, 20.0, 60.0, 30, 'CBD001', null, '30ml tincture'],
        ['THC Gummies', 'Edible', 'Hybrid', 10.0, 0.0, 25.0, 40, 'GUM001', null, '10mg per piece, 10 pieces']
      ];

      sampleProducts.forEach(product => {
        tx.executeSql(
          `INSERT OR IGNORE INTO products (name, category, type, thc, cbd, price, stock, barcode, image, description) 
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? 
           WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ?);`,
          [...product, product[0]],
          () => {},
          (_, error) => { console.error('Error inserting sample product:', error); reject(error); return false; }
        );
      });

      // Initialize today's cash float if not exists
      const today = new Date().toISOString().split('T')[0];
      tx.executeSql(
        `INSERT OR IGNORE INTO cash_float (date, starting_amount, ending_amount, total_sales, notes) 
         VALUES (?, ?, NULL, 0, ?);`,
        [today, 200.0, 'Initial float'],
        () => { resolve(); },
        (_, error) => { console.error('Error initializing cash float:', error); reject(error); return false; }
      );
    });
  });
};

export default {
  initDatabase,
  db
};