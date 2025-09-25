import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { 
  Text, 
  Surface, 
  Title, 
  Divider, 
  ActivityIndicator,
  Button,
  IconButton,
  List
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getTodaySales, getDailySalesSummary, getTopSellingProducts } from '../services/salesService';
import { getTodayFloat, calculateExpectedEndingAmount } from '../services/cashFloatService';
import { theme, shadowStyles } from '../theme/theme';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySales, setTodaySales] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayTransactions, setTodayTransactions] = useState(0);
  const [cashFloat, setCashFloat] = useState(null);
  const [expectedEndingAmount, setExpectedEndingAmount] = useState(0);
  const [topProducts, setTopProducts] = useState([]);
  
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get today's sales
      const sales = await getTodaySales();
      setTodaySales(sales);
      
      // Calculate today's total
      const total = sales.reduce((sum, sale) => sum + sale.total, 0);
      setTodayTotal(total);
      
      // Set transaction count
      setTodayTransactions(sales.length);
      
      // Get cash float
      const float = await getTodayFloat();
      setCashFloat(float);
      
      if (float) {
        const endingAmount = await calculateExpectedEndingAmount();
        setExpectedEndingAmount(endingAmount);
      }
      
      // Get top selling products
      const topSellingProducts = await getTopSellingProducts(5);
      setTopProducts(topSellingProducts);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };
  
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Title style={styles.headerTitle}>Welcome, {user?.username}</Title>
          <Text style={styles.headerSubtitle}>Today's Business Overview</Text>
        </View>
        <IconButton
          icon="refresh"
          color={theme.colors.primary}
          size={24}
          onPress={onRefresh}
        />
      </View>
      
      <View style={styles.statsContainer}>
        <Surface style={[styles.statCard, shadowStyles.medium]}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="cash-register" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.statLabel}>Today's Sales</Text>
          <Text style={styles.statValue}>{formatCurrency(todayTotal)}</Text>
        </Surface>
        
        <Surface style={[styles.statCard, shadowStyles.medium]}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="receipt" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.statLabel}>Transactions</Text>
          <Text style={styles.statValue}>{todayTransactions}</Text>
        </Surface>
        
        <Surface style={[styles.statCard, shadowStyles.medium]}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="cash" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.statLabel}>Cash Float</Text>
          <Text style={styles.statValue}>
            {cashFloat ? formatCurrency(expectedEndingAmount) : 'Not Set'}
          </Text>
        </Surface>
      </View>
      
      <Surface style={[styles.section, shadowStyles.medium]}>
        <View style={styles.sectionHeader}>
          <Title style={styles.sectionTitle}>Quick Actions</Title>
        </View>
        <Divider />
        <View style={styles.quickActions}>
          <Button 
            mode="contained" 
            icon="cash-register" 
            onPress={() => navigation.navigate('Sales', { screen: 'SalesMain' })}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            New Sale
          </Button>
          
          <Button 
            mode="contained" 
            icon="package-variant-closed" 
            onPress={() => navigation.navigate('Inventory')}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            Inventory
          </Button>
          
          <Button 
            mode="contained" 
            icon="cash" 
            onPress={() => navigation.navigate('Settings', { screen: 'CashFloat' })}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            Cash Float
          </Button>
        </View>
      </Surface>
      
      <Surface style={[styles.section, shadowStyles.medium]}>
        <View style={styles.sectionHeader}>
          <Title style={styles.sectionTitle}>Top Selling Products</Title>
        </View>
        <Divider />
        {topProducts.length > 0 ? (
          <List.Section>
            {topProducts.map((product) => (
              <List.Item
                key={product.id}
                title={product.name}
                description={`${product.category} - ${product.type}`}
                left={props => <List.Icon {...props} icon="package-variant" color={theme.colors.primary} />}
                right={props => <Text style={styles.productSales}>{formatCurrency(product.total_sales)}</Text>}
                onPress={() => navigation.navigate('Inventory', { 
                  screen: 'ProductDetail', 
                  params: { productId: product.id } 
                })}
              />
            ))}
          </List.Section>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No sales data available yet</Text>
          </View>
        )}
      </Surface>
      
      <Surface style={[styles.section, shadowStyles.medium]}>
        <View style={styles.sectionHeader}>
          <Title style={styles.sectionTitle}>Recent Transactions</Title>
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('Sales')}
            color={theme.colors.primary}
          >
            View All
          </Button>
        </View>
        <Divider />
        {todaySales.length > 0 ? (
          <List.Section>
            {todaySales.slice(0, 5).map((sale) => (
              <List.Item
                key={sale.id}
                title={`Sale #${sale.id}`}
                description={`Payment: ${sale.payment_method}`}
                left={props => <List.Icon {...props} icon="receipt" color={theme.colors.primary} />}
                right={props => <Text style={styles.saleAmount}>{formatCurrency(sale.total)}</Text>}
                onPress={() => navigation.navigate('Sales', { 
                  screen: 'SaleDetail', 
                  params: { saleId: sale.id } 
                })}
              />
            ))}
          </List.Section>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions today</Text>
          </View>
        )}
      </Surface>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 4,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  section: {
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    flexWrap: 'wrap',
  },
  actionButton: {
    marginVertical: 8,
    minWidth: '30%',
    backgroundColor: theme.colors.primary,
  },
  actionButtonContent: {
    height: 50,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: theme.colors.text,
    opacity: 0.7,
  },
  productSales: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  saleAmount: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;