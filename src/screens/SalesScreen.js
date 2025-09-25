import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { 
  Text, 
  Surface, 
  Title, 
  Searchbar, 
  Button, 
  FAB, 
  Chip,
  ActivityIndicator,
  IconButton,
  List,
  Divider,
  Portal,
  Dialog
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { getProducts, searchProducts } from '../services/productService';
import { 
  startVoiceRecognition, 
  handleVoiceCommand, 
  isMobileVoiceSupported,
  requestVoicePermissions
} from '../services/voiceService';
import { theme, shadowStyles } from '../theme/theme';

const { width } = Dimensions.get('window');

const SalesScreen = ({ navigation }) => {
  const { addToCart, cartItems, total } = useCart();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [voiceCommandResult, setVoiceCommandResult] = useState(null);
  
  const categories = ['All', 'Flower', 'Concentrate', 'Edible', 'Pre-Roll', 'Vape'];
  const types = ['All', 'Sativa', 'Indica', 'Hybrid', 'CBD'];
  
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  
  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };
  
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      // Reset to filtered by category/type if no search query
      filterProductsByCategoryAndType(selectedCategory, selectedType);
      return;
    }
    
    try {
      const results = await searchProducts(query);
      
      // Apply category and type filters to search results if they're selected
      let filtered = results;
      
      if (selectedCategory && selectedCategory !== 'All') {
        filtered = filtered.filter(product => product.category === selectedCategory);
      }
      
      if (selectedType && selectedType !== 'All') {
        filtered = filtered.filter(product => product.type === selectedType);
      }
      
      setFilteredProducts(filtered);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };
  
  const filterProductsByCategoryAndType = (category, type) => {
    let filtered = products;
    
    if (category && category !== 'All') {
      filtered = filtered.filter(product => product.category === category);
    }
    
    if (type && type !== 'All') {
      filtered = filtered.filter(product => product.type === type);
    }
    
    setFilteredProducts(filtered);
  };
  
  const handleCategorySelect = (category) => {
    const newCategory = category === selectedCategory ? null : category;
    setSelectedCategory(newCategory);
    filterProductsByCategoryAndType(newCategory, selectedType);
  };
  
  const handleTypeSelect = (type) => {
    const newType = type === selectedType ? null : type;
    setSelectedType(newType);
    filterProductsByCategoryAndType(selectedCategory, newType);
  };
  
  const handleAddToCart = (product, quantity = 1) => {
    addToCart(product, quantity);
  };
  
  const startListening = async () => {
    // For mobile devices, request permissions first
    if (Platform.OS !== 'web') {
      const hasPermission = await requestVoicePermissions();
      if (!hasPermission) {
        Alert.alert(
          'Microphone Permission',
          'We need microphone permission to use voice commands',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    setIsListening(true);
    setShowVoiceDialog(true);
    
    await startVoiceRecognition(
      async (result) => {
        console.log('Voice command received:', result);
        
        const commandResult = await handleVoiceCommand(result, handleAddToCart);
        setVoiceCommandResult(commandResult);
        
        // Keep dialog open to show the result
        setTimeout(() => {
          setIsListening(false);
          // Close dialog after showing result for a moment
          setTimeout(() => {
            setShowVoiceDialog(false);
            setVoiceCommandResult(null);
          }, 2000);
        }, 1000);
      },
      (error) => {
        console.error('Voice recognition error:', error);
        setIsListening(false);
        setShowVoiceDialog(false);
      }
    );
  };
  
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };
  
  const renderProductItem = ({ item }) => (
    <Surface style={[styles.productCard, shadowStyles.small]}>
      <TouchableOpacity
        style={styles.productCardContent}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.productMeta}>
            <Chip 
              style={styles.productChip} 
              textStyle={styles.productChipText}
            >
              {item.category}
            </Chip>
            <Chip 
              style={styles.productChip} 
              textStyle={styles.productChipText}
            >
              {item.type}
            </Chip>
          </View>
          <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
        </View>
        
        <View style={styles.productActions}>
          <IconButton
            icon="plus"
            color={theme.colors.primary}
            size={20}
            onPress={() => handleAddToCart(item)}
            style={styles.addButton}
          />
        </View>
      </TouchableOpacity>
    </Surface>
  );
  
  const renderCategoryChip = (category) => (
    <Chip
      key={category}
      selected={selectedCategory === category}
      onPress={() => handleCategorySelect(category)}
      style={[
        styles.filterChip,
        selectedCategory === category && styles.selectedChip
      ]}
      textStyle={[
        styles.filterChipText,
        selectedCategory === category && styles.selectedChipText
      ]}
    >
      {category}
    </Chip>
  );
  
  const renderTypeChip = (type) => (
    <Chip
      key={type}
      selected={selectedType === type}
      onPress={() => handleTypeSelect(type)}
      style={[
        styles.filterChip,
        selectedType === type && styles.selectedChip
      ]}
      textStyle={[
        styles.filterChipText,
        selectedType === type && styles.selectedChipText
      ]}
    >
      {type}
    </Chip>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search products..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.primary}
          inputStyle={{ color: theme.colors.text }}
        />
      </View>
      
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {categories.map(renderCategoryChip)}
        </ScrollView>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {types.map(renderTypeChip)}
        </ScrollView>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant" size={48} color={theme.colors.disabled} />
              <Text style={styles.emptyStateText}>No products found</Text>
            </View>
          }
        />
      )}
      
      <Surface style={[styles.cartPreview, shadowStyles.large]}>
        <View style={styles.cartInfo}>
          <Text style={styles.cartItemCount}>
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
          </Text>
          <Text style={styles.cartTotal}>{formatCurrency(total)}</Text>
        </View>
        
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Cart')}
          style={styles.viewCartButton}
          contentStyle={styles.viewCartButtonContent}
          disabled={cartItems.length === 0}
        >
          View Cart
        </Button>
      </Surface>
      
      <FAB
        style={styles.voiceFab}
        icon={isListening ? "microphone" : "microphone-outline"}
        color={isListening ? theme.colors.error : theme.colors.text}
        onPress={startListening}
        loading={isListening}
      />
      
      <Portal>
        <Dialog
          visible={showVoiceDialog}
          onDismiss={() => !isListening && setShowVoiceDialog(false)}
          style={styles.voiceDialog}
        >
          <View style={styles.voiceDialogContent}>
            {isListening ? (
              <>
                <MaterialCommunityIcons 
                  name="microphone" 
                  size={48} 
                  color={theme.colors.primary}
                  style={styles.pulsingIcon}
                />
                <Text style={styles.voiceDialogText}>
                  Listening... Try saying "Add two grams of Blue Dream"
                </Text>
              </>
            ) : voiceCommandResult ? (
              <>
                <MaterialCommunityIcons 
                  name={voiceCommandResult.success ? "check-circle" : "alert-circle"} 
                  size={48} 
                  color={voiceCommandResult.success ? theme.colors.success : theme.colors.error}
                />
                <Text style={styles.voiceDialogText}>
                  {voiceCommandResult.message}
                </Text>
              </>
            ) : null}
          </View>
        </Dialog>
      </Portal>
    </View>
  );
};

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  searchBar: {
    backgroundColor: theme.colors.background,
    elevation: 2,
  },
  filtersContainer: {
    backgroundColor: theme.colors.surface,
    paddingBottom: 8,
  },
  filtersScroll: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  filterChip: {
    marginHorizontal: 4,
    backgroundColor: theme.colors.background,
  },
  selectedChip: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.text,
  },
  selectedChipText: {
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text,
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  productCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.colors.text,
  },
  productMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productChip: {
    marginRight: 8,
    height: 24,
    backgroundColor: theme.colors.background,
  },
  productChipText: {
    fontSize: 10,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  productActions: {
    justifyContent: 'center',
  },
  addButton: {
    margin: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 10,
    color: theme.colors.disabled,
  },
  cartPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  cartInfo: {
    flex: 1,
  },
  cartItemCount: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  viewCartButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  viewCartButtonContent: {
    height: 40,
  },
  voiceFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80,
    backgroundColor: theme.colors.surface,
  },
  voiceDialog: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceDialogContent: {
    padding: 24,
    alignItems: 'center',
  },
  voiceDialogText: {
    marginTop: 16,
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 16,
  },
  pulsingIcon: {
    opacity: 0.8,
  },
});

export default SalesScreen;