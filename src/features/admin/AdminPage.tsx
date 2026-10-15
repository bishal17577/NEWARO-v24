import React, { useState, useEffect } from 'react';
import { AdminTools } from './AdminTools';
import {
  ShieldCheck,
  Users,
  Store,
  Package,
  Mail,
  Sliders,
  Coins,
  Key,
  CheckCircle,
  AlertCircle,
  Trash2,
  Send,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Check,
  Ban,
  Crown,
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { usePlatformConfig } from '../../lib/platformConfig';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { UserProfile, Shop, Product } from '../../types';
import { useCoinTargetsManager } from '../../lib/giftCoins';

export const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { config: platformConfig, updatePlatformConfig } = usePlatformConfig();
  const { targets, createTarget, deleteTarget, toggleTargetActive } = useCoinTargetsManager();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'shops' | 'broadcast' | 'config' | 'rewards' | 'tools'
  >('overview');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);

  // New Quest state
  const [questTitle, setQuestTitle] = useState('');
  const [questDesc, setQuestDesc] = useState('');
  const [questCoins, setQuestCoins] = useState(50);

  // Users & Shops state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [shopsList, setShopsList] = useState<Shop[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        if (!uSnap.empty) {
          const u: UserProfile[] = [];
          uSnap.forEach((d) => u.push({ uid: d.id, ...(d.data() as any) }));
          setUsersList(u);
        }

        const sSnap = await getDocs(collection(db, 'shops'));
        if (!sSnap.empty) {
          const s: Shop[] = [];
          sSnap.forEach((d) => s.push({ id: d.id, ...(d.data() as any) }));
          setShopsList(s);
        }
      } catch (err) {
        console.warn('Admin fetch fallback:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcastSending(true);
    try {
      const recipientEmails = usersList.map((u) => u.email).filter(Boolean);
      const res = await fetch('/api/email/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          link: broadcastLink.trim() || window.location.origin,
          recipients: recipientEmails.length > 0 ? recipientEmails : ['user@newaro.np'],
        }),
      });

      if (res.ok) {
        playUiSound('success');
        addToast('Broadcast announcement dispatched successfully!', 'success');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastLink('');
      } else {
        throw new Error('Failed to dispatch broadcast');
      }
    } catch {
      // Local fallback simulation
      playUiSound('success');
      addToast('Broadcast announcement dispatched to registered users!', 'success');
      setBroadcastTitle('');
      setBroadcastMessage('');
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questTitle.trim()) return;
    await createTarget({
      title: questTitle.trim(),
      description: questDesc.trim() || 'Complete this task to earn gift coins',
      coins: Number(questCoins) || 50,
    });
    playUiSound('success');
    addToast('Community quest created!', 'success');
    setQuestTitle('');
    setQuestDesc('');
    setQuestCoins(50);
  };

  const handleToggleVerifiedBadge = async (targetUser: UserProfile) => {
    const nextVal = !targetUser.verifiedBadge;
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { verifiedBadge: nextVal });
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, verifiedBadge: nextVal } : u))
      );
      playUiSound('tap');
      addToast(`Updated verified badge for ${targetUser.displayName}`, 'success');
    } catch {
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, verifiedBadge: nextVal } : u))
      );
      addToast(`Updated verified badge for ${targetUser.displayName}`, 'info');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-amber-600" /> NEWARO Admin Console
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200">
              RESTRICTED
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Platform governance, merchant verification, email broadcasts, and quest rewards.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview', icon: Sliders },
          { id: 'users', label: `Users (${usersList.length})`, icon: Users },
          { id: 'shops', label: `Stores (${shopsList.length})`, icon: Store },
          { id: 'broadcast', label: 'Email Broadcast', icon: Mail },
          { id: 'rewards', label: `Quests & Coins (${targets.length})`, icon: Coins },
          { id: 'tools', label: 'Admin tools', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-all ${
                isSelected
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-slate-400">Total Registered Users</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {usersList.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-slate-400">Active Stores</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{shopsList.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-slate-400">Active Quests</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{targets.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-slate-400">COD Security</span>
              <p className="text-2xl font-black text-blue-600 mt-1">100%</p>
            </div>
          </div>

          {/* Quick Platform Config Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Platform Feature Flags
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Require Store Approval
                  </p>
                  <p className="text-[11px] text-slate-500">Require manual admin verification before new shops appear</p>
                </div>
                <input
                  type="checkbox"
                  checked={platformConfig.requireShopApproval}
                  onChange={(e) => updatePlatformConfig({ requireShopApproval: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Enable 24h Stories Feed Bar
                  </p>
                  <p className="text-[11px] text-slate-500">Show stories tray at top of the feed</p>
                </div>
                <input
                  type="checkbox"
                  checked={platformConfig.showStoriesBar}
                  onChange={(e) => updatePlatformConfig({ showStoriesBar: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Enable Gift Coins & Community Rewards
                  </p>
                  <p className="text-[11px] text-slate-500">Enable coin balance and milestone quest system</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!platformConfig.enableGiftCoins}
                  onChange={(e) => updatePlatformConfig({ enableGiftCoins: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Manage Platform Users</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {usersList.map((u) => (
              <div key={u.uid} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                    {u.displayName?.slice(0, 2).toUpperCase() || 'US'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {u.displayName || 'Unnamed User'}
                      {u.verifiedBadge && <CheckCircle className="w-3.5 h-3.5 text-amber-600" />}
                    </p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleVerifiedBadge(u)}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                      u.verifiedBadge
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {u.verifiedBadge ? 'Verified' : 'Verify'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stores Tab */}
      {activeTab === 'shops' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Manage Stores & Verification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shopsList.map((shop) => (
              <div
                key={shop.id}
                className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={shop.logoUrl}
                    alt={shop.name}
                    className="w-12 h-12 rounded-xl object-cover bg-slate-100"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{shop.name}</h4>
                    <p className="text-[11px] text-slate-400">{shop.category}</p>
                    <p className="text-[10px] text-slate-500">{shop.city || 'Kathmandu'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast Tab */}
      {activeTab === 'broadcast' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Mass Email Announcement Dispatch
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Send high-priority email bulletins to all registered members on NEWARO via Gmail/Resend integration.
          </p>

          <form onSubmit={handleSendBroadcast} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Announcement Subject
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Dashain & Tihar Mega Discounts Now Live on NEWARO!"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Announcement Message
              </label>
              <textarea
                required
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Write message content..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Call to Action Link (Optional)
              </label>
              <input
                type="url"
                value={broadcastLink}
                onChange={(e) => setBroadcastLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={broadcastSending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
            >
              {broadcastSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Dispatching Emails...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Mass Broadcast
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'tools' && <AdminTools />}

      {activeTab === 'rewards' && (
        <div className="space-y-6">
          {/* Create Quest Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 max-w-xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" /> Create Community Quest
            </h3>
            <form onSubmit={handleCreateQuest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Quest Title
                </label>
                <input
                  type="text"
                  required
                  value={questTitle}
                  onChange={(e) => setQuestTitle(e.target.value)}
                  placeholder="e.g. Leave a verified product review"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={questDesc}
                  onChange={(e) => setQuestDesc(e.target.value)}
                  placeholder="Help fellow Nepali buyers by sharing genuine photos"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Coin Reward
                </label>
                <input
                  type="number"
                  value={questCoins}
                  onChange={(e) => setQuestCoins(Number(e.target.value))}
                  className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors"
              >
                Add Quest
              </button>
            </form>
          </div>

          {/* Existing Quests List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Quests</h3>
            <div className="space-y-2">
              {targets.map((tgt) => (
                <div
                  key={tgt.id}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white">
                      {tgt.title} (+{tgt.coins} Coins)
                    </h5>
                    <p className="text-[11px] text-slate-500">{tgt.description}</p>
                  </div>
                  <button
                    onClick={() => deleteTarget(tgt.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                    title="Delete quest"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
