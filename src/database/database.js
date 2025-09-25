import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const USERS_KEY = '@cannabis_pos_users';
const PRODUCTS_KEY = '@cannabis_pos_products';
const SALES_KEY = '@cannabis_pos_sales';
const SALE_ITEMS_KEY = '@cannabis_pos_sale_items';
const CASH_FLOAT_KEY = '@cannabis_pos_cash_float';

// In-memory cache for faster access
let usersCache = null;
let productsCache = null;
let salesCache = null;
let saleItemsCache = null;
let cashFloatCache = null;

// Helper functions for AsyncStorage operations
const getItem = async (key, defaultValue = null) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value !== null ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`Error getting item from AsyncStorage (${key}):`, error);
    return defaultValue;
  }
};

const setItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting item in AsyncStorage (${key}):`, error);
    return false;
  }
};

// Database initialization
export const initDatabase = async () => {
  try {
    // Initialize users if not exists
    let users = await getItem(USERS_KEY, []);
    if (users.length === 0) {
      users = [
        {
          id: 1,
          username: 'admin',
          password: 'admin123',
          role: 'admin'
        }
      ];
      await setItem(USERS_KEY, users);
    }
    usersCache = users;

    // Initialize products if not exists
    let products = await getItem(PRODUCTS_KEY, []);
    if (products.length === 0) {
      products = [
        { id: 1, name: 'Blue Dream', category: 'Flower', type: 'Sativa', thc: 18.5, cbd: 0.5, price: 12.0, stock: 100, barcode: 'BD001', image: null, description: 'A popular sativa-dominant hybrid' },
        { id: 2, name: 'OG Kush', category: 'Flower', type: 'Indica', thc: 22.0, cbd: 0.3, price: 14.0, stock: 80, barcode: 'OGK001', image: null, description: 'A classic indica strain' },
        { id: 3, name: 'Sour Diesel', category: 'Flower', type: 'Sativa', thc: 20.0, cbd: 0.2, price: 13.0, stock: 90, barcode: 'SD001', image: null, description: 'Energetic and uplifting sativa' },
        { id: 4, name: 'Girl Scout Cookies', category: 'Flower', type: 'Hybrid', thc: 24.0, cbd: 0.7, price: 15.0, stock: 75, barcode: 'GSC001', image: null, description: 'Sweet and earthy hybrid' },
        { id: 5, name: 'Purple Punch', category: 'Flower', type: 'Indica', thc: 19.0, cbd: 1.0, price: 13.5, stock: 85, barcode: 'PP001', image: null, description: 'Relaxing indica with berry notes' },
        { id: 6, name: 'Jack Herer', category: 'Flower', type: 'Sativa', thc: 18.0, cbd: 0.4, price: 12.5, stock: 95, barcode: 'JH001', image: null, description: 'Clear-headed sativa' },
        { id: 7, name: 'Northern Lights', category: 'Flower', type: 'Indica', thc: 16.0, cbd: 0.3, price: 11.0, stock: 70, barcode: 'NL001', image: null, description: 'Classic relaxing indica' },
        { id: 8, name: 'Pineapple Express', category: 'Flower', type: 'Hybrid', thc: 17.5, cbd: 0.5, price: 13.0, stock: 80, barcode: 'PE001', image: null, description: 'Tropical hybrid strain' },
        { id: 9, name: 'CBD Oil', category: 'Concentrate', type: 'CBD', thc: 1.0, cbd: 20.0, price: 60.0, stock: 30, barcode: 'CBD001', image: null, description: '30ml tincture' },
        { id: 10, name: 'THC Gummies', category: 'Edible', type: 'Hybrid', thc: 10.0, cbd: 0.0, price: 25.0, stock: 40, barcode: 'GUM001', image: null, description: '10mg per piece, 10 pieces' }
      ];
      await setItem(PRODUCTS_KEY, products);
    }
    productsCache = products;

    // Initialize sales if not exists
    const sales = await getItem(SALES_KEY, []);
    salesCache = sales;

    // Initialize sale items if not exists
    const saleItems = await getItem(SALE_ITEMS_KEY, []);
    saleItemsCache = saleItems;

    // Initialize cash float if not exists
    let cashFloat = await getItem(CASH_FLOAT_KEY, []);
    if (cashFloat.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      cashFloat = [
        {
          id: 1,
          date: today,
          starting_amount: 200.0,
          ending_amount: null,
          total_sales: 0,
          notes: 'Initial float'
        }
      ];
      await setItem(CASH_FLOAT_KEY, cashFloat);
    }
    cashFloatCache = cashFloat;

    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Users operations
export const getUsers = async () => {
  if (usersCache) return [...usersCache];
  const users = await getItem(USERS_KEY, []);
  usersCache = users;
  return [...users];
};

export const getUserById = async (id) => {
  const users = await getUsers();
  return users.find(user => user.id === id) || null;
};

export const getUserByUsername = async (username) => {
  const users = await getUsers();
  return users.find(user => user.username === username) || null;
};

export const createUser = async (userData) => {
  const users = await getUsers();
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    ...userData
  };
  users.push(newUser);
  await setItem(USERS_KEY, users);
  usersCache = users;
  return newUser;
};

export const updateUser = async (id, userData) => {
  const users = await getUsers();
  const index = users.findIndex(user => user.id === id);
  if (index === -1) return false;
  
  users[index] = { ...users[index], ...userData };
  await setItem(USERS_KEY, users);
  usersCache = users;
  return true;
};

// Products operations
export const getProducts = async () => {
  if (productsCache) return [...productsCache];
  const products = await getItem(PRODUCTS_KEY, []);
  productsCache = products;
  return [...products];
};

export const getProductById = async (id) => {
  const products = await getProducts();
  return products.find(product => product.id === id) || null;
};

export const getProductByBarcode = async (barcode) => {
  const products = await getProducts();
  return products.find(product => product.barcode === barcode) || null;
};

export const searchProducts = async (query) => {
  const products = await getProducts();
  const searchTerm = query.toLowerCase();
  return products.filter(product => 
    product.name.toLowerCase().includes(searchTerm) ||
    product.category.toLowerCase().includes(searchTerm) ||
    product.type.toLowerCase().includes(searchTerm) ||
    (product.description && product.description.toLowerCase().includes(searchTerm))
  );
};

export const addProduct = async (productData) => {
  const products = await getProducts();
  const newProduct = {
    id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
    ...productData
  };
  products.push(newProduct);
  await setItem(PRODUCTS_KEY, products);
  productsCache = products;
  return newProduct;
};

export const updateProduct = async (id, productData) => {
  const products = await getProducts();
  const index = products.findIndex(product => product.id === id);
  if (index === -1) return false;
  
  products[index] = { ...products[index], ...productData };
  await setItem(PRODUCTS_KEY, products);
  productsCache = products;
  return true;
};

export const updateProductStock = async (id, newStock) => {
  return updateProduct(id, { stock: newStock });
};

export const deleteProduct = async (id) => {
  const products = await getProducts();
  const filteredProducts = products.filter(product => product.id !== id);
  if (filteredProducts.length === products.length) return false;
  
  await setItem(PRODUCTS_KEY, filteredProducts);
  productsCache = filteredProducts;
  return true;
};

// Sales operations
export const getSales = async (startDate = null, endDate = null) => {
  const sales = await getItem(SALES_KEY, []);
  
  if (!startDate && !endDate) return [...sales];
  
  return sales.filter(sale => {
    if (startDate && endDate) {
      return sale.date >= startDate && sale.date <= endDate;
    } else if (startDate) {
      return sale.date >= startDate;
    } else {
      return sale.date <= endDate;
    }
  });
};

export const getSaleById = async (id) => {
  const sales = await getSales();
  return sales.find(sale => sale.id === id) || null;
};

export const createSale = async (saleData, cartItems, userId) => {
  // Get current data
  const sales = await getSales();
  const saleItems = await getItem(SALE_ITEMS_KEY, []);
  const products = await getProducts();
  
  // Create new sale
  const newSale = {
    id: sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1,
    ...saleData,
    user_id: userId
  };
  
  // Add sale items
  const newSaleItems = cartItems.map(item => ({
    id: saleItems.length > 0 ? Math.max(...saleItems.map(si => si.id)) + 1 + saleItems.indexOf(item) : 1 + cartItems.indexOf(item),
    sale_id: newSale.id,
    product_id: item.id,
    quantity: item.quantity,
    price: item.price
  }));
  
  // Update product stock
  for (const item of cartItems) {
    const productIndex = products.findIndex(p => p.id === item.id);
    if (productIndex !== -1) {
      products[productIndex].stock -= item.quantity;
    }
  }
  
  // Update cash float
  const cashFloat = await getItem(CASH_FLOAT_KEY, []);
  const today = new Date().toISOString().split('T')[0];
  const todayFloatIndex = cashFloat.findIndex(cf => cf.date === today);
  
  if (todayFloatIndex !== -1) {
    cashFloat[todayFloatIndex].total_sales += saleData.total;
  }
  
  // Save all changes
  sales.push(newSale);
  saleItems.push(...newSaleItems);
  
  await setItem(SALES_KEY, sales);
  await setItem(SALE_ITEMS_KEY, saleItems);
  await setItem(PRODUCTS_KEY, products);
  await setItem(CASH_FLOAT_KEY, cashFloat);
  
  // Update caches
  salesCache = sales;
  saleItemsCache = saleItems;
  productsCache = products;
  cashFloatCache = cashFloat;
  
  return newSale.id;
};

export const getSaleDetails = async (saleId) => {
  const sales = await getSales();
  const saleItems = await getItem(SALE_ITEMS_KEY, []);
  const products = await getProducts();
  
  const sale = sales.find(s => s.id === saleId);
  if (!sale) return null;
  
  const items = saleItems
    .filter(item => item.sale_id === saleId)
    .map(item => {
      const product = products.find(p => p.id === item.product_id);
      return {
        ...item,
        name: product ? product.name : 'Unknown Product',
        category: product ? product.category : 'Unknown',
        type: product ? product.type : 'Unknown'
      };
    });
  
  return { ...sale, items };
};

// Cash float operations
export const getCashFloat = async () => {
  if (cashFloatCache) return [...cashFloatCache];
  const cashFloat = await getItem(CASH_FLOAT_KEY, []);
  cashFloatCache = cashFloat;
  return [...cashFloat];
};

export const getTodayFloat = async () => {
  const cashFloat = await getCashFloat();
  const today = new Date().toISOString().split('T')[0];
  return cashFloat.find(cf => cf.date === today) || null;
};

export const getFloatByDate = async (date) => {
  const cashFloat = await getCashFloat();
  return cashFloat.find(cf => cf.date === date) || null;
};

export const initializeDailyFloat = async (amount, date = new Date().toISOString().split('T')[0]) => {
  const cashFloat = await getCashFloat();
  const existingIndex = cashFloat.findIndex(cf => cf.date === date);
  
  if (existingIndex !== -1) {
    // Update existing float
    cashFloat[existingIndex].starting_amount = amount;
  } else {
    // Create new float
    const newFloat = {
      id: cashFloat.length > 0 ? Math.max(...cashFloat.map(cf => cf.id)) + 1 : 1,
      date,
      starting_amount: amount,
      ending_amount: null,
      total_sales: 0,
      notes: 'Daily float initialization'
    };
    cashFloat.push(newFloat);
  }
  
  await setItem(CASH_FLOAT_KEY, cashFloat);
  cashFloatCache = cashFloat;
  return true;
};

export const closeDailyFloat = async (endingAmount, notes = '', date = new Date().toISOString().split('T')[0]) => {
  const cashFloat = await getCashFloat();
  const index = cashFloat.findIndex(cf => cf.date === date);
  
  if (index === -1) return false;
  
  cashFloat[index].ending_amount = endingAmount;
  cashFloat[index].notes = notes;
  
  await setItem(CASH_FLOAT_KEY, cashFloat);
  cashFloatCache = cashFloat;
  return true;
};

export const calculateExpectedEndingAmount = async (date = new Date().toISOString().split('T')[0]) => {
  const floatData = await getFloatByDate(date);
  if (!floatData) {
    throw new Error('No float data found for the specified date');
  }
  
  return floatData.starting_amount + floatData.total_sales;
};

export const autoCloseFloat = async (date = new Date().toISOString().split('T')[0]) => {
  const expectedEndingAmount = await calculateExpectedEndingAmount(date);
  await closeDailyFloat(expectedEndingAmount, 'Auto-closed by system', date);
  return expectedEndingAmount;
};

// Export a mock db object for compatibility with existing code
export const db = {
  transaction: (callback) => {
    // Mock transaction function that immediately resolves
    const mockTx = {
      executeSql: (query, params, successCallback) => {
        if (successCallback) successCallback();
      }
    };
    callback(mockTx);
  }
};

export default {
  initDatabase,
  db
};