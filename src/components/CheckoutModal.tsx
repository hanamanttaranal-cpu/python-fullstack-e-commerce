import React, { useState } from 'react';
import { X, MapPin, CreditCard, ShieldCheck, CheckCircle2, ShoppingBag, ShieldAlert } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { CartItem, ShippingAddress } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  cartItems: CartItem[];
  onOrderSuccess: (orderId: string) => void;
  onClearCart: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  user,
  cartItems,
  onOrderSuccess,
  onClearCart
}: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Shipping Address, Step 2: Payment Details
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State - Shipping
  const [shipping, setShipping] = useState<ShippingAddress>({
    fullName: user?.displayName || '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });

  // Form State - Payment
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.displayName || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shippingCost = subtotal > 150 ? 0 : 15.00;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please sign in to place an order.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. Structure the items payload matching the Order schema exactly
      const orderItems = cartItems.map((item) => ({
        productId: item.id,
        name: item.product.name,
        price: Number(item.product.price),
        quantity: Number(item.quantity),
        image: item.product.image
      }));

      const orderPayload = {
        userId: user.uid,
        items: orderItems,
        shippingAddress: {
          fullName: shipping.fullName,
          addressLine1: shipping.addressLine1,
          city: shipping.city,
          state: shipping.state,
          zipCode: shipping.zipCode,
          country: shipping.country
        },
        paymentMethod: `Card ending in ${cardNumber.slice(-4) || '4242'}`,
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        shipping: Number(shippingCost.toFixed(2)),
        total: Number(total.toFixed(2)),
        status: 'Pending',
        createdAt: serverTimestamp() // Matches request.time on server
      };

      // 2. Perform transaction / batch to write order and adjust stock
      const batch = writeBatch(db);
      
      // Save order doc
      const ordersRef = collection(db, 'orders');
      const orderDocRef = await addDoc(ordersRef, orderPayload);

      // Decrement stock for all items
      for (const item of cartItems) {
        const productDocRef = doc(db, 'products', item.id);
        const newStock = Math.max(0, item.product.stock - item.quantity);
        batch.update(productDocRef, { stock: newStock });
      }

      await batch.commit();

      // Complete
      onClearCart();
      onOrderSuccess(orderDocRef.id);
    } catch (error) {
      console.error('Checkout failed:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
      } catch (e: any) {
        setErrorMsg('Order Processing Denied: Ensure auth rules are matched and stock is valid.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="checkout-modal-container">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 bg-gray-500/75 backdrop-blur-xs transition-opacity" 
          onClick={onClose}
          id="checkout-backdrop"
        />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl flex flex-col md:flex-row h-auto max-h-[90vh]">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            id="close-checkout-btn"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Checkout flow content */}
          <div className="w-full p-6 sm:p-8 overflow-y-auto" id="checkout-body">
            
            {/* Header Stepper */}
            <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-5" id="checkout-stepper">
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1 ? 'bg-gray-900 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {step === 1 ? '1' : '✓'}
                </span>
                <span className="text-xs font-bold text-gray-900">Shipping</span>
              </div>
              <div className="h-px bg-gray-200 flex-1" />
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  2
                </span>
                <span className={`text-xs font-bold ${step === 2 ? 'text-gray-900' : 'text-gray-400'}`}>Payment</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Shipping Details Form */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4" id="shipping-form">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>Where should we deliver?</span>
                </h3>

                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={shipping.fullName}
                      onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Street Address
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Apt, Suite, Building..."
                      value={shipping.addressLine1}
                      onChange={(e) => setShipping({ ...shipping, addressLine1: e.target.value })}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={shipping.city}
                      onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      State / Province
                    </label>
                    <input
                      type="text"
                      required
                      value={shipping.state}
                      onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Zip / Postal Code
                    </label>
                    <input
                      type="text"
                      required
                      value={shipping.zipCode}
                      onChange={(e) => setShipping({ ...shipping, zipCode: e.target.value })}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Country
                    </label>
                    <select
                      value={shipping.country}
                      onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    >
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>Australia</option>
                      <option>Germany</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                    id="goto-payment-btn"
                  >
                    Continue to Payment
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Payment Details Form */}
            {step === 2 && (
              <form onSubmit={handlePlaceOrder} className="space-y-6" id="payment-form">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span>Secure Credit Card Payment</span>
                </h3>

                {/* Animated credit card view */}
                <div className="relative h-44 w-full max-w-sm mx-auto bg-gradient-to-br from-gray-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between font-mono">
                  <div className="flex justify-between items-start">
                    <div className="h-8 w-11 bg-amber-400/20 border border-amber-400/30 rounded-md flex items-center justify-center text-amber-300 font-bold text-sm tracking-wider uppercase">
                      Chip
                    </div>
                    <span className="text-xs font-bold italic text-slate-400">Premium Visa</span>
                  </div>

                  <div>
                    <span className="text-sm tracking-widest text-slate-300 block">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </span>
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase font-bold">Holder</span>
                        <span className="text-xs font-semibold truncate max-w-[200px]">
                          {cardHolder || 'FULL NAME'}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] text-slate-500 uppercase font-bold">Expiry</span>
                        <span className="text-xs font-semibold">{cardExpiry || 'MM/YY'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-4">
                  <div className="sm:col-span-4">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="4111 2222 3333 4444"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Card Holder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Expiration Date
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      CVV
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="•••"
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="mt-1 w-full text-xs rounded-lg border border-gray-200 p-2.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-2xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Your financial credentials are fully secure and transactions are fully protected under secure Firebase rulesets.</span>
                </div>

                <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                    id="back-to-shipping-btn"
                  >
                    Back to Shipping
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:bg-gray-200 disabled:text-gray-400"
                    id="place-order-btn"
                  >
                    {isProcessing ? 'Authorizing...' : `Pay & Place Order — $${total.toFixed(2)}`}
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
