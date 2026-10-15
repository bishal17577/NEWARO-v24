import { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { ApiKeyEntry } from '../types';

export type ApiProviderType = 'imgbb' | 'gemini' | 'resend';

const STORAGE_KEY = 'newaro_api_key_pool_v2';

const DEFAULT_POOL: ApiKeyEntry[] = [];

function normalizeEntry(k: ApiKeyEntry): ApiKeyEntry {
  const isActive = k.active !== undefined ? k.active : k.enabled !== false;
  return {
    ...k,
    enabled: isActive,
    active: isActive,
    quotaExhausted: Boolean(k.quotaExhausted),
  };
}

export function loadLocalApiPool(): ApiKeyEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POOL;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_POOL;
    const map = new Map<string, ApiKeyEntry>();
    DEFAULT_POOL.forEach((k) => map.set(k.id, normalizeEntry(k)));
    parsed.forEach((k: ApiKeyEntry) => {
      if (k && k.id && k.key && k.provider === 'imgbb') {
        map.set(k.id, normalizeEntry(k));
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.priority || 99) - (b.priority || 99));
  } catch {
    return DEFAULT_POOL;
  }
}

export function saveLocalApiPool(entries: ApiKeyEntry[]) {
  try {
    const normalized = entries.filter((k) => k.provider === 'imgbb').map(normalizeEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('newaro:api_pool_updated', { detail: normalized }));
    }, 0);
  } catch {}
}

export function getActiveKeysForProvider(provider: ApiProviderType): ApiKeyEntry[] {
  if (provider !== 'imgbb') return [];
  const all = loadLocalApiPool();
  return all
    .filter(
      (k) =>
        k.provider === provider &&
        k.enabled !== false &&
        k.active !== false &&
        !k.quotaExhausted &&
        k.key &&
        k.key.trim().length > 4
    )
    .sort(
      (a, b) =>
        (a.priority || 99) - (b.priority || 99) || (a.failCount || 0) - (b.failCount || 0)
    );
}

export async function recordKeySuccess(id: string) {
  const pool = loadLocalApiPool();
  const next = pool.map((k) =>
    k.id === id
      ? { ...k, usageCount: (k.usageCount || 0) + 1, quotaExhausted: false, lastUsedAt: Date.now() }
      : k
  );
  saveLocalApiPool(next);
  try {
    await updateDoc(doc(db, 'api_keys', id), {
      usageCount: increment(1),
      quotaExhausted: false,
      lastUsedAt: Date.now(),
    });
  } catch {}
}

export async function recordKeyFailure(id: string, exhausted = false) {
  const pool = loadLocalApiPool();
  const next = pool.map((k) =>
    k.id === id
      ? {
          ...k,
          failCount: (k.failCount || 0) + 1,
          quotaExhausted: exhausted ? true : k.quotaExhausted,
          lastUsedAt: Date.now(),
        }
      : k
  );
  saveLocalApiPool(next);
  try {
    await updateDoc(doc(db, 'api_keys', id), {
      failCount: increment(1),
      ...(exhausted ? { quotaExhausted: true } : {}),
      lastUsedAt: Date.now(),
    });
  } catch {}
}

export function useApiKeyPool() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>(() => loadLocalApiPool());
  const [loading, setLoading] = useState(false);

  const syncFromFirestore = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'api_keys'));
      if (!snap.empty) {
        const remote = snap.docs.map((d) => normalizeEntry({ id: d.id, ...d.data() } as ApiKeyEntry));
        const map = new Map<string, ApiKeyEntry>();
        loadLocalApiPool().forEach((k) => map.set(k.id, k));
        remote.forEach((k) => {
          if (k && k.id && k.key && k.provider === 'imgbb') map.set(k.id, k);
        });
        const merged = Array.from(map.values()).sort((a, b) => (a.priority || 99) - (b.priority || 99));
        setKeys(merged);
        saveLocalApiPool(merged);
      } else {
        saveLocalApiPool(loadLocalApiPool());
      }
    } catch {
      saveLocalApiPool(loadLocalApiPool());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncFromFirestore();
    const handler = (e: Event) => {
      const custom = e as CustomEvent<ApiKeyEntry[]>;
      if (custom.detail) setKeys(custom.detail);
      else setKeys(loadLocalApiPool());
    };
    window.addEventListener('newaro:api_pool_updated', handler);
    return () => window.removeEventListener('newaro:api_pool_updated', handler);
  }, []);

  const addApiKey = async (entry: {
    provider: ApiProviderType;
    label: string;
    key: string;
    addedBy: string;
    addedByName?: string;
    addedByEmail?: string;
    priority?: number;
  }) => {
    const cleanKey = entry.key.trim();
    if (!cleanKey) return null;
    const id = `key_${entry.provider}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const existingForProvider = keys.filter((k) => k.provider === entry.provider);
    const newEntry: ApiKeyEntry = normalizeEntry({
      id,
      provider: entry.provider,
      label: entry.label.trim() || `${entry.provider.toUpperCase()} Key #${existingForProvider.length + 1}`,
      key: cleanKey,
      addedBy: entry.addedBy || 'user',
      addedByName: entry.addedByName || entry.addedByEmail || 'Member',
      addedByEmail: entry.addedByEmail || '',
      enabled: true,
      active: true,
      quotaExhausted: false,
      priority: entry.priority || existingForProvider.length + 1,
      failCount: 0,
      usageCount: 0,
      createdAt: Date.now(),
    });
    const next = [...keys, newEntry].sort((a, b) => (a.priority || 99) - (b.priority || 99));
    setKeys(next);
    saveLocalApiPool(next);
    try {
      await setDoc(doc(db, 'api_keys', id), newEntry);
    } catch {}
    return newEntry;
  };

  const updateApiKey = async (id: string, updates: Partial<ApiKeyEntry>) => {
    const next = keys
      .map((k) => (k.id === id ? normalizeEntry({ ...k, ...updates }) : k))
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));
    setKeys(next);
    saveLocalApiPool(next);
    try {
      const target = next.find((k) => k.id === id);
      if (target) {
        await setDoc(doc(db, 'api_keys', id), target, { merge: true });
      }
    } catch {}
  };

  const deleteApiKey = async (id: string) => {
    const next = keys.filter((k) => k.id !== id);
    setKeys(next);
    saveLocalApiPool(next);
    try {
      await deleteDoc(doc(db, 'api_keys', id));
    } catch {}
  };

  const toggleKey = async (id: string, explicitEnabled?: boolean) => {
    const target = keys.find((k) => k.id === id);
    if (!target) return;
    const nextState =
      explicitEnabled !== undefined
        ? explicitEnabled
        : !(target.active !== false && target.enabled !== false);
    await updateApiKey(id, { active: nextState, enabled: nextState, quotaExhausted: false });
  };

  const resetQuotaFlags = async (specificId?: string) => {
    const next = keys.map((k) =>
      !specificId || k.id === specificId
        ? normalizeEntry({ ...k, quotaExhausted: false, failCount: 0 })
        : k
    );
    setKeys(next);
    saveLocalApiPool(next);
  };

  return {
    keys,
    loading,
    addApiKey,
    addKey: addApiKey,
    updateApiKey,
    updateKey: updateApiKey,
    deleteApiKey,
    deleteKey: deleteApiKey,
    removeKey: deleteApiKey,
    toggleKeyActive: toggleKey,
    toggleKey,
    resetQuotaFlags,
    resetQuota: resetQuotaFlags,
    refreshPool: syncFromFirestore,
  };
}

export const useApiPool = useApiKeyPool;
