import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  Search,
  MapPin,
  Star,
  Plus,
  CheckCircle,
  UserPlus,
  UserCheck,
  MessageSquare,
  LayoutDashboard,
} from 'lucide-react';
import { collection, query, limit, doc, setDoc, deleteDoc, updateDoc, increment, where } from 'firebase/firestore';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useCategories } from '../../lib/categories';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { Shop } from '../../types';
import { StoreSkeleton } from '../../components/ui/Skeletons';
import { getShopTheme, patternStyle } from '../../lib/shopThemes';

export const ShopsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, canAccessShop } = useAuth();
  const { allCategoriesWithAll } = useCategories();
  const { addToast } = useToast();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const currentUid = user?.uid || 'guest';
  const [followedShops, setFollowedShops] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`newaro_follows_${currentUid}`) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetchShops();
  }, [user?.uid, isAdmin]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const snap = await getDocsWithTimeout(query(collection(db, 'shops'), where('status', '==', 'approved'), limit(60)), 4000).catch(() => null);
      if (snap && !snap.empty) {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Shop))
          .filter((s) => s.status === 'approved' || s.approved === true || isAdmin || canAccessShop(s));
        setShops(list);
      } else {
        setShops([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent, shop: Shop) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      addToast('Sign in to follow stores', 'info');
      navigate('/auth');
      return;
    }
    const nextState = !followedShops[shop.id];
    playUiSound('pop');
    setFollowedShops((prev) => ({ ...prev, [shop.id]: nextState }));

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

  const filteredShops = shops.filter((shop) => {
    const matchesCat =
      selectedCategory === 'All' || shop.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      (shop.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const myShops = shops.filter((s) => canAccessShop(s));

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-extrabold text-slate-900 truncate">Local Stores</h1>
            <p className="text-xs text-slate-500 truncate">{shops.length} verified storefronts</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(myShops.length > 0 || isAdmin) && (
            <Link
              to="/shop-dashboard"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Shop Dashboard</span>
            </Link>
          )}
          <Link
            to="/create-shop"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Open Store</span>
          </Link>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores by name, city, or category..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs sm:text-sm outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {allCategoriesWithAll.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <StoreSkeleton count={6} />
      ) : filteredShops.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 space-y-3">
          <Store className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No stores found</h3>
          <Link
            to="/create-shop"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" /> Open Storefront
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map((shop) => {
            const isFollowed = !!followedShops[shop.id];
            const theme = getShopTheme(shop.category);
            const ThemeIcon = theme.icon;
            return (
              <div
                key={shop.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between group hover:border-blue-300 transition-all"
              >
                <div>
                  <Link to={`/shops/${shop.id}`} className="block relative h-28 overflow-hidden" style={{ background: theme.hero }}>
                    <div aria-hidden className="absolute inset-0" style={patternStyle(theme)} />
                    {shop.coverUrl ? (
                      <img
                        src={shop.coverUrl}
                        alt={shop.name}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <ThemeIcon aria-hidden className={`absolute right-4 top-3 w-12 h-12 ${theme.heroDark ? 'text-white/25' : 'text-slate-900/15'}`} />
                    )}
                    <span
                      className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                      style={{ background: theme.accent, color: theme.onAccent }}
                    >
                      <ThemeIcon className="w-3 h-3" /> {theme.label}
                    </span>
                    <div className="absolute -bottom-5 left-4">
                      {shop.logoUrl ? (
                        <img
                          src={shop.logoUrl}
                          alt={shop.name}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-2xl border-2 border-white object-cover bg-white shadow-sm"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl border-2 border-white flex items-center justify-center font-black text-lg shadow-sm" style={{ background: theme.accent, color: theme.onAccent }}>
                          {shop.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="pt-7 px-4 pb-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/shops/${shop.id}`}
                        className="text-sm font-extrabold text-slate-900 hover:text-blue-600 truncate flex items-center gap-1"
                      >
                        <span className="truncate">{shop.name}</span>
                        {shop.verified && <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </Link>
                      <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5 shrink-0 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {shop.rating || '5.0'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {shop.category} · {shop.followersCount || 0} followers
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{shop.description}</p>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{shop.address}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={(e) => handleFollowToggle(e, shop)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      isFollowed
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isFollowed ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 shrink-0" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  {canAccessShop(shop) && (
                    <Link
                      to={`/shop-dashboard?shopId=${shop.id}`}
                      className="p-2 bg-slate-900 hover:bg-black text-white rounded-xl transition-colors"
                      title="Manage Store Dashboard"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                    </Link>
                  )}

                  <Link
                    to={`/messages?userId=${shop.ownerId}&shopId=${shop.id}&shopName=${encodeURIComponent(shop.name)}`}
                    className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl transition-colors"
                    title="Message Store"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
