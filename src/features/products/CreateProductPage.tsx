import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Package,
  Loader2,
  ArrowLeft,
  Store,
  Plus,
  Sparkles,
  Wand2,
  X,
  Upload,
} from 'lucide-react';
import { collection, query, where, addDoc, limit } from 'firebase/firestore';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useCategories } from '../../lib/categories';
import { useToast } from '../../components/ui/Toast';
import { uploadToImgBB } from '../../lib/imgbb';
import { removeImageBackground } from '../../lib/backgroundRemover';
import { Shop } from '../../types';

export const CreateProductPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const prefillShopId = searchParams.get('shopId');
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { categories } = useCategories();
  const { addToast } = useToast();

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState(prefillShopId || '');
  const [loadingShops, setLoadingShops] = useState(true);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fashion');
  const [price, setPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [processingBgIdx, setProcessingBgIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUserShops();
  }, [user?.uid, user?.email, isAdmin]);

  const fetchUserShops = async () => {
    setLoadingShops(true);
    try {
      let list: Shop[] = [];
      if (user) {
        if (isAdmin) {
          const snap = await getDocsWithTimeout(query(collection(db, 'shops'), limit(100)), 5000);
          list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
        } else {
          const snap1 = await getDocsWithTimeout(
            query(collection(db, 'shops'), where('ownerId', '==', user.uid)),
            4000
          );
          list = snap1.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));

          if (user.email) {
            const snap2 = await getDocsWithTimeout(
              query(collection(db, 'shops'), where('ownerEmail', '==', (user.email || '').toLowerCase())),
              4000
            ).catch(() => null);
            if (snap2 && !snap2.empty) {
              const byEmail = snap2.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
              const existingIds = new Set(list.map((s) => s.id));
              for (const s of byEmail) {
                if (!existingIds.has(s.id)) list.push(s);
              }
            }
          }
        }
      }

      if (list.length === 0) {
        const publicSnap = await getDocsWithTimeout(
          query(collection(db, 'shops'), limit(20)),
          4000
        ).catch(() => null);
        if (publicSnap && !publicSnap.empty) {
          list = publicSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
        }
      }

      setShops(list);
      if (prefillShopId && list.some((s) => s.id === prefillShopId)) {
        setSelectedShopId(prefillShopId);
      } else if (!selectedShopId && list.length > 0) {
        setSelectedShopId(list[0].id);
      }
    } finally {
      setLoadingShops(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (autoRemoveBg) {
          addToast(`Removing background automatically via remove.bg...`, 'info');
        }
        const res = await uploadToImgBB(file, undefined, {
          removeBackground: autoRemoveBg,
        });
        setImages((prev) => [...prev, res.url]);
        if (res.bgRemoved) {
          addToast(`Product image background removed cleanly!`, 'success');
        } else {
          addToast(`Product image uploaded`, 'success');
        }
      }
    } catch {
      addToast('Failed to process image upload', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleManualRemoveBg = async (idx: number) => {
    const targetUrl = images[idx];
    if (!targetUrl || processingBgIdx !== null) return;
    setProcessingBgIdx(idx);
    addToast('Applying remove.bg AI background removal...', 'info');
    try {
      const res = await removeImageBackground(targetUrl);
      if (res.success && res.resultUrl) {
        const imgbbRes = await uploadToImgBB(res.resultUrl);
        setImages((prev) => prev.map((img, i) => (i === idx ? imgbbRes.url : img)));
        addToast('Background removed successfully!', 'success');
      } else {
        addToast(res.error || 'Could not remove background', 'error');
      }
    } catch {
      addToast('Background removal failed', 'error');
    } finally {
      setProcessingBgIdx(null);
    }
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('Please sign in first', 'info');
      navigate('/auth');
      return;
    }

    if (!selectedShopId) {
      addToast('Please select or create a storefront first', 'error');
      return;
    }

    if (!name.trim() || !price || Number(price) <= 0) {
      addToast('Provide a product title and valid price in NPR', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const currentShop = shops.find((s) => s.id === selectedShopId) || shops[0];
      const productData = {
        shopId: selectedShopId,
        shopName: currentShop?.name || 'NEWARO Verified Store',
        shopLogo: currentShop?.logoUrl || '',
        sellerId: user.uid,
        sellerEmail: user.email || '',
        name: name.trim(),
        description: description.trim() || 'Verified quality item listed on NEWARO marketplace.',
        price: Number(price),
        stock: Number(stock) || 1,
        category: category || currentShop?.category || 'Fashion',
        images:
          images.length > 0
            ? images
            : [],
        featured: false,
        rating: 5.0,
        reviewCount: 0,
        ordersCount: 0,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'products'), productData);
      addToast('Product published to storefront!', 'success');
      navigate(`/products/${docRef.id}`);
    } catch {
      addToast('Failed to list product in database', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-2.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <Link to="/shops" className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">List Product</h1>
          <p className="text-xs text-slate-500">Publish item to your store catalog with AI background removal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Storefront *</label>
            <Link
              to="/create-shop"
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Storefront</span>
            </Link>
          </div>
          {loadingShops ? (
            <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading storefronts...</span>
            </div>
          ) : shops.length > 0 ? (
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              required
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-blue-500 transition-all font-medium text-slate-800"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category || 'General'})
                </option>
              ))}
            </select>
          ) : (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2">
              <Store className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs font-bold text-amber-900">No Storefront Found</p>
              <p className="text-[11px] text-amber-700">
                You must have an open storefront before publishing products.
              </p>
              <Link
                to="/create-shop"
                className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Open Storefront First
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Product Title *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acer Aspire 5 Laptop or Handmade Pashmina Shawl"
            className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-blue-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-blue-500 transition-all"
            >
              {(categories.length > 0
                ? categories
                : ['Electronics', 'Fashion', 'Handicrafts', 'Food & Bakery', 'Beauty & Health', 'Home & Living', 'Art & Books', 'Others']
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Stock Quantity *</label>
            <input
              type="number"
              min="1"
              required
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Price (NPR) *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
              NPR
            </span>
            <input
              type="number"
              required
              min="10"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="62999"
              className="w-full text-xs sm:text-sm pl-13 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specs, material, warranty, sizing, or Cash on Delivery terms..."
            className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-blue-500 transition-all resize-none"
          />
        </div>

        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 rounded-2xl border border-blue-200/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>Automatic Background Removal</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    remove.bg AI
                  </span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Clean product cutouts on upload without studio backgrounds
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRemoveBg}
                onChange={(e) => setAutoRemoveBg(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Product Images</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 py-3 px-4 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <Upload className="w-4 h-4 text-blue-600" />
                )}
                <span>
                  {uploadingImage
                    ? autoRemoveBg
                      ? 'Removing background & uploading...'
                      : 'Uploading image...'
                    : 'Select product photos'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl border border-slate-200 overflow-hidden group bg-slate-50 flex items-center justify-center p-1"
                  >
                    <img
                      src={img}
                      alt={`Product preview ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors"
                      title="Remove Image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleManualRemoveBg(idx)}
                      disabled={processingBgIdx === idx}
                      className="absolute bottom-1.5 left-1.5 right-1.5 py-1 px-1.5 bg-black/75 hover:bg-blue-600 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 opacity-90 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Remove Background with remove.bg AI"
                    >
                      {processingBgIdx === idx ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3 text-amber-300" />
                      )}
                      <span>Remove BG</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || (shops.length === 0 && !loadingShops)}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-sm text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing to Storefront...</span>
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              <span>Publish Product to Store</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
