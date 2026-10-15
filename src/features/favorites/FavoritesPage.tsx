import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight, Trash2, Store } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';

interface FavoriteItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  shopName: string;
  shopId: string;
}


export const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('newaro_saved_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { addItem } = useCartStore();
  const { addToast } = useToast();

  const handleRemove = (id: string, name: string) => {
    const next = favorites.filter((item) => item.id !== id);
    setFavorites(next);
    localStorage.setItem('newaro_saved_favorites', JSON.stringify(next));
    playUiSound('pop');
    addToast(`Removed "${name}" from saved items`, 'info');
  };

  const handleAddToCart = (item: FavoriteItem) => {
    addItem({
      productId: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
      shopId: item.shopId,
      shopName: item.shopName,
      stock: 15,
    });
    playUiSound('success');
    addToast(`Added "${item.name}" to cart!`, 'success');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" /> Saved Items
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Your wishlist of authentic products from verified stores across Nepal.
          </p>
        </div>

        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-xl transition-colors shadow-xs"
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Continue Shopping
        </Link>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-8 space-y-3">
          <Heart className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Wishlist is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Bookmark items while browsing the feed or explore page to save them for later!
          </p>
          <Link
            to="/explore"
            className="inline-block mt-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {favorites.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemove(item.id, item.name)}
                    className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors shadow-xs"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                    <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{item.shopName}</span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {item.name}
                  </h3>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      Rs. {(item.price || 0).toLocaleString()}
                    </span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-[11px] text-slate-400 line-through">
                        Rs. {(item.originalPrice || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() => handleAddToCart(item)}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart (COD)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
