import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === newItem.productId);
          const addQty = newItem.quantity || 1;
          if (existing) {
            const updatedItems = state.items.map((item) =>
              item.productId === newItem.productId
                ? { ...item, quantity: Math.min(item.quantity + addQty, item.stock || 99) }
                : item
            );
            return { items: updatedItems, isCartOpen: true };
          }
          return {
            items: [...state.items, { ...newItem, quantity: addQty }],
            isCartOpen: true,
          };
        });
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stock || 99) } : i
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'newaro-cart-storage',
    }
  )
);

interface UIState {
  isAiModalOpen: boolean;
  openAiModal: (prefillPrompt?: string) => void;
  closeAiModal: () => void;
  aiPrefillPrompt: string;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  activeSearchQuery: string;
  setActiveSearchQuery: (q: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAiModalOpen: false,
  aiPrefillPrompt: '',
  openAiModal: (prefill = '') => set({ isAiModalOpen: true, aiPrefillPrompt: prefill }),
  closeAiModal: () => set({ isAiModalOpen: false, aiPrefillPrompt: '' }),
  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  activeSearchQuery: '',
  setActiveSearchQuery: (q) => set({ activeSearchQuery: q }),
}));
