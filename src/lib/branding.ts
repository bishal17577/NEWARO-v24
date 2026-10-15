import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface BrandSettings {
  logoUrl?: string;
  updatedAt?: number;
  updatedBy?: string;
}

const LOCAL_STORAGE_KEY = 'newaro_custom_logo';

export function useBrandSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [updatedBy, setUpdatedBy] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'branding'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as BrandSettings;
          setUpdatedBy(data.updatedBy);
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, data.logoUrl);
            } catch {}
          } else {
            setLogoUrl(null);
            try {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            } catch {}
          }
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    const handleCustomLogoUpdate = (e: Event) => {
      const customEv = e as CustomEvent<string | null>;
      setLogoUrl(customEv.detail);
    };
    window.addEventListener('newaro:logo_updated', handleCustomLogoUpdate);
    return () => {
      unsub();
      window.removeEventListener('newaro:logo_updated', handleCustomLogoUpdate);
    };
  }, []);

  const saveLogo = async (newUrl: string, userEmail?: string) => {
    setLogoUrl(newUrl);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, newUrl);
    } catch {}
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('newaro:logo_updated', { detail: newUrl }));
    }, 0);
    await setDoc(
      doc(db, 'settings', 'branding'),
      {
        logoUrl: newUrl,
        updatedAt: Date.now(),
        updatedBy: userEmail || 'admin',
      },
      { merge: true }
    ).catch(() => {});
  };

  const removeLogo = async () => {
    setLogoUrl(null);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, "");
    } catch {}
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('newaro:logo_updated', { detail: null }));
    }, 0);
    await setDoc(
      doc(db, 'settings', 'branding'),
      {
        logoUrl: '',
        updatedAt: Date.now(),
      },
      { merge: true }
    ).catch(() => {});
  };

  return { logoUrl, updatedBy, loading, saveLogo, removeLogo };
}
