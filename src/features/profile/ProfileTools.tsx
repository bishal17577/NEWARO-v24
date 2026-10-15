import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import type { DocumentData, Query } from 'firebase/firestore';
import { Bell, Bookmark, Coins, Crown, FileText, Package, Pencil, Plus, Settings, Share2, ShoppingBag, Store, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useGiftCoins } from '../../lib/giftCoins';
import { useToast } from '../../components/ui/Toast';

const SAVED_KEY = 'newaro_saved_favorites';

const show = (value: number | null | undefined): string =>
  value === undefined ? '…' : value === null ? '—' : value.toLocaleString();

// Real counts and quick actions for the signed-in account. A missing count shows a dash, never a made-up number.
export const ProfileTools: React.FC<{ uid: string }> = ({ uid }) => {
  const { addToast } = useToast();
  const { balance } = useGiftCoins(uid);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [savedCount, setSavedCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const countOf = (q: Query<DocumentData>): Promise<number | null> =>
      getCountFromServer(q)
        .then((snap) => snap.data().count)
        .catch(() => null);

    const pairs: [string, Promise<number | null>][] = [
      ['orders', countOf(query(collection(db, 'orders'), where('buyerId', '==', uid)))],
      [
        'notifications',
        countOf(query(collection(db, 'notifications'), where('recipientId', '==', uid), where('read', '==', false))),
      ],
      [
        'following',
        countOf(query(collection(db, 'follows'), where('followerId', '==', uid), where('targetType', '==', 'shop'))),
      ],
      ['posts', countOf(query(collection(db, 'posts'), where('authorId', '==', uid)))],
      ['shops', countOf(query(collection(db, 'shops'), where('ownerId', '==', uid)))],
      ['products', countOf(query(collection(db, 'products'), where('sellerId', '==', uid)))],
    ];

    Promise.all(pairs.map(([key, p]) => p.then((value) => [key, value] as [string, number | null]))).then((results) => {
      if (active) setCounts(Object.fromEntries(results));
    });

    try {
      const raw = localStorage.getItem(SAVED_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setSavedCount(Array.isArray(list) ? list.length : 0);
    } catch {
      setSavedCount(0);
    }

    return () => {
      active = false;
    };
  }, [uid]);

  const shareProfile = async () => {
    const link = `${window.location.origin}/profile/${uid}`;
    try {
      await navigator.clipboard.writeText(link);
      addToast('Profile link copied', 'success');
    } catch {
      addToast('Could not copy the link on this device', 'error');
    }
  };

  const tiles: { label: string; value: string; to: string; icon: LucideIcon }[] = [
    { label: 'Orders', value: show(counts.orders), to: '/orders', icon: ShoppingBag },
    { label: 'Coins', value: show(balance), to: '/wallet', icon: Coins },
    { label: 'Unread alerts', value: show(counts.notifications), to: '/notifications', icon: Bell },
    { label: 'Following shops', value: show(counts.following), to: '/friends', icon: Users },
    { label: 'My posts', value: show(counts.posts), to: `/profile/${uid}`, icon: FileText },
    { label: 'My shops', value: show(counts.shops), to: '/shop-dashboard', icon: Store },
    { label: 'My products', value: show(counts.products), to: '/shop-dashboard', icon: Package },
    { label: 'Saved items', value: show(savedCount), to: '/favorites', icon: Bookmark },
  ];

  const cardClass =
    'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors';

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.label} to={tile.to} className={cardClass}>
              <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <p className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{tile.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{tile.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link to="/edit-profile" className={`${cardClass} flex-row items-center`}>
          <Pencil className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">Edit profile</span>
        </Link>
        <Link to="/create-post" className={`${cardClass} flex-row items-center`}>
          <Plus className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">Create post</span>
        </Link>
        <Link to="/create-shop" className={`${cardClass} flex-row items-center`}>
          <Store className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">Start a shop</span>
        </Link>
        <Link to="/membership" className={`${cardClass} flex-row items-center`}>
          <Crown className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">Membership</span>
        </Link>
        <Link to="/settings" className={`${cardClass} flex-row items-center`}>
          <Settings className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">Settings</span>
        </Link>
        <button type="button" onClick={shareProfile} className={`${cardClass} flex-row items-center text-left`}>
          <Share2 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">Copy profile link</span>
        </button>
      </div>
    </section>
  );
};
