import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  MessageSquare,
  ArrowLeft,
  Truck,
  ShieldCheck,
  CheckCircle,
  Star,
  Share2,
  Heart,
  RotateCcw,
  Clock,
  MapPin,
  ChevronRight,
  Maximize2,
  Sparkles,
  Send,
  Check,
  CreditCard,
  Flame,
  HelpCircle,
  ThumbsUp,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Plus,
} from 'lucide-react';
import {
  doc,
  collection,
  query,
  where,
  limit,
  addDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db, getDocWithTimeout, getDocsWithTimeout } from '../../lib/firebase';
import { Product, ProductReview } from '../../types';
import { useCartStore } from '../../lib/store';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { ProductDetailSkeleton } from '../../components/ui/Skeletons';

// Extended Nepal shipping coverage across key logistics hubs
interface ShippingDistrict {
  city: string;
  province: string;
  days: string;
  fee: number;
  expressAvailable: boolean;
}

const NEPAL_SHIPPING_DISTRICTS: ShippingDistrict[] = [
  { city: 'Kathmandu Valley', province: 'Bagmati', days: 'Same-day or Next-day (within 24 hrs)', fee: 100, expressAvailable: true },
  { city: 'Lalitpur (Patan)', province: 'Bagmati', days: '24 Hours Delivery', fee: 100, expressAvailable: true },
  { city: 'Bhaktapur', province: 'Bagmati', days: '24 - 48 Hours', fee: 100, expressAvailable: true },
  { city: 'Pokhara (Lakeside/New Road)', province: 'Gandaki', days: '2 - 3 Business Days', fee: 150, expressAvailable: true },
  { city: 'Chitwan / Narayangarh', province: 'Bagmati', days: '2 - 3 Business Days', fee: 150, expressAvailable: false },
  { city: 'Butwal / Bhairahawa', province: 'Lumbini', days: '3 - 4 Business Days', fee: 180, expressAvailable: false },
  { city: 'Biratnagar / Dharan', province: 'Koshi', days: '3 - 4 Business Days', fee: 200, expressAvailable: false },
  { city: 'Nepalgunj', province: 'Lumbini', days: '4 - 5 Business Days', fee: 220, expressAvailable: false },
  { city: 'Dhangadhi', province: 'Sudurpashchim', days: '4 - 5 Business Days', fee: 250, expressAvailable: false },
  { city: 'Janakpur', province: 'Madhesh', days: '3 - 4 Business Days', fee: 200, expressAvailable: false },
  { city: 'Hetauda', province: 'Bagmati', days: '2 - 3 Business Days', fee: 160, expressAvailable: false },
];

// Product Color / Finish Variants
const COLOR_VARIANTS = [
  { id: 'space-gray', name: 'Space Gray', hex: '#4B5563', inStock: true },
  { id: 'alpine-silver', name: 'Alpine Silver', hex: '#E2E8F0', inStock: true },
  { id: 'midnight-black', name: 'Midnight Black', hex: '#0F172A', inStock: true },
  { id: 'royal-navy', name: 'Royal Navy', hex: '#1E3A8A', inStock: false },
];

