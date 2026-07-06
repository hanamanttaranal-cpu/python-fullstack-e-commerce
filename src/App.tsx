import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ShoppingBag, Star, RefreshCw, LogIn, Sparkles, ShieldCheck } from 'lucide-react';
import { Product, CartItem, UserProfile } from './types';
import { auth, db, signInWithGoogle, handleFirestoreError, OperationType } from './firebase';
import { SEED_PRODUCTS } from './data/seedProducts';

// Components
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrdersTab from './components/OrdersTab';
import AdminPanel from './components/AdminPanel';
import { ToastProvider, useToast } from './components/Toast';

export function AppContent() {
  const { showToast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Products Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Product detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<'shop' | 'orders' | 'admin'>('shop');

  // Syncing database / Seeding trigger
  const [seeding, setSeeding] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // 1. Firebase Auth listener & Profile Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // User signed in: make sure they exist in 'users' collection in Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            await setDoc(userDocRef, {
              displayName: currentUser.displayName || 'Guest User',
              photoURL: currentUser.photoURL || '',
              email: currentUser.email || '',
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error syncing user profile with Firestore:', error);
          // Handled, but won't crash the UI
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load and Seed Products
  useEffect(() => {
    const productsRef = collection(db, 'products');

    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        if (snapshot.empty) {
          setProducts([]);
          setCategories([]);
          setLoadingProducts(false);
          return;
        }

        const list: Product[] = [];
        const catsSet = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Product, 'id'>;
          list.push({ id: doc.id, ...data });
          catsSet.add(data.category);
        });

        setProducts(list);
        setCategories(Array.from(catsSet));
        setLoadingProducts(false);
        setDbError(null);
      },
      (error) => {
        console.error('Error loading products from Firestore:', error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'products');
        } catch (e) {
          setDbError('Access Denied: Please verify that you have successfully deployed your firestore.rules.');
        }
        setLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2b. Authenticated Admin Auto-Seeding
  useEffect(() => {
    // If loading is finished, the catalog is empty, the user is signed in as the admin, and we aren't currently seeding
    if (
      !loadingProducts &&
      products.length === 0 &&
      user &&
      user.email === 'hanamanttaranal19@gmail.com' &&
      !seeding
    ) {
      const autoSeed = async () => {
        setSeeding(true);
        setDbError(null);
        try {
          console.log('Administrator detected and catalog is empty. Auto-seeding initial catalog...');
          for (const prod of SEED_PRODUCTS) {
            const newDocRef = doc(collection(db, 'products'));
            await setDoc(newDocRef, prod);
          }
          setSuccessNotice('AuraMarket Catalog successfully seeded into Firestore.');
          setTimeout(() => setSuccessNotice(null), 5000);
        } catch (err) {
          console.error('Auto-seeding failed:', err);
          setDbError('Unable to write catalog seed documents. Please verify Firestore rules.');
        } finally {
          setSeeding(false);
        }
      };
      autoSeed();
    }
  }, [products, loadingProducts, user, seeding]);

  // 3. Cart State Synchronizer (Load from / Save to LocalStorage by default)
  useEffect(() => {
    const cached = localStorage.getItem('auramarket_cart');
    if (cached) {
      try {
        setCartItems(JSON.parse(cached));
      } catch (e) {
        console.error('Error parsing cart items', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('auramarket_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Synchronize cart with Firestore for signed-in users
  useEffect(() => {
    if (!user) return;

    const cartDocRef = doc(db, 'carts', user.uid);
    const unsubscribe = onSnapshot(
      cartDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteItems = snapshot.data().items as { productId: string; quantity: number }[];
          if (remoteItems && products.length > 0) {
            // Rebuild cartItems list using fresh product info
            const merged: CartItem[] = remoteItems
              .map((remote) => {
                const matchedProd = products.find((p) => p.id === remote.productId);
                if (matchedProd) {
                  return { id: remote.productId, product: matchedProd, quantity: remote.quantity };
                }
                return null;
              })
              .filter(Boolean) as CartItem[];
            
            // Only update if changes are real to avoid cycles
            if (JSON.stringify(merged) !== JSON.stringify(cartItems)) {
              setCartItems(merged);
            }
          }
        }
      },
      (error) => {
        // Quietly fail as rules might restrict access before order or cart is initialized
        console.warn('Cart Sync snapshot listener warning:', error.message);
      }
    );

    return () => unsubscribe();
  }, [user, products]);

  // Push cart updates to Firestore
  const syncCartToRemote = async (items: CartItem[]) => {
    if (!user) return;
    const cartDocRef = doc(db, 'carts', user.uid);
    try {
      const itemsPayload = items.map((item) => ({
        productId: item.id,
        quantity: item.quantity
      }));
      await setDoc(cartDocRef, {
        userId: user.uid,
        items: itemsPayload,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Remote Cart Sync Failed (rules restriction):', e);
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) }
            : item
        );
      } else {
        updated = [...prev, { id: product.id, product, quantity: 1 }];
      }
      syncCartToRemote(updated);
      return updated;
    });
    
    showToast(`${product.name} added to cart!`, 'success');
    // Auto trigger slide cart open
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    setCartItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, quantity } : item));
      syncCartToRemote(updated);
      return updated;
    });
  };

  const handleRemoveCartItem = (id: string) => {
    const itemToRemove = cartItems.find(item => item.id === id);
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      syncCartToRemote(updated);
      return updated;
    });
    if (itemToRemove) {
      showToast(`${itemToRemove.product.name} removed from cart.`, 'info');
    }
  };

  const handleClearCart = () => {
    setCartItems([]);
    if (user) {
      const cartDocRef = doc(db, 'carts', user.uid);
      setDoc(cartDocRef, { userId: user.uid, items: [], updatedAt: serverTimestamp() }).catch(console.error);
    }
  };

  // Filtering Logic
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredProducts = products.filter((p) => p.featured).slice(0, 3);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between selection:bg-gray-900 selection:text-white" id="app-viewport">
      
      {/* Navbar Integration */}
      <Navbar
        user={user}
        authLoading={authLoading}
        cartCount={cartCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        setIsCartOpen={setIsCartOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        categories={categories}
      />

      {/* Main Container Stage */}
      <main className="flex-grow">
        
        {/* Sync or Seeding Status Banner */}
        {seeding && (
          <div className="bg-gray-900 text-white py-2 px-4 text-xs font-mono font-bold text-center animate-pulse flex items-center justify-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Establishing core catalog records in Firestore database...</span>
          </div>
        )}

        {/* Database access warnings */}
        {dbError && (
          <div className="bg-red-50 text-red-800 py-3.5 px-4 text-xs font-bold text-center border-b border-red-100 flex items-center justify-center gap-2 max-w-4xl mx-auto mt-4 rounded-xl shadow-xs">
            <ShieldCheck className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span>{dbError}</span>
          </div>
        )}

        {successNotice && (
          <div className="bg-emerald-50 text-emerald-800 py-3.5 px-4 text-xs font-bold text-center border-b border-emerald-100 flex items-center justify-center gap-2 max-w-4xl mx-auto mt-4 rounded-xl shadow-xs">
            <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Dynamic Tab Switching Content */}
        {activeTab === 'shop' && (
          <div id="shop-tab-viewport">
            
            {/* Elegant Hero Banner */}
            {selectedCategory === 'All' && !searchQuery && (
              <section className="bg-white border-b border-gray-100 py-12 sm:py-16 md:py-20 text-center" id="hero-banner">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 uppercase tracking-widest mb-4 font-mono">
                    High Craft & Premium Goods
                  </span>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 font-sans">
                    Crafted for Comfort,<br />Designed for Longevity.
                  </h1>
                  <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto font-sans leading-relaxed">
                    Explore a highly curated assembly of premium gadgets, high-fidelity audio equipment, minimalist home living essentials, and weather-proof activewear.
                  </p>
                </div>
              </section>
            )}

            {/* Main grid section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" id="catalog-section">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 font-mono">
                  {selectedCategory} Catalog ({filteredProducts.length})
                </h2>
              </div>

              {/* Loader Skeleton */}
              {loadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="products-skeletons">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-2xl h-80 flex flex-col justify-between p-4">
                      <div className="bg-gray-150 h-44 rounded-xl w-full" />
                      <div className="space-y-2 mt-4">
                        <div className="bg-gray-150 h-4 w-3/4 rounded" />
                        <div className="bg-gray-150 h-3 w-1/2 rounded" />
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="bg-gray-150 h-5 w-1/3 rounded" />
                        <div className="bg-gray-150 h-8 w-1/4 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-24 text-center" id="catalog-empty-stage">
                  <ShoppingBag className="h-12 w-12 text-gray-350 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-gray-900 font-sans">No products matched</h3>
                  <p className="text-xs text-gray-500 mt-1">Try clearing your filters or testing another query.</p>
                  <button
                    onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                    className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                  >
                    Clear Search Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="products-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      onViewDetails={setSelectedProduct}
                    />
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

        {activeTab === 'orders' && (
          <OrdersTab user={user} />
        )}

        {activeTab === 'admin' && user?.email === 'hanamanttaranal19@gmail.com' && (
          <AdminPanel />
        )}

      </main>

      {/* Footer Branding Area */}
      <footer className="bg-white border-t border-gray-100 py-8" id="footer-branding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 font-sans">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">AuraMarket</span>
            <span>•</span>
            <span>Durable Craftsmanship</span>
          </div>
          <p>© 2026 AuraMarket. Integrated with cloud-secure Firestore databases & Auth.</p>
        </div>
      </footer>

      {/* Dynamic Slide Drawer and Modals */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          user={user}
          onAddToCart={handleAddToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        user={user}
        cartItems={cartItems}
        onClearCart={handleClearCart}
        onOrderSuccess={(orderId) => {
          setIsCheckoutOpen(false);
          setActiveTab('orders');
          showToast(`Order placed successfully! Receipt ID: ${orderId.slice(-5).toUpperCase()}`, 'success');
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
