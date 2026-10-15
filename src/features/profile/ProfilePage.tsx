import React, { useState, useEffect } from 'react';
import { ProfileTools } from './ProfileTools';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  Store,
  Briefcase,
  Share2,
  Edit3,
  MessageSquare,
  Sparkles,
  Heart,
  ExternalLink,
  Coins,
  Shield,
  Layers,
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { UserProfile, Shop, Post, JobItem } from '../../types';
import { playUiSound } from '../../lib/settings';
import { useToast } from '../../components/ui/Toast';
import { Shimmer } from '../../components/ui/Skeletons';

export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const targetUid = userId || currentUser?.uid;
  const isOwnProfile = currentUser && targetUid === currentUser.uid;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'shops' | 'gigs'>('posts');
  const [shops, setShops] = useState<Shop[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      if (!targetUid) {
        setLoading(false);
        return;
      }

      if (isOwnProfile && currentProfile) {
        setProfile(currentProfile);
      }

      try {
        const snap = await getDoc(doc(db, 'users', targetUid));
        if (snap.exists() && isMounted) {
          setProfile({ uid: snap.id, ...(snap.data() as any) });
        } else if (isMounted) {
          // A missing user document shows nothing. No made-up profile.
          setProfile(null);
        }

        // Fetch User's Shops
        const shopsSnap = await getDocs(
          query(collection(db, 'shops'), where('ownerId', '==', targetUid))
        );
        if (!shopsSnap.empty && isMounted) {
          const sList: Shop[] = [];
          shopsSnap.forEach((d) => sList.push({ id: d.id, ...(d.data() as any) }));
          setShops(sList);
        }

        // Fetch User's Posts
        const postsSnap = await getDocs(
          query(collection(db, 'posts'), where('authorId', '==', targetUid))
        );
        if (!postsSnap.empty && isMounted) {
          const pList: Post[] = [];
          postsSnap.forEach((d) => pList.push({ id: d.id, ...(d.data() as any) }));
          setPosts(pList);
        }
      } catch (err) {
        console.warn('Profile fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [targetUid, isOwnProfile, currentProfile]);

  const handleFollowToggle = () => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    playUiSound('pop');
    setIsFollowing(!isFollowing);
    addToast(isFollowing ? 'Unfollowed user' : 'Following user!', 'info');
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    addToast('Profile link copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Shimmer className="h-64 rounded-3xl" />
        <Shimmer className="h-12 w-full rounded-xl" />
        <Shimmer className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="text-center py-24 space-y-4 max-w-md mx-auto">
        <User className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile Not Found</h3>
        <p className="text-xs text-slate-500">
          The user profile you are looking for does not exist or has been removed.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {isOwnProfile && <ProfileTools uid={targetUid} />}

      {/* Profile Card Header */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative">
            <img
              src={
                profile?.photoURL ||
                ''
              }
              alt={profile?.displayName}
              className="w-24 h-24 sm:w-28 sm:spin-none rounded-2xl object-cover border-4 border-white dark:border-slate-800 shadow-md bg-slate-100"
            />
            {profile?.verifiedBadge && (
              <div
                className="absolute -bottom-1 -right-1 bg-amber-600 text-white p-1 rounded-full shadow-sm"
                title="Verified NEWARO Member"
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                  {profile?.displayName || 'NEWARO User'}
                  {profile?.role === 'admin' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200">
                      ADMIN
                    </span>
                  )}
                  {profile?.role === 'shop_owner' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200">
                      SELLER
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {profile?.email}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2">
                {isOwnProfile ? (
                  <Link
                    to="/edit-profile"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs ${
                        isFollowing
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <Link
                      to={`/chat?userId=${profile?.uid}`}
                      className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Send Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  </>
                )}
                <button
                  onClick={handleShare}
                  className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Share Profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl pt-1">
                {profile.bio}
              </p>
            )}

            {/* Meta Tags */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
              {profile?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {profile.city}, Nepal
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Joined{' '}
                {new Date(profile?.createdAt || Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <Coins className="w-3.5 h-3.5" /> {profile?.giftCoins || 0} Gift Coins
              </span>
            </div>

            {/* Counters */}
            <div className="flex items-center justify-center sm:justify-start gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {(profile?.followersCount || 0) + (isFollowing ? 1 : 0)}
                </span>{' '}
                <span className="text-slate-500">Followers</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {profile?.followingCount || 0}
                </span>{' '}
                <span className="text-slate-500">Following</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{shops.length}</span>{' '}
                <span className="text-slate-500">Stores</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'posts', label: 'Posts & Feed', icon: Layers },
          { id: 'shops', label: `Stores (${shops.length})`, icon: Store },
          { id: 'gigs', label: 'Services & Gigs', icon: Briefcase },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                isSelected
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Layers className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-500">No public posts shared yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-3">
                    {post.content}
                  </p>
                  {post.images && (post.images || []).length > 0 && (
                    <img
                      src={post.images[0]}
                      alt="Post attachment"
                      className="w-full h-44 object-cover rounded-xl"
                    />
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-rose-500 font-semibold">
                      <Heart className="w-3.5 h-3.5 fill-rose-500" /> {post.likesCount || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'shops' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shops.length === 0 ? (
            <div className="sm:col-span-2 text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Store className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-500">No active stores registered</p>
              {isOwnProfile && (
                <Link
                  to="/create-shop"
                  className="inline-block mt-3 px-3.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-semibold"
                >
                  Open a Store on NEWARO
                </Link>
              )}
            </div>
          ) : (
            shops.map((shop) => (
              <Link
                key={shop.id}
                to={`/shops/${shop.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5 hover:border-amber-500 transition-colors"
              >
                <img
                  src={
                    shop.logoUrl ||
                    ''
                  }
                  alt={shop.name}
                  className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 dark:border-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {shop.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">{shop.category}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-1">
                    {shop.city || 'Kathmandu, Nepal'}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'gigs' && (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <Briefcase className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-xs font-medium text-slate-500">
            {profile?.freelancerTitle
              ? `${profile.freelancerTitle} • Available for hire in Nepal`
              : 'Freelancer profile open for inquiries'}
          </p>
          <Link
            to="/jobs?tab=gigs"
            className="inline-block mt-3 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Explore Freelance Gigs
          </Link>
        </div>
      )}
    </div>
  );
};
