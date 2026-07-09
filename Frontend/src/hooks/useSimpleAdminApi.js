// hooks/useSimpleAdminApi.js
import { useState, useEffect } from 'react';
import { simpleAdminApi } from '../services/SimpleAdminApi';

export const useSimpleAdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await simpleAdminApi.getMyProducts(params);
      setProducts(result.products);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (formData, files) => {
    try {
      setLoading(true);
      const productFormData = simpleAdminApi.createFormData(formData, files);
      const result = await simpleAdminApi.createProduct(productFormData);
      await fetchProducts(); // Refresh list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId, formData, files) => {
    try {
      setLoading(true);
      const productFormData = simpleAdminApi.createFormData(formData, files);
      const result = await simpleAdminApi.updateProduct(productId, productFormData);
      await fetchProducts(); // Refresh list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct
  };
};

// Usage in component:
const MyProductsPage = () => {
  const { products, loading, error, fetchProducts } = useSimpleAdminProducts();

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          {product.title}
          Status: {product.status}
        </div>
      ))}
    </div>
  );
};