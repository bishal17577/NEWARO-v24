import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  Loader2,
  Check,
  Upload,
  Camera,
  Image as ImageIcon,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useCategories } from '../../lib/categories';
import { useToast } from '../../components/ui/Toast';
import { usePlatformConfig } from '../../lib/platformConfig';
import { uploadToImgBB } from '../../lib/imgbb';
import { getShopTheme, patternStyle } from '../../lib/shopThemes';

export const CreateShopPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, updateProfileData } = useAuth();
  const { categories, createCategory } = useCategories();
  const { config: platformConfig } = usePlatformConfig();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Fashion');
  const [ownerEmail, setOwnerEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState(profile?.city || 'Kathmandu');
  const [address, setAddress] = useState(profile?.address || '');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [autoRemoveLogoBg, setAutoRemoveLogoBg] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadToImgBB(file, {
        removeBackground: autoRemoveLogoBg,
      });
      setLogoUrl(res.url);
      addToast('Store logo uploaded!', 'success');
    } catch {
      addToast('Failed to upload logo image', 'error');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const res = await uploadToImgBB(file);
      setCoverUrl(res.url);
      addToast('Store banner uploaded!', 'success');
    } catch {
      addToast('Failed to upload banner image', 'error');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('Please sign in to open a storefront', 'info');
      navigate('/auth');
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      addToast('Store name, phone, and address are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cleanCategory = category.trim() || 'Fashion';
      createCategory(cleanCategory);
      // Every shop from a seller waits for admin approval
      const autoApprove = isAdmin;

      const newShop = {
        ownerId: user.uid,
        ownerName: profile?.displayName || user.email?.split('@')[0] || 'Store Owner',
        ownerEmail: (ownerEmail.trim() || user.email || '').toLowerCase(),
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: description.trim() || `Welcome to ${name.trim()} on NEWARO!`,
        category: cleanCategory,
        logoUrl: logoUrl || '',
        coverUrl: coverUrl || '',
        phone: phone.trim(),
        whatsapp: phone.trim(),
        city: city.trim() || 'Kathmandu',
        address: `${address.trim()}, ${city.trim() || 'Kathmandu'}`,
        rating: 5.0,
        reviewCount: 1,
        followersCount: 1,
        createdAt: Date.now(),
        verified: autoApprove,
        status: autoApprove ? 'approved' : 'pending',
        approved: autoApprove,
      };

      const docRef = await addDoc(collection(db, 'shops'), newShop);
      await updateProfileData({
        isSeller: true,
        role: isAdmin ? 'admin' : 'shop_owner',
      }).catch(() => {});

      addToast('Storefront created successfully!', 'success');
      navigate(`/shop-dashboard?shopId=${docRef.id}`);
    } catch {
      addToast('Failed to create store', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-12">
      <div className="flex items-center gap-2.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <Link to="/shops" className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <Store className="w-5 h-5 text-blue-600 shrink-0" />
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">Open Storefront</h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="h-32 sm:h-44 bg-gradient-to-r from-slate-800 to-slate-900 relative">
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>Cover Banner Preview</span>
            </div>
          )}
          <div className="absolute -bottom-6 left-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-black text-xl">
                  {name ? name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-8 px-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {name || 'Your Store Name'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{category}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{city || 'Kathmandu'}</span>
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
            Pending Admin Approval
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-5">
        <div className="space-y-4 pb-2 border-b border-slate-100">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Store Branding (Upload Photo Files)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Store Logo</span>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="text-[10px] text-rose-600 font-bold hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                      </>
                    )}
                  </button>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={autoRemoveLogoBg}
                      onChange={(e) => setAutoRemoveLogoBg(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                    <span>Auto Remove Background (remove.bg)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Cover Banner</span>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    className="text-[10px] text-rose-600 font-bold hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    ref={coverInputRef}
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {uploadingCover ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>Upload Banner</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1">Recommended: 1200 x 400px</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Store Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kathmandu Tech Hub"
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-hidden cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {(() => {
              const th = getShopTheme(category);
              const Icon = th.icon;
              return (
                <div
                  className="relative mt-2 h-14 rounded-xl overflow-hidden flex items-center gap-2.5 px-3"
                  style={{ background: th.hero }}
                  aria-label={`Store look: ${th.label}`}
                >
                  <div aria-hidden className="absolute inset-0" style={patternStyle(th)} />
                  <span className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: th.accent, color: th.onAccent }}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className={`relative text-xs leading-tight ${th.heroDark ? 'text-white' : 'text-slate-900'}`}>
                    <b>{th.label} look</b>
                    <br />
                    <span className="opacity-80">{th.tagline}</span>
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone / WhatsApp *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+977 9800000000"
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Kathmandu"
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Street Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. New Road, Pako"
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description & Bio</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell customers about your products, warranty policies, and specialty..."
            className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Create & Launch Storefront</span>
        </button>
      </form>
    </div>
  );
};
