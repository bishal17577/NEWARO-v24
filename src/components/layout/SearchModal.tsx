import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Store, Package, Loader2, Briefcase, Camera, AppWindow, Bus } from 'lucide-react';
import { useUIStore } from '../../lib/store';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { compressImage } from '../../lib/imgbb';
import { Product, Shop, JobItem } from '../../types';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setSearchOpen } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [busTrips, setBusTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const photoModeRef = useRef(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState('');
  const [photoError, setPhotoError] = useState('');

  const handlePhoto = async (file?: File | null) => {
    if (!file) return;
    setPhotoError('');
    setPhotoNote('');
    photoModeRef.current = true;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.');
      return;
    }
    if (!auth.currentUser) {
      setPhotoError('Please sign in to use Find by Photo.');
      return;
    }
    setPhotoBusy(true);
    try {
      const small = await compressImage(file, 800, 0.8);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(small);
      });
      const snap = await getDocs(query(collection(db, 'products'), limit(120)));
      const catalog = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/ai/find-by-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          image: dataUrl,
          catalog: catalog.map((p) => ({ id: p.id, name: p.name, category: p.category, shopName: p.shopName, description: p.description })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setPhotoError(data?.error || 'Photo search failed. Please try again.');
        return;
      }
      const matched = (data.matchedIds as string[]).map((id) => catalog.find((p) => p.id === id)).filter(Boolean) as Product[];
      setSearchTerm('');
      setProducts(matched);
      setShops([]);
      setJobs([]);
      setApps([]);
      setBusTrips([]);
      setPhotoNote(
        matched.length
          ? `Looks like: ${data.item || 'an item'}. ${data.description || ''}`
          : `Looks like: ${data.item || 'an item'}. No matching listing on NEWARO yet.`
      );
    } catch (err: any) {
      setPhotoError(err?.message || 'Photo search failed. Please try again.');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      if (!photoModeRef.current) {
        setProducts([]);
        setShops([]);
        setJobs([]);
        setApps([]);
        setBusTrips([]);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const lower = searchTerm.toLowerCase();
        let allProds: Product[] = [];
        let allShops: Shop[] = [];
        let allJobs: JobItem[] = [];
        let allApps: any[] = [];
        let allBusTrips: any[] = [];

        try {
          const pSnap = await getDocs(query(collection(db, 'products'), limit(30)));
          if (!pSnap.empty) {
            allProds = pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
          }
          const sSnap = await getDocs(query(collection(db, 'shops'), where('status', '==', 'approved'), limit(30)));
          if (!sSnap.empty) {
            allShops = sSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
          }
          const jSnap = await getDocs(query(collection(db, 'jobs'), limit(20)));
          if (!jSnap.empty) allJobs = jSnap.docs.map((d) => ({ id: d.id, ...d.data() } as JobItem));
          const aSnap = await getDocs(query(collection(db, 'apps'), where('status', '==', 'published'), limit(30)));
          allApps = aSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const bSnap = await getDocs(query(collection(db, 'bus_trips'), limit(30)));
          allBusTrips = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {}

        const matchedProducts = allProds.filter(
          (p) =>
            (p.name || '').toLowerCase().includes(lower) ||
            (p.category || '').toLowerCase().includes(lower) ||
            p.description?.toLowerCase().includes(lower)
        );

        const matchedShops = allShops.filter(
          (s) =>
            (s.name || '').toLowerCase().includes(lower) ||
            s.category?.toLowerCase().includes(lower) ||
            s.address?.toLowerCase().includes(lower)
        );

        const matchedJobs = allJobs.filter(
          (j) =>
            (j.title || '').toLowerCase().includes(lower) ||
            (j.companyOrClient || '').toLowerCase().includes(lower) ||
            (j.skills && (j.skills || []).some((sk) => sk.toLowerCase().includes(lower)))
        );

        setProducts(matchedProducts.slice(0, 6));
        setShops(matchedShops.slice(0, 4));
        setJobs(matchedJobs.slice(0, 4));
        setApps(allApps.filter((a) => `${a.name || ''} ${a.description || ''} ${a.category || ''}`.toLowerCase().includes(lower)).slice(0, 4));
        setBusTrips(allBusTrips.filter((b) => `${b.busNumber || ''} ${b.route || ''} ${b.driverName || ''} ${b.status || ''}`.toLowerCase().includes(lower)).slice(0, 4));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 md:p-20 bg-slate-900/40 backdrop-blur-xs flex justify-center items-start">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center gap-2.5">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              photoModeRef.current = false;
              setPhotoNote('');
              setSearchTerm(e.target.value);
            }}
            placeholder="Search products, shops, jobs, apps, buses..."
            autoFocus
            className="flex-1 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 outline-hidden bg-transparent"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhoto(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            title="Find by photo"
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {photoBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          </button>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setSearchOpen(false)}
            className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 divide-y divide-slate-100">
          {loading && (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">Searching marketplace & gigs...</p>
            </div>
          )}

          {photoError && <div className="py-2 text-xs text-rose-600">{photoError}</div>}
          {photoNote && <div className="py-2 text-xs text-slate-600">{photoNote}</div>}

          {!loading && !searchTerm && products.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs sm:text-sm">
              Type keywords, or tap the camera to find items from a photo.
            </div>
          )}

          {!loading && searchTerm && products.length === 0 && shops.length === 0 && jobs.length === 0 && apps.length === 0 && busTrips.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">No results found for &ldquo;{searchTerm}&rdquo;</p>
            </div>
          )}

          {shops.length > 0 && (
            <div className="py-3 first:pt-0">
              <p className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-600" /> Stores ({shops.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(`/shops/${shop.id}`);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50/60 cursor-pointer border border-transparent hover:border-blue-100 transition-all"
                  >
                    <img
                      src={shop.logoUrl || ''}
                      alt={shop.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{shop.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{shop.category} · {shop.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div className="py-3">
              <p className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-rose-600" /> Products ({products.length})
              </p>
              <div className="space-y-1.5">
                {products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(`/products/${p.id}`);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.images?.[0] || ''}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-contain bg-slate-100 p-1 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{p.name}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{p.shopName || p.category}</p>
                      </div>
                    </div>
                    <div className="text-right pl-3 shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-rose-600 tabular-nums">Rs. {(p.price || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {jobs.length > 0 && (
            <div className="py-3">
              <p className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" /> Gigs & Jobs ({jobs.length})
              </p>
              <div className="space-y-1.5">
                {jobs.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => {
                      setSearchOpen(false);
                      navigate('/jobs');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">{j.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{j.companyOrClient} · {j.location}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 tabular-nums shrink-0">
                      {j.salaryOrBudget || 'Negotiable'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {apps.length > 0 && (
            <div className="py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400"><AppWindow className="h-3.5 w-3.5 text-indigo-600"/> Apps & Tools ({apps.length})</p>
              {apps.map((app) => <button key={app.id} onClick={() => { setSearchOpen(false); navigate('/apps'); }} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-indigo-50"><AppWindow className="h-5 w-5 text-indigo-600"/><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{app.name}</span><span className="block truncate text-xs text-slate-500">{app.category || 'App'} · {app.description || ''}</span></span></button>)}
            </div>
          )}
          {busTrips.length > 0 && (
            <div className="py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400"><Bus className="h-3.5 w-3.5 text-sky-600"/> Buses & Booking ({busTrips.length})</p>
              {busTrips.map((trip) => <button key={trip.id} onClick={() => { setSearchOpen(false); navigate('/booking'); }} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-sky-50"><Bus className="h-5 w-5 text-sky-600"/><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">Bus {trip.busNumber || '—'} · {trip.status || 'status unavailable'}</span><span className="block truncate text-xs text-slate-500">{trip.route || 'Route not listed'} · {trip.driverName || 'Driver not listed'}</span></span></button>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
