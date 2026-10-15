import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Download,
  RefreshCw,
  PieChart as PieChartIcon,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { collection, query, limit } from 'firebase/firestore';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { Order, Product, Shop, Post, UserProfile } from '../../types';
import { StoreSkeleton } from '../../components/ui/Skeletons';
import { useToast } from '../../components/ui/Toast';

export const AnalyticsDashboardPage: React.FC = () => {
  const { user, isAdmin, isShopOwner } = useAuth();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [scope, setScope] = useState<'platform' | 'mystore'>('platform');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [oRes, pRes, sRes, poRes, uRes] = await Promise.allSettled([
        getDocsWithTimeout(query(collection(db, 'orders'), limit(200)), 4000),
        getDocsWithTimeout(query(collection(db, 'products'), limit(200)), 4000),
        getDocsWithTimeout(query(collection(db, 'shops'), limit(100)), 4000),
        getDocsWithTimeout(query(collection(db, 'posts'), limit(100)), 4000),
        getDocsWithTimeout(query(collection(db, 'users'), limit(100)), 4000),
      ]);

      if (oRes.status === 'fulfilled') {
        setOrders(oRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      }
      if (pRes.status === 'fulfilled' && !pRes.value.empty) {
        setProducts(pRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } else {
        setProducts([]);
      }
      if (sRes.status === 'fulfilled' && !sRes.value.empty) {
        setShops(sRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Shop)));
      } else {
        setShops([]);
      }
      if (poRes.status === 'fulfilled') {
        setPosts(poRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
      }
      if (uRes.status === 'fulfilled') {
        setUsers(uRes.value.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const relevantOrders = useMemo(() => {
    const now = Date.now();
    const cutoff =
      timeRange === '7d'
        ? now - 7 * 24 * 60 * 60 * 1000
        : timeRange === '30d'
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0;

    return orders.filter((o) => {
      const isTimeValid = (o.createdAt || 0) >= cutoff;
      if (!isTimeValid) return false;
      if (scope === 'mystore' && user) {
        return (
          o.sellerId === user.uid ||
          (user.email && o.shopOwnerEmail?.toLowerCase() === (user.email || '').toLowerCase())
        );
      }
      return true;
    });
  }, [orders, timeRange, scope, user]);

  const totalRevenue = useMemo(() => {
    return relevantOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [relevantOrders]);

  const totalDelivered = useMemo(() => {
    return relevantOrders.filter((o) => o.status === 'delivered').length;
  }, [relevantOrders]);

  const activeOrdersCount = useMemo(() => {
    return relevantOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
  }, [relevantOrders]);

  const avgOrderValue = useMemo(() => {
    const valid = relevantOrders.filter((o) => o.status !== 'cancelled');
    return valid.length > 0 ? Math.round(totalRevenue / valid.length) : 0;
  }, [relevantOrders, totalRevenue]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    relevantOrders.forEach((o) => {
      const st = o.status || 'pending';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [relevantOrders]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [products]);

  const dailyBuckets = useMemo(() => {
    const days = 7;
    const buckets: Array<{ label: string; revenue: number; orders: number }> = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayOrders = relevantOrders.filter(
        (o) => (o.createdAt || 0) >= dayStart && (o.createdAt || 0) < dayEnd && o.status !== 'cancelled'
      );
      const dayRev = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      buckets.push({
        label: dateStr,
        revenue: dayRev,
        orders: dayOrders.length,
      });
    }
    return buckets;
  }, [relevantOrders]);

  const maxBucketRevenue = Math.max(1, ...dailyBuckets.map((b) => b.revenue));

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue (NPR)', totalRevenue],
      ['Total Orders', relevantOrders.length],
      ['Average Order Value (NPR)', avgOrderValue],
      ['Delivered Orders', totalDelivered],
      ['Active Orders', activeOrdersCount],
      ['Total Products Listed', products.length],
      ['Total Active Storefronts', shops.length],
      ['Total Registered Members', users.length],
      [],
      ['Recent Daily Breakdown'],
      ['Date', 'Revenue (NPR)', 'Orders Count'],
      ...dailyBuckets.map((b) => [b.label, b.revenue, b.orders]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `newaro-analytics-${timeRange}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Analytics exported to CSV!', 'success');
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-extrabold text-slate-900 truncate">
              Platform Analytics & Data
            </h1>
            <p className="text-xs text-slate-500 truncate">
              Real-time marketplace performance, revenue trajectories, and order volumes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(isShopOwner || isAdmin) && (
            <div className="bg-slate-100 p-0.5 rounded-xl flex text-xs font-bold">
              <button
                type="button"
                onClick={() => setScope('platform')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  scope === 'platform' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Platform
              </button>
              <button
                type="button"
                onClick={() => setScope('mystore')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  scope === 'mystore' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                My Store
              </button>
            </div>
          )}

          <div className="bg-slate-100 p-0.5 rounded-xl flex text-xs font-bold">
            {(['7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors uppercase cursor-pointer ${
                  timeRange === r ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={fetchData}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <StoreSkeleton count={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Revenue (COD)
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">
                NPR {totalRevenue.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold pt-1">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Verified Orders</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Orders Placed
              </span>
              <p className="text-xl sm:text-2xl font-black text-blue-600 tabular-nums">
                {relevantOrders.length}
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                <span className="text-slate-700 font-bold">{totalDelivered}</span> delivered ·{' '}
                <span className="text-blue-600 font-bold">{activeOrdersCount}</span> in transit
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Average Order Value
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                NPR {avgOrderValue.toLocaleString()}
              </p>
              <div className="text-[11px] text-slate-400 pt-1">Across all order fulfillments</div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Active Catalog Items
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {products.length}
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                In <span className="font-bold text-slate-700">{shops.length}</span> verified storefronts
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Daily Revenue Trajectory (NPR)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Order revenue activity by day</p>
                </div>
                <span className="text-xs font-bold text-blue-600">Last 7 Days</span>
              </div>

              <div className="pt-4">
                <div className="h-48 sm:h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2 border-b border-slate-100">
                  {dailyBuckets.map((bucket, idx) => {
                    const heightPercent = Math.max(
                      8,
                      Math.round((bucket.revenue / maxBucketRevenue) * 100)
                    );
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md tabular-nums text-center whitespace-nowrap">
                          {bucket.revenue > 0 ? `NPR ${bucket.revenue.toLocaleString()}` : '0'}
                        </div>
                        <div
                          className="w-full max-w-[42px] bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-xl group-hover:from-blue-700 group-hover:to-sky-500 transition-all shadow-2xs"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-slate-400 font-semibold pt-2 px-1">
                  {dailyBuckets.map((b, i) => (
                    <span key={i} className="truncate text-center">
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                  <span>Order Pipeline</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">{relevantOrders.length} Total</span>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'pending', label: 'Pending', count: statusCounts.pending, color: 'bg-amber-500' },
                  { key: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed, color: 'bg-blue-600' },
                  { key: 'processing', label: 'Processing', count: statusCounts.processing, color: 'bg-purple-600' },
                  { key: 'shipped', label: 'Out for Delivery', count: statusCounts.shipped, color: 'bg-sky-500' },
                  { key: 'delivered', label: 'Delivered', count: statusCounts.delivered, color: 'bg-emerald-500' },
                  { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, color: 'bg-rose-500' },
                ].map((item) => {
                  const percent =
                    relevantOrders.length > 0
                      ? Math.round((item.count / relevantOrders.length) * 100)
                      : 0;
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="text-slate-500 tabular-nums">
                          {item.count} ({percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-300`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Category Distribution</span>
                </h3>
                <Link to="/explore" className="text-xs font-bold text-blue-600 hover:underline">
                  Browse Catalog
                </Link>
              </div>
              {categoryCounts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No categories populated yet</p>
              ) : (
                <div className="space-y-2.5">
                  {categoryCounts.map(([cat, count], idx) => {
                    const percent =
                      products.length > 0 ? Math.round((count / products.length) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{cat}</span>
                          <span className="text-slate-500 tabular-nums">
                            {count} products ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>Commerce Ecosystem</span>
                </h3>
                <Link to="/" className="text-xs font-bold text-blue-600 hover:underline">
                  View Feed
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Community Posts</span>
                  <span className="text-lg font-black text-slate-900 tabular-nums">{posts.length}</span>
                  <p className="text-[11px] text-slate-500">Shared product updates and stories</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Verified Storefronts</span>
                  <span className="text-lg font-black text-blue-600 tabular-nums">{shops.length}</span>
                  <p className="text-[11px] text-slate-500">Active local sellers across Nepal</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Member Accounts</span>
                  <span className="text-lg font-black text-slate-900 tabular-nums">{users.length}</span>
                  <p className="text-[11px] text-slate-500">Registered buyers & shop owners</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Method</span>
                  <span className="text-lg font-black text-emerald-600">100% COD</span>
                  <p className="text-[11px] text-slate-500">Cash on Delivery across Nepal</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
