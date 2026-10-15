import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getCountFromServer, getDocs, limit, query, where, doc, updateDoc } from 'firebase/firestore';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  AppWindow,
  Bus,
  Briefcase,
  Calendar,
  Crown,
  Download,
  FileText,
  Heart,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Newspaper,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { useToast } from '../../components/ui/Toast';
import { usePlatformConfig } from '../../lib/platformConfig';
import type { PlatformConfig } from '../../types';

interface CountTool {
  id: string;
  label: string;
  collection: string;
  icon: LucideIcon;
}
interface ExportTool {
  id: string;
  label: string;
  collection: string;
  file: string;
}
interface ShortcutTool {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
}

// 1. Live counts (14). Each number is counted from Firestore when the page opens.
const COUNT_TOOLS: CountTool[] = [
  { id: 'users', label: 'Users', collection: 'users', icon: Users },
  { id: 'shops', label: 'Shops', collection: 'shops', icon: Store },
  { id: 'products', label: 'Products', collection: 'products', icon: Package },
  { id: 'orders', label: 'Orders', collection: 'orders', icon: ShoppingBag },
  { id: 'posts', label: 'Posts', collection: 'posts', icon: FileText },
  { id: 'stories', label: 'Stories', collection: 'stories', icon: ImageIcon },
  { id: 'events', label: 'Events', collection: 'events', icon: Calendar },
  { id: 'jobs', label: 'Jobs', collection: 'jobs', icon: Briefcase },
  { id: 'job_proposals', label: 'Job proposals', collection: 'job_proposals', icon: Layers },
  { id: 'follows', label: 'Follows', collection: 'follows', icon: Heart },
  { id: 'notifications', label: 'Notifications', collection: 'notifications', icon: Bell },
  { id: 'announcements', label: 'Announcements', collection: 'announcements', icon: Megaphone },
  { id: 'chats', label: 'Chats', collection: 'chats', icon: MessageSquare },
  { id: 'redeem_codes', label: 'Redeem codes', collection: 'redeem_codes', icon: Ticket },
  { id: 'apps', label: 'Apps', collection: 'apps', icon: AppWindow },
  { id: 'booking_services', label: 'Booking services', collection: 'booking_services', icon: Calendar },
  { id: 'bookings', label: 'Bookings', collection: 'bookings', icon: ShoppingBag },
  { id: 'bus_trips', label: 'Bus trips', collection: 'bus_trips', icon: Bus },
];

// 2. CSV exports (9). Each file holds up to 1,000 real rows.
const EXPORT_TOOLS: ExportTool[] = [
  { id: 'x-users', label: 'Users', collection: 'users', file: 'newaro-users.csv' },
  { id: 'x-shops', label: 'Shops', collection: 'shops', file: 'newaro-shops.csv' },
  { id: 'x-products', label: 'Products', collection: 'products', file: 'newaro-products.csv' },
  { id: 'x-orders', label: 'Orders', collection: 'orders', file: 'newaro-orders.csv' },
  { id: 'x-posts', label: 'Posts', collection: 'posts', file: 'newaro-posts.csv' },
  { id: 'x-events', label: 'Events', collection: 'events', file: 'newaro-events.csv' },
  { id: 'x-jobs', label: 'Jobs', collection: 'jobs', file: 'newaro-jobs.csv' },
  { id: 'x-proposals', label: 'Job proposals', collection: 'job_proposals', file: 'newaro-job-proposals.csv' },
  { id: 'x-announcements', label: 'Announcements', collection: 'announcements', file: 'newaro-announcements.csv' },
  { id: 'x-apps', label: 'Apps', collection: 'apps', file: 'newaro-apps.csv' },
  { id: 'x-bookings', label: 'Bookings', collection: 'bookings', file: 'newaro-bookings.csv' },
  { id: 'x-bus-trips', label: 'Bus trips', collection: 'bus_trips', file: 'newaro-bus-trips.csv' },
];

