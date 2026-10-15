import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Plus,
  ShoppingBag,
  Calendar,
  Sparkles,
  LayoutList,
  UserCheck,
  UserPlus,
  ArrowLeft,
  X,
  QrCode,
  ExternalLink,
  Briefcase,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
} from 'lucide-react';
import { collection, query, orderBy, limit, doc, updateDoc, increment, setDoc, deleteDoc, where } from 'firebase/firestore';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useCartStore } from '../../lib/store';
import { usePlatformConfig } from '../../lib/platformConfig';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { Post, Product, Story, Shop, EventItem, JobItem } from '../../types';
import { StoryViewerModal } from './StoryViewerModal';
import {
  StorySkeleton,
  PostSkeleton,
  ProductSkeleton,
} from '../../components/ui/Skeletons';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { addItem } = useCartStore();
  const { config: platformConfig } = usePlatformConfig();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'foryou' | 'posts' | 'following' | 'events' | 'freelancing'>(() => {
    if (location.pathname === '/events') return 'events';
    if (location.pathname === '/jobs') return 'freelancing';
    return 'foryou';
  });

  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const [qrModalProduct, setQrModalProduct] = useState<Product | null>(null);
  const [copiedQrUrl, setCopiedQrUrl] = useState(false);
  const [lightboxState, setLightboxState] = useState<{
    images: string[];
    index: number;
    authorName?: string;
    caption?: string;
    link?: string;
  } | null>(null);

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentsMap, setCommentsMap] = useState<Record<string, Array<{ authorName: string; text: string }>>>({});

  const currentUid = user?.uid || 'guest';
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`newaro_likes_${currentUid}`) || '{}');
    } catch {
      return {};
    }
  });

  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`newaro_saved_posts_${currentUid}`) || '{}');
    } catch {
      return {};
    }
  });

  const [followedAuthors, setFollowedAuthors] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`newaro_follows_${currentUid}`) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetchFeedData();
  }, [user?.uid]);

  const fetchFeedData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, prRes, eRes, jRes, shRes] = await Promise.allSettled([
        getDocsWithTimeout(query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(30)), 4000),
        getDocsWithTimeout(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(40)), 4000),
        getDocsWithTimeout(query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(40)), 4000),
        getDocsWithTimeout(query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(20)), 4000),
        getDocsWithTimeout(query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(20)), 4000),
        getDocsWithTimeout(query(collection(db, 'shops'), where('status', '==', 'approved'), limit(40)), 4000),
      ]);

      if (sRes.status === 'fulfilled' && !sRes.value.empty) {
        const storyNow = Date.now();
        setStories(
          sRes.value.docs
            .map((d) => ({ id: d.id, ...d.data() } as Story))
            .filter((st) => typeof st.expiresAt !== 'number' || st.expiresAt > storyNow)
        );
      }
      if (pRes.status === 'fulfilled' && !pRes.value.empty) {
        setPosts(pRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
      }
      if (prRes.status === 'fulfilled' && !prRes.value.empty) {
        setProducts(prRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } else {
        setProducts([]);
      }
      if (eRes.status === 'fulfilled' && !eRes.value.empty) {
        setEvents(eRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as EventItem)));
      }
      if (jRes.status === 'fulfilled' && !jRes.value.empty) {
        setJobs(jRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as JobItem)));
      } else {
        setJobs([]);
      }
      if (shRes.status === 'fulfilled' && !shRes.value.empty) {
        setShops(shRes.value.docs.map((d) => ({ id: d.id, ...d.data() } as Shop)));
      } else {
        setShops([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (post: Post) => {
    if (!user) {
      addToast('Please sign in to like posts', 'info');
      navigate('/auth');
      return;
    }
    const isLiked = !!likedPosts[post.id];
    const nextState = !isLiked;
    const newCount = Math.max(0, (post.likesCount || 0) + (nextState ? 1 : -1));

    playUiSound('pop');
    setLikedPosts((prev) => {
      const next = { ...prev, [post.id]: nextState };
      try {
        localStorage.setItem(`newaro_likes_${user.uid}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likesCount: newCount } : p)));

    try {
      const likeDocRef = doc(db, 'posts', post.id, 'likes', user.uid);
      const postRef = doc(db, 'posts', post.id);
      if (!nextState) {
        await deleteDoc(likeDocRef).catch(() => {});
        await updateDoc(postRef, { likesCount: increment(-1) }).catch(() => {});
      } else {
        await setDoc(likeDocRef, { userId: user.uid, createdAt: Date.now() }).catch(() => {});
        await updateDoc(postRef, { likesCount: increment(1) }).catch(() => {});
      }
    } catch {}
  };

  const handleFollowAuthor = async (authorId: string, authorName: string) => {
    if (!user) {
      addToast('Please sign in to follow', 'info');
      navigate('/auth');
      return;
    }
    const nextState = !followedAuthors[authorId];
    playUiSound('pop');
    setFollowedAuthors((prev) => {
      const next = { ...prev, [authorId]: nextState };
      try {
        localStorage.setItem(`newaro_follows_${user.uid}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    addToast(nextState ? `Following ${authorName}` : `Unfollowed ${authorName}`, 'success');
  };

  const handleBookmarkPost = (postId: string) => {
    if (!user) {
      addToast('Please sign in to save posts', 'info');
      navigate('/auth');
      return;
    }
    const isSaved = !!savedPosts[postId];
    setSavedPosts((prev) => {
      const next = { ...prev, [postId]: !isSaved };
      try {
        localStorage.setItem(`newaro_saved_posts_${user.uid}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    addToast(isSaved ? 'Bookmark removed' : 'Post saved to bookmarks!', 'success');
  };

  const handleShare = (title: string, url: string) => {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      addToast('Link copied to clipboard!', 'success');
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user) {
      addToast('Please sign in to comment', 'info');
      navigate('/auth');
      return;
    }
    if (!commentText.trim()) return;

    const newComment = {
      authorName: profile?.displayName || user.email?.split('@')[0] || 'User',
      text: commentText.trim(),
    };

    setCommentsMap((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p))
    );

    setCommentText('');
    await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) }).catch(() => {});
    addToast('Comment posted!', 'success');
  };

  const forYouGridProducts = products.slice(0, 12);

  const renderPostPhotos = (post: Post) => {
    const imgs = post.images || [];
    if (imgs.length === 0) return null;

    const handlePhotoClick = (index: number) => {
      setLightboxState({
        images: imgs,
        index,
        authorName: post.authorName,
        caption: post.content,
        link: post.link,
      });
    };

    if (imgs.length === 1) {
      return (
        <div
          onClick={() => handlePhotoClick(0)}
          className="bg-slate-950/5 relative rounded-2xl overflow-hidden cursor-pointer group flex items-center justify-center max-h-[540px] my-1"
        >
          <img
            src={imgs[0]}
            alt={post.content ? post.content.slice(0, 40) : 'Post photo'}
            loading="lazy"
            decoding="async"
            className="w-full max-h-[540px] object-contain group-hover:scale-[1.01] transition-transform duration-300"
          />
          {post.link && (
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 right-3 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md hover:bg-blue-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Visit Link</span>
            </a>
          )}
        </div>
      );
    }

    if (imgs.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5 my-1 rounded-2xl overflow-hidden bg-slate-100">
          {imgs.map((imgUrl, idx) => (
            <div
              key={idx}
              onClick={() => handlePhotoClick(idx)}
              className="relative overflow-hidden cursor-pointer group aspect-4/3 bg-slate-950/5 flex items-center justify-center"
            >
              <img
                src={imgUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      );
    }

    const firstPhoto = imgs[0];
    const secondPhoto = imgs[1];
    const thirdPhoto = imgs[2];
    const extraCount = imgs.length - 3;

    return (
      <div className="space-y-1.5 my-1 rounded-2xl overflow-hidden bg-slate-100/60 p-1">
        <div
          onClick={() => handlePhotoClick(0)}
          className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-950/5 max-h-[420px] aspect-16/10 flex items-center justify-center"
        >
          <img
            src={firstPhoto}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
          />
          <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
            1 / {imgs.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div
            onClick={() => handlePhotoClick(1)}
            className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-950/5 aspect-4/3 flex items-center justify-center"
          >
            <img
              src={secondPhoto}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div
            onClick={() => handlePhotoClick(2)}
            className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-950/5 aspect-4/3 flex items-center justify-center"
          >
            <img
              src={thirdPhoto}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
            {extraCount > 0 && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2 text-center group-hover:bg-black/75 transition-colors">
                <span className="text-xl sm:text-2xl font-black tabular-nums">+{extraCount}</span>
                <span className="text-[11px] font-bold text-white/90">view all photos</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* 1. TOP 24H STORIES BAR */}
      {platformConfig.showStoriesBar && (
        <div className="bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-2xs overflow-x-auto no-scrollbar touch-pan-x w-full">
          {loading ? (
            <StorySkeleton count={6} />
          ) : (
            <div className="flex items-center gap-3">
              <div
                onClick={() => {
                  if (!user) {
                    addToast('Please sign in to add a story', 'info');
                    navigate('/auth');
                    return;
                  }
                  navigate('/create-post?isStory=true');
                }}
                className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
              >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-blue-400 p-0.5 group-hover:border-blue-600 transition-colors">
                  <div className="w-full h-full rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 max-w-[64px] truncate text-center">
                  Add Story
                </span>
              </div>

              {(() => {
                const firstIndexByAuthor = new Map<string, number>();
                stories.forEach((st, i) => {
                  if (!firstIndexByAuthor.has(st.authorId)) firstIndexByAuthor.set(st.authorId, i);
                });
                return Array.from(firstIndexByAuthor.entries()).map(([authorId, idx]) => {
                  const story = stories[idx];
                  const name = story.authorName || story.shopName || 'NEWARO';
                  const count = stories.filter((st) => st.authorId === authorId).length;
                  return (
                    <div
                      key={authorId}
                      onClick={() => {
                        setActiveStoryIndex(idx);
                        setStoryModalOpen(true);
                      }}
                      title={`${name} · ${count} ${count === 1 ? 'story' : 'stories'}`}
                      className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
                    >
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 shadow-2xs">
                        <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                          {story.authorAvatar ? (
                            <img
                              src={story.authorAvatar}
                              alt={name}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            name.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 max-w-[64px] truncate text-center">
                        {name.split(' ')[0]}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* 2. TAB CONTROLS */}
      <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs flex gap-1 overflow-x-auto no-scrollbar sm:grid sm:grid-cols-5">
        {[
          { key: 'foryou', label: 'FOR YOU', icon: Sparkles },
          { key: 'posts', label: 'POSTS', icon: LayoutList },
          { key: 'following', label: 'FOLLOWING', icon: UserCheck },
          { key: 'events', label: 'EVENTS', icon: Calendar },
          { key: 'freelancing', label: 'GIGS & JOBS', icon: Briefcase },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-3 sm:px-1 shrink-0 sm:shrink text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. "FOR YOU" TAB: 3x4 PRODUCT GRID + SOCIAL POSTS */}
      {activeTab === 'foryou' && (
        <div className="space-y-6">
          <section className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <ShoppingBag className="w-5 h-5 text-blue-600 shrink-0" />
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Featured Marketplace Products
                </h2>
              </div>
              <Link
                to="/explore"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>View Full Catalog</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            {loading ? (
              <ProductSkeleton count={8} />
            ) : forYouGridProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No products listed yet</p>
                <Link
                  to="/create-product"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  List First Product
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {forYouGridProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col justify-between group hover:border-blue-400 hover:shadow-md transition-all shadow-2xs overflow-hidden"
                  >
                    <div>
                      <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 relative group/img mb-2.5 flex items-center justify-center p-1.5 border border-slate-100">
                        <Link to={`/products/${product.id}`} className="block w-full h-full flex items-center justify-center">
                          <img
                            src={product.images?.[0] || ''}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain group-hover/img:scale-105 transition-transform duration-300"
                          />
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            playUiSound('pop');
                            setQrModalProduct(product);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-blue-600 text-white shadow-xs backdrop-blur-xs transition-colors cursor-pointer"
                          title="Scan Product QR"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {product.shopName || product.category || 'Store'}
                        </p>
                        <Link
                          to={`/products/${product.id}`}
                          className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 block leading-snug"
                          title={product.name}
                        >
                          {product.name}
                        </Link>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed min-h-[32px]">
                          {product.description || 'Verified authentic listing available with Cash on Delivery.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-black text-rose-600 tabular-nums truncate block">
                          Rs. {(product.price || 0).toLocaleString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playUiSound('success');
                          addItem({
                            productId: product.id,
                            shopId: product.shopId,
                            shopName: product.shopName,
                            name: product.name,
                            price: product.price,
                            image: product.images?.[0] || '',
                            stock: product.stock,
                          });
                          addToast(`Added ${product.name} to cart!`, 'success');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Social Feed Posts & Desktop Side Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Center Social Feed Posts */}
            <section className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <LayoutList className="w-4 h-4 text-blue-600" />
                  <span>Community Posts & Updates</span>
                </h3>
                <Link to="/create-post" className="text-xs font-bold text-blue-600 hover:underline">
                  + Create Post
                </Link>
              </div>

              {loading ? (
                <PostSkeleton count={2} />
              ) : posts.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
                  <LayoutList className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No community posts yet</p>
                  <Link
                    to="/create-post"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                  >
                    Share First Post
                  </Link>
                </div>
              ) : (
                posts.map((post) => {
                  const isLiked = !!likedPosts[post.id];
                  const isSaved = !!savedPosts[post.id];
                  const isFollowed = !!followedAuthors[post.authorId];
                  const comments = commentsMap[post.id] || [];

                  return (
                    <article
                      key={post.id}
                      id={`post-${post.id}`}
                      className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all"
                    >
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Link
                            to={`/profile/${post.authorId}`}
                            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm overflow-hidden shrink-0"
                          >
                            {post.authorAvatar ? (
                              <img
                                src={post.authorAvatar}
                                alt={post.authorName}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              post.authorName?.charAt(0).toUpperCase() || 'U'
                            )}
                          </Link>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/profile/${post.authorId}`}
                                className="font-extrabold text-xs sm:text-sm text-slate-900 hover:text-blue-600 transition-colors truncate block"
                              >
                                {post.authorName}
                              </Link>
                              {post.shopName && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-md truncate">
                                  {post.shopName}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">
                              {formatRelativeTime(post.createdAt)}
                            </p>
                          </div>
                        </div>

                        {user?.uid !== post.authorId && (
                          <button
                            type="button"
                            onClick={() => handleFollowAuthor(post.authorId, post.authorName)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer ${
                              isFollowed
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                            }`}
                          >
                            {isFollowed ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Follow</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {post.content && (
                        <div className="px-4 pb-3">
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
                            {post.content}
                          </p>
                        </div>
                      )}

                      {renderPostPhotos(post)}

                      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-slate-600">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleLikePost(post)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                              isLiked ? 'text-rose-600 bg-rose-50' : 'hover:bg-slate-100'
                            }`}
                          >
                            <Heart className={`w-4 h-4 shrink-0 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                            <span className="tabular-nums">{post.likesCount || 0}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)
                            }
                            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            <span className="tabular-nums">
                              {(post.commentsCount || 0) + comments.length}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleShare(
                                post.authorName,
                                `${window.location.origin}/#post-${post.id}`
                              )
                            }
                            className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4 shrink-0" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBookmarkPost(post.id)}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                            isSaved ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title="Bookmark"
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600' : ''}`} />
                        </button>
                      </div>

                      {activeCommentPostId === post.id && (
                        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                          {comments.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {comments.map((c, i) => (
                                <div key={i} className="text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                                  <span className="font-bold text-slate-900 mr-1.5">{c.authorName}:</span>
                                  <span className="text-slate-700">{c.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                              placeholder="Write a comment..."
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-hidden focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>

            {/* Desktop Right Recommendations Column */}
            <aside className="lg:col-span-4 hidden lg:block space-y-4">
              {/* Top Verified Shops Widget */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Top Local Stores</span>
                  </h4>
                  <Link to="/shops" className="text-[11px] font-bold text-blue-600 hover:underline">
                    See All
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {shops.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2.5">
                      <Link to={`/shops/${s.id}`} className="flex items-center gap-2.5 min-w-0 group">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {s.logoUrl ? (
                            <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            s.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-slate-400 capitalize truncate">
                            {s.category || 'Retail Store'}
                          </p>
                        </div>
                      </Link>
                      <Link
                        to={`/shops/${s.id}`}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg text-[11px] font-bold transition-colors shrink-0"
                      >
                        Visit
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open Freelance Gigs Widget */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Freelance Gigs</span>
                  </h4>
                  <Link to="/jobs" className="text-[11px] font-bold text-blue-600 hover:underline">
                    Explore
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {jobs.slice(0, 3).map((j) => (
                    <Link
                      key={j.id}
                      to="/jobs"
                      className="block p-2.5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 transition-all group"
                    >
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {j.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-1">
                        <span>{j.companyOrClient}</span>
                        <span className="font-extrabold text-blue-700">
                          {j.salaryOrBudget || 'Negotiable'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* NEWARO Trust Pledge Banner */}
              <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-3xl p-5 shadow-xs space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                  NEPAL SOCIAL COMMERCE
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold leading-snug">
                  100% Cash on Delivery & Direct Store Support
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Every order is verified with authentic shops and inspected before dispatch across Kathmandu and nationwide.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* 4. POSTS TAB */}
      {activeTab === 'posts' && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                  {post.authorAvatar ? (
                    <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    post.authorName.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{post.authorName}</h4>
                  <p className="text-[11px] text-slate-400">{formatRelativeTime(post.createdAt)}</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">{post.content}</p>
              {renderPostPhotos(post)}
            </article>
          ))}
        </div>
      )}

      {/* 5. FOLLOWING TAB */}
      {activeTab === 'following' && (
        <div className="space-y-4 w-full">
          <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-blue-600" />
                <span>Stores & Creators You Follow</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Stay connected with your favorite storefronts</p>
            </div>
            <Link
              to="/shops"
              className="text-xs font-bold text-blue-600 hover:underline px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
            >
              Browse All Shops
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {shops.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group hover:border-blue-400"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/shops/${s.id}`} className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-xs overflow-hidden shrink-0 border border-slate-100">
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          s.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {s.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md truncate uppercase">
                            {s.category || 'Store'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {s.description || 'Verified authentic vendor with nationwide fast shipping and Cash on Delivery.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/messages?userId=${s.ownerId}&shopName=${encodeURIComponent(s.name)}`}
                    className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chat Store</span>
                  </Link>
                  <Link
                    to={`/shops/${s.id}`}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>Visit Shop</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="space-y-4 w-full">
          <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-rose-600" />
                <span>Upcoming Events & Workshops</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Explore tech showcases, creator meetups, and local community gatherings</p>
            </div>
            <Link
              to="/create-event"
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl shadow-2xs transition-colors shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Host Event</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group hover:border-blue-400"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {ev.category || 'Event'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.eventDate || ev.date || 'Upcoming'}</span>
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {ev.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {ev.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{ev.location || 'Kathmandu, Nepal'}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Organizer: {ev.organizerName || ev.creatorName || 'Community Member'}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToast('RSVP Confirmed! Notification sent.', 'success')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    Join Event
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. FREELANCING TAB (Redirects/Views direct Gigs) */}
      {activeTab === 'freelancing' && (
        <div className="space-y-4 w-full">
          <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5 text-emerald-600" />
                <span>Freelance Gigs & Contractor Opportunities</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Find freelance developer, design, and commerce roles in Nepal</p>
            </div>
            <Link
              to="/jobs"
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl shadow-2xs transition-colors shrink-0 flex items-center gap-1"
            >
              <span>Contractor Dashboard & Gigs</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {jobs.map((jb) => (
              <div
                key={jb.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group hover:border-blue-400"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {jb.type || 'Freelance'} · {jb.category || 'Tech'}
                    </span>
                    <span className="text-xs font-black text-emerald-600 tabular-nums">
                      {jb.salaryOrBudget || 'Negotiable'}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {jb.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Client: {jb.companyOrClient} · {jb.location || 'Remote'}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {jb.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Posted by {jb.posterName || 'Verified Recruiter'}
                  </span>
                  <Link
                    to={`/jobs?tab=gigs`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                  >
                    <span>View & Bid</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModalProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setQrModalProduct(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full space-y-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Product QR Scanner</span>
              </h3>
              <button
                type="button"
                onClick={() => setQrModalProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${window.location.origin}/products/${qrModalProduct.id}`
                )}`}
                alt="Product QR Code"
                className="w-44 h-44 object-contain mx-auto"
              />
            </div>
            <div className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
              <p className="font-extrabold text-slate-900 truncate">{qrModalProduct.name}</p>
              <p className="text-slate-500 truncate">Store: {qrModalProduct.shopName}</p>
              <p className="text-emerald-700 font-black tabular-nums">
                NPR {(qrModalProduct.price || 0).toLocaleString()} · Cash on Delivery
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/products/${qrModalProduct.id}`);
                  setCopiedQrUrl(true);
                  addToast('Product URL copied!', 'success');
                  setTimeout(() => setCopiedQrUrl(false), 2000);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedQrUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQrUrl ? 'Copied' : 'Copy Link'}</span>
              </button>
              <Link
                to={`/products/${qrModalProduct.id}`}
                onClick={() => setQrModalProduct(null)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl text-center shadow-xs"
              >
                Open Details
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxState && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none"
          onClick={() => setLightboxState(null)}
        >
          <div
            className="flex items-center justify-between text-white z-20 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxState(null)}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-xs font-bold bg-white/15 px-3 py-1.5 rounded-full tabular-nums">
              {lightboxState.index + 1} / {lightboxState.images.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxState(null)}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center relative my-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxState.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxState((prev) =>
                    prev
                      ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }
                      : null
                  );
                }}
                className="absolute left-2 sm:left-6 z-20 p-3 rounded-full bg-black/60 hover:bg-black/85 text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={lightboxState.images[lightboxState.index]}
              alt="Full view"
              className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300"
            />

            {lightboxState.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxState((prev) =>
                    prev
                      ? { ...prev, index: (prev.index + 1) % prev.images.length }
                      : null
                  );
                }}
                className="absolute right-2 sm:right-6 z-20 p-3 rounded-full bg-black/60 hover:bg-black/85 text-white transition-all cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {lightboxState.caption && (
            <div
              className="text-center text-white text-xs max-w-xl mx-auto space-y-1.5 pb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="line-clamp-2">{lightboxState.caption}</p>
            </div>
          )}
        </div>
      )}

      {/* STORY VIEWER MODAL */}
      {storyModalOpen && stories.length > 0 && (
        <StoryViewerModal
          stories={stories}
          initialIndex={activeStoryIndex}
          onClose={() => setStoryModalOpen(false)}
        />
      )}
    </div>
  );
};
