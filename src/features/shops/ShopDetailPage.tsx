import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Store,
  MapPin,
  MessageSquare,
  Star,
  CheckCircle,
  ShoppingBag,
  ArrowLeft,
  UserPlus,
  UserCheck,
  LayoutDashboard,
  Search,
  Truck,
  BadgeCheck,
} from 'lucide-react';
import { collection, query, where, doc, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { db, getDocsWithTimeout, getDocWithTimeout } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useCartStore } from '../../lib/store';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { Shop, Product } from '../../types';
import { StoreSkeleton } from '../../components/ui/Skeletons';
import { getShopTheme, patternStyle } from '../../lib/shopThemes';
import { ShopProductCard, gridClassFor } from './ShopProductCard';

export const ShopDetailPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user, canAccessShop } = useAuth();
  const { addItem } = useCartStore();
  const { addToast } = useToast();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [sortBy, setSortBy] = useState<'new' | 'low' | 'high'>('new');

  const currentUid = user?.uid || 'guest';
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`newaro_follows_${currentUid}`) || '{}');
      setIsFollowing(!!saved[shopId]);
    } catch {}
  }, [shopId, currentUid]);

  useEffect(() => {
    if (shopId) {
      fetchShopAndProducts(shopId);
    }
  }, [shopId]);

  const fetchShopAndProducts = async (id: string) => {
    setLoading(true);
    try {
      const [shopSnap, prodSnap] = await Promise.allSettled([
        getDocWithTimeout(doc(db, 'shops', id), 4000),
        getDocsWithTimeout(query(collection(db, 'products'), where('shopId', '==', id)), 4000),
      ]);

      if (shopSnap.status === 'fulfilled' && shopSnap.value.exists()) {
        const sData = { id: shopSnap.value.id, ...shopSnap.value.data() } as Shop;
        setShop(sData);
      } else {
        setShop(null);
      }

      if (prodSnap.status === 'fulfilled' && !prodSnap.value.empty) {
        setProducts(prodSnap.value.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } else {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !shop) {
      addToast('Sign in to follow this store', 'info');
      navigate('/auth');
      return;
    }
    const nextState = !isFollowing;
    const newCount = Math.max(0, (shop.followersCount || 0) + (nextState ? 1 : -1));
    playUiSound('pop');
    setIsFollowing(nextState);
    setShop({ ...shop, followersCount: newCount });

    try {
      const followId = `${user.uid}_${shop.id}`;
      if (!nextState) {
        await deleteDoc(doc(db, 'follows', followId)).catch(() => {});
        await updateDoc(doc(db, 'shops', shop.id), { followersCount: increment(-1) }).catch(() => {});
      } else {
        await setDoc(doc(db, 'follows', followId), {
          followerId: user.uid,
          targetId: shop.id,
          targetType: 'shop',
          createdAt: Date.now(),
        }).catch(() => {});
        await updateDoc(doc(db, 'shops', shop.id), { followersCount: increment(1) }).catch(() => {});
      }
    } catch {}
  };

  if (loading) {
    return <StoreSkeleton count={2} />;
  }

  if (!shop) {
    return (
      <div className="bg-white p-10 text-center rounded-2xl border border-slate-200 max-w-md mx-auto my-10 space-y-3">
        <Store className="w-10 h-10 text-slate-300 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Store Not Found</h2>
        <Link to="/shops" className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
          Back to Stores
        </Link>
      </div>
    );
  }

  const isOwner = canAccessShop(shop);
  const theme = getShopTheme(shop.category);
  const ThemeIcon = theme.icon;
  const heroText = theme.heroDark ? 'text-white' : 'text-slate-900';
  const heroSub = theme.heroDark ? 'text-white/80' : 'text-slate-700';

  const productCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];

  const filteredProducts = products
    .filter((p) => {
      const matchCat = selectedCat === 'All' || p.category === selectedCat;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    })
    .sort((a, b) =>
      sortBy === 'low' ? (a.price || 0) - (b.price || 0) : sortBy === 'high' ? (b.price || 0) - (a.price || 0) : (b.createdAt || 0) - (a.createdAt || 0)
    );

  const handleAdd = (prod: Product) => {
    playUiSound('success');
    addItem({
      productId: prod.id,
      shopId: prod.shopId,
      shopName: prod.shopName,
      name: prod.name,
      price: prod.price,
      image: prod.images?.[0] || '',
      stock: prod.stock,
    });
    addToast(`Added ${prod.name} to cart`, 'success');
  };

  return (
    <div className="space-y-5" style={{ ['--shop-accent' as string]: theme.accent }}>
      {/* Header: look changes with the kind of shop */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div className="relative h-40 sm:h-56 overflow-hidden" style={{ background: theme.hero }}>
          <div aria-hidden className="absolute inset-0" style={patternStyle(theme)} />
          {shop.coverUrl ? (
            <>
              <img
                src={shop.coverUrl}
                alt={`${shop.name} shop cover`}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            </>
          ) : (
            <>
              <ThemeIcon aria-hidden className={`absolute right-5 sm:right-12 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-36 sm:h-36 ${theme.heroDark ? 'text-white/15' : 'text-slate-900/10'}`} />
              <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-5 max-w-[70%]">
                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] ${heroSub}`}>{theme.label}</p>
                <p className={`text-base sm:text-xl ${theme.heading} ${heroText}`}>{theme.tagline}</p>
              </div>
            </>
          )}
          <Link
            to="/shops"
            className="absolute top-3 left-3 p-2 rounded-xl bg-black/45 text-white hover:bg-black/65 transition-colors"
            aria-label="Back to stores"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 backdrop-blur-md"
            style={{ background: theme.accent, color: theme.onAccent }}
          >
            <ThemeIcon className="w-3.5 h-3.5" /> {theme.label}
          </span>
        </div>

        <div className="p-4 sm:p-6 pt-0 relative">
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-4">
            <div className="flex items-end gap-3.5 min-w-0">
              <div className="relative shrink-0">
                {shop.logoUrl ? (
                  <img
                    src={shop.logoUrl}
                    alt={shop.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white dark:border-slate-900 object-cover bg-white shadow-md"
                  />
                ) : (
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white dark:border-slate-900 flex items-center justify-center font-black text-2xl shadow-md"
                    style={{ background: theme.accent, color: theme.onAccent }}
                  >
                    {shop.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="pb-1 min-w-0">
                <h1 className={`text-lg sm:text-2xl text-slate-900 dark:text-white flex items-center gap-1.5 ${theme.heading || 'font-extrabold'}`}>
                  <span className="truncate">{shop.name}</span>
                  {shop.verified && <CheckCircle className="w-4 h-4 shrink-0" style={{ color: theme.accent }} />}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {shop.category} · {shop.followersCount || 0} followers ·{' '}
                  <Star className="w-3 h-3 inline fill-amber-400 text-amber-400" /> {shop.rating || '5.0'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer ${
                  isFollowing ? 'bg-slate-100 text-slate-700' : ''
                }`}
                style={isFollowing ? undefined : { background: theme.accent, color: theme.onAccent }}
              >
                {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              </button>

              <Link
                to={`/messages?userId=${shop.ownerId}&shopId=${shop.id}&shopName=${encodeURIComponent(shop.name)}`}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message</span>
              </Link>

              {isOwner && (
                <Link
                  to={`/shop-dashboard?shopId=${shop.id}`}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
              )}
            </div>
          </div>

          {shop.description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3 whitespace-pre-line">{shop.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: theme.soft, color: '#334155' }}>
              <Truck className="w-3.5 h-3.5" style={{ color: theme.accent }} /> Cash on Delivery
            </span>
            {shop.verified && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: theme.soft, color: '#334155' }}>
                <BadgeCheck className="w-3.5 h-3.5" style={{ color: theme.accent }} /> Verified store
              </span>
            )}
            {(shop.city || shop.address) && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full max-w-full" style={{ background: theme.soft, color: '#334155' }}>
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: theme.accent }} />
                <span className="truncate">{shop.city || shop.address}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className={`text-lg sm:text-xl text-slate-900 dark:text-white ${theme.heading || 'font-extrabold'}`}>
            {theme.sectionTitle}
            <span className="ml-2 text-xs font-semibold text-slate-400 tabular-nums">{filteredProducts.length}</span>
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={theme.searchHint}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'new' | 'low' | 'high')}
            aria-label="Sort products"
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200"
          >
            <option value="new">Newest</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>

        {productCategories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {['All', ...productCategories].map((cat) => {
              const active = selectedCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold shrink-0 whitespace-nowrap transition-colors border"
                  style={
                    active
                      ? { background: theme.accent, color: theme.onAccent, borderColor: theme.accent }
                      : { background: theme.soft, color: '#334155', borderColor: 'transparent' }
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-10 text-center space-y-2">
          <ThemeIcon className="w-9 h-9 mx-auto" style={{ color: theme.accent }} />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {products.length === 0 ? 'This store has not listed anything yet.' : 'Nothing matches your search.'}
          </p>
          {products.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCat('All');
              }}
              className="text-xs font-bold underline"
              style={{ color: theme.accent }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className={gridClassFor(theme.layout)}>
          {filteredProducts.map((prod) => (
            <ShopProductCard key={prod.id} product={prod} theme={theme} onAdd={handleAdd} />
          ))}
        </div>
      )}
    </div>
  );
};
