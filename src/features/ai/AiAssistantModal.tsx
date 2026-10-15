import React, { useEffect, useRef, useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Package, ScanFace, Send, ShoppingBag, Sparkles, X } from 'lucide-react';
import { auth, db, getDocsWithTimeout } from '../../lib/firebase';
import { useCartStore, useUIStore } from '../../lib/store';
import { playUiSound } from '../../lib/settings';
import { useToast } from '../../components/ui/Toast';
import { Product } from '../../types';

interface FaceInfo {
  position?: string;
  expression?: string;
  apparentAgeRange?: string;
  hair?: string;
  facialHair?: string;
  glasses?: string;
  headwear?: string;
  clarity?: string;
}

interface PhotoAnalysis {
  summary?: string;
  faceCount?: number;
  faces?: FaceInfo[];
  objects?: string[];
  visibleText?: string[];
  scene?: string;
  dominantColors?: string[];
  productMatch?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  products?: Product[];
  image?: string;
  analysis?: PhotoAnalysis;
  detail?: string;
}

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

// Shrinks a photo to a sharp 1600px JPEG so faces and small text stay readable but the upload stays fast.
async function prepareImageForAi(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG, WEBP or GIF).');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('That image is over 12 MB. Please choose a smaller one.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This image could not be read. Try a JPG or PNG.'));
      el.src = objectUrl;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process this image.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const AnalysisCard: React.FC<{ a: PhotoAnalysis }> = ({ a }) => {
  const faces = a.faces || [];
  const chips = (items?: string[]) =>
    (items || []).length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {(items || []).map((x, i) => (
          <span key={`${x}-${i}`} className="px-2 py-0.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-[11px] text-slate-700 dark:text-slate-200">
            {x}
          </span>
        ))}
      </div>
    ) : null;
  const label = 'text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400';
  return (
    <div className="glass-panel w-full max-w-[92%] rounded-2xl p-3.5 space-y-3 text-[13px] text-slate-800 dark:text-slate-100">
      <div className="flex items-center gap-2 font-semibold">
        <ScanFace className="w-4 h-4 text-blue-600" />
        Photo scan
        <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-300">
          {a.faceCount ?? faces.length} {(a.faceCount ?? faces.length) === 1 ? 'face' : 'faces'} detected
        </span>
      </div>
      {a.summary && <p className="leading-relaxed">{a.summary}</p>}
      {faces.length > 0 && (
        <div className="space-y-1.5">
          <p className={label}>Faces</p>
          {faces.map((f, i) => (
            <div key={i} className="rounded-xl bg-slate-900/5 dark:bg-white/5 px-3 py-2 leading-snug">
              <span className="font-semibold">Face {i + 1}</span>
              {f.position ? <span className="text-slate-500 dark:text-slate-400"> · {f.position}</span> : null}
              <div className="text-[12px] text-slate-600 dark:text-slate-300">
                {[
                  f.expression,
                  f.apparentAgeRange && f.apparentAgeRange !== 'unclear' ? `looks about ${f.apparentAgeRange}` : '',
                  f.hair ? `hair: ${f.hair}` : '',
                  f.facialHair && f.facialHair !== 'none' ? f.facialHair : '',
                  f.glasses && f.glasses !== 'none' ? f.glasses : '',
                  f.headwear && f.headwear !== 'none' ? f.headwear : '',
                  f.clarity ? `${f.clarity} view` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          ))}
        </div>
      )}
      {(a.objects || []).length > 0 && (
        <div className="space-y-1">
          <p className={label}>Objects</p>
          {chips(a.objects)}
        </div>
      )}
      {(a.visibleText || []).length > 0 && (
        <div className="space-y-1">
          <p className={label}>Text in image</p>
          {chips(a.visibleText)}
        </div>
      )}
      {(a.scene || (a.dominantColors || []).length > 0) && (
        <div className="space-y-1">
          <p className={label}>Scene</p>
          <p>{[a.scene, (a.dominantColors || []).join(', ')].filter(Boolean).join(' · ')}</p>
        </div>
      )}
      <p className="text-[10px] text-slate-400">NEWARO AI describes what is visible. It does not identify people, and age is only a rough estimate.</p>
    </div>
  );
};

const WELCOME: Message = {
  id: 'welcome',
  sender: 'assistant',
  text: 'Namaste, I am NEWARO AI. Ask about products, prices, shops or how NEWARO works. I answer from the items listed on NEWARO.',
};

const SUGGESTIONS = ['Best food on NEWARO', 'Price of a laptop', 'Show new arrivals', 'How does Cash on Delivery work?', 'Explain something to me'];

const CATALOG_LIMIT = 80;

const words = (text: string): string[] =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

// Offline fallback: matches words against real listings only. It never invents an item.
function matchListings(text: string, catalog: Product[]): Product[] {
  const wanted = words(text);
  if (wanted.length === 0) return [];
  return catalog
    .map((p) => {
      const haystack = words(`${p.name} ${p.category || ''} ${p.description || ''} ${p.brand || ''}`).join(' ');
      const score = wanted.reduce((n, w) => (haystack.includes(w) ? n + 1 : n), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.p);
}

const formatNpr = (n: number) => `Rs. ${(Number(n) || 0).toLocaleString()}`;

// Swipe left and right through product cards inside the chat. The app itself never moves.
const ProductRail: React.FC<{
  products: Product[];
  onOpen: (id: string) => void;
  onAdd: (p: Product) => void;
}> = ({ products, onOpen, onAdd }) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const stepPx = (): number => {
    const first = railRef.current?.firstElementChild as HTMLElement | null | undefined;
    return first ? first.offsetWidth + 12 : 0;
  };

  const go = (dir: 1 | -1) => {
    const step = stepPx();
    if (step) railRef.current?.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = railRef.current;
    const step = stepPx();
    if (el && step) setActive(Math.min(products.length - 1, Math.round(el.scrollLeft / step)));
  };

  return (
    <div className="space-y-2.5">
      <div ref={railRef} onScroll={onScroll} className="swipe-rail" aria-label="Matching NEWARO items">
        {products.map((p) => (
          <article key={p.id} className="glass-panel shrink-0 w-[168px] sm:w-[188px] rounded-2xl p-2.5 flex flex-col">
            <button type="button" onClick={() => onOpen(p.id)} className="text-left block">
              <div className="aspect-square rounded-xl overflow-hidden bg-white/70 dark:bg-slate-800/70 flex items-center justify-center">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <h4 className="mt-2 text-[13px] font-semibold leading-snug text-slate-900 dark:text-slate-100 line-clamp-2 min-h-[2.5em]">
                {p.name}
              </h4>
            </button>
            <p className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatNpr(p.price)}</p>
            {p.originalPrice && p.originalPrice > p.price ? (
              <p className="text-[11px] tabular-nums text-slate-400 line-through">{formatNpr(p.originalPrice)}</p>
            ) : null}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{p.shopName || 'NEWARO seller'}</p>
            <button
              type="button"
              onClick={() => onAdd(p)}
              className="mt-2.5 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Add to cart
            </button>
          </article>
        ))}
      </div>

      {products.length > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {products.map((p, i) => (
              <span
                key={p.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-4 bg-slate-800 dark:bg-slate-200' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous item"
              onClick={() => go(-1)}
              disabled={active === 0}
              className="w-8 h-8 rounded-full glass-panel flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next item"
              onClick={() => go(1)}
              disabled={active >= products.length - 1}
              className="w-8 h-8 rounded-full glass-panel flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AiAssistantModal: React.FC = () => {
  const { isAiModalOpen, closeAiModal, aiPrefillPrompt } = useUIStore();
  const { addItem } = useCartStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Real listings from Firestore, loaded when the assistant opens
  useEffect(() => {
    if (!isAiModalOpen || catalogLoaded) return undefined;
    let active = true;
    const load = async () => {
      try {
        const snap = await getDocsWithTimeout(
          query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(CATALOG_LIMIT)),
          6000
        );
        if (active) setCatalog(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) {
        console.warn('NEWARO AI could not load listings:', err);
      } finally {
        if (active) setCatalogLoaded(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isAiModalOpen, catalogLoaded]);

  useEffect(() => {
    if (!isAiModalOpen) return undefined;
    if (aiPrefillPrompt) setInput(aiPrefillPrompt);
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [isAiModalOpen, aiPrefillPrompt]);

  // Scroll only the chat list, never the page
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const pushAssistant = (text: string, products: Product[] = [], extra: Partial<Message> = {}) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}-${prev.length}`,
        sender: 'assistant',
        text,
        products: products.length ? products : undefined,
        ...extra,
      },
    ]);
  };

  const attachFile = async (file?: File | null) => {
    if (!file) return;
    try {
      setPendingImage(await prepareImageForAi(file));
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err: any) {
      addToast(err?.message || 'Could not use that image.', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const postChat = async (payload: Record<string, unknown>, forceRefresh: boolean) => {
    const idToken = (await auth.currentUser?.getIdToken(forceRefresh).catch(() => '')) || '';
    return fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(payload),
    });
  };

  const handleSend = async (preset?: string) => {
    const image = pendingImage;
    const text = (preset ?? input).trim() || (image ? 'Analyse this photo in detail.' : '');
    if (!text || loading) return;
    if (!auth.currentUser) {
      setMessages((prev) => [
        ...prev,
        { id: `usr-${Date.now()}`, sender: 'user', text, image: image || undefined },
        { id: `bot-${Date.now()}`, sender: 'assistant', text: 'Sign in with Google to chat with NEWARO AI.' },
      ]);
      setInput('');
      setPendingImage(null);
      return;
    }

    playUiSound('tap');
    const history = messages.slice(-6).map((m) => ({ role: m.sender, text: m.text }));
    setMessages((prev) => [...prev, { id: `usr-${Date.now()}`, sender: 'user', text, image: image || undefined }]);
    setInput('');
    setPendingImage(null);
    setLoading(true);

    const payload = {
      message: text,
      history,
      ...(image ? { image } : {}),
      catalog: catalog.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        category: p.category,
        shopName: p.shopName,
        stock: p.stock,
        description: (p.description || '').slice(0, 160),
      })),
    };

    try {
      let res = await postChat(payload, false);
      // An expired token is the most common cause of a 401. Refresh it once and retry automatically.
      if (res.status === 401) res = await postChat(payload, true);
      const data = await res.json().catch(() => null);
      const ids: string[] = Array.isArray(data?.productIds) ? data.productIds : [];
      const picked = ids
        .map((id) => catalog.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p));

      if (data?.ok) {
        pushAssistant(data.reply || 'Here is what I found on NEWARO.', picked, { analysis: data.analysis || undefined });
        playUiSound('pop');
      } else if (res.status === 401) {
        pushAssistant('The server could not verify your sign-in. Please sign out, sign in again, then retry.');
      } else {
        const message = String(data?.reply || data?.error || 'NEWARO AI could not answer. Please try again.');
        const matches = image ? [] : matchListings(text, catalog);
        pushAssistant(matches.length ? `${message} Here are matching real NEWARO listings.` : message, matches, {
          detail: data?.detail ? String(data.detail) : undefined,
        });
      }
    } catch (error: any) {
      const matches = image ? [] : matchListings(text, catalog);
      const detail = error?.message ? String(error.message).slice(0, 180) : 'Network request failed.';
      pushAssistant(matches.length
        ? `NEWARO AI could not connect (${detail}). Here are matching real NEWARO listings.`
        : `NEWARO AI could not connect (${detail}). Check your connection and server configuration, then retry.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (p: Product) => {
    addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      image: p.images?.[0] || '',
      shopId: p.shopId,
      shopName: p.shopName,
      stock: p.stock,
    });
    playUiSound('success');
    addToast(`Added "${p.name}" to cart`, 'success');
  };

  const openProduct = (id: string) => {
    closeAiModal();
    navigate(`/products/${id}`);
  };

  if (!isAiModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/20 dark:bg-black/40"
      onClick={() => {
        playUiSound('tap');
        closeAiModal();
      }}
    >
      <section
        role="dialog"
        aria-label="NEWARO AI"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          attachFile(e.dataTransfer.files?.[0]);
        }}
        className="glass-sheet relative w-full sm:max-w-xl h-[88dvh] sm:h-[min(44rem,88vh)] rounded-t-[28px] sm:rounded-[28px] flex flex-col overflow-hidden"
      >
        {dragging && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] border-2 border-dashed border-blue-500 bg-blue-500/10 text-sm font-semibold text-blue-700 dark:text-blue-300 pointer-events-none">
            Drop a photo to scan it
          </div>
        )}
        <header className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 dark:text-white text-[15px]">NEWARO AI</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Ask anything · photo scan · real NEWARO listings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAiModal}
            aria-label="Close NEWARO AI"
            className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2 space-y-4">
          {messages.map((m) => {
            const mine = m.sender === 'user';
            return (
              <div key={m.id} className={`flex flex-col gap-2 ${mine ? 'items-end' : 'items-start'}`}>
                {m.image && (
                  <img
                    src={m.image}
                    alt="Uploaded photo"
                    className="max-w-[70%] max-h-56 rounded-2xl object-cover border border-white/60 dark:border-slate-700"
                  />
                )}
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap ${
                    mine
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-br-lg'
                      : 'glass-panel text-slate-800 dark:text-slate-100 rounded-bl-lg'
                  }`}
                >
                  {m.text}
                  {m.detail && (
                    <span className="block mt-1.5 text-[11px] opacity-60 break-words">Reason: {m.detail}</span>
                  )}
                </div>
                {m.analysis && <AnalysisCard a={m.analysis} />}
                {m.products && m.products.length > 0 && (
                  <div className="w-full">
                    <ProductRail products={m.products} onOpen={openProduct} onAdd={handleAddToCart} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="glass-panel w-fit flex items-center gap-2 px-4 py-3 rounded-3xl rounded-bl-lg text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin" /> Looking through NEWARO
            </div>
          )}
        </div>

        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar overscroll-x-contain">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSend(s)}
              disabled={loading}
              className="shrink-0 px-3 py-1.5 rounded-full glass-panel text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {pendingImage && (
          <div className="px-4 pb-2">
            <div className="relative inline-block">
              <img src={pendingImage} alt="Photo ready to scan" className="h-16 w-16 rounded-xl object-cover border border-white/70 dark:border-slate-700" />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                aria-label="Remove photo"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div
          className="px-4 pt-1 flex items-center gap-2"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => attachFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            aria-label="Attach a photo to scan"
            title="Upload a photo to scan"
            className="w-11 h-11 rounded-2xl glass-panel text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 disabled:opacity-40"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            maxLength={500}
            placeholder={pendingImage ? 'Ask about this photo (or just press send)' : 'Ask anything about NEWARO or general topics'}
            aria-label="Message NEWARO AI"
            className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={(!input.trim() && !pendingImage) || loading}
            aria-label="Send"
            className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </section>
    </div>
  );
};
