import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
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
  Portal,
  Dialog,
  TextInput,
  Divider
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProducts, searchProducts, addProduct } from '../services/productService';
import { theme, shadowStyles } from '../theme/theme';

const InventoryScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Flower',
    type: 'Sativa',
    price: '',
    stock: '',
    thc: '',
    cbd: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  
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
  
  const handleAddProduct = async () => {
    try {
      // Validate fields
      if (!newProduct.name || !newProduct.price || !newProduct.stock) {
        Alert.alert('Validation Error', 'Name, price and stock are required');
        return;
      }
      
      setSaving(true);
      
      // Convert numeric fields
      const productToAdd = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock: parseFloat(newProduct.stock),
        thc: parseFloat(newProduct.thc || 0),
        cbd: parseFloat(newProduct.cbd || 0)
      };
      
      await addProduct(productToAdd);
      
      // Reset form and close dialog
      setNewProduct({
        name: '',
        category: 'Flower',
        type: 'Sativa',
        price: '',
        stock: '',
        thc: '',
        cbd: '',
        description: ''
      });
      
      setShowAddDialog(false);
      
      // Reload products
      loadProducts();
      
      Alert.alert('Success', 'Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product');
    } finally {
      setSaving(false);
    }
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
          <View style={styles.productDetails}>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            <Text style={[
              styles.productStock, 
              item.stock < 10 ? styles.lowStock : null
            ]}>
              Stock: {item.stock}
            </Text>
          </View>
        </View>
        
        <View style={styles.productActions}>
          <IconButton
            icon="chevron-right"
            color={theme.colors.primary}
            size={24}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
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
          placeholder="Search inventory..."
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
          <Text style={styles.loadingText}>Loading inventory...</Text>
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
              <Button 
                mode="contained" 
                onPress={() => setShowAddDialog(true)}
                style={styles.addButton}
                icon="plus"
              >
                Add Product
              </Button>
            </View>
          }
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        color="#000000"
        onPress={() => setShowAddDialog(true)}
      />
      
      <Portal>
        <Dialog
          visible={showAddDialog}
          onDismiss={() => setShowAddDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Add New Product</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <TextInput
                label="Product Name"
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({...newProduct, name: text})}
                style={styles.input}
                mode="outlined"
              />
              
              <View style={styles.row}>
                <View style={styles.dropdown}>
                  <Text style={styles.dropdownLabel}>Category</Text>
                  <View style={styles.chipContainer}>
                    {categories.filter(c => c !== 'All').map((category) => (
                      <Chip
                        key={category}
                        selected={newProduct.category === category}
                        onPress={() => setNewProduct({...newProduct, category})}
                        style={[
                          styles.dialogChip,
                          newProduct.category === category && styles.selectedDialogChip
                        ]}
                        textStyle={[
                          styles.dialogChipText,
                          newProduct.category === category && styles.selectedDialogChipText
                        ]}
                      >
                        {category}
                      </Chip>
                    ))}
                  </View>
                </View>
              </View>
              
              <View style={styles.row}>
                <View style={styles.dropdown}>
                  <Text style={styles.dropdownLabel}>Type</Text>
                  <View style={styles.chipContainer}>
                    {types.filter(t => t !== 'All').map((type) => (
                      <Chip
                        key={type}
                        selected={newProduct.type === type}
                        onPress={() => setNewProduct({...newProduct, type})}
                        style={[
                          styles.dialogChip,
                          newProduct.type === type && styles.selectedDialogChip
                        ]}
                        textStyle={[
                          styles.dialogChipText,
                          newProduct.type === type && styles.selectedDialogChipText
                        ]}
                      >
                        {type}
                      </Chip>
                    ))}
                  </View>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.row}>
                <TextInput
                  label="Price"
                  value={newProduct.price}
                  onChangeText={(text) => setNewProduct({...newProduct, price: text})}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  left={<TextInput.Affix text="$" />}
                />
                
                <TextInput
                  label="Stock"
                  value={newProduct.stock}
                  onChangeText={(text) => setNewProduct({...newProduct, stock: text})}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                />
              </View>
              
              <View style={styles.row}>
                <TextInput
                  label="THC %"
                  value={newProduct.thc}
                  onChangeText={(text) => setNewProduct({...newProduct, thc: text})}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  right={<TextInput.Affix text="%" />}
                />
                
                <TextInput
                  label="CBD %"
                  value={newProduct.cbd}
                  onChangeText={(text) => setNewProduct({...newProduct, cbd: text})}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  right={<TextInput.Affix text="%" />}
                />
              </View>
              
              <TextInput
                label="Description (Optional)"
                value={newProduct.description}
                onChangeText={(text) => setNewProduct({...newProduct, description: text})}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={3}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          
          <Dialog.Actions>
            <Button onPress={() => setShowAddDialog(false)} color={theme.colors.text}>
              Cancel
            </Button>
            <Button 
              onPress={handleAddProduct} 
              mode="contained" 
              loading={saving}
              disabled={saving}
            >
              Add Product
            </Button>
          </Dialog.Actions>
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
    paddingBottom: 80, // Extra padding for FAB
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
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  productStock: {
    fontSize: 14,
    color: theme.colors.text,
  },
  lowStock: {
    color: theme.colors.error,
  },
  productActions: {
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 10,
    marginBottom: 20,
    color: theme.colors.disabled,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  dialog: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
  },
  dialogTitle: {
    color: theme.colors.primary,
  },
  dialogScrollArea: {
    maxHeight: 400,
  },
  dialogContent: {
    paddingVertical: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  dropdown: {
    marginBottom: 12,
    width: '100%',
  },
  dropdownLabel: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dialogChip: {
    margin: 4,
    backgroundColor: theme.colors.background,
  },
  selectedDialogChip: {
    backgroundColor: theme.colors.primary,
  },
  dialogChipText: {
    color: theme.colors.text,
  },
  selectedDialogChipText: {
    color: '#000000',
  },
  divider: {
    marginVertical: 12,
  },
});

export default InventoryScreen;