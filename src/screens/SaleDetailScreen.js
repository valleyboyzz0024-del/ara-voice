import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Share,
  Platform
} from 'react-native';
import { 
  Text, 
  Surface, 
  Title, 
  Button, 
  Divider,
  ActivityIndicator,
  List,
  IconButton,
  Caption
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSaleDetails } from '../services/salesService';
import { theme, shadowStyles } from '../theme/theme';

const SaleDetailScreen = ({ route, navigation }) => {
  const { saleId } = route.params;
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadSaleDetails();
  }, []);
  
  const loadSaleDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const saleDetails = await getSaleDetails(saleId);
      
      if (!saleDetails) {
        setError('Sale not found');
      } else {
        setSale(saleDetails);
      }
    } catch (err) {
      console.error('Error loading sale details:', err);
      setError('Failed to load sale details');
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleShare = async () => {
    if (!sale) return;
    
    try {
      const itemsList = sale.items.map(item => 
        `${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}`
      ).join('\n');
      
      const message = `Sale #${sale.id}\n` +
        `Date: ${formatDate(sale.date)}\n` +
        `Payment: ${sale.payment_method}\n\n` +
        `Items:\n${itemsList}\n\n` +
        `Total: ${formatCurrency(sale.total)}`;
      
      await Share.share({
        message,
        title: `Sale Receipt #${sale.id}`
      });
    } catch (error) {
      console.error('Error sharing sale:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading sale details...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadSaleDetails}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }
  
  if (!sale) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="file-search" size={64} color={theme.colors.disabled} />
        <Text style={styles.errorText}>Sale not found</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Surface style={[styles.headerCard, shadowStyles.medium]}>
        <View style={styles.headerRow}>
          <View>
            <Title style={styles.saleTitle}>Sale #{sale.id}</Title>
            <Text style={styles.saleDate}>{formatDate(sale.date)}</Text>
          </View>
          <IconButton
            icon="share-variant"
            color={theme.colors.primary}
            size={24}
            onPress={handleShare}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.paymentInfo}>
          <View style={styles.paymentMethod}>
            <MaterialCommunityIcons 
              name="cash" 
              size={24} 
              color={theme.colors.primary} 
              style={styles.paymentIcon}
            />
            <View>
              <Caption style={styles.paymentLabel}>Payment Method</Caption>
              <Text style={styles.paymentValue}>{sale.payment_method}</Text>
            </View>
          </View>
          
          <View>
            <Caption style={styles.totalLabel}>Total</Caption>
            <Text style={styles.totalValue}>{formatCurrency(sale.total)}</Text>
          </View>
        </View>
      </Surface>
      
      <Surface style={[styles.itemsCard, shadowStyles.medium]}>
        <Title style={styles.itemsTitle}>Items</Title>
        <Divider style={styles.divider} />
        
        {sale.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category} - {item.type}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price)} each</Text>
            </View>
            
            <View style={styles.itemQuantity}>
              <Text style={styles.quantityText}>{item.quantity}x</Text>
            </View>
            
            <View style={styles.itemTotal}>
              <Text style={styles.itemTotalText}>{formatCurrency(item.price * item.quantity)}</Text>
            </View>
          </View>
        ))}
        
        <Divider style={styles.divider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(sale.total)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>{formatCurrency(0)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.totalSummaryLabel}>Total</Text>
          <Text style={styles.totalSummaryValue}>{formatCurrency(sale.total)}</Text>
        </View>
      </Surface>
      
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('SalesMain')}
          style={styles.newSaleButton}
          contentStyle={styles.buttonContent}
        >
          New Sale
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    color: theme.colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
  },
  headerCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  saleDate: {
    color: theme.colors.text,
    opacity: 0.7,
  },
  divider: {
    marginVertical: 12,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    marginRight: 8,
  },
  paymentLabel: {
    color: theme.colors.text,
    opacity: 0.7,
  },
  paymentValue: {
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  totalLabel: {
    color: theme.colors.text,
    opacity: 0.7,
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  itemsCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  itemInfo: {
    flex: 1,
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
  },
  itemPrice: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  itemQuantity: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  itemTotal: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  itemTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
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
  totalSummaryLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalSummaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  actions: {
    marginTop: 8,
    marginBottom: 24,
  },
  newSaleButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  buttonContent: {
    height: 50,
  },
});

export default SaleDetailScreen;