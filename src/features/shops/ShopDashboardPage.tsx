import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Plus,
  AlertTriangle,
  Package,
  ShoppingBag,
  ExternalLink,
  Store,
  CheckCircle,
  MapPin,
  Edit3,
  Trash2,
  Search,
  Sparkles,
  Save,
  Loader2,
  Settings,
  Upload,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import {
  collection,
  query,
  limit,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useCategories } from '../../lib/categories';
import { Shop, Product, Order } from '../../types';
import { StoreSkeleton } from '../../components/ui/Skeletons';
import { useToast } from '../../components/ui/Toast';
import { uploadToImgBB } from '../../lib/imgbb';

export const ShopDashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin, canAccessShop, loading: authLoading } = useAuth();
  const { categories } = useCategories();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'settings' | 'ai'>('overview');
  const [myShops, setMyShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>(searchParams.get('shopId') || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [productSearch, setProductSearch] = useState('');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [savingProductEdit, setSavingProductEdit] = useState(false);

  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeBio, setStoreBio] = useState('');
  const [storeLogo, setStoreLogo] = useState('');
  const [storeCover, setStoreCover] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [autoRemoveLogoBg, setAutoRemoveLogoBg] = useState(false);
  const [savingStoreSettings, setSavingStoreSettings] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [aiPromptType, setAiPromptType] = useState<'promo' | 'bio' | 'product'>('promo');
  const [aiCustomInput, setAiCustomInput] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  const [isAccessDenied, setIsAccessDenied] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user?.uid, user?.email, isAdmin, authLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    setIsAccessDenied(false);
    try {
      const [sRes, pRes, oRes] = await Promise.allSettled([
        getDocsWithTimeout(query(collection(db, 'shops'), limit(200)), 4000),
        getDocsWithTimeout(query(collection(db, 'products'), limit(300)), 4000),
        getDocsWithTimeout(query(collection(db, 'orders'), limit(300)), 4000),
      ]);

      let allShops: Shop[] = [];
      if (sRes.status === 'fulfilled' && !sRes.value.empty) {
        allShops = sRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
      } else {
        allShops = [];
      }

      const accessible = allShops.filter((s) => isAdmin || canAccessShop(s));
      setMyShops(accessible);

      const requestedId = searchParams.get('shopId');
      if (requestedId) {
        const found = accessible.find((s) => s.id === requestedId);
        if (found) {
          setSelectedShopId(found.id);
        } else if (!isAdmin && allShops.some((s) => s.id === requestedId)) {
          setIsAccessDenied(true);
          setSelectedShopId('');
        } else if (accessible.length > 0) {
          setSelectedShopId(accessible[0].id);
        }
      } else if (accessible.length > 0) {
        setSelectedShopId(accessible[0].id);
      }

      if (pRes.status === 'fulfilled' && !pRes.value.empty) {
        setProducts(pRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } else {
        setProducts([]);
      }

      if (oRes.status === 'fulfilled' && !oRes.value.empty) {
        setOrders(oRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      }
    } finally {
      setLoading(false);
    }
  };

  const currentShop = myShops.find((s) => s.id === selectedShopId) || myShops[0];

  useEffect(() => {
    if (currentShop) {
      setStoreName(currentShop.name || '');
      setStoreCategory(currentShop.category || 'Electronics');
      setStorePhone(currentShop.phone || '');
      setStoreCity(currentShop.city || 'Kathmandu');
      setStoreAddress(currentShop.address || '');
      setStoreBio(currentShop.description || '');
      setStoreLogo(currentShop.logoUrl || '');
      setStoreCover(currentShop.coverUrl || '');
    }
  }, [currentShop?.id]);

  const shopProducts = products.filter((p) => currentShop && p.shopId === currentShop.id);
  const shopOrders = orders.filter(
    (o) =>
      currentShop &&
      (o.shopId === currentShop.id ||
        o.sellerId === currentShop.ownerId ||
        (currentShop.ownerEmail && o.shopOwnerEmail?.toLowerCase() === currentShop.ownerEmail.toLowerCase()))
  );

  const totalRevenue = shopOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingOrdersCount = shopOrders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  const lowStockProductsCount = shopProducts.filter((p) => p.stock <= 5).length;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadToImgBB(file, { removeBackground: autoRemoveLogoBg });
      setStoreLogo(res.url);
      addToast('Logo image uploaded!', 'success');
    } catch {
      addToast('Failed to upload logo', 'error');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const res = await uploadToImgBB(file);
      setStoreCover(res.url);
      addToast('Cover banner uploaded!', 'success');
    } catch {
      addToast('Failed to upload banner', 'error');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: nextStatus, updatedAt: Date.now() });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      addToast(`Order #${orderId.slice(0, 8)} status updated to ${nextStatus}`, 'success');
    } catch {
      addToast('Failed to update order status', 'error');
    }
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingProductEdit(true);
    try {
      await updateDoc(doc(db, 'products', editingProduct.id), {
        price: Number(editPrice),
        stock: Number(editStock),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, price: Number(editPrice), stock: Number(editStock) }
            : p
        )
      );
      addToast(`Updated ${editingProduct.name}!`, 'success');
      setEditingProduct(null);
    } catch {
      addToast('Failed to update product', 'error');
    } finally {
      setSavingProductEdit(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}" from your store?`)) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      addToast(`Deleted product: ${productName}`, 'success');
    } catch {
      addToast('Failed to delete product', 'error');
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return;
    setSavingStoreSettings(true);
    try {
      const updated = {
        name: storeName.trim(),
        category: storeCategory,
        phone: storePhone.trim(),
        city: storeCity.trim(),
        address: storeAddress.trim(),
        description: storeBio.trim(),
        logoUrl: storeLogo.trim(),
        coverUrl: storeCover.trim(),
        updatedAt: Date.now(),
      };
      await updateDoc(doc(db, 'shops', currentShop.id), updated);
      setMyShops((prev) =>
        prev.map((s) => (s.id === currentShop.id ? { ...s, ...updated } : s))
      );
      addToast('Storefront profile updated successfully!', 'success');
    } catch {
      addToast('Failed to save store profile', 'error');
    } finally {
      setSavingStoreSettings(false);
    }
  };

  const handleGenerateAiCopy = async () => {
    setGeneratingAi(true);
    setAiResult('');
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are an expert copywriter for NEWARO (Nepal). Shop name: "${currentShop?.name || 'Local Store'}" (${currentShop?.category || 'General'}, ${currentShop?.city || 'Kathmandu'}). Goal: Write a compelling, catchy ${aiPromptType === 'promo' ? 'Flash Sale announcement' : aiPromptType === 'bio' ? 'Store Bio' : 'Product description'} in clean Nepali English. Context info: ${aiCustomInput || 'Authentic quality, best price in NPR, 100% Cash on Delivery across Nepal'}.`,
        }),
      });
      const data = await res.json();
      if (data && data.reply) {
        setAiResult(data.reply);
      } else {
        setAiResult('Shop authentic deals on NEWARO! Verified storefront with Cash on Delivery anywhere in Nepal.');
      }
    } catch {
      setAiResult('Quality products at honest Nepalese prices. Fast local fulfillment and 100% Cash on Delivery across Nepal.');
    } finally {
      setGeneratingAi(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <StoreSkeleton count={3} />
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You do not have permission to view or manage this store. Storefront dashboards are strictly private to their verified owner.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          {myShops.length > 0 ? (
            <button
              onClick={() => {
                setIsAccessDenied(false);
                setSelectedShopId(myShops[0].id);
                setSearchParams({ shopId: myShops[0].id });
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Go to My Store ({myShops[0].name})</span>
            </button>
          ) : (
            <Link
              to="/create-shop"
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Open My Storefront</span>
            </Link>
          )}
          <Link
            to="/shops"
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Browse Stores
          </Link>
        </div>
      </div>
    );
  }

  if (!user || myShops.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Store className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-slate-900">Store Owner Dashboard</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You don't have an active storefront yet. Apply to open your store on NEWARO, and once approved by admin, you can manage your inventory and customer orders here.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link
            to="/create-shop"
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Open Storefront</span>
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  const filteredProducts = shopProducts.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.category?.toLowerCase().includes(productSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (productStockFilter === 'in_stock') return p.stock > 5;
    if (productStockFilter === 'low_stock') return p.stock > 0 && p.stock <= 5;
    if (productStockFilter === 'out_of_stock') return p.stock === 0;
    return true;
  });

  const filteredOrders = shopOrders.filter((o) => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  return (
    <div className="space-y-5 w-full min-w-0 pb-16">
      <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src={currentShop?.logoUrl || ''}
            alt={currentShop?.name}
            className="w-13 h-13 sm:w-15 sm:h-15 rounded-xl object-cover bg-slate-900 border border-slate-800 shrink-0"
          />
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-white truncate">
                {currentShop?.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Verified</span>
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{currentShop?.city || 'Kathmandu, Nepal'}</span>
              </span>
              <span>·</span>
              <span className="text-blue-400 font-medium">{currentShop?.category}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 w-full md:w-auto justify-end">
          {isAdmin && myShops.length > 1 && (
            <select
              value={selectedShopId}
              onChange={(e) => {
                setSelectedShopId(e.target.value);
                setSearchParams({ shopId: e.target.value });
              }}
              className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold border border-slate-800 focus:outline-hidden cursor-pointer"
            >
              {myShops.map((s) => (
                <option key={s.id} value={s.id}>
                  Store: {s.name}
                </option>
              ))}
            </select>
          )}

          <Link
            to={`/shops/${currentShop?.id}`}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Store</span>
          </Link>
          <Link
            to={`/create-product?shopId=${currentShop?.id}`}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Store Revenue</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">
            NPR {totalRevenue.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 block">Cash on Delivery</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
          <p className="text-xl sm:text-2xl font-black text-blue-600 tabular-nums">
            {shopOrders.length}
          </p>
          <span className="text-[10px] text-amber-600 font-bold block">
            {pendingOrdersCount} pending
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Products Listed</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
            {shopProducts.length}
          </p>
          <span className={`text-[10px] font-bold block ${lowStockProductsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {lowStockProductsCount > 0 ? `${lowStockProductsCount} low stock` : 'Healthy stock'}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Followers</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
            {currentShop?.followersCount || 0}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {currentShop?.rating ? (currentShop.rating || 0).toFixed(1) : '5.0'} rating
          </span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'overview', label: 'Overview', icon: LayoutDashboard },
          { key: 'products', label: 'Products', icon: Package, count: shopProducts.length },
          { key: 'orders', label: 'Orders', icon: ShoppingBag, count: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : shopOrders.length },
          { key: 'settings', label: 'Store Settings & Photos', icon: Settings },
          { key: 'ai', label: 'AI Seller Tools', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                  Recent Orders
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  View All ({shopOrders.length})
                </button>
              </div>
              {shopOrders.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No orders placed yet. Share your store link to start receiving orders!
                </div>
              ) : (
                <div className="space-y-2 divide-y divide-slate-100">
                  {shopOrders.slice(0, 5).map((o) => (
                    <div key={o.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{o.buyerName || 'Customer'}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(o.createdAt).toLocaleDateString()} · {o.items?.length || 1} item(s)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600 tabular-nums">NPR {o.total?.toLocaleString()}</div>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                            o.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700'
                              : o.status === 'shipped'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <h3 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  to={`/create-product?shopId=${currentShop?.id}`}
                  className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors group cursor-pointer block"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                      Add Product (Auto Background Removal)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Transparent background powered by remove.bg API
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Update Logo & Cover Photos
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Upload fresh brand images and banner
                    </div>
                  </div>
                  <Edit3 className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search products by title..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={productStockFilter}
                onChange={(e) => setProductStockFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">All Products</option>
                <option value="in_stock">In Stock (&gt;5)</option>
                <option value="low_stock">Low Stock (1-5)</option>
                <option value="out_of_stock">Out of Stock (0)</option>
              </select>
              <Link
                to={`/create-product?shopId=${currentShop?.id}`}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Price (NPR)</th>
                  <th className="py-2.5 px-3">Stock</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.images?.[0] || ''}
                          alt={p.name}
                          className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0"
                        />
                        <Link to={`/products/${p.id}`} className="font-bold text-slate-900 hover:text-blue-600 truncate max-w-[200px] block">
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-medium">{p.category}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-600 tabular-nums">
                      NPR {p.price?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          p.stock > 5
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.stock > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {p.stock} units
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setEditPrice(p.price);
                            setEditStock(p.stock);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          title="Edit Price & Stock"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
              Customer Orders ({filteredOrders.length})
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Delivery Address</th>
                  <th className="py-2.5 px-3">Total (NPR)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{o.id.slice(0, 8)}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{o.buyerName || 'Buyer'}</div>
                      <div className="text-[10px] text-slate-400">{o.buyerPhone || o.buyerEmail}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[170px] truncate">
                      {o.shippingAddress || 'Kathmandu, Nepal'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-600 tabular-nums">
                      NPR {o.total?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          o.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : o.status === 'shipped'
                            ? 'bg-blue-50 text-blue-700'
                            : o.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <select
                        value={o.status}
                        onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as any)}
                        className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 focus:outline-hidden cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Store Profile & Images
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload logo and cover banner photos directly to customize your storefront.
            </p>
          </div>

          <form onSubmit={handleSaveStoreSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-slate-100">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Store Logo</span>
                  {storeLogo && (
                    <button
                      type="button"
                      onClick={() => setStoreLogo('')}
                      className="text-[10px] text-rose-600 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    {storeLogo ? (
                      <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Logo File</span>
                        </>
                      )}
                    </button>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRemoveLogoBg}
                        onChange={(e) => setAutoRemoveLogoBg(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Auto Remove BG</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Cover Banner</span>
                  {storeCover && (
                    <button
                      type="button"
                      onClick={() => setStoreCover('')}
                      className="text-[10px] text-rose-600 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-18 h-13 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    {storeCover ? (
                      <img src={storeCover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={coverInputRef}
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingCover}
                      onClick={() => coverInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {uploadingCover ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload Banner File</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">Recommended: 1200 x 400px</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Store Name *</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600 font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={storeCategory}
                  onChange={(e) => setStoreCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  required
                  placeholder="+977 9800000000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={storeCity}
                  onChange={(e) => setStoreCity(e.target.value)}
                  placeholder="Kathmandu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="New Road, Kathmandu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Store Description & Bio</label>
              <textarea
                rows={3}
                value={storeBio}
                onChange={(e) => setStoreBio(e.target.value)}
                placeholder="Tell customers about your store, products, and specialties..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={savingStoreSettings}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {savingStoreSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Store Profile</span>
            </button>
          </form>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 max-w-2xl mx-auto space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Seller Tools</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate promotional announcements or product descriptions for your NEWARO storefront.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Task</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'promo', label: 'Flash Sale Promo' },
                  { id: 'bio', label: 'Store Bio' },
                  { id: 'product', label: 'Product Copy' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAiPromptType(t.id as any)}
                    className={`p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                      aiPromptType === t.id
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Details & Special Offers</label>
              <input
                type="text"
                value={aiCustomInput}
                onChange={(e) => setAiCustomInput(e.target.value)}
                placeholder="e.g. 20% discount on all items this weekend, Cash on Delivery"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateAiCopy}
              disabled={generatingAi}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {generatingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Generate Copy</span>
            </button>

            {aiResult && (
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">
                    Generated Result
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult);
                      addToast('Copied to clipboard!', 'success');
                    }}
                    className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {aiResult}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-3.5">
            <h3 className="text-base font-bold text-slate-900">
              Update Price & Inventory
            </h3>
            <p className="text-xs text-slate-500 truncate">{editingProduct.name}</p>
            <form onSubmit={handleSaveProductEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (NPR)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Units in Stock</label>
                <input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(Number(e.target.value))}
                  required
                  min={0}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden font-bold"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProductEdit}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {savingProductEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