// 3. Shortcuts (7) to existing admin-related pages.
const SHORTCUT_TOOLS: ShortcutTool[] = [
  { id: 's-dashboard', label: 'Shop dashboard', to: '/shop-dashboard', icon: LayoutDashboard },
  { id: 's-analytics', label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { id: 's-wallet', label: 'Coins and wallet', to: '/wallet', icon: Wallet },
  { id: 's-membership', label: 'Membership', to: '/membership', icon: Crown },
  { id: 's-events', label: 'Events', to: '/events', icon: Calendar },
  { id: 's-jobs', label: 'Jobs and gigs', to: '/jobs', icon: Briefcase },
  { id: 's-news', label: 'News', to: '/news', icon: Newspaper },
];

const toCsv = (rows: Record<string, unknown>[]): string => {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown): string => {
    if (value === undefined || value === null) return '';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [keys.join(','), ...rows.map((row) => keys.map((k) => escape(row[k])).join(','))].join('\n');
};

const downloadText = (fileName: string, text: string) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const AdminTools: React.FC = () => {
  const { addToast } = useToast();
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [busyExport, setBusyExport] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Record<string, any>[] | null>(null);
  const { config: platformConfig, updatePlatformConfig } = usePlatformConfig();
  const [pendingShops, setPendingShops] = useState<Record<string, any>[]>([]);
  const [standardFeeInput, setStandardFeeInput] = useState('');
  const [expressFeeInput, setExpressFeeInput] = useState('');
  const [minimumInput, setMinimumInput] = useState('');

  const loadPendingShops = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'shops'), where('status', '==', 'pending'), limit(50)));
      setPendingShops(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.warn('Pending shops unavailable:', err);
      setPendingShops([]);
    }
  };

  useEffect(() => {
    loadPendingShops();
  }, []);

  const decideShop = async (shopId: string, approve: boolean) => {
    try {
      await updateDoc(
        doc(db, 'shops', shopId),
        approve
          ? { status: 'approved', approved: true, verified: true }
          : { status: 'rejected', approved: false, verified: false }
      );
      addToast(approve ? 'Shop approved. It is now live.' : 'Shop rejected.', approve ? 'success' : 'info');
      loadPendingShops();
    } catch (err) {
      console.warn('Shop decision failed:', err);
      addToast('Could not update the shop. Check admin access.', 'error');
    }
  };

  const saveDeliverySettings = async () => {
    const updates: Partial<PlatformConfig> = {};
    const standard = Number(standardFeeInput);
    const express = Number(expressFeeInput);
    const minimum = Number(minimumInput);
    if (standardFeeInput !== '' && standard >= 0) updates.standardDeliveryFee = standard;
    if (expressFeeInput !== '' && express >= 0) updates.expressDeliveryFee = express;
    if (minimumInput !== '' && minimum >= 0) updates.minimumOrderNpr = minimum;
    if (Object.keys(updates).length === 0) {
      addToast('Type at least one amount to save', 'info');
      return;
    }
    await updatePlatformConfig(updates);
    setStandardFeeInput('');
    setExpressFeeInput('');
    setMinimumInput('');
    addToast('Delivery settings saved', 'success');
  };

  const loadCounts = async () => {
    setCountsLoading(true);
    const results = await Promise.allSettled(
      COUNT_TOOLS.map((tool) => getCountFromServer(query(collection(db, tool.collection))))
    );
    const next: Record<string, number | null> = {};
    results.forEach((result, index) => {
      next[COUNT_TOOLS[index].id] = result.status === 'fulfilled' ? result.value.data().count : null;
    });
    setCounts(next);
    setCountsLoading(false);
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const exportCsv = async (tool: ExportTool) => {
    setBusyExport(tool.id);
    try {
      const snap = await getDocsWithTimeout(query(collection(db, tool.collection), limit(1000)), 20000);
      if (snap.empty) {
        addToast(`No ${tool.label.toLowerCase()} to export yet`, 'info');
        return;
      }
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>);
      downloadText(tool.file, toCsv(rows));
      addToast(`Exported ${rows.length} rows`, 'success');
    } catch (err) {
      console.warn('Export failed:', err);
      addToast('Export failed. Check that this account is an admin.', 'error');
    } finally {
      setBusyExport(null);
    }
  };

  const findUser = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean.includes('@')) {
      addToast('Type a full email address', 'error');
      return;
    }
    setSearching(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', clean), limit(10)));
      setFound(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    } catch (err) {
      console.warn('User lookup failed:', err);
      addToast('Lookup failed. Check that this account is an admin.', 'error');
      setFound([]);
    } finally {
      setSearching(false);
    }
  };

  const cardClass =
    'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4';

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Live counts</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Counted from Firestore right now</p>
          </div>
          <button
            type="button"
            onClick={loadCounts}
            disabled={countsLoading}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${countsLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COUNT_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const value = counts[tool.id];
            return (
              <div key={tool.id} className={cardClass}>
                <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <p className="mt-2 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {value === undefined ? '…' : value === null ? '—' : value.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tool.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Export data (CSV)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Up to 1,000 rows per file</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EXPORT_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => exportCsv(tool)}
              disabled={busyExport !== null}
              className={`${cardClass} text-left flex items-center justify-between gap-3 disabled:opacity-50`}
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {busyExport === tool.id ? 'Exporting...' : tool.label}
              </span>
              <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Shortcuts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SHORTCUT_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} to={tool.to} className={`${cardClass} flex items-center gap-3`}>
                <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{tool.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Find a user by email</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') findUser();
            }}
            placeholder="user@example.com"
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={findUser}
            disabled={searching}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Search className="w-4 h-4" /> Find
          </button>
        </div>
        {found && found.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No user found with that exact email.</p>
        )}
        {found && found.length > 0 && (
          <ul className="space-y-2">
            {found.map((u) => (
              <li key={u.uid} className={cardClass}>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{u.displayName || 'No name yet'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {u.email} · role: {u.role || 'user'} · id: {u.uid}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Shops waiting for approval</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">A shop appears on NEWARO only after you approve it</p>
        </div>
        {pendingShops.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No shops are waiting for approval.</p>
        ) : (
          <ul className="space-y-2">
            {pendingShops.map((shop) => (
              <li key={shop.id} className={`${cardClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{shop.name || 'Unnamed shop'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {[shop.category, shop.city, shop.ownerEmail].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => decideShop(shop.id, true)}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => decideShop(shop.id, false)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Delivery settings</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Now: Standard NPR {platformConfig.standardDeliveryFee ?? 150} · Express NPR {platformConfig.expressDeliveryFee ?? 250} · Minimum order NPR {platformConfig.minimumOrderNpr ?? 100}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="number"
            min={0}
            value={standardFeeInput}
            onChange={(e) => setStandardFeeInput(e.target.value)}
            placeholder="Standard fee (NPR)"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
          />
          <input
            type="number"
            min={0}
            value={expressFeeInput}
            onChange={(e) => setExpressFeeInput(e.target.value)}
            placeholder="Express fee (NPR)"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
          />
          <input
            type="number"
            min={0}
            value={minimumInput}
            onChange={(e) => setMinimumInput(e.target.value)}
            placeholder="Minimum order (NPR)"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={saveDeliverySettings}
          className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold"
        >
          Save delivery settings
        </button>
      </section>

    </div>
  );
};
