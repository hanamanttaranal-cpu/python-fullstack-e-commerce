import React, { useState, useEffect } from 'react';
import { Package, Clock, ShieldAlert, ChevronDown, ChevronUp, MapPin, CreditCard } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Order } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface OrdersTabProps {
  user: FirebaseUser | null;
}

export default function OrdersTab({ user }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setErrorMsg(null);

    const ordersRef = collection(db, 'orders');
    
    // CRITICAL: Filter by userId is MANDATORY to satisfy our secure "allow list" rule
    const q = query(ordersRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Order);
        });
        
        // Sort orders by timestamp if it exists, otherwise fallback to local ordering
        list.sort((a, b) => {
          const timeA = a.createdAt ? (typeof a.createdAt === 'object' ? (a.createdAt as any).seconds : new Date(a.createdAt).getTime()) : 0;
          const timeB = b.createdAt ? (typeof b.createdAt === 'object' ? (b.createdAt as any).seconds : new Date(b.createdAt).getTime()) : 0;
          return timeB - timeA;
        });

        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading orders:', error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        } catch (e: any) {
          setErrorMsg('Access Denied: Please check Firestore rule deployment status.');
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpandedOrder(expandedOrder === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Processing':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Shipped':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const formatOrderDate = (createdAt: any) => {
    if (!createdAt) return 'Recent';
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return new Date(createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 font-sans">Please sign in to view orders</h2>
        <p className="text-sm text-gray-500 mt-1">Order tracking is restricted to logged-in customers.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8" id="orders-tab-view">
      <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-sans">
            Your Order History
          </h1>
          <p className="text-xs text-gray-500 mt-1">Track state, history, and receipts for all items.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
          <Package className="h-5 w-5" />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
          <ShieldAlert className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400 animate-pulse">
          Retrieving order receipts from database...
        </div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl p-8 bg-gray-50/50">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-gray-900 font-sans">No orders placed yet</h3>
          <p className="text-xs text-gray-500 mt-1">Items you purchase will appear here in chronological order.</p>
        </div>
      ) : (
        <div className="space-y-4" id="orders-accordion">
          {orders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div 
                key={order.id} 
                className="overflow-hidden rounded-xl border border-gray-150 bg-white hover:border-gray-300 transition-colors"
                id={`order-block-${order.id}`}
              >
                {/* Header Summary */}
                <div 
                  onClick={() => toggleExpand(order.id!)}
                  className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer bg-gray-50/20 hover:bg-gray-50/50 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 font-bold text-xs font-mono">
                      #{order.id?.slice(-5).toUpperCase() || 'ORDER'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 font-sans">
                          {formatOrderDate(order.createdAt)}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {order.items.reduce((acc, item) => acc + item.quantity, 0)} items • Total: ${order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-gray-900 font-mono">
                      ${order.total.toFixed(2)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Details Section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 sm:p-5 bg-white space-y-5" id={`order-details-${order.id}`}>
                    
                    {/* Item list */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                        Purchased Items
                      </h4>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="h-10 w-10 object-cover rounded-md border border-gray-100"
                              />
                              <div>
                                <span className="text-xs font-bold text-gray-900 font-sans block">{item.name}</span>
                                <span className="text-[10px] text-gray-500">Qty: {item.quantity} • ${item.price.toFixed(2)} each</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-gray-900 font-mono">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Meta address / payment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                      <div className="text-xs space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono block">
                          Shipping Destination
                        </span>
                        <div className="flex items-start gap-1.5 text-gray-600">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-bold text-gray-800">{order.shippingAddress.fullName}</p>
                            <p>{order.shippingAddress.addressLine1}</p>
                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                            <p>{order.shippingAddress.country}</p>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono block">
                            Billing Info
                          </span>
                          <div className="flex items-center gap-1.5 text-gray-600 mt-1">
                            <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                            <span>{order.paymentMethod}</span>
                          </div>
                        </div>

                        {/* Cost items */}
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-2xs border border-gray-100">
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span className="font-mono">${order.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Shipping</span>
                            <span className="font-mono">
                              {order.shipping === 0 ? 'FREE' : `$${order.shipping.toFixed(2)}`}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Tax</span>
                            <span className="font-mono">${order.tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-100 text-xs">
                            <span>Total</span>
                            <span className="font-mono">${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
