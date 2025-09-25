import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { createSale } from '../services/salesService';
import { getCurrentUser } from '../services/authService';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  
  // Calculate total whenever cart items change
  useEffect(() => {
    const newTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  }, [cartItems]);
  
  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      // Check if product already exists in cart
      const existingItemIndex = prevItems.findIndex(item => item.id === product.id);
      
      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity
        };
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          type: product.type,
          quantity: quantity
        }];
      }
    });
  };
  
  // Update item quantity
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };
  
  // Remove item from cart
  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };
  
  // Clear cart
  const clearCart = () => {
    setCartItems([]);
  };
  
  // Process sale
  const processSale = async (paymentMethod = 'cash') => {
    try {
      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }
      
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const saleData = {
        date: new Date().toISOString().split('T')[0],
        total: total,
        paymentMethod: paymentMethod
      };
      
      const saleId = await createSale(saleData, cartItems, user.id);
      
      // Clear cart after successful sale
      clearCart();
      
      return {
        success: true,
        saleId,
        message: 'Sale completed successfully'
      };
    } catch (error) {
      console.error('Error processing sale:', error);
      Alert.alert('Sale Error', error.message || 'Failed to process sale');
      return {
        success: false,
        error,
        message: error.message || 'Failed to process sale'
      };
    }
  };
  
  const value = {
    cartItems,
    total,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    processSale,
    itemCount: cartItems.length
  };
  
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;