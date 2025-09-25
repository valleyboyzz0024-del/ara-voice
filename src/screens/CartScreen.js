import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  Text, 
  Surface, 
  Title, 
  Button, 
  IconButton, 
  Divider,
  TextInput,
  ActivityIndicator,
  Portal,
  Dialog,
  List
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { theme, shadowStyles } from '../theme/theme';
import { speakResponse } from '../services/voiceService';

const CartScreen = ({ navigation }) => {
  const { cartItems, total, updateQuantity, removeFromCart, clearCart, processSale } = useCart();
  const [processing, setProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [saleId, setSaleId] = useState(null);
  const [notes, setNotes] = useState('');
  
  const handleQuantityChange = (productId, quantity) => {
    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity < 1) return;
    updateQuantity(productId, numQuantity);
  };
  
  const handleRemoveItem = (productId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from the cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: () => removeFromCart(productId), style: 'destructive' }
      ]
    );
  };
  
  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items from the cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', onPress: () => clearCart(), style: 'destructive' }
      ]
    );
  };
  
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to the cart before checking out.');
      return;
    }
    
    setShowConfirmDialog(true);
  };
  
  const handleConfirmSale = async () => {
    setShowConfirmDialog(false);
    setProcessing(true);
    
    try {
      const result = await processSale('cash');
      
      if (result.success) {
        setSaleId(result.saleId);
        setShowSuccessDialog(true);
        speakResponse('Sale completed successfully');
      } else {
        Alert.alert('Sale Error', result.message || 'Failed to process sale');
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      Alert.alert('Sale Error', error.message || 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleViewSaleDetails = () => {
    setShowSuccessDialog(false);
    navigation.navigate('SaleDetail', { saleId });
  };
  
  const handleNewSale = () => {
    setShowSuccessDialog(false);
    navigation.navigate('SalesMain');
  };
  
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };
  
  const renderCartItem = ({ item }) => (
    <Surface style={[styles.cartItem, shadowStyles.small]}>
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category} - {item.type}</Text>
        <Text style={styles.itemPrice}>{formatCurrency(item.price)} each</Text>
      </View>
      
      <View style={styles.itemActions}>
        <View style={styles.quantityContainer}>
          <IconButton
            icon="minus"
            size={20}
            color={theme.colors.text}
            onPress={() => handleQuantityChange(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
            style={styles.quantityButton}
          />
          
          <TextInput
            value={item.quantity.toString()}
            onChangeText={(text) => handleQuantityChange(item.id, text)}
            keyboardType="numeric"
            style={styles.quantityInput}
            mode="outlined"
            dense
          />
          
          <IconButton
            icon="plus"
            size={20}
            color={theme.colors.text}
            onPress={() => handleQuantityChange(item.id, item.quantity + 1)}
            style={styles.quantityButton}
          />
        </View>
        
        <Text style={styles.itemTotal}>{formatCurrency(item.price * item.quantity)}</Text>
        
        <IconButton
          icon="delete"
          size={20}
          color={theme.colors.error}
          onPress={() => handleRemoveItem(item.id)}
          style={styles.deleteButton}
        />
      </View>
    </Surface>
  );
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Shopping Cart</Title>
        <Button 
          mode="text" 
          onPress={handleClearCart}
          disabled={cartItems.length === 0}
          color={theme.colors.error}
        >
          Clear Cart
        </Button>
      </View>
      
      {cartItems.length > 0 ? (
        <FlatList
          data={cartItems}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.cartList}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="cart-outline" size={64} color={theme.colors.disabled} />
          <Text style={styles.emptyStateText}>Your cart is empty</Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('SalesMain')}
            style={styles.browseButton}
            contentStyle={styles.browseButtonContent}
          >
            Browse Products
          </Button>
        </View>
      )}
      
      {cartItems.length > 0 && (
        <Surface style={[styles.summaryContainer, shadowStyles.large]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(0)}</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
          
          <Button
            mode="contained"
            onPress={handleCheckout}
            style={styles.checkoutButton}
            contentStyle={styles.checkoutButtonContent}
            disabled={processing || cartItems.length === 0}
            loading={processing}
          >
            Complete Sale
          </Button>
        </Surface>
      )}
      
      <Portal>
        <Dialog
          visible={showConfirmDialog}
          onDismiss={() => setShowConfirmDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Confirm Sale</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Process this sale for {formatCurrency(total)}?
            </Text>
            <Text style={styles.dialogSubtext}>
              Payment method: Cash
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)} color={theme.colors.text}>
              Cancel
            </Button>
            <Button onPress={handleConfirmSale} mode="contained">
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Sale Complete</Dialog.Title>
          <Dialog.Content>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle" size={64} color={theme.colors.success} />
            </View>
            <Text style={styles.dialogText}>
              Sale #{saleId} has been processed successfully.
            </Text>
            <Text style={styles.dialogSubtext}>
              Total: {formatCurrency(total)}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleViewSaleDetails} color={theme.colors.primary}>
              View Details
            </Button>
            <Button onPress={handleNewSale} mode="contained">
              New Sale
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  itemCategory: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    margin: 0,
  },
  quantityInput: {
    width: 40,
    height: 40,
    textAlign: 'center',
    backgroundColor: theme.colors.surface,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 'auto',
    marginRight: 16,
  },
  deleteButton: {
    margin: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.text,
    opacity: 0.7,
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: theme.colors.primary,
  },
  browseButtonContent: {
    height: 50,
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  divider: {
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  checkoutButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  checkoutButtonContent: {
    height: 50,
  },
  dialog: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
  },
  dialogTitle: {
    color: theme.colors.primary,
  },
  dialogText: {
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 8,
  },
  dialogSubtext: {
    color: theme.colors.text,
    opacity: 0.7,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
});

export default CartScreen;