import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Store,
  Navigation,
  Search,
  ExternalLink,
  Phone,
  MessageSquare,
  ShieldCheck,
  Star,
  Package,
} from 'lucide-react';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Shop } from '../../types';

const NEPAL_CITIES = [
  'All Nepal',
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Pokhara',
  'Chitwan',
  'Butwal',
  'Biratnagar',
  'Dharan',
];

export const NearbyPage: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState('All Nepal');
  const [search, setSearch] = useState('');

  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'shops'), where('status', '==', 'approved'), limit(200)));
        if (active) setAllShops(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop)));
      } catch (err) {
        console.warn('Nearby shops load failed:', err);
      } finally {
        if (active) setLoadingShops(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredShops = allShops.filter((shop) => {
    if (selectedCity !== 'All Nepal') {
      const matchCity = shop.city?.toLowerCase().includes(selectedCity.toLowerCase());
      const matchAddress = shop.address?.toLowerCase().includes(selectedCity.toLowerCase());
      if (!matchCity && !matchAddress) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (shop.name || '').toLowerCase().includes(q);
      const matchCat = (shop.category || '').toLowerCase().includes(q);
      const matchAddr = (shop.address || '').toLowerCase().includes(q);
      return matchName || matchCat || matchAddr;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-600 to-orange-600 p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase">
            <Navigation className="w-3.5 h-3.5" /> Local Explorer
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Verified Stores Near You</h1>
          <p className="text-amber-100 text-xs sm:text-sm max-w-lg">
            Shop directly from physical storefronts and registered local merchants in your city. Enjoy same-day or next-day Cash on Delivery!
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[min(200px,100%)]">
          <span className="text-2xl font-black">{filteredShops.length}</span>
          <p className="text-xs text-amber-200">Verified Stores Active</p>
        </div>
      </div>

      {/* City Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {NEPAL_CITIES.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCity === city
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        <div className="relative min-w-[min(240px,100%)]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city, area, or store name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Grid of Nearby Stores */}
      {loadingShops ? (
        <div className="text-center py-12 text-sm font-semibold text-slate-500">Loading stores...</div>
      ) : filteredShops.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Store className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {allShops.length === 0 ? 'No stores yet in NEWARO' : 'No stores match your search'}
          </h3>
          <Link
            to="/create-shop"
            className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Open your store
          </Link>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredShops.map((shop) => (
          <div
            key={shop.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-amber-400 dark:hover:border-amber-500 transition-all flex flex-col justify-between"
          >
            {/* Store Cover Header */}
            <div className="relative h-28 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              {shop.coverUrl && (
                <img
                  src={shop.coverUrl}
                  alt={shop.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-2.5 right-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-600 flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Verified
              </div>
            </div>

            {/* Store Info */}
            <div className="p-5 pt-0 relative flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-end gap-3 -mt-8 mb-3">
                  <img
                    src={shop.logoUrl}
                    alt={shop.name}
                    className="w-16 h-16 rounded-xl object-cover border-3 border-white dark:border-slate-900 shadow-md bg-white shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                      {shop.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {shop.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3">
                  {shop.description}
                </p>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{shop.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{shop.phone}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Link
                  to={`/chat?shopId=${shop.id}`}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                </Link>

                <Link
                  to={`/shops/${shop.id}`}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors text-center shadow-xs flex items-center justify-center gap-1"
                >
                  <Store className="w-3.5 h-3.5" /> Visit Store
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
