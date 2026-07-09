import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit3, Trash2, Package, ShoppingBag, ShieldAlert, CheckCircle2, ChevronRight, Coins, RefreshCw } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, getDocs, setDoc } from 'firebase/firestore';
import { Product, Order } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SEED_PRODUCTS } from '../data/seedProducts';
import { useToast } from './Toast';

export default function AdminPanel() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // New product form state
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    price: 0,
    category: 'Tech & Gadgets',
    image: '',
    rating: 5,
    reviewCount: 0,
    stock: 10,
    featured: false
  });

  // Load All Products from Firestore
  useEffect(() => {
    setLoadingProducts(true);
    const productsRef = collection(db, 'products');
    
    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(list);
        setLoadingProducts(false);
      },
      (error) => {
        console.error('Error loading products for admin:', error);
        setErrorMsg('Failed to fetch catalog. Please verify your Firestore security rules.');
        setLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load All Orders from Firestore (Since we are Admin, we can bypass the userId list filter if we query all orders)
  useEffect(() => {
    setLoadingOrders(true);
    const ordersRef = collection(db, 'orders');
    
    const unsubscribe = onSnapshot(
      ordersRef,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Order);
        });
        // Sort orders descending
        list.sort((a, b) => {
          const timeA = a.createdAt ? (typeof a.createdAt === 'object' ? (a.createdAt as any).seconds : new Date(a.createdAt).getTime()) : 0;
          const timeB = b.createdAt ? (typeof b.createdAt === 'object' ? (b.createdAt as any).seconds : new Date(b.createdAt).getTime()) : 0;
          return timeB - timeA;
        });
        setOrders(list);
        setLoadingOrders(false);
      },
      (error) => {
        console.error('Error loading orders for admin:', error);
        // Error is expected if user isn't bootstrapped admin or rule deployment hasn't synced
        setErrorMsg('Unable to retrieve general orders list. Authenticated Admin only.');
        setLoadingOrders(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Create Product in Firestore
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic validation
    if (!newProduct.name || !newProduct.description || !newProduct.image || newProduct.price <= 0 || newProduct.stock < 0) {
      setErrorMsg('Please populate all fields with valid configurations.');
      return;
    }

    try {
      const productsRef = collection(db, 'products');
      await addDoc(productsRef, {
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        reviewCount: 0,
        rating: 5,
        featured: Boolean(newProduct.featured)
      });

      const productName = newProduct.name;
      setSuccessMsg('Product launched successfully in Firestore.');
      showToast(`${productName} launched successfully!`, 'success');
      setIsAdding(false);
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        category: 'Tech & Gadgets',
        image: '',
        rating: 5,
        reviewCount: 0,
        stock: 10,
        featured: false
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      showToast('Failed to create product.', 'error');
      try {
        handleFirestoreError(error, OperationType.CREATE, 'products');
      } catch (e: any) {
        setErrorMsg('Action Denied: Rules require admin permissions to write catalog.');
      }
    }
  };

  // Adjust stock count in Firestore
  const handleUpdateStock = async (productId: string, currentStock: number, change: number) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const newStock = Math.max(0, currentStock + change);
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { stock: newStock });
      setSuccessMsg('Inventory adjusted successfully.');
      showToast('Inventory adjusted successfully.', 'success');
    } catch (error) {
      console.error('Failed to update stock:', error);
      showToast('Failed to adjust inventory.', 'error');
      setErrorMsg('Action Denied: Admin permissions required.');
    }
  };

  // Delete product in Firestore
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const productRef = doc(db, 'products', productId);
      await deleteDoc(productRef);
      setSuccessMsg('Product eliminated from catalog.');
      showToast('Product deleted from catalog.', 'info');
    } catch (error) {
      console.error('Failed to delete product:', error);
      showToast('Failed to delete product.', 'error');
      setErrorMsg('Action Denied: Admin permissions required.');
    }
  };

  // Manual seed catalog with sample products
  const handleManualSeed = async () => {
    setIsSeeding(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      console.log('Seeding initial products into Firestore manually...');
      for (const prod of SEED_PRODUCTS) {
        const newDocRef = doc(collection(db, 'products'));
        await setDoc(newDocRef, prod);
      }
      setSuccessMsg('AuraMarket Catalog successfully seeded with 8 premium products.');
      showToast('AuraMarket Catalog successfully seeded with 8 premium products.', 'success');
    } catch (err) {
      console.error('Manual seed failed:', err);
      showToast('Failed to seed catalog.', 'error');
      setErrorMsg('Failed to seed catalog. Make sure you are authenticated as the Administrator.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Progress Order Status in Firestore
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status });
      setSuccessMsg(`Order #${orderId.slice(-5).toUpperCase()} progressed to ${status}.`);
      showToast(`Order #${orderId.slice(-5).toUpperCase()} progressed to ${status}.`, 'success');
    } catch (error) {
      console.error('Failed to update order:', error);
      showToast('Failed to update order status.', 'error');
      setErrorMsg('Action Denied: Admin permissions required.');
    }
  };

  const categories = ['Tech & Gadgets', 'Audio & Acoustics', 'Home & Living', 'Apparel & Style'];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8" id="admin-panel-container">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white font-sans flex items-center gap-2">
            <Settings className="h-6 w-6 text-gray-700 dark:text-gray-300 animate-spin-slow" />
            <span>Storefront Administrator Control Panel</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage global inventory catalog, stock limits, and customer fulfillment logs.</p>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 text-xs font-semibold">
          <ShieldAlert className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-450 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="admin-grids">
        
        {/* Left Side: Inventory Management */}
        <div className="lg:col-span-2 space-y-6" id="admin-inventory-section">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
              Store Catalog ({products.length})
            </h2>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer animate-none"
              id="admin-add-product-toggle"
            >
              <Plus className="h-4 w-4" />
              <span>Launch Product</span>
            </button>
          </div>

          {/* New Product Form */}
          {isAdding && (
            <form onSubmit={handleAddProduct} className="p-5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 rounded-xl space-y-4" id="new-product-form">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white font-mono uppercase">Launch New Premium Asset</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase font-mono">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 bg-white dark:bg-gray-950 text-gray-950 dark:text-white focus:outline-hidden focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:focus:border-white dark:focus:ring-white"
                    placeholder="e.g. Aero Glide Keyboard"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase font-mono">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 bg-white dark:bg-gray-950 text-gray-950 dark:text-white focus:outline-hidden focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:focus:border-white dark:focus:ring-white"
                  >
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase font-mono">Full Description</label>
                <textarea
                  rows={3}
                  required
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 bg-white dark:bg-gray-950 text-gray-950 dark:text-white focus:outline-hidden focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:focus:border-white dark:focus:ring-white"
                  placeholder="Detailed specifications and craftsmanship..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase font-mono">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 bg-white dark:bg-gray-950 text-gray-950 dark:text-white focus:outline-hidden focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:focus:border-white dark:focus:ring-white"
                    placeholder="149.99"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase font-mono">Initial Stock</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    className="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 bg-white dark:bg-gray-950 text-gray-950 dark:text-white focus:outline-hidden focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:focus:border-white dark:focus:ring-white"
                    placeholder="10"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-350">
                    <input
                      type="checkbox"
                      checked={newProduct.featured}
                      onChange={(e) => setNewProduct({ ...newProduct, featured: e.target.checked })}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <span>Highlight as Featured</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase font-mono">Asset Image URL</label>
                <input
                  type="url"
                  required
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  className="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 bg-white dark:bg-gray-950 text-gray-950 dark:text-white focus:outline-hidden focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:focus:border-white dark:focus:ring-white"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-850 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Publish Product
                </button>
              </div>
            </form>
          )}

          {/* Products List Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-800 overflow-hidden" id="admin-products-table">
            {loadingProducts ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Syncing catalog inventory logs...</div>
            ) : products.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-4">
                <div className="text-xs text-gray-400 dark:text-gray-500">The storefront inventory catalog is currently empty.</div>
                <button
                  onClick={handleManualSeed}
                  disabled={isSeeding}
                  className="mx-auto flex items-center gap-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  id="admin-manual-seed-btn"
                >
                  {isSeeding ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Seeding Catalog Assets...</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-3.5 w-3.5" />
                      <span>Seed Storefront with Sample Catalog</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-850">
                {products.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-4 flex-wrap hover:bg-gray-50/50 dark:hover:bg-gray-950/25 border-b border-gray-100 dark:border-gray-850 last:border-b-0 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="h-10 w-10 object-cover rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950" />
                      <div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{p.name}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">{p.category} • <span className="font-mono">${p.price}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Stock Adjuster */}
                      <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-955 p-1 rounded-lg border border-gray-100 dark:border-gray-800 text-xs">
                        <button
                          onClick={() => handleUpdateStock(p.id, p.stock, -1)}
                          disabled={p.stock <= 0}
                          className="h-6 w-6 rounded-md hover:bg-white dark:hover:bg-gray-900 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 disabled:opacity-30 cursor-pointer bg-transparent"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold font-mono text-gray-800 dark:text-gray-250 min-w-[20px] text-center">{p.stock}</span>
                        <button
                          onClick={() => handleUpdateStock(p.id, p.stock, 1)}
                          className="h-6 w-6 rounded-md hover:bg-white dark:hover:bg-gray-900 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 cursor-pointer bg-transparent"
                        >
                          +
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Global Fulfillment Orders Log */}
        <div className="space-y-6" id="admin-orders-section">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
            Customer Fulfillment logs ({orders.length})
          </h2>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1" id="admin-orders-scroll">
            {loadingOrders ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Syncing active customer orders...</div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/20 dark:bg-gray-900/30">
                No active sales orders.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 hover:border-gray-350 dark:hover:border-gray-700 rounded-xl space-y-3 transition-colors text-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white font-mono">#{order.id?.slice(-5).toUpperCase()}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                      {order.createdAt ? (typeof order.createdAt === 'object' ? 'Just Now' : new Date(order.createdAt).toLocaleDateString()) : 'Recent'}
                    </span>
                  </div>

                  <div className="text-gray-600 dark:text-gray-400">
                    <p className="font-semibold text-gray-800 dark:text-gray-250">{order.shippingAddress.fullName}</p>
                    <p className="truncate text-2xs mt-0.5">{order.shippingAddress.addressLine1}, {order.shippingAddress.city}</p>
                  </div>

                  {/* Pricing and Items count */}
                  <div className="flex justify-between items-center text-2xs pt-1 border-t border-gray-50 dark:border-gray-850 text-gray-500 dark:text-gray-450 font-sans">
                    <span>{order.items.length} unique items</span>
                    <span className="font-bold text-gray-900 dark:text-white font-mono">${order.total.toFixed(2)}</span>
                  </div>

                  {/* Status progression actions */}
                  <div className="flex flex-wrap gap-1.5 pt-2" id={`actions-${order.id}`}>
                    {order.status === 'Pending' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id!, 'Processing')}
                        className="px-2.5 py-1 bg-amber-50 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 font-bold text-[9px] rounded-md hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                      >
                        Accept & Process
                      </button>
                    )}
                    {order.status === 'Processing' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id!, 'Shipped')}
                        className="px-2.5 py-1 bg-blue-50 border border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-[9px] rounded-md hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                      >
                        Dispatch (Ship)
                      </button>
                    )}
                    {order.status === 'Shipped' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id!, 'Delivered')}
                        className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      >
                        Mark Delivered
                      </button>
                    )}
                    <span className="text-[10px] text-gray-500 dark:text-gray-450 font-bold px-2 py-0.5 bg-gray-50 dark:bg-gray-950 rounded border border-gray-100 dark:border-gray-800 ml-auto">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
