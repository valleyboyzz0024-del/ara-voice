import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Alert
} from 'react-native';
import { 
  Text, 
  Surface, 
  Title, 
  Button, 
  Divider,
  ActivityIndicator,
  Chip,
  TextInput,
  IconButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProductById, updateProduct } from '../services/productService';
import { useCart } from '../context/CartContext';
import { theme, shadowStyles } from '../theme/theme';

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadProductDetails();
  }, []);
  
  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const productDetails = await getProductById(productId);
      
      if (!productDetails) {
        setError('Product not found');
      } else {
        setProduct(productDetails);
        setEditedProduct({...productDetails});
      }
    } catch (err) {
      console.error('Error loading product details:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToCart = () => {
    if (!product) return;
    
    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity < 1) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }
    
    if (numQuantity > product.stock) {
      Alert.alert('Insufficient Stock', `Only ${product.stock} units available`);
      return;
    }
    
    addToCart(product, numQuantity);
    Alert.alert('Added to Cart', `${numQuantity} ${product.name} added to cart`);
    navigation.goBack();
  };
  
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Validate fields
      if (!editedProduct.name || !editedProduct.price || !editedProduct.stock) {
        Alert.alert('Validation Error', 'Name, price and stock are required');
        return;
      }
      
      // Convert numeric fields
      const updatedProduct = {
        ...editedProduct,
        price: parseFloat(editedProduct.price),
        stock: parseFloat(editedProduct.stock),
        thc: parseFloat(editedProduct.thc || 0),
        cbd: parseFloat(editedProduct.cbd || 0)
      };
      
      await updateProduct(updatedProduct);
      setProduct(updatedProduct);
      setIsEditing(false);
      Alert.alert('Success', 'Product updated successfully');
    } catch (err) {
      console.error('Error updating product:', err);
      Alert.alert('Update Failed', 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };
  
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading product details...</Text>
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
          onPress={loadProductDetails}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }
  
  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="package-variant" size={64} color={theme.colors.disabled} />
        <Text style={styles.errorText}>Product not found</Text>
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
      <Surface style={[styles.productCard, shadowStyles.medium]}>
        <View style={styles.header}>
          {isEditing ? (
            <TextInput
              label="Product Name"
              value={editedProduct.name}
              onChangeText={(text) => setEditedProduct({...editedProduct, name: text})}
              style={styles.input}
              mode="outlined"
            />
          ) : (
            <Title style={styles.productName}>{product.name}</Title>
          )}
          
          {!isEditing && (
            <IconButton
              icon="pencil"
              color={theme.colors.primary}
              size={20}
              onPress={() => setIsEditing(true)}
            />
          )}
        </View>
        
        <View style={styles.categoryContainer}>
          {isEditing ? (
            <View style={styles.row}>
              <TextInput
                label="Category"
                value={editedProduct.category}
                onChangeText={(text) => setEditedProduct({...editedProduct, category: text})}
                style={[styles.input, styles.halfInput]}
                mode="outlined"
              />
              <TextInput
                label="Type"
                value={editedProduct.type}
                onChangeText={(text) => setEditedProduct({...editedProduct, type: text})}
                style={[styles.input, styles.halfInput]}
                mode="outlined"
              />
            </View>
          ) : (
            <View style={styles.chipContainer}>
              <Chip style={styles.chip}>{product.category}</Chip>
              <Chip style={styles.chip}>{product.type}</Chip>
            </View>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            {isEditing ? (
              <TextInput
                label="Price"
                value={editedProduct.price.toString()}
                onChangeText={(text) => setEditedProduct({...editedProduct, price: text})}
                keyboardType="decimal-pad"
                style={styles.input}
                mode="outlined"
                left={<TextInput.Affix text="$" />}
              />
            ) : (
              <Text style={styles.detailValue}>{formatCurrency(product.price)}</Text>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stock</Text>
            {isEditing ? (
              <TextInput
                label="Stock"
                value={editedProduct.stock.toString()}
                onChangeText={(text) => setEditedProduct({...editedProduct, stock: text})}
                keyboardType="decimal-pad"
                style={styles.input}
                mode="outlined"
              />
            ) : (
              <Text style={[
                styles.detailValue, 
                product.stock < 10 ? styles.lowStock : null
              ]}>
                {product.stock} units
              </Text>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>THC</Text>
            {isEditing ? (
              <TextInput
                label="THC %"
                value={editedProduct.thc ? editedProduct.thc.toString() : '0'}
                onChangeText={(text) => setEditedProduct({...editedProduct, thc: text})}
                keyboardType="decimal-pad"
                style={styles.input}
                mode="outlined"
                right={<TextInput.Affix text="%" />}
              />
            ) : (
              <Text style={styles.detailValue}>{product.thc}%</Text>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>CBD</Text>
            {isEditing ? (
              <TextInput
                label="CBD %"
                value={editedProduct.cbd ? editedProduct.cbd.toString() : '0'}
                onChangeText={(text) => setEditedProduct({...editedProduct, cbd: text})}
                keyboardType="decimal-pad"
                style={styles.input}
                mode="outlined"
                right={<TextInput.Affix text="%" />}
              />
            ) : (
              <Text style={styles.detailValue}>{product.cbd}%</Text>
            )}
          </View>
          
          {isEditing && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Barcode</Text>
              <TextInput
                label="Barcode"
                value={editedProduct.barcode || ''}
                onChangeText={(text) => setEditedProduct({...editedProduct, barcode: text})}
                style={styles.input}
                mode="outlined"
              />
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description</Text>
            {isEditing ? (
              <TextInput
                label="Description"
                value={editedProduct.description || ''}
                onChangeText={(text) => setEditedProduct({...editedProduct, description: text})}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.descriptionText}>
                {product.description || 'No description available'}
              </Text>
            )}
          </View>
        </View>
        
        {isEditing ? (
          <View style={styles.editActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setEditedProduct({...product});
                setIsEditing(false);
              }}
              style={styles.cancelButton}
              contentStyle={styles.buttonContent}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveChanges}
              style={styles.saveButton}
              contentStyle={styles.buttonContent}
              loading={saving}
              disabled={saving}
            >
              Save Changes
            </Button>
          </View>
        ) : (
          <View style={styles.actions}>
            <View style={styles.quantityContainer}>
              <IconButton
                icon="minus"
                size={20}
                color={theme.colors.text}
                onPress={() => {
                  const current = parseInt(quantity, 10);
                  if (!isNaN(current) && current > 1) {
                    setQuantity((current - 1).toString());
                  }
                }}
                disabled={quantity === '1'}
                style={styles.quantityButton}
              />
              
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                style={styles.quantityInput}
                mode="outlined"
                dense
              />
              
              <IconButton
                icon="plus"
                size={20}
                color={theme.colors.text}
                onPress={() => {
                  const current = parseInt(quantity, 10);
                  if (!isNaN(current)) {
                    setQuantity((current + 1).toString());
                  } else {
                    setQuantity('1');
                  }
                }}
                style={styles.quantityButton}
              />
            </View>
            
            <Button
              mode="contained"
              onPress={handleAddToCart}
              style={styles.addToCartButton}
              contentStyle={styles.buttonContent}
              icon="cart-plus"
              disabled={product.stock <= 0}
            >
              Add to Cart
            </Button>
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
  productCard: {
    borderRadius: 10,
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    flex: 1,
  },
  categoryContainer: {
    marginTop: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
  },
  divider: {
    marginVertical: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.text,
  },
  lowStock: {
    color: theme.colors.error,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    margin: 0,
  },
  quantityInput: {
    width: 60,
    height: 40,
    textAlign: 'center',
    backgroundColor: theme.colors.surface,
  },
  addToCartButton: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  buttonContent: {
    height: 50,
  },
  input: {
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: theme.colors.primary,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.colors.primary,
  },
});

export default ProductDetailScreen;