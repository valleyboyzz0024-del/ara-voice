import {
  getSales,
  getSaleById,
  createSale,
  getSaleDetails
} from '../database/database';

// Get today's sales
export const getTodaySales = async () => {
  const today = new Date().toISOString().split('T')[0];
  return getSales(today, today);
};

// Get daily sales summary
export const getDailySalesSummary = async (startDate, endDate) => {
  const sales = await getSales(startDate, endDate);
  
  // Group sales by date
  const salesByDate = sales.reduce((acc, sale) => {
    if (!acc[sale.date]) {
      acc[sale.date] = {
        date: sale.date,
        transaction_count: 0,
        total_sales: 0
      };
    }
    
    acc[sale.date].transaction_count += 1;
    acc[sale.date].total_sales += sale.total;
    
    return acc;
  }, {});
  
  // Convert to array and sort by date
  return Object.values(salesByDate).sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
};

// Get top selling products
export const getTopSellingProducts = async (limit = 10, startDate, endDate) => {
  const sales = await getSales(startDate, endDate);
  const saleIds = sales.map(sale => sale.id);
  
  // If no sales, return empty array
  if (saleIds.length === 0) {
    return [];
  }
  
  // Get all sale details
  const saleDetails = await Promise.all(
    saleIds.map(id => getSaleDetails(id))
  );
  
  // Flatten all items
  const allItems = saleDetails
    .filter(sale => sale !== null)
    .flatMap(sale => sale.items || []);
  
  // Group by product
  const productSales = allItems.reduce((acc, item) => {
    if (!acc[item.product_id]) {
      acc[item.product_id] = {
        id: item.product_id,
        name: item.name,
        category: item.category,
        type: item.type,
        total_quantity: 0,
        total_sales: 0
      };
    }
    
    acc[item.product_id].total_quantity += item.quantity;
    acc[item.product_id].total_sales += (item.quantity * item.price);
    
    return acc;
  }, {});
  
  // Convert to array, sort by quantity, and limit
  return Object.values(productSales)
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, limit);
};

// Export functions from database module
export {
  getSales,
  getSaleById,
  createSale,
  getSaleDetails
};