import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PlatformConfig } from '../types';

const CONFIG_STORAGE_KEY = 'newaro_platform_config_v2';

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  bannerEnabled: false,
  bannerText: '',
  bannerLink: '/shops',
  showHeroBanner: false,
  showStoriesBar: true,
  showQuickComposer: true,
  showFeaturedProducts: true,
  showFeaturedStores: true,
  enableAiAssistant: true,
  enableGiftCoins: true,
  requireShopApproval: true,
  standardDeliveryFee: 150,
  expressDeliveryFee: 250,
  minimumOrderNpr: 100,
};

export function loadPlatformConfig(): PlatformConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_CONFIG;
    return { ...DEFAULT_PLATFORM_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PLATFORM_CONFIG;
  }
}

export function usePlatformConfig() {
  const [config, setConfig] = useState<PlatformConfig>(() => loadPlatformConfig());

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'platform'),
      (snap) => {
        if (snap.exists()) {
          const data = { ...DEFAULT_PLATFORM_CONFIG, ...(snap.data() as Partial<PlatformConfig>) };
          setConfig(data);
          try {
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(data));
          } catch {}
        }
      },
      () => {}
    );
    const handleLocal = (e: Event) => {
      const custom = e as CustomEvent<PlatformConfig>;
      if (custom.detail) setConfig(custom.detail);
      else setConfig(loadPlatformConfig());
    };
    window.addEventListener('newaro:platform_config_updated', handleLocal);
    return () => {
      unsub();
      window.removeEventListener('newaro:platform_config_updated', handleLocal);
    };
  }, []);

  const updatePlatformConfig = async (updates: Partial<PlatformConfig>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('newaro:platform_config_updated', { detail: next }));
      }, 0);
    } catch {}
    await setDoc(doc(db, 'settings', 'platform'), next, { merge: true }).catch(() => {});
  };

  return {
    config,
    updatePlatformConfig,
  };
}