// Spec/Size Tiers
const SPEC_OPTIONS = [
  { label: 'Standard Edition', priceDelta: 0, desc: 'Base configuration with official accessories' },
  { label: 'Pro Bundle (+NPR 2,500)', priceDelta: 2500, desc: 'Includes extended 1-yr warranty & carry bag' },
  { label: 'Ultimate Kit (+NPR 4,800)', priceDelta: 4800, desc: 'Includes fast charger, sleeve & screen protector' },
];

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addItem } = useCartStore();
  const { addToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedCity, setSelectedCity] = useState(NEPAL_SHIPPING_DISTRICTS[0].city);
  const [selectedColor, setSelectedColor] = useState(COLOR_VARIANTS[0]);
  const [selectedSpec, setSelectedSpec] = useState(SPEC_OPTIONS[0]);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'warranty' | 'qa' | 'reviews'>('details');
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Optical Zoom lens state
  const [zoomStyle, setZoomStyle] = useState({ display: 'none', backgroundPosition: '0% 0%' });
  const [is360Active, setIs360Active] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);

  // EMI Calculator toggle
  const [showEmiCalculator, setShowEmiCalculator] = useState(false);
  const [emiTenure, setEmiTenure] = useState<6 | 12 | 18>(6);

  // Bundle Add-on toggles
  const [includeAccessoryA, setIncludeAccessoryA] = useState(true);
  const [includeAccessoryB, setIncludeAccessoryB] = useState(false);

  // Reviews & Rating Filter
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4' | 'verified'>('all');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});

  // Instant Q&A state
  const [questions, setQuestions] = useState([
    {
      id: 'q-1',
      question: 'Is Cash on Delivery really available outside Kathmandu Valley?',
      answer: 'Yes! We ship via Kathmandu Express & Nepal Post Courier with 100% Cash on Delivery across all 77 districts.',
      author: 'Aakash M.',
      date: '2 weeks ago',
    },
    {
      id: 'q-2',
      question: 'Does this come with authentic manufacturer warranty in Nepal?',
      answer: 'Yes, includes 1-Year official store warranty with local replacement within 7 days if defective.',
      author: 'Prajwol S.',
      date: '1 month ago',
    },
  ]);
  const [newQuestion, setNewQuestion] = useState('');
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (productId) {
      fetchProductData(productId);
    }
  }, [productId]);

  const fetchProductData = async (id: string) => {
    setLoading(true);
    try {
      let prodData: Product | null = null;
      const snap = await getDocWithTimeout(doc(db, 'products', id), 4000).catch(() => null);
      if (snap && snap.exists()) {
        prodData = { id: snap.id, ...snap.data() } as Product;
      }

      if (prodData) {
        setProduct(prodData);

        // Load related products
        const relSnap = await getDocsWithTimeout(
          query(collection(db, 'products'), where('category', '==', prodData.category), limit(6)),
          3000
        ).catch(() => null);

        if (relSnap && !relSnap.empty) {
          setRelatedProducts(
            relSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as Product))
              .filter((p) => p.id !== prodData?.id)
          );
        } else {
          setRelatedProducts([]);
        }

        // Load reviews
        const revSnap = await getDocsWithTimeout(
          query(collection(db, 'products', id, 'reviews'), limit(15)),
          3000
        ).catch(() => null);

        if (revSnap && !revSnap.empty) {
          setReviews(revSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductReview)));
        } else {
          setReviews([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Optical Magnifier Mouse Movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundPosition: `${x}% ${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none', backgroundPosition: '0% 0%' });
  };

  const effectivePrice = (product?.price || 0) + selectedSpec.priceDelta;
  const currentShipping =
    NEPAL_SHIPPING_DISTRICTS.find((c) => c.city === selectedCity) || NEPAL_SHIPPING_DISTRICTS[0];

  const discountPercent =
    product?.originalPrice && product.originalPrice > effectivePrice
      ? Math.round(((product.originalPrice - effectivePrice) / product.originalPrice) * 100)
      : null;

  const emiMonthly = Math.round(effectivePrice / emiTenure);

  const handleAddToCart = () => {
    if (!product) return;
    playUiSound('success');
    addItem({
      productId: product.id,
      shopId: product.shopId,
      shopName: product.shopName,
      name: `${product.name} (${selectedColor.name}, ${selectedSpec.label})`,
      price: effectivePrice,
      image: product.images?.[activeImageIdx] || product.images?.[0] || '',
      quantity,
      stock: product.stock,
    });
    addToast(`Added ${quantity}x "${product.name}" to cart!`, 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const handleAddBundleToCart = () => {
    if (!product) return;
    playUiSound('success');
    addItem({
      productId: product.id,
      shopId: product.shopId,
      shopName: product.shopName,
      name: `${product.name} (Special Bundle Package)`,
      price: effectivePrice + (includeAccessoryA ? 1200 : 0) + (includeAccessoryB ? 1800 : 0),
      image: product.images?.[0] || '',
      quantity: 1,
      stock: product.stock,
    });
    addToast('Special Value Bundle added to your bag!', 'success');
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product?.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      addToast('Product link copied to clipboard!', 'success');
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('Please sign in to write a verified review', 'info');
      navigate('/auth');
      return;
    }
    if (!reviewComment.trim()) return;

    setSubmittingReview(true);
    playUiSound('success');
    try {
      const newRev: ProductReview = {
        id: `rev_${Date.now()}`,
        productId: product?.id || '',
        authorId: user.uid,
        authorName: profile?.displayName || user.email?.split('@')[0] || 'Customer',
        authorAvatar: profile?.photoURL || '',
        rating: reviewRating,
        comment: reviewComment.trim(),
        verifiedPurchase: true,
        createdAt: Date.now(),
      };
      setReviews([newRev, ...reviews]);
      setReviewComment('');
      if (product) {
        addDoc(collection(db, 'products', product.id, 'reviews'), newRev).catch(() => {});
        updateDoc(doc(db, 'products', product.id), {
          reviewCount: increment(1),
        }).catch(() => {});
      }
      addToast('Thank you! Your verified review has been posted.', 'success');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleVoteHelpful = (id: string) => {
    playUiSound('pop');
    setHelpfulVotes((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    addToast('Feedback recorded!', 'info');
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    playUiSound('success');
    setQuestions([
      {
        id: `q_${Date.now()}`,
        question: newQuestion.trim(),
        answer: 'Store owner notified! Verified answer will appear shortly.',
        author: profile?.displayName || 'Buyer',
        date: 'Just now',
      },
      ...questions,
    ]);
    setNewQuestion('');
    addToast('Your question has been sent to the store owner!', 'success');
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (reviewFilter === '5') return r.rating === 5;
      if (reviewFilter === '4') return r.rating === 4;
      if (reviewFilter === 'verified') return r.verifiedPurchase;
      return true;
    });
  }, [reviews, reviewFilter]);

  if (loading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200/90 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Product Not Found</h2>
        <p className="text-xs text-slate-500">The product you are looking for may have been sold or removed.</p>
        <Link
          to="/explore"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  const activeImg =
    product.images?.[activeImageIdx] ||
    product.images?.[0] ||
    '';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-24">
      {/* 1. BREADCRUMBS & TOP BAR */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Link to="/" className="hover:text-blue-600 shrink-0">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <Link to="/explore" className="hover:text-blue-600 shrink-0">Catalog</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-blue-600 font-bold shrink-0">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-900 font-bold truncate max-w-[140px] sm:max-w-[240px]">{product.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Share Product"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              playUiSound('pop');
              setIsFavorited(!isFavorited);
              addToast(isFavorited ? 'Removed from wishlist' : 'Saved to wishlist!', 'success');
            }}
            className={`p-2 rounded-xl bg-white border border-slate-200 transition-colors cursor-pointer ${
              isFavorited ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-slate-600 hover:text-rose-600'
            }`}
            title="Add to Wishlist"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-600' : ''}`} />
          </button>
        </div>
      </nav>

      {/* 2. ADVANCED PRODUCT SHOWCASE DUAL-PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN: HIGH-AESTHETIC MEDIA SUITE (6 COLS) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-sm relative overflow-hidden group">
            {/* Top Badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5">
              {discountPercent && (
                <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                  {discountPercent}% OFF
                </span>
              )}
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Verified Genuine</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                100% Cash on Delivery
              </span>
            </div>

            {/* Top-Right Action Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playUiSound('tap');
                  setIs360Active(!is360Active);
                  setRotationAngle((prev) => (prev + 90) % 360);
                }}
                className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                  is360Active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white/90 text-slate-700 hover:text-blue-600 border-slate-200 shadow-2xs'
                }`}
                title="Rotate 360 View"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="p-2 rounded-xl bg-white/90 backdrop-blur-md text-slate-700 hover:text-blue-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title="Expand Fullscreen Lightbox"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Main Stage Image with Optical Magnifier Lens */}
            <div
              ref={imageContainerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="aspect-square w-full rounded-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center p-6 relative overflow-hidden cursor-crosshair select-none"
            >
              <img
                src={activeImg}
                alt={product.name}
                style={{
                  transform: `rotate(${rotationAngle}deg)`,
                  transition: is360Active ? 'transform 0.4s ease' : 'none',
                }}
                className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              />

              {/* Optical Magnifier Overlay Lens */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl bg-no-repeat shadow-inner transition-opacity duration-150"
                style={{
                  ...zoomStyle,
                  backgroundImage: `url(${activeImg})`,
                  backgroundSize: '250%',
                }}
              />
            </div>

            {/* Interactive 360 Spin Bar if toggled */}
            {is360Active && (
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Interactive 360° Perspective Angle ({rotationAngle}°)</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="45"
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(Number(e.target.value))}
                  className="w-36 accent-blue-600 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Thumbnails row */}
          {product.images && (product.images || []).length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
              {(product.images || []).map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    playUiSound('pop');
                    setActiveImageIdx(i);
                  }}
                  className={`w-20 h-20 rounded-2xl border p-1.5 bg-white shrink-0 overflow-hidden transition-all cursor-pointer ${
                    activeImageIdx === i
                      ? 'border-blue-600 ring-4 ring-blue-500/15 shadow-sm'
                      : 'border-slate-200/90 hover:border-slate-300 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Angle ${i + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Confidence Assurances Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center space-y-1 shadow-2xs">
              <Truck className="w-4 h-4 text-blue-600 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">Nationwide COD</p>
              <p className="text-[10px] text-slate-400">Pay cash upon delivery</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center space-y-1 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">Inspected Genuine</p>
              <p className="text-[10px] text-slate-400">Physical seal checked</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center space-y-1 shadow-2xs">
              <RotateCcw className="w-4 h-4 text-indigo-600 mx-auto" />
              <p className="text-[11px] font-black text-slate-800">7-Day Return</p>
              <p className="text-[10px] text-slate-400">Hassle-free exchange</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PRODUCT METRICS, DETAILS & PURCHASING ACTION (6 COLS) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-sm space-y-5">
            {/* Storefront Connection Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <Link
                to={`/shops/${product.shopId}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-600 transition-colors text-xs font-extrabold group"
              >
                <Store className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{product.shopName || 'Verified Storefront'}</span>
                <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              </Link>
              <span className="text-xs font-extrabold text-amber-600 flex items-center gap-1 tabular-nums">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{product.rating || 5.0}</span>
                <span className="text-slate-400">({product.reviewCount || reviews.length} reviews)</span>
              </span>
            </div>

            {/* Product Title */}
            <div>
              <span className="text-[11px] font-black uppercase text-blue-600 tracking-wider">
                {product.brand || product.category}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight mt-1">
                {product.name}
              </h1>
            </div>

            {/* Price Box with Savings & Stock Urgency */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl sm:text-3xl font-black text-rose-600 tabular-nums">
                      NPR {effectivePrice.toLocaleString()}
                    </span>
                    {product.originalPrice && product.originalPrice > effectivePrice && (
                      <span className="text-sm font-semibold text-slate-400 line-through tabular-nums">
                        NPR {(product.originalPrice || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {product.originalPrice && product.originalPrice > effectivePrice && (
                    <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                      You save NPR {(product.originalPrice - effectivePrice).toLocaleString()} ({discountPercent}%)
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      product.stock > 5
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : product.stock > 0
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Stock Urgency Bar */}
              {product.stock <= 5 && product.stock > 0 && (
                <div className="pt-1 flex items-center gap-2 text-xs text-amber-700 font-bold">
                  <Flame className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span>High demand: Only {product.stock} units remaining at this promotional price!</span>
                </div>
              )}
            </div>

            {/* 0% BANK INSTALLMENT / EMI CALCULATOR DROPDOWN */}
            <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setShowEmiCalculator(!showEmiCalculator)}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-extrabold text-slate-800">
                    Nepal Bank EMI available from NPR {Math.round(effectivePrice / 12).toLocaleString()}/mo
                  </span>
                </div>
                {showEmiCalculator ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
              {showEmiCalculator && (
                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <p className="text-[11px]">
                    0% markup financing with partner banks: Nabil, Global IME, NIC Asia & Himalayan Bank.
                  </p>
                  <div className="flex gap-2">
                    {[6, 12, 18].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEmiTenure(t as any)}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          emiTenure === t
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t} Months (NPR {Math.round(effectivePrice / t).toLocaleString()}/mo)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* COLOR & FINISH SELECTOR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Finish / Color:</span>
                <span className="font-extrabold text-blue-600">{selectedColor.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {COLOR_VARIANTS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      playUiSound('tap');
                      setSelectedColor(c);
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                      selectedColor.id === c.id
                        ? 'border-blue-600 ring-4 ring-blue-500/20 scale-110'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {selectedColor.id === c.id && (
                      <Check className={`w-3.5 h-3.5 ${c.hex === '#E2E8F0' ? 'text-slate-900' : 'text-white'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* SPECIFICATION / PACKAGE TIER SELECTOR */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Edition & Packaging:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SPEC_OPTIONS.map((spec, sIdx) => {
                  const active = selectedSpec.label === spec.label;
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => {
                        playUiSound('tap');
                        setSelectedSpec(spec);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-blue-600 bg-blue-50/50 shadow-2xs ring-2 ring-blue-500/10'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-black text-slate-900">{spec.label}</div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{spec.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NEPAL DISTRICT DELIVERY ESTIMATOR */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Estimate Delivery to Your City</span>
                </span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-xs font-bold bg-white border border-blue-200 rounded-xl px-2.5 py-1 text-slate-800 outline-hidden cursor-pointer"
                >
                  {NEPAL_SHIPPING_DISTRICTS.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city} ({c.province})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentShipping.days}</span>
                </span>
                <span className="font-extrabold text-slate-900">NPR {currentShipping.fee}</span>
              </div>
              {currentShipping.expressAvailable && (
                <p className="text-[10px] font-bold text-blue-700">
                  ⚡ Express Same-day Courier available if ordered before 2:00 PM.
                </p>
              )}
            </div>

            {/* Quantity Selector & Purchase Actions */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-xs font-extrabold text-slate-900 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                    className="w-7 h-7 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">
                  Subtotal: NPR {(effectivePrice * quantity).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-700" />
                  <span>Add to Cart</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <span>Buy with COD</span>
                </button>
              </div>

              {/* Chat Inquire Button */}
              <Link
                to={`/messages?userId=${product.sellerId}&shopId=${product.shopId}&shopName=${encodeURIComponent(
                  product.shopName
                )}&productTitle=${encodeURIComponent(product.name)}&draft=${encodeURIComponent(
                  `Namaste! I would like to inquire about "${product.name}" in ${selectedColor.name} (${selectedSpec.label}). Is Cash on Delivery available to ${selectedCity}?`
                )}`}
                className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors group cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>Chat with Store Owner about this item</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FREQUENTLY BOUGHT TOGETHER BUNDLE BUILDER */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Frequently Bought Together - Instant Combo Savings</span>
          </h3>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
            Save 15% on Bundle
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-20 h-20 rounded-2xl border border-slate-200 p-2 bg-slate-50 flex items-center justify-center">
              <img src={activeImg} alt={product.name} className="max-h-full max-w-full object-contain" />
            </div>
            <span className="text-slate-400 font-bold text-lg">+</span>
            <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeAccessoryA}
                onChange={(e) => setIncludeAccessoryA(e.target.checked)}
                className="rounded text-blue-600"
              />
              <div>
                <span className="font-bold text-slate-900 block">Shockproof Armor Case</span>
                <span className="text-slate-500 font-semibold tabular-nums">+NPR 1,200</span>
              </div>
            </label>
            <span className="text-slate-400 font-bold text-lg">+</span>
            <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeAccessoryB}
                onChange={(e) => setIncludeAccessoryB(e.target.checked)}
                className="rounded text-blue-600"
              />
              <div>
                <span className="font-bold text-slate-900 block">65W GaN Fast Charger</span>
                <span className="text-slate-500 font-semibold tabular-nums">+NPR 1,800</span>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-4 self-end lg:self-center">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-semibold">Bundle Total:</span>
              <span className="text-base sm:text-lg font-black text-rose-600 tabular-nums">
                NPR {(effectivePrice + (includeAccessoryA ? 1200 : 0) + (includeAccessoryB ? 1800 : 0)).toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddBundleToCart}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              Add Bundle to Cart
            </button>
          </div>
        </div>
      </div>

      {/* 4. EXPANDED TABS: SPECS, WARRANTY, VERIFIED REVIEWS & Q&A */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-200/80 px-4 pt-3 overflow-x-auto no-scrollbar gap-2">
          {[
            { id: 'details', label: 'Description & Highlights' },
            { id: 'specs', label: 'Full Specifications' },
            { id: 'warranty', label: 'Authenticity & Warranty' },
            { id: 'qa', label: `Community Q&A (${questions.length})` },
            { id: 'reviews', label: `Customer Reviews (${reviews.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                playUiSound('tap');
                setActiveTab(t.id as any);
              }}
              className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-7">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-extrabold text-slate-900">About this product</h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Inspected before nationwide dispatch</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero upfront payment required</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECS */}
          {activeTab === 'specs' && (
            <div className="max-w-2xl">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {product.specifications ? (
                    Object.entries(product.specifications).map(([key, val]) => (
                      <tr key={key} className="py-2.5">
                        <td className="py-2.5 pr-4 font-bold text-slate-400 w-1/3">{key}</td>
                        <td className="py-2.5 text-slate-800 font-semibold">{val}</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="py-2.5">
                        <td className="py-2.5 pr-4 font-bold text-slate-400">Category</td>
                        <td className="py-2.5 text-slate-800 font-semibold">{product.category}</td>
                      </tr>
                      <tr className="py-2.5">
                        <td className="py-2.5 pr-4 font-bold text-slate-400">Availability</td>
                        <td className="py-2.5 text-emerald-600 font-bold">Ready to Dispatch (Nepal)</td>
                      </tr>
                      <tr className="py-2.5">
                        <td className="py-2.5 pr-4 font-bold text-slate-400">Payment Option</td>
                        <td className="py-2.5 text-slate-800 font-semibold">100% Cash on Delivery</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: WARRANTY */}
          {activeTab === 'warranty' && (
            <div className="max-w-2xl space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Warranty & Quality Seal</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {product.warrantyPeriod ||
                  'Backed by local verified store return guarantee. Inspect the item physically upon arrival before paying your delivery rider.'}
              </p>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <span className="font-extrabold">NEWARO Buyer Safety Pledge:</span>
                <p>If the received product does not match description or arrived damaged, hand it back to the rider at zero cost to you.</p>
              </div>
            </div>
          )}

          {/* TAB 4: COMMUNITY Q&A */}
          {activeTab === 'qa' && (
            <div className="space-y-6 max-w-2xl">
              <form onSubmit={handleAskQuestion} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Have a question about this product?</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ask about sizing, compatibility, delivery times..."
                    className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl outline-hidden focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Ask Seller
                  </button>
                </div>
              </form>

              <div className="space-y-3 divide-y divide-slate-100">
                {questions.map((q) => (
                  <div key={q.id} className="pt-3 first:pt-0 space-y-1">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">Q</span>
                      <span>{q.question}</span>
                    </p>
                    <p className="text-xs text-slate-600 pl-6 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] shrink-0 mt-0.5">A</span>
                      <span>{q.answer}</span>
                    </p>
                    <span className="text-[10px] text-slate-400 pl-6 block">{q.author} · {q.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: VERIFIED REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Review submit form */}
              <form onSubmit={handleAddReview} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3 max-w-xl">
                <h4 className="text-xs font-bold text-slate-900">Write a Verified Customer Review</h4>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          reviewRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">{reviewRating} Stars</span>
                </div>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with product quality, packaging, and delivery in Nepal..."
                  className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-hidden focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={submittingReview || !reviewComment.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Review</span>
                </button>
              </form>

              {/* Filter pills */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: 'All Reviews' },
                  { id: '5', label: '5 Stars ★' },
                  { id: '4', label: '4 Stars ★' },
                  { id: 'verified', label: 'Verified Buyers Only' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setReviewFilter(f.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      reviewFilter === f.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Reviews list */}
              <div className="space-y-3 max-w-2xl divide-y divide-slate-100">
                {filteredReviews.map((rev) => (
                  <div key={rev.id} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{rev.authorName}</span>
                        {rev.verifiedPurchase && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleVoteHelpful(rev.id)}
                        className="text-[11px] text-slate-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Helpful ({helpfulVotes[rev.id] || 4})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. RELATED PRODUCTS RECOMMENDATIONS */}
      {relatedProducts.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>You Might Also Like</span>
            </h3>
            <Link to="/explore" className="text-xs font-bold text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col justify-between group hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <Link to={`/products/${rel.id}`} className="space-y-2">
                  <div className="aspect-square rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center p-2 border border-slate-100">
                    <img
                      src={rel.images?.[0]}
                      alt={rel.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 truncate">{rel.name}</h4>
                  <p className="text-xs font-black text-rose-600 tabular-nums">
                    NPR {(rel.price || 0).toLocaleString()}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. FULLSCREEN ULTRA-HD LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-5 right-5 text-white/80 hover:text-white text-2xl font-bold cursor-pointer"
          >
            ✕
          </button>
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center">
            <img
              src={activeImg}
              alt={product.name}
              className="max-h-[75vh] max-w-full object-contain filter drop-shadow-2xl"
            />
          </div>
          <div className="text-center text-white text-xs mt-4">
            <span className="font-extrabold">{product.name}</span>
            <p className="text-white/60">Optical Studio View - High Resolution Inspection</p>
          </div>
        </div>
      )}

      {/* 7. MOBILE STICKY BOTTOM CHECKOUT DOCK */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:hidden flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={activeImg} alt={product.name} className="w-10 h-10 rounded-xl object-contain border p-0.5 shrink-0 bg-slate-50" />
          <div className="min-w-0">
            <p className="text-xs font-black text-rose-600 tabular-nums">
              NPR {effectivePrice.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{selectedColor.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddToCart}
            className="px-3.5 py-2.5 min-h-[42px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cart
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            className="px-4 py-2.5 min-h-[42px] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            Buy with COD
          </button>
        </div>
      </div>
    </div>
  );
};
