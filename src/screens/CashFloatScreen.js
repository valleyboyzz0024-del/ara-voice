import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  RefreshControl,
  Alert
} from 'react-native';
import { 
  Text, 
  Surface, 
  Title, 
  Button, 
  Divider,
  ActivityIndicator,
  TextInput,
  List,
  Portal,
  Dialog,
  Caption
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  getTodayFloat, 
  getFloatHistory, 
  initializeDailyFloat, 
  closeDailyFloat,
  calculateExpectedEndingAmount,
  autoCloseFloat
} from '../services/cashFloatService';
import { getTodaySales } from '../services/salesService';
import { theme, shadowStyles } from '../theme/theme';

const CashFloatScreen = ({ navigation }) => {
  const [todayFloat, setTodayFloat] = useState(null);
  const [floatHistory, setFloatHistory] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startAmount, setStartAmount] = useState('');
  const [endAmount, setEndAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedEndingAmount, setExpectedEndingAmount] = useState(0);
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get today's float
      const float = await getTodayFloat();
      setTodayFloat(float);
      
      if (float) {
        const expected = await calculateExpectedEndingAmount();
        setExpectedEndingAmount(expected);
        setEndAmount(expected.toString());
      }
      
      // Get float history
      const history = await getFloatHistory(10);
      setFloatHistory(history);
      
      // Get today's sales
      const sales = await getTodaySales();
      setTodaySales(sales);
      
    } catch (error) {
      console.error('Error loading cash float data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const handleInitializeFloat = async () => {
    try {
      setProcessing(true);
      
      const amount = parseFloat(startAmount);
      
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid starting amount');
        return;
      }
      
      await initializeDailyFloat(amount);
      
      setShowInitDialog(false);
      setStartAmount('');
      
      // Reload data
      await loadData();
      
      Alert.alert('Success', 'Cash float initialized successfully');
    } catch (error) {
      console.error('Error initializing cash float:', error);
      Alert.alert('Error', 'Failed to initialize cash float');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleCloseFloat = async () => {
    try {
      setProcessing(true);
      
      const amount = parseFloat(endAmount);
      
      if (isNaN(amount) || amount < 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid ending amount');
        return;
      }
      
      await closeDailyFloat(amount, notes);
      
      setShowCloseDialog(false);
      setEndAmount('');
      setNotes('');
      
      // Reload data
      await loadData();
      
      Alert.alert('Success', 'Cash float closed successfully');
    } catch (error) {
      console.error('Error closing cash float:', error);
      Alert.alert('Error', 'Failed to close cash float');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleAutoClose = async () => {
    try {
      setProcessing(true);
      
      const amount = await autoCloseFloat();
      
      // Reload data
      await loadData();
      
      Alert.alert('Success', `Cash float auto-closed with amount: $${amount.toFixed(2)}`);
    } catch (error) {
      console.error('Error auto-closing cash float:', error);
      Alert.alert('Error', 'Failed to auto-close cash float');
    } finally {
      setProcessing(false);
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
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading cash float data...</Text>
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
      <Surface style={[styles.section, shadowStyles.medium]}>
        <Title style={styles.sectionTitle}>Today's Cash Float</Title>
        <Divider style={styles.divider} />
        
        {todayFloat ? (
          <View>
            <View style={styles.floatInfo}>
              <View style={styles.floatDetail}>
                <Text style={styles.floatLabel}>Starting Amount</Text>
                <Text style={styles.floatValue}>{formatCurrency(todayFloat.starting_amount)}</Text>
              </View>
              
              <View style={styles.floatDetail}>
                <Text style={styles.floatLabel}>Total Sales</Text>
                <Text style={styles.floatValue}>{formatCurrency(todayFloat.total_sales)}</Text>
              </View>
              
              <View style={styles.floatDetail}>
                <Text style={styles.floatLabel}>Expected Ending</Text>
                <Text style={styles.floatValue}>{formatCurrency(expectedEndingAmount)}</Text>
              </View>
              
              <View style={styles.floatDetail}>
                <Text style={styles.floatLabel}>Actual Ending</Text>
                <Text style={styles.floatValue}>
                  {todayFloat.ending_amount !== null 
                    ? formatCurrency(todayFloat.ending_amount) 
                    : 'Not closed yet'}
                </Text>
              </View>
              
              {todayFloat.ending_amount !== null && (
                <View style={styles.floatDetail}>
                  <Text style={styles.floatLabel}>Difference</Text>
                  <Text style={[
                    styles.floatValue,
                    todayFloat.ending_amount !== expectedEndingAmount && styles.discrepancy
                  ]}>
                    {formatCurrency(todayFloat.ending_amount - expectedEndingAmount)}
                  </Text>
                </View>
              )}
            </View>
            
            {todayFloat.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notesText}>{todayFloat.notes}</Text>
              </View>
            )}
            
            <View style={styles.floatActions}>
              {todayFloat.ending_amount === null ? (
                <>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setEndAmount(expectedEndingAmount.toString());
                      setShowCloseDialog(true);
                    }}
                    style={styles.floatButton}
                    icon="cash-register"
                  >
                    Close Float
                  </Button>
                  
                  <Button
                    mode="contained"
                    onPress={handleAutoClose}
                    style={styles.floatButton}
                    icon="cash-lock"
                    loading={processing}
                    disabled={processing}
                  >
                    Auto Close
                  </Button>
                </>
              ) : (
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Sales')}
                  style={styles.floatButton}
                  icon="cash-register"
                >
                  View Sales
                </Button>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash" size={48} color={theme.colors.disabled} />
            <Text style={styles.emptyStateText}>No cash float initialized for today</Text>
            <Button
              mode="contained"
              onPress={() => setShowInitDialog(true)}
              style={styles.initButton}
              icon="cash-plus"
            >
              Initialize Float
            </Button>
          </View>
        )}
      </Surface>
      
      <Surface style={[styles.section, shadowStyles.medium]}>
        <Title style={styles.sectionTitle}>Today's Transactions</Title>
        <Divider style={styles.divider} />
        
        {todaySales.length > 0 ? (
          <List.Section>
            {todaySales.map((sale) => (
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
            <MaterialCommunityIcons name="receipt" size={48} color={theme.colors.disabled} />
            <Text style={styles.emptyStateText}>No transactions today</Text>
          </View>
        )}
      </Surface>
      
      <Surface style={[styles.section, shadowStyles.medium]}>
        <Title style={styles.sectionTitle}>Float History</Title>
        <Divider style={styles.divider} />
        
        {floatHistory.length > 0 ? (
          <List.Section>
            {floatHistory.map((float) => (
              <List.Item
                key={float.id}
                title={formatDate(float.date)}
                description={`Sales: ${formatCurrency(float.total_sales)}`}
                left={props => <List.Icon {...props} icon="calendar" color={theme.colors.primary} />}
                right={() => (
                  <View style={styles.floatHistoryRight}>
                    <Text style={styles.floatHistoryStart}>{formatCurrency(float.starting_amount)}</Text>
                    <Text style={styles.floatHistoryEnd}>
                      {float.ending_amount !== null 
                        ? formatCurrency(float.ending_amount) 
                        : 'Open'}
                    </Text>
                  </View>
                )}
              />
            ))}
          </List.Section>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar" size={48} color={theme.colors.disabled} />
            <Text style={styles.emptyStateText}>No float history available</Text>
          </View>
        )}
      </Surface>
      
      <Portal>
        <Dialog
          visible={showInitDialog}
          onDismiss={() => setShowInitDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Initialize Cash Float</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Enter the starting amount for today's cash float:
            </Text>
            <TextInput
              label="Starting Amount"
              value={startAmount}
              onChangeText={setStartAmount}
              keyboardType="decimal-pad"
              style={styles.dialogInput}
              mode="outlined"
              left={<TextInput.Affix text="$" />}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowInitDialog(false)} color={theme.colors.text}>
              Cancel
            </Button>
            <Button 
              onPress={handleInitializeFloat} 
              mode="contained" 
              loading={processing}
              disabled={processing || !startAmount}
            >
              Initialize
            </Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog
          visible={showCloseDialog}
          onDismiss={() => setShowCloseDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Close Cash Float</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Enter the ending amount for today's cash float:
            </Text>
            <TextInput
              label="Ending Amount"
              value={endAmount}
              onChangeText={setEndAmount}
              keyboardType="decimal-pad"
              style={styles.dialogInput}
              mode="outlined"
              left={<TextInput.Affix text="$" />}
            />
            
            <Caption style={styles.dialogCaption}>
              Expected ending amount: {formatCurrency(expectedEndingAmount)}
            </Caption>
            
            <TextInput
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              style={[styles.dialogInput, styles.notesInput]}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCloseDialog(false)} color={theme.colors.text}>
              Cancel
            </Button>
            <Button 
              onPress={handleCloseFloat} 
              mode="contained" 
              loading={processing}
              disabled={processing || !endAmount}
            >
              Close Float
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    paddingBottom: 24,
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
  section: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  divider: {
    marginVertical: 12,
  },
  floatInfo: {
    marginBottom: 16,
  },
  floatDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  floatLabel: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
  },
  floatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  discrepancy: {
    color: theme.colors.error,
  },
  notesContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  floatActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  floatButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    marginTop: 10,
    marginBottom: 20,
    color: theme.colors.text,
    opacity: 0.7,
  },
  initButton: {
    backgroundColor: theme.colors.primary,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    alignSelf: 'center',
  },
  floatHistoryRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  floatHistoryStart: {
    fontSize: 14,
    color: theme.colors.text,
  },
  floatHistoryEnd: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
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
    marginBottom: 16,
  },
  dialogInput: {
    backgroundColor: theme.colors.surface,
  },
  dialogCaption: {
    marginTop: 4,
    marginBottom: 16,
  },
  notesInput: {
    marginTop: 16,
  },
});

export default CashFloatScreen;