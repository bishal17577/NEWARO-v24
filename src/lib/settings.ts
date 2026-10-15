import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailNotificationPrefs } from '../types';

export const DEFAULT_EMAIL_NOTIFICATION_PREFS: EmailNotificationPrefs = {
  orders: true,
  announcements: true,
  messages: true,
  comments: true,
  likes: false,
  follows: false,
  productUpdates: false,
  gigAlerts: true,
  weeklyInsights: true,
  thresholdAlerts: true,
};

export function resolveEmailNotificationPrefs(
  raw?: Partial<EmailNotificationPrefs> | null
): EmailNotificationPrefs {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_EMAIL_NOTIFICATION_PREFS };
  }
  return {
    orders: typeof raw.orders === 'boolean' ? raw.orders : DEFAULT_EMAIL_NOTIFICATION_PREFS.orders,
    announcements:
      typeof raw.announcements === 'boolean'
        ? raw.announcements
        : DEFAULT_EMAIL_NOTIFICATION_PREFS.announcements,
    messages:
      typeof raw.messages === 'boolean' ? raw.messages : DEFAULT_EMAIL_NOTIFICATION_PREFS.messages,
    comments:
      typeof raw.comments === 'boolean' ? raw.comments : DEFAULT_EMAIL_NOTIFICATION_PREFS.comments,
    likes: typeof raw.likes === 'boolean' ? raw.likes : DEFAULT_EMAIL_NOTIFICATION_PREFS.likes,
    follows:
      typeof raw.follows === 'boolean' ? raw.follows : DEFAULT_EMAIL_NOTIFICATION_PREFS.follows,
    productUpdates:
      typeof raw.productUpdates === 'boolean'
        ? raw.productUpdates
        : DEFAULT_EMAIL_NOTIFICATION_PREFS.productUpdates,
    gigAlerts:
      typeof raw.gigAlerts === 'boolean'
        ? raw.gigAlerts
        : DEFAULT_EMAIL_NOTIFICATION_PREFS.gigAlerts,
    weeklyInsights:
      typeof raw.weeklyInsights === 'boolean'
        ? raw.weeklyInsights
        : DEFAULT_EMAIL_NOTIFICATION_PREFS.weeklyInsights,
    thresholdAlerts:
      typeof raw.thresholdAlerts === 'boolean'
        ? raw.thresholdAlerts
        : DEFAULT_EMAIL_NOTIFICATION_PREFS.thresholdAlerts,
  };
}

export interface NewaroSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'sm' | 'base' | 'lg';
  compactFeed: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  dragonCursor: boolean;
  glassmorphism: boolean;
  showStoryRings: boolean;
  showPriceBadges: boolean;
  stickyHeader: boolean;
  showBottomNavLabels: boolean;
  locationMode: 'always_on' | 'while_using' | 'always_off';
  defaultCity: string;
  nearbyRadiusKm: number;
  savedLat?: number;
  savedLng?: number;
  prioritizeLocalStores: boolean;
  showDistanceBadge: boolean;
  autoDetectGps: boolean;
  saveLocationHistory: boolean;
  distanceUnit: 'km' | 'mi';
  safeSearch: boolean;
  hideOutOfStock: boolean;
  verifiedStoresOnly: boolean;
  codOnlyFilter: boolean;
  freeDeliveryOnly: boolean;
  instantSearchSuggestions: boolean;
  saveSearchHistory: boolean;
  searchIncludeJobs: boolean;
  publicProfile: boolean;
  showOnlineStatus: boolean;
  readReceipts: boolean;
  allowDirectMessages: boolean;
  loginAlerts: boolean;
  maskPhoneOnPublicPosts: boolean;
  pushNotifications: boolean;
  soundEffects: boolean;
  emailNotificationPrefs: EmailNotificationPrefs;
  dataSaverMode: boolean;
  autoCompressUploads: boolean;
  offlineFeedCache: boolean;
  prefetchStoreImages: boolean;
  oneClickCodCheckout: boolean;
  autoApplySavedAddress: boolean;
  saveCartOnExit: boolean;
  whatsappOrderConfirm: boolean;
  autoAcceptOffers: boolean;
}

