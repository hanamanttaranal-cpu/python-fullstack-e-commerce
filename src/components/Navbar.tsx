import React from 'react';
import { ShoppingCart, LogIn, LogOut, Package, User, Search, Settings } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { signInWithGoogle, logOut } from '../firebase';
import { useToast } from './Toast';

interface NavbarProps {
  user: FirebaseUser | null;
  authLoading: boolean;
  cartCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  setIsCartOpen: (open: boolean) => void;
  activeTab: 'shop' | 'orders' | 'admin';
  setActiveTab: (tab: 'shop' | 'orders' | 'admin') => void;
  categories: string[];
}

export default function Navbar({
  user,
  authLoading,
  cartCount,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  setIsCartOpen,
  activeTab,
  setActiveTab,
  categories
}: NavbarProps) {
  const { showToast } = useToast();
  const isAdmin = user?.email === 'hanamanttaranal19@gmail.com';

  const handleSignIn = async () => {
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        showToast(`Welcome back, ${loggedUser.displayName || 'User'}!`, 'success');
      }
    } catch (e) {
      showToast('Authentication failed. Please try again.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      showToast('Signed out successfully.', 'info');
    } catch (e) {
      showToast('Sign out failed.', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-xs" id="nav-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo / Brand Name */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => { setActiveTab('shop'); setSelectedCategory('All'); }}
            id="nav-logo-container"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white shadow-md font-mono font-bold text-lg">
              E
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block font-sans">
              Aura<span className="text-gray-500 font-light">Market</span>
            </span>
          </div>

          {/* Search Box */}
          <div className="flex-1 max-w-md relative hidden md:block" id="nav-search-desktop">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search premium goods..."
              className="w-full rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all duration-200"
              id="desktop-search-input"
            />
          </div>

          {/* Actions Menu */}
          <div className="flex items-center gap-2 sm:gap-4" id="nav-actions-container">
            {/* Navigation Tabs */}
            <button
              onClick={() => setActiveTab('shop')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'shop' 
                  ? 'text-gray-900 bg-gray-50' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
              id="tab-shop-btn"
            >
              Shop
            </button>
            
            {user && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'orders' 
                    ? 'text-gray-900 bg-gray-50' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                }`}
                id="tab-orders-btn"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'admin' 
                    ? 'text-gray-900 bg-gray-50' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                }`}
                id="tab-admin-btn"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Shopping Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200"
              aria-label="Shopping Cart"
              id="cart-trigger-btn"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Login/Dropdown */}
            {authLoading ? (
              <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" id="auth-loading-skeleton"></div>
            ) : user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-gray-100" id="user-profile-widget">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || '')}`}
                  alt={user.displayName || 'User Profile'}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full border border-gray-200 hover:scale-105 transition-transform"
                />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-gray-900 leading-none">{user.displayName}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 max-w-[120px] truncate">{user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                  id="sign-out-btn"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all"
                id="sign-in-btn"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}

          </div>
        </div>

        {/* Categories Bar & Mobile Search (Sub-Navbar) */}
        {activeTab === 'shop' && (
          <div className="border-t border-gray-100 py-3 flex flex-col sm:flex-row items-center justify-between gap-3" id="sub-navbar">
            {/* Mobile Search */}
            <div className="w-full relative md:hidden" id="nav-search-mobile">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search premium goods..."
                className="w-full rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all duration-200"
                id="mobile-search-input"
              />
            </div>

            {/* Categories horizontal list */}
            <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar pb-1 sm:pb-0" id="categories-scroll">
              {['All', ...categories].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                  id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
