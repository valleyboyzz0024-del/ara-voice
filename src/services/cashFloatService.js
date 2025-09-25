import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCashFloat,
  getTodayFloat,
  getFloatByDate,
  initializeDailyFloat,
  closeDailyFloat,
  calculateExpectedEndingAmount,
  autoCloseFloat
} from '../database/database';

// Get float history with limit
export const getFloatHistory = async (limit = 30) => {
  const allFloat = await getCashFloat();
  return allFloat
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};

// Update float notes
export const updateFloatNotes = async (date, notes) => {
  const cashFloat = await getCashFloat();
  const index = cashFloat.findIndex(cf => cf.date === date);
  
  if (index === -1) return false;
  
  cashFloat[index].notes = notes;
  
  // Save changes
  await AsyncStorage.setItem('@cannabis_pos_cash_float', JSON.stringify(cashFloat));
  return true;
};

// Export functions from database module
export {
  getCashFloat,
  getTodayFloat,
  getFloatByDate,
  initializeDailyFloat,
  closeDailyFloat,
  calculateExpectedEndingAmount,
  autoCloseFloat
};