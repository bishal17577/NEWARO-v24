import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useCartStore } from './store';

let stopStoreSync: (() => void) | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

export function stopCartSync() {
  if (stopStoreSync) stopStoreSync();
  stopStoreSync = null;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
}

// Keeps the cart on the signed-in account, so it follows the user to any device.
export function startCartSync(uid: string | null) {
  stopCartSync();
  if (!uid) return;

  const save = (items: unknown[]) => {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      // Firestore rejects undefined values, so remove them first
      const clean = JSON.parse(JSON.stringify(items));
      setDoc(doc(db, 'carts', uid), { items: clean, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }, 800);
  };

  stopStoreSync = useCartStore.subscribe((state) => save(state.items));

  const load = async () => {
    try {
      const snap = await getDoc(doc(db, 'carts', uid));
      const remote: any[] = snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : [];
      const merged = [...useCartStore.getState().items];
      remote.forEach((item) => {
        if (item && item.productId && !merged.some((l) => l.productId === item.productId)) {
          merged.push(item);
        }
      });
      useCartStore.setState({ items: merged });
    } catch (err) {
      console.warn('Cart could not be loaded from your account:', err);
    }
  };
  load();
}
