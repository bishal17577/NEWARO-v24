import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Store, Users } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { Shop } from '../../types';

// Shops this account follows. Read from the real follows collection. Empty when there are none.
export const FriendsPage: React.FC = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!authChecked) return undefined;
    if (!uid) {
      setShops([]);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const follows = await getDocs(
          query(collection(db, 'follows'), where('followerId', '==', uid), where('targetType', '==', 'shop'))
        );
        const ids = follows.docs
          .map((d) => String(d.data().targetId || ''))
          .filter(Boolean)
          .slice(0, 50);
        const found = await Promise.all(
          ids.map(async (id) => {
            const snap = await getDoc(doc(db, 'shops', id));
            return snap.exists() ? ({ id: snap.id, ...snap.data() } as Shop) : null;
          })
        );
        if (active) setShops(found.filter((s): s is Shop => s !== null));
      } catch (err) {
        console.warn('Following list unavailable:', err);
        if (active) setShops([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [authChecked, uid]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Following</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Shops you follow on NEWARO</p>
        </div>
      </div>

      {!authChecked || loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading...</p>
      ) : !uid ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <p className="font-bold text-slate-900 dark:text-white">Sign in to see the shops you follow</p>
          <Link to="/auth" className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">
            Sign in
          </Link>
        </div>
      ) : shops.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <p className="font-bold text-slate-900 dark:text-white">You do not follow any shops yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shops you follow will appear here.</p>
          <Link to="/shops" className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">
            Browse shops
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              to={`/shops/${shop.id}`}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                {shop.logoUrl ? (
                  <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{shop.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {[shop.category, shop.city].filter(Boolean).join(' · ')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
