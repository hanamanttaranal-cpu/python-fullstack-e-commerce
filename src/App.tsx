import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ShoppingBag, Star, RefreshCw, LogIn, Sparkles, ShieldCheck } from 'lucide-react';
import { Product, CartItem, UserProfile, Rating } from './types';
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
import ProductCompare from './components/ProductCompare';
import NewsletterSignup from './components/NewsletterSignup';

export function AppContent() {
  const { showToast } = useToast();
  
  // Global Dark Mode state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
    } catch (e) {
      // Fail gracefully if localStorage is disabled
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      // Fail gracefully
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Products Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');

  // Selected Product detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Recently Viewed State (stores IDs in session state)
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('auramarket_recently_viewed');
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Track product clicks via selectedProduct
  useEffect(() => {
    if (selectedProduct) {
      setRecentlyViewedIds((prev) => {
        const filtered = prev.filter((id) => id !== selectedProduct.id);
        const updated = [selectedProduct.id, ...filtered].slice(0, 5);
        sessionStorage.setItem('auramarket_recently_viewed', JSON.stringify(updated));
        return updated;
      });
    }
  }, [selectedProduct]);

  // Load ratings in real-time from Firestore
  const [allRatings, setAllRatings] = useState<Rating[]>([]);

  useEffect(() => {
    const ratingsRef = collection(db, 'ratings');
    const unsubscribe = onSnapshot(
      ratingsRef,
      (snapshot) => {
        const list: Rating[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Rating);
        });
        setAllRatings(list);
      },
      (error) => {
        console.error('Error loading ratings from Firestore:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute average rating and count for each product
  const ratingsSummary = React.useMemo(() => {
    const summary: Record<string, { total: number; count: number }> = {};
    allRatings.forEach((r) => {
      if (!summary[r.productId]) {
        summary[r.productId] = { total: 0, count: 0 };
      }
      summary[r.productId].total += r.rating;
      summary[r.productId].count += 1;
    });

    const result: Record<string, { average: number; count: number }> = {};
    Object.keys(summary).forEach((productId) => {
      const data = summary[productId];
      result[productId] = {
        average: Number((data.total / data.count).toFixed(1)),
        count: data.count,
      };
    });
    return result;
  }, [allRatings]);

  // Merge computed ratings with products catalog
  const productsWithRatings = React.useMemo(() => {
    return products.map((product) => {
      const summary = ratingsSummary[product.id];
      if (summary) {
        return {
          ...product,
          rating: summary.average,
          reviewCount: summary.count,
        };
      }
      return product;
    });
  }, [products, ratingsSummary]);

  // Resolve recently viewed products using memo
  const recentlyViewedProducts = React.useMemo(() => {
    return recentlyViewedIds
      .map((id) => productsWithRatings.find((p) => p.id === id))
      .filter((p): p is Product => !!p);
  }, [recentlyViewedIds, productsWithRatings]);

  // Product Comparison state
  const [comparedIds, setComparedIds] = useState<string[]>([]);

  const handleToggleCompare = (product: Product) => {
    setComparedIds((prev) => {
      if (prev.includes(product.id)) {
        return prev.filter((id) => id !== product.id);
      }
      if (prev.length >= 3) {
        showToast('You can compare a maximum of 3 products side-by-side.', 'info');
        return prev;
      }
      return [...prev, product.id];
    });
  };

  const handleRemoveFromCompare = (product: Product) => {
    setComparedIds((prev) => prev.filter((id) => id !== product.id));
  };

  const handleClearCompare = () => {
    setComparedIds([]);
  };

  const comparedProducts = React.useMemo(() => {
    return comparedIds
      .map((id) => productsWithRatings.find((p) => p.id === id))
      .filter((p): p is Product => !!p);
  }, [comparedIds, productsWithRatings]);

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
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error('Error syncing user profile with Firestore:', error);
          try {
            handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
          } catch (e) {
            // Keep app running but log detailed error
          }
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

  // Filtering & Sorting Logic
  const filteredProducts = productsWithRatings
    .filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price;
      }
      return a.name.localeCompare(b.name);
    });

  const featuredProducts = productsWithRatings.filter((p) => p.featured).slice(0, 3);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between selection:bg-gray-900 selection:text-white dark:bg-gray-950 dark:text-gray-100 dark:selection:bg-white dark:selection:text-gray-950 transition-colors duration-300" id="app-viewport">
      
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
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {/* Main Container Stage */}
      <main className="flex-grow">
        
        {/* Sync or Seeding Status Banner */}
        {seeding && (
          <div className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 py-2 px-4 text-xs font-mono font-bold text-center animate-pulse flex items-center justify-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Establishing core catalog records in Firestore database...</span>
          </div>
        )}

        {/* Database access warnings */}
        {dbError && (
          <div className="bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-350 py-3.5 px-4 text-xs font-bold text-center border-b border-red-100 dark:border-red-900 flex items-center justify-center gap-2 max-w-4xl mx-auto mt-4 rounded-xl shadow-xs">
            <ShieldCheck className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{dbError}</span>
          </div>
        )}

        {successNotice && (
          <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-350 py-3.5 px-4 text-xs font-bold text-center border-b border-emerald-100 dark:border-emerald-900 flex items-center justify-center gap-2 max-w-4xl mx-auto mt-4 rounded-xl shadow-xs">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Dynamic Tab Switching Content */}
        {activeTab === 'shop' && (
          <div id="shop-tab-viewport">
            
            {/* Elegant Hero Banner */}
            {selectedCategory === 'All' && !searchQuery && (
              <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-12 sm:py-16 md:py-20 text-center transition-colors duration-300" id="hero-banner">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                  <span className="inline-flex items-center rounded-full bg-gray-50 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 uppercase tracking-widest mb-4 font-mono">
                    High Craft & Premium Goods
                  </span>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white font-sans">
                    Crafted for Comfort,<br />Designed for Longevity.
                  </h1>
                  <p className="mt-4 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-sans leading-relaxed">
                    Explore a highly curated assembly of premium gadgets, high-fidelity audio equipment, minimalist home living essentials, and weather-proof activewear.
                  </p>
                </div>
              </section>
            )}

            {/* Main grid section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" id="catalog-section">
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono">
                  {selectedCategory} Catalog ({filteredProducts.length})
                </h2>
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-select" className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sort by:</label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white font-sans text-gray-700 dark:text-gray-200 cursor-pointer shadow-xs transition-colors hover:border-gray-300 dark:hover:border-gray-700"
                  >
                    <option value="name">Name (A-Z)</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Loader Skeleton */}
              {loadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="products-skeletons">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl h-80 flex flex-col justify-between p-4 shadow-xs" id={`product-skeleton-card-${i}`}>
                      <div className="bg-shimmer h-44 rounded-xl w-full" />
                      <div className="space-y-2 mt-4">
                        <div className="bg-shimmer h-4 w-3/4 rounded" />
                        <div className="bg-shimmer h-3 w-1/2 rounded" />
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="bg-shimmer h-5 w-1/3 rounded" />
                        <div className="bg-shimmer h-8 w-1/4 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-24 text-center" id="catalog-empty-stage">
                  <ShoppingBag className="h-12 w-12 text-gray-350 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white font-sans">No products matched</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try clearing your filters or testing another query.</p>
                  <button
                    onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                    className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
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
                      isComparing={comparedIds.includes(product.id)}
                      onToggleCompare={handleToggleCompare}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Recently Viewed Section */}
            {recentlyViewedProducts.length > 0 && selectedCategory === 'All' && !searchQuery && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-100 dark:border-gray-800" id="recently-viewed-section">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono">
                      Recently Viewed ({recentlyViewedProducts.length})
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-sans">Your recently clicked premium items</p>
                  </div>
                  <button
                    onClick={() => {
                      setRecentlyViewedIds([]);
                      sessionStorage.removeItem('auramarket_recently_viewed');
                      showToast('Recently viewed items cleared.', 'info');
                    }}
                    className="text-xs font-mono text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4" id="recently-viewed-grid">
                  {recentlyViewedProducts.map((product) => (
                    <div 
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="group cursor-pointer bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 flex flex-col hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-xs transition-all duration-200"
                    >
                      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-950 rounded-lg mb-3">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono mb-0.5">{product.category}</p>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-gray-700 dark:group-hover:text-gray-200 font-sans">{product.name}</h4>
                      <p className="text-xs font-bold text-gray-900 dark:text-white font-mono mt-1">${product.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {activeTab === 'orders' && (
          <OrdersTab user={user} />
        )}

        {activeTab === 'admin' && user?.email === 'hanamanttaranal19@gmail.com' && (
          <AdminPanel />
        )}

      </main>

      {/* Newsletter Signup Section */}
      <NewsletterSignup />

      {/* Footer Branding Area */}
      <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 py-8 transition-colors duration-300" id="footer-branding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-gray-500 font-sans">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700 dark:text-gray-300">AuraMarket</span>
            <span>•</span>
            <span>Durable Craftsmanship</span>
          </div>
          <p>© 2026 AuraMarket. Integrated with cloud-secure Firestore databases & Auth.</p>
        </div>
      </footer>

      {/* Dynamic Slide Drawer and Modals */}
      {selectedProduct && (
        <ProductDetailModal
          product={productsWithRatings.find((p) => p.id === selectedProduct.id) || selectedProduct}
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

      <ProductCompare
        comparedProducts={comparedProducts}
        onRemoveFromCompare={handleRemoveFromCompare}
        onClearCompare={handleClearCompare}
        onAddToCart={handleAddToCart}
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
