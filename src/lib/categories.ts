import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, limit } from 'firebase/firestore';
import { db } from './firebase';

const DEFAULT_CATEGORIES = [
  'Fashion & Clothing',
  'Electronics & Computers',
  'Phones & Accessories',
  'Home & Living',
  'Beauty & Personal Care',
  'Flowers & Gifts',
  'Food & Bakery',
  'Groceries & Daily Needs',
  'Health & Wellness',
  'Sports & Outdoors',
  'Toys & Baby Products',
  'Books & Stationery',
  'Jewellery & Watches',
  'Furniture & Decor',
  'Automotive & Tools',
  'Handmade & Handicrafts',
  'Art & Collectibles',
  'Pets & Pet Supplies',
  'Services & Repairs',
  'Freelance & Gigs',
  'Events & Experiences',
];

const STORAGE_KEY = 'newaro_custom_categories_v2';

export function getStoredCategories(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set(parsed));
      }
    }
  } catch {}
  return [...DEFAULT_CATEGORIES];
}

export function addCustomCategoryToStorage(newCat: string): string[] {
  const clean = newCat.trim();
  if (!clean || clean.toLowerCase() === 'all') return getStoredCategories();
  const current = getStoredCategories();
  const exists = current.some((c) => c.toLowerCase() === clean.toLowerCase());
  if (exists) return current;
  const updated = [...current, clean];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('newaro:categories_updated', { detail: updated }));
    }, 0);
  } catch {}
  addDoc(collection(db, 'categories'), {
    name: clean,
    createdAt: Date.now(),
  }).catch(() => {});
  return updated;
}

export function removeCustomCategoryFromStorage(catToRemove: string): string[] {
  const current = getStoredCategories();
  const updated = current.filter((c) => c.toLowerCase() !== catToRemove.toLowerCase());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('newaro:categories_updated', { detail: updated }));
    }, 0);
  } catch {}
  return updated;
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(() => getStoredCategories());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent<string[]>;
      if (customEv.detail) {
        setCategories(customEv.detail);
      } else {
        setCategories(getStoredCategories());
      }
    };
    window.addEventListener('newaro:categories_updated', handleUpdate);
    getDocs(query(collection(db, 'categories'), limit(30)))
      .then((snap) => {
        if (!snap.empty) {
          const remoteNames = snap.docs
            .map((d) => d.data().name)
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
          if (remoteNames.length > 0) {
            const merged = Array.from(new Set([...getStoredCategories(), ...remoteNames]));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            setCategories(merged);
          }
        }
      })
      .catch(() => {});
    return () => window.removeEventListener('newaro:categories_updated', handleUpdate);
  }, []);

  const createCategory = (name: string) => {
    const next = addCustomCategoryToStorage(name);
    setCategories(next);
  };

  const deleteCategory = (name: string) => {
    const next = removeCustomCategoryFromStorage(name);
    setCategories(next);
  };

  return {
    categories,
    allCategoriesWithAll: ['All', ...categories],
    createCategory,
    deleteCategory,
  };
}