export const DEFAULT_SETTINGS: NewaroSettings = {
  theme: 'light',
  fontSize: 'base',
  compactFeed: false,
  reducedMotion: false,
  highContrast: false,
  dragonCursor: true,
  glassmorphism: true,
  showStoryRings: true,
  showPriceBadges: true,
  stickyHeader: true,
  showBottomNavLabels: true,
  locationMode: 'while_using',
  defaultCity: 'Kathmandu',
  nearbyRadiusKm: 15,
  prioritizeLocalStores: true,
  showDistanceBadge: true,
  autoDetectGps: true,
  saveLocationHistory: true,
  distanceUnit: 'km',
  safeSearch: true,
  hideOutOfStock: false,
  verifiedStoresOnly: false,
  codOnlyFilter: false,
  freeDeliveryOnly: false,
  instantSearchSuggestions: true,
  saveSearchHistory: true,
  searchIncludeJobs: true,
  publicProfile: true,
  showOnlineStatus: true,
  readReceipts: true,
  allowDirectMessages: true,
  loginAlerts: true,
  maskPhoneOnPublicPosts: false,
  pushNotifications: true,
  soundEffects: true,
  emailNotificationPrefs: { ...DEFAULT_EMAIL_NOTIFICATION_PREFS },
  dataSaverMode: false,
  autoCompressUploads: true,
  offlineFeedCache: true,
  prefetchStoreImages: true,
  oneClickCodCheckout: true,
  autoApplySavedAddress: true,
  saveCartOnExit: true,
  whatsappOrderConfirm: true,
  autoAcceptOffers: false,
};

const SETTINGS_KEY = 'newaro_user_settings_v3';

export function getStoredSettings(): NewaroSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveStoredSettings(settings: NewaroSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyDocumentTheme(settings);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('newaro:settings_updated', { detail: settings }));
    }, 0);
  } catch {}
}

export function playUiSound(type: 'pop' | 'click' | 'success' | 'tap' = 'pop') {
  try {
    const current = getStoredSettings();
    if (!current.soundEffects) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(type === 'success' ? 660 : 520, ctx.currentTime);
    if (type === 'success') {
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    }
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {}
}

export function applyDocumentTheme(settings: NewaroSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (settings.theme === 'dark') {
    root.classList.add('dark');
  } else if (settings.theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
  root.classList.toggle('high-contrast', !!settings.highContrast);
  root.classList.toggle('reduce-motion', !!settings.reducedMotion);
}

export function useSettings() {
  const [settings, setSettings] = useState<NewaroSettings>(() => getStoredSettings());

  useEffect(() => {
    applyDocumentTheme(settings);
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<NewaroSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getStoredSettings());
      }
    };
    window.addEventListener('newaro:settings_updated', handleUpdate);
    return () => window.removeEventListener('newaro:settings_updated', handleUpdate);
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'users', uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const resolved = resolveEmailNotificationPrefs(data?.notificationPrefs?.email);
          const current = getStoredSettings();
          const next = { ...current, emailNotificationPrefs: resolved };
          setSettings(next);
          saveStoredSettings(next);
        }
      })
      .catch(() => {});
  }, [auth.currentUser?.uid]);

  const updateEmailNotificationPref = <K extends keyof EmailNotificationPrefs>(
    key: K,
    value: boolean
  ) => {
    playUiSound('pop');
    const current = getStoredSettings();
    const currentPrefs = resolveEmailNotificationPrefs(current.emailNotificationPrefs);
    const nextPrefs: EmailNotificationPrefs = { ...currentPrefs, [key]: value };
    const next = { ...current, emailNotificationPrefs: nextPrefs };
    setSettings(next);
    saveStoredSettings(next);
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(
        doc(db, 'users', uid),
        { notificationPrefs: { email: nextPrefs } },
        { merge: true }
      ).catch(() => {});
    }
  };

  const updateSetting = <K extends keyof NewaroSettings>(key: K, value: NewaroSettings[K]) => {
    playUiSound('pop');
    const current = getStoredSettings();
    const next = { ...current, [key]: value };
    setSettings(next);
    saveStoredSettings(next);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    saveStoredSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    emailPrefs: resolveEmailNotificationPrefs(settings.emailNotificationPrefs),
    updateEmailNotificationPref,
    updateSetting,
    resetSettings,
  };
}

export const useNewaroSettings = useSettings;
