import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Package,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { useCartStore } from '../../lib/store';
import { useCategories } from '../../lib/categories';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { Product } from '../../types';
import { ProductSkeleton } from '../../components/ui/Skeletons';

export const ExplorePage: React.FC = () => {
  const { addItem } = useCartStore();
  const { allCategoriesWithAll } = useCategories();
  const { addToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchExploreData();
  }, []);

  const fetchExploreData = async () => {
    setLoading(true);
    try {
      const prRes = await getDocsWithTimeout(
        query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(60)),
        4000
      ).catch(() => null);

      if (prRes && !prRes.empty) {
        setProducts(prRes.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } else {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchQ =
      !searchQuery.trim() ||
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shopName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-extrabold text-slate-900">Explore Catalog</h1>
            <p className="text-xs text-slate-500">Discover trending electronics, fashion, food, and verified storefronts in Nepal</p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products or stores..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-hidden focus:bg-white focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {allCategoriesWithAll.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold shrink-0 transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ProductSkeleton count={8} />
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 space-y-2">
          <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No products match your filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-3 flex flex-col justify-between group hover:border-blue-300 transition-all shadow-2xs"
            >
              <Link to={`/products/${prod.id}`}>
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2.5 flex items-center justify-center p-2">
                  {prod.images?.[0] ? (
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      loading="lazy"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">{prod.name}</h3>
                <p className="text-xs sm:text-sm font-extrabold text-rose-600 mt-1 tabular-nums">
                  Rs. {(prod.price || 0).toLocaleString()}
                </p>
              </Link>
              <button
                onClick={() => {
                  playUiSound('success');
                  addItem({
                    productId: prod.id,
                    shopId: prod.shopId,
                    shopName: prod.shopName,
                    name: prod.name,
                    price: prod.price,
                    image: prod.images?.[0] || '',
                    stock: prod.stock,
                  });
                  addToast(`Added ${prod.name} to cart`, 'success');
                }}
                className="mt-2.5 w-full py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
