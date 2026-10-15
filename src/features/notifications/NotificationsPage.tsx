import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Trash2,
  Filter,
  CheckCheck,
  ShoppingBag,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  Megaphone,
  Sparkles,
  ExternalLink,
  Sliders,
  Clock,
  Heart,
  ChevronRight,
  Search,
  Volume2,
  VolumeX,
  RefreshCw,
  Plus,
  ShieldCheck,
  Info,
  Layers,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { NotificationItem, NotificationType } from '../../types';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'alerts' | 'gigs' | 'orders' | 'messages' | 'system'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live notifications for signed-in users, straight from Firestore. Guests see a sign-in prompt, never sample data.
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', 'in', [user.uid, 'ALL']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setNotifications(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem)));
        setLoading(false);
      },
      (err) => {
        console.warn('Notifications unavailable:', err);
        setNotifications([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Keeps the list in sync after a read, delete or clear
  const syncDemoState = (updated: NotificationItem[]) => {
    setNotifications(updated);
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Category filter
      if (activeFilter === 'unread' && n.read) return false;
      if (activeFilter === 'alerts' && n.type !== 'threshold_alert') return false;
      if (activeFilter === 'gigs' && n.type !== 'gig_proposal' && n.type !== 'gig_accepted' && n.type !== 'weekly_report') return false;
      if (activeFilter === 'orders' && n.type !== 'order_placed' && n.type !== 'order_status') return false;
      if (activeFilter === 'messages' && n.type !== 'message') return false;
      if (activeFilter === 'system' && n.type !== 'system' && n.type !== 'announcement') return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (n.title || '').toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const alertCount = notifications.filter((n) => n.type === 'threshold_alert' && !n.read).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (soundEnabled) playUiSound('pop');
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    syncDemoState(updated);
    if (user && !id.startsWith('seed-')) {
      try {
        await updateDoc(doc(db, 'notifications', id), { read: true });
      } catch {}
    }
  };

  const handleMarkAllAsRead = async () => {
    if (soundEnabled) playUiSound('success');
    const updated = notifications.map((n) => ({ ...n, read: true }));
    syncDemoState(updated);
    addToast('All notifications marked as read', 'success');
    if (user) {
      try {
        const unreadList = notifications.filter((n) => !n.read && !n.id.startsWith('seed-'));
        for (const item of unreadList) {
          updateDoc(doc(db, 'notifications', item.id), { read: true }).catch(() => {});
        }
      } catch {}
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundEnabled) playUiSound('pop');
    const updated = notifications.filter((n) => n.id !== id);
    syncDemoState(updated);
    addToast('Notification removed', 'info');
    if (user && !id.startsWith('seed-')) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch {}
    }
  };

  const formatTimestamp = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'threshold_alert':
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
        );
      case 'weekly_report':
        return (
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        );
      case 'gig_proposal':
      case 'gig_accepted':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        );
      case 'order_placed':
      case 'order_status':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        );
      case 'message':
        return (
          <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case 'like':
      case 'follow':
        return (
          <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-200 text-pink-500 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5" />
          </div>
        );
      case 'announcement':
      case 'system':
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const getActionLabel = (item: NotificationItem) => {
    switch (item.type) {
      case 'threshold_alert':
        return 'Adjust Thresholds';
      case 'weekly_report':
        return 'Read Insight Report';
      case 'gig_accepted':
      case 'gig_proposal':
        return 'Review Gigs & Bids';
      case 'order_status':
      case 'order_placed':
        return 'Track Order';
      case 'message':
        return 'Open Chat';
      default:
        return 'View Details';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-16">
      {/* GUEST MODE BANNER IF NOT SIGNED IN */}
      {!user && (
        <div className="glass-panel rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
            Sign in to see your notifications: orders, messages, shop updates and alerts.
          </p>
          <Link
            to="/auth"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shrink-0 whitespace-nowrap text-center"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* 1. TOP HEADER HERO */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black tabular-nums shadow-xs">
                    {unreadCount} Unread
                  </span>
                )}
                {alertCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>{alertCount} Alert</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time alert thresholds, weekly insight reports, gig proposals & store order updates
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playUiSound('tap');
                addToast(soundEnabled ? 'Audio cues muted' : 'Audio cues enabled', 'info');
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                soundEnabled
                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                  : 'border-slate-200 text-slate-400 bg-slate-50'
              }`}
              title={soundEnabled ? 'Mute Sound Cues' : 'Unmute Sound Cues'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}

            <Link
              to="/jobs?tab=thresholds"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              title="Customize alert threshold values"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Thresholds</span>
            </Link>
          </div>
        </div>

        {/* Quick Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by keyword, client, or milestone..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 outline-hidden focus:bg-white focus:border-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
      </div>

      {/* 2. CATEGORY FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: 'All Notifications', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { id: 'alerts', label: 'Threshold Alerts', icon: AlertTriangle, count: notifications.filter((n) => n.type === 'threshold_alert').length },
          { id: 'gigs', label: 'Gigs & Reports', icon: Briefcase, count: notifications.filter((n) => n.type === 'gig_proposal' || n.type === 'gig_accepted' || n.type === 'weekly_report').length },
          { id: 'orders', label: 'Store Orders', icon: ShoppingBag, count: notifications.filter((n) => n.type === 'order_placed' || n.type === 'order_status').length },
          { id: 'messages', label: 'Messages', icon: MessageSquare, count: notifications.filter((n) => n.type === 'message').length },
          { id: 'system', label: 'System & Security', icon: ShieldCheck, count: notifications.filter((n) => n.type === 'system' || n.type === 'announcement').length },
        ].map((tab) => {
          const active = activeFilter === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (soundEnabled) playUiSound('tap');
                setActiveFilter(tab.id as any);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. CLEAN NOTIFICATION FEED */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-xs text-slate-400 border border-slate-200 shadow-2xs">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">All caught up!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                No notifications match your current filter. Real-time threshold alerts and client messages will appear here.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isUnread = !item.read;
            const actionLabel = getActionLabel(item);

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isUnread) handleMarkAsRead(item.id);
                  if (item.actionUrl) navigate(item.actionUrl);
                }}
                className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer relative group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isUnread
                    ? 'bg-blue-50/40 border-blue-300 hover:border-blue-400 shadow-2xs'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {getNotificationIcon(item.type)}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-xs sm:text-sm font-extrabold leading-snug truncate ${
                          isUnread ? 'text-slate-900 font-black' : 'text-slate-800'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                      )}
                      {item.priority === 'high' && (
                        <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-wider">
                          High Priority
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 ml-auto sm:ml-0">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(item.createdAt)}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pr-2">
                      {item.message}
                    </p>
                    {/* Metadata pill for thresholds if available */}
                    {item.metadata && (
                      <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                          Current: {item.metadata.currentValue} {item.metadata.unit}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                          Threshold: {item.metadata.threshold} {item.metadata.unit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.actionUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isUnread) handleMarkAsRead(item.id);
                        navigate(item.actionUrl!);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{actionLabel}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      className="p-1.5 rounded-xl hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(item.id, e)}
                      className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. NOTIFICATION & THRESHOLD INSIGHT FOOTER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950 text-white rounded-3xl p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-black flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Automate your alerts with custom thresholds</span>
          </h4>
          <p className="text-xs text-slate-300 max-w-xl">
            Contractors can define custom safety margins for weekly revenue (NPR), milestone SLAs, and minimum client satisfaction ratings.
          </p>
        </div>
        <Link
          to="/jobs?tab=thresholds"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap"
        >
          Configure Alert Rules
        </Link>
      </div>
    </div>
  );
};
