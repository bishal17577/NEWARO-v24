import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { Order, OrderStatus } from '../../types';
import { Shimmer } from '../../components/ui/Skeletons';
import { useToast } from '../../components/ui/Toast';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; icon: any }
> = {
  pending: {
    label: 'Order Placed (COD)',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed by Seller',
    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    icon: CheckCircle2,
  },
  processing: {
    label: 'Packaging',
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-400',
    icon: Package,
  },
  shipped: {
    label: 'Out for Delivery',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-400',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-400',
    icon: AlertCircle,
  },
};

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setCancellingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', updatedAt: Date.now() });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)));
      addToast('Order cancelled', 'success');
    } catch (err) {
      console.warn('Cancel failed:', err);
      addToast('Could not cancel the order. It may already be processing.', 'error');
    } finally {
      setCancellingId(null);
    }
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      setLoading(true);
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'orders'),
          where('buyerId', '==', user.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty && isMounted) {
          const list: Order[] = [];
          snap.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as any) });
          });
          list.sort((a, b) => b.createdAt - a.createdAt);
          setOrders(list);
        } else if (isMounted) {
          setOrders([]);
        }
      } catch (err) {
        console.warn('Orders fetch fallback:', err);
        if (isMounted) setOrders([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesId = order.id.toLowerCase().includes(q);
      const matchesShop = order.shopName?.toLowerCase().includes(q);
      const matchesItem = (order.items || []).some((i) => (i.name || '').toLowerCase().includes(q));
      return matchesId || matchesShop || matchesItem;
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-amber-600" />
            My Orders
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track deliveries, verify Cash on Delivery status, and view past purchases.
          </p>
        </div>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
        >
          <ShoppingBag className="w-4 h-4" />
          Continue Shopping
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === tab
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab === 'all' ? 'All Orders' : tab}
            </button>
          ))}
        </div>

        <div className="relative min-w-[min(240px,100%)]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, item, or shop..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          <Shimmer className="h-44 w-full" />
          <Shimmer className="h-44 w-full" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 mb-3">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Orders Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {statusFilter !== 'all'
              ? `You do not have any orders matching status "${statusFilter}".`
              : "You haven't placed any orders yet. Discover trending products from verified sellers across Nepal!"}
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors"
          >
            Explore Marketplace <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Order Top Bar */}
                <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Order #{order.id}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 dark:text-slate-400">{formattedDate}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Store: {order.shopName || 'NEWARO Seller'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="p-5 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={
                            item.image ||
                            ''
                          }
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div>
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                            {item.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Qty: <span className="font-bold">{item.quantity}</span> × Rs.{' '}
                            {(item.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Info */}
                <div className="px-5 py-3.5 bg-slate-50/40 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 dark:text-slate-400">
                    <span>Shipping to: </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {order.shippingAddress || (order.city ? `${order.city}, Nepal` : 'Kathmandu, Nepal')}
                    </span>
                    <span className="ml-2 font-mono uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {order.status === 'pending' && user && order.buyerId === user.uid && (
                      <button
                        type="button"
                        onClick={() => cancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
                      >
                        {cancellingId === order.id ? 'Cancelling...' : 'Cancel order'}
                      </button>
                    )}
                    <div className="text-right">
                      <span className="text-slate-500 dark:text-slate-400 mr-2">Total Amount:</span>
                      <span className="text-base font-black text-amber-600 dark:text-amber-400">
                        Rs. {(order.total || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
