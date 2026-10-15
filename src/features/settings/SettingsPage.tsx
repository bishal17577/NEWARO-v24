import React from 'react';
import {
  Settings,
  Bell,
  Moon,
  Sun,
  Shield,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  RotateCcw,
  Check,
  MapPin,
  Lock,
  Eye,
  Sliders,
  User,
  Store,
  Briefcase,
  ShoppingBag,
} from 'lucide-react';
import { useSettings, playUiSound } from '../../lib/settings';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../../types';

export const SettingsPage: React.FC = () => {
  const { settings, emailPrefs, updateSetting, updateEmailNotificationPref, resetSettings } = useSettings();
  const { user, profile, role, isAdmin, switchRole } = useAuth();
  const { addToast } = useToast();

  const handleToggleTheme = (theme: 'light' | 'dark' | 'system') => {
    updateSetting('theme', theme);
    playUiSound('tap');
    addToast(`Theme set to ${theme}`, 'info');
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!user) {
      addToast('Please sign in to switch roles.', 'info');
      return;
    }
    playUiSound('tap');
    await switchRole(newRole);
    addToast(`Account role switched to ${newRole === 'shop_owner' ? 'Store Owner' : newRole === 'freelancer' ? 'Freelancer' : 'Buyer / Member'}. Navigation updated!`, 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-amber-600" />
          Settings & Preferences
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your NEWARO experience, notification channels, audio cues, and account role mode.
        </p>
      </div>

      {/* Account Role & Mode Switcher */}
      {user && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> Account Role & Mode
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch your active role to access specific dashboard tools, listings, and menu shortcuts.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Active: {role.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              {
                id: 'user' as UserRole,
                label: 'Buyer / Member',
                desc: 'Browse stores, place COD orders, social stories',
                icon: ShoppingBag,
              },
              {
                id: 'shop_owner' as UserRole,
                label: 'Store Owner',
                desc: 'Seller dashboard, product listing, COD order processing',
                icon: Store,
              },
              {
                id: 'freelancer' as UserRole,
                label: 'Freelancer / Contractor',
                desc: 'Contractor dashboard, bid on gigs, client proposals',
                icon: Briefcase,
              },
            ].map((rItem) => {
              const Icon = rItem.icon;
              const isSelected = role === rItem.id;
              return (
                <button
                  key={rItem.id}
                  onClick={() => handleRoleChange(rItem.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    {isSelected && (
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-blue-600 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold">{rItem.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{rItem.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Moon className="w-5 h-5 text-amber-600" /> Appearance & Display
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              { id: 'light', label: 'Light Mode', icon: Sun },
              { id: 'dark', label: 'Dark Mode', icon: Moon },
              { id: 'system', label: 'System Default', icon: Smartphone },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = settings.theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleToggleTheme(item.id)}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">High Contrast Mode</p>
              <p className="text-[11px] text-slate-500">Sharper borders and higher contrast text</p>
            </div>
            <input
              type="checkbox"
              checked={!!settings.highContrast}
              onChange={(e) => updateSetting('highContrast', e.target.checked)}
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Dragon cursor</p>
              <p className="text-[11px] text-slate-500">Animated dragon that follows your mouse (desktop only; off with Reduced Motion)</p>
            </div>
            <input
              type="checkbox"
              checked={settings.dragonCursor !== false}
              onChange={(e) => updateSetting('dragonCursor', e.target.checked)}
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">UI Sound Effects</p>
              <p className="text-[11px] text-slate-500">Audio cues on reactions, tap clicks, and cart actions</p>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEffects}
              onChange={(e) => updateSetting('soundEffects', e.target.checked)}
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Email & Notification Delivery Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-600" /> Notifications & Email Alerts
        </h3>
        <p className="text-xs text-slate-500 -mt-3">
          Configure real-time alerts sent to your registered email via NEWARO’s integrated transactional mailing system.
        </p>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[
            {
              key: 'orders',
              title: 'Order Status & Tracking',
              desc: 'Receipts, Cash on Delivery confirmation, and courier dispatch updates',
            },
            {
              key: 'messages',
              title: 'Direct Messages',
              desc: 'Chat alerts when sellers or buyers message you on NEWARO',
            },
            {
              key: 'announcements',
              title: 'Community Announcements',
              desc: 'Special offers, festival deals, and marketplace bulletins',
            },
            {
              key: 'gigAlerts',
              title: 'Freelance & Gig Alerts',
              desc: 'Notifications when matching freelance jobs are posted in Nepal',
            },
            {
              key: 'weeklyInsights',
              title: 'Weekly Performance Reports',
              desc: 'Automated AI revenue summaries and goal metrics for sellers & freelancers',
            },
          ].map((item) => (
            <div key={item.key} className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.title}</p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={!!emailPrefs[item.key as keyof typeof emailPrefs]}
                onChange={(e) =>
                  updateEmailNotificationPref(item.key as any, e.target.checked)
                }
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Shopping & Location Defaults */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-600" /> Marketplace & Checkout Preferences
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Prioritize Verified Local Stores
              </p>
              <p className="text-[11px] text-slate-500">Show Kathmandu, Pokhara, and nearby city stores higher</p>
            </div>
            <input
              type="checkbox"
              checked={settings.prioritizeLocalStores}
              onChange={(e) => updateSetting('prioritizeLocalStores', e.target.checked)}
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                One-Click Cash on Delivery (COD)
              </p>
              <p className="text-[11px] text-slate-500">Remember delivery address for lightning-fast COD orders</p>
            </div>
            <input
              type="checkbox"
              checked={settings.oneClickCodCheckout}
              onChange={(e) => updateSetting('oneClickCodCheckout', e.target.checked)}
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Auto-Compress Image Uploads
              </p>
              <p className="text-[11px] text-slate-500">Compress seller product photos before uploading to optimize bandwidth</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCompressUploads}
              onChange={(e) => updateSetting('autoCompressUploads', e.target.checked)}
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Reset Defaults Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => {
            resetSettings();
            playUiSound('tap');
            addToast('Settings reset to defaults', 'info');
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset All to Defaults
        </button>
      </div>
    </div>
  );
};
