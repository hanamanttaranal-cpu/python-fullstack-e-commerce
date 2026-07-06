import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, q: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}: CartDrawerProps) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shipping = subtotal > 150 ? 0 : subtotal > 0 ? 15.00 : 0;
  const tax = subtotal * 0.08; // 8% sales tax
  const total = subtotal + shipping + tax;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-container">
      <div className="absolute inset-0 overflow-hidden">
        
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-gray-500/75 backdrop-blur-xs transition-opacity" 
          onClick={onClose}
          id="cart-drawer-backdrop"
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-all flex flex-col h-full justify-between">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100" id="cart-drawer-header">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-gray-900" />
                <h2 className="text-base font-bold text-gray-900 font-sans">
                  Your Shopping Cart ({cartItems.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                id="close-cart-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable list of items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" id="cart-items-list">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 font-sans">Your bag is empty</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                    Explore our premium goods to find your match!
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-4 py-2 bg-gray-900 text-white font-semibold text-xs rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex gap-4 p-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 hover:border-gray-200/80 rounded-xl transition-all duration-200 group"
                    id={`cart-item-${item.id}`}
                  >
                    {/* Thumbnail */}
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-16 w-16 object-cover object-center rounded-lg border border-gray-200/50 bg-white"
                    />

                    {/* Meta info */}
                    <div className="flex-1 flex flex-col justify-between" id={`cart-item-meta-${item.id}`}>
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-1 font-sans">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {item.product.category}
                        </p>
                      </div>

                      {/* Quantity Modifier & Price */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 bg-white rounded-lg p-0.5">
                          <button
                            disabled={item.quantity <= 1}
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-md text-gray-600"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-gray-800 font-mono">{item.quantity}</span>
                          <button
                            disabled={item.quantity >= item.product.stock}
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-md text-gray-600"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-gray-900 font-mono">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Total summary pricing */}
            {cartItems.length > 0 && (
              <div className="border-t border-gray-100 bg-white p-6 space-y-4" id="cart-drawer-pricing">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span className="font-mono">
                      {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Estimated Tax (8%)</span>
                    <span className="font-mono">${tax.toFixed(2)}</span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-[10px] text-amber-600 text-right font-semibold">
                      Add ${(150 - subtotal).toFixed(2)} more for FREE shipping!
                    </p>
                  )}
                  <div className="border-t border-gray-50 pt-3 flex justify-between text-sm font-bold text-gray-900">
                    <span>Total Amount</span>
                    <span className="font-mono text-base font-extrabold text-gray-900">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={onCheckout}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 group cursor-pointer transition-all active:scale-[0.99]"
                  id="checkout-btn"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
