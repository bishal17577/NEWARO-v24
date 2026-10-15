import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Compass,
  MapPin,
  User as UserIcon,
  Search,
  MessageSquare,
  Bell,
  Plus,
  Sparkles,
  ShieldCheck,
  Calendar,
  Briefcase,
  Package,
  Store,
  Settings,
  Camera,
  Loader2,
  LayoutDashboard,
  Moon,
  Sun,
  Ban,
  LogOut,
  Crown,
  TrendingUp,
  Newspaper,
  Coins,
  Users,
  ChevronLeft,
  ChevronRight,
  Palette,
  Target,
  Edit3,
  Heart,
  Bus,
  AppWindow,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useCartStore, useUIStore } from '../../lib/store';
import { useLiveBadges } from '../../hooks/useLiveBadges';
import { useBrandSettings } from '../../lib/branding';
import { usePlatformConfig } from '../../lib/platformConfig';
import { useSettings, playUiSound } from '../../lib/settings';
import { useGiftCoins } from '../../lib/giftCoins';
import { uploadToImgBB } from '../../lib/imgbb';
import { CartDrawer } from '../../features/cart/CartDrawer';
import { AiAssistantModal } from '../../features/ai/AiAssistantModal';
import { SearchModal } from './SearchModal';
import { CreateModal } from './CreateModal';
import { PwaInstallBanner } from './PwaInstallBanner';
import { Footer } from './Footer';
import { ToastContainer, useToast } from '../ui/Toast';
import { UserRole } from '../../types';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, role, isAdmin, isShopOwner, isFreelancer, isBanned, logout, switchRole } =
    useAuth();
  const { getTotalItems, openCart } = useCartStore();
  const { openAiModal, setSearchOpen } = useUIStore();
  const { unreadNotifications, unreadChats } = useLiveBadges();
  const { logoUrl, saveLogo } = useBrandSettings();
  const { config: platformConfig } = usePlatformConfig();
  const { settings, updateSetting } = useSettings();
  const { balance: coinBalance } = useGiftCoins(user?.uid, profile?.giftCoins);
  const { addToast } = useToast();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [uploadingBrandLogo, setUploadingBrandLogo] = useState(false);
  const brandLogoInputRef = useRef<HTMLInputElement>(null);
  const createDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Desktop sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('newaro_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    const nextState = !sidebarCollapsed;
    setSidebarCollapsed(nextState);
    playUiSound('tap');
    try {
      localStorage.setItem('newaro_sidebar_collapsed', String(nextState));
    } catch {}
  };

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileDrawerOpen]);

  // Close dropdowns & drawer on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        createDropdownRef.current &&
        !createDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCreateDropdownOpen(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsCreateDropdownOpen(false);
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close mobile drawer & dropdowns and reset scroll on route changes
  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setIsCreateDropdownOpen(false);
    setIsProfileDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const totalCartCount = getTotalItems();
  const isChatRoute =
    location.pathname.startsWith('/chat') || location.pathname.startsWith('/messages');
  const isInsideChatConversation =
    isChatRoute &&
    (location.search.includes('userId=') || location.search.includes('shopId='));
  const isProductDetailRoute = location.pathname.startsWith('/products/');
  const hideMobileBottomNav = isInsideChatConversation || isProductDetailRoute;

  // Grouped Sidebar & Drawer Navigation Architecture (Strictly Role-Filtered)
  const navigationGroups = useMemo(() => {
    // 1. Guest Experience (Not logged in)
    if (!user) {
      return [
        {
          title: 'DISCOVER',
          items: [
            { label: 'Home', path: '/', icon: Home },
            { label: 'Explore', path: '/explore', icon: Compass },
            { label: 'Shops', path: '/shops', icon: Store },
            { label: 'Events', path: '/events', icon: Calendar },
            { label: 'Nearby', path: '/nearby', icon: MapPin },
            { label: 'Jobs & Gigs', path: '/jobs', icon: Briefcase },
          ],
        },
        {
          title: 'COMMUNITY',
          items: [
            { label: 'Membership', path: '/membership', icon: Crown },
            { label: 'Creator Hub', path: '/creator', icon: Palette },
            { label: 'News & Blog', path: '/news', icon: Newspaper },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { label: 'Sign In / Register', path: '/auth', icon: UserIcon },
            { label: 'AI Assistant', action: () => openAiModal(), icon: Sparkles, isAction: true },
          ],
        },
      ];
    }

    // 2. Logged In User Experience (Role-tailored)
    // Create items according to role
    const createItems = [];
    if (isAdmin) {
      createItems.push(
        { label: 'Create Post', path: '/create-post', icon: Edit3 },
        { label: 'Add Product', path: '/create-product', icon: Package },
        { label: 'Create Shop', path: '/create-shop', icon: ShoppingBag },
        { label: 'Post Gig / Job', path: '/create-job', icon: Briefcase },
        { label: 'Host Event', path: '/create-event', icon: Calendar }
      );
    } else if (isShopOwner) {
      createItems.push(
        { label: 'Add Product', path: '/create-product', icon: Package },
        { label: 'Create Post', path: '/create-post', icon: Edit3 },
        { label: 'Host Event', path: '/create-event', icon: Calendar },
        { label: 'Post Job', path: '/create-job', icon: Briefcase }
      );
    } else if (isFreelancer) {
      createItems.push(
        { label: 'Post Gig / Job', path: '/create-job', icon: Briefcase },
        { label: 'Create Post', path: '/create-post', icon: Edit3 },
        { label: 'Host Event', path: '/create-event', icon: Calendar }
      );
    } else {
      // Regular Buyer / Member
      createItems.push(
        { label: 'Create Post', path: '/create-post', icon: Edit3 },
        { label: 'Open Shop', path: '/create-shop', icon: ShoppingBag },
        { label: 'Post Gig / Job', path: '/create-job', icon: Briefcase },
        { label: 'Host Event', path: '/create-event', icon: Calendar }
      );
    }

    // Business items according to role
    const businessItems = [];
    businessItems.push({ label: 'Jobs & Gigs', path: '/jobs', icon: Briefcase });
    if (isFreelancer || isAdmin) {
      businessItems.push({ label: 'Contractor Hub', path: '/jobs?tab=dashboard', icon: Target });
    }
    if (isShopOwner || isAdmin) {
      businessItems.push({ label: 'Seller Dashboard', path: '/shop-dashboard', icon: LayoutDashboard });
      businessItems.push({ label: 'Store Analytics', path: '/analytics', icon: TrendingUp });
    }
    businessItems.push(
      { label: 'My Orders', path: '/orders', icon: Package },
      { label: 'Saved Wishlist', path: '/favorites', icon: Heart },
      { label: 'Gift Coins Wallet', path: '/wallet', icon: Coins }
    );

    return [
      {
        title: 'MAIN',
        items: [
          { label: 'Home', path: '/', icon: Home },
          { label: 'Explore', path: '/explore', icon: Compass },
          { label: 'Apps & Tools', path: '/apps', icon: AppWindow },
          { label: 'Bus & Booking', path: '/booking', icon: Bus },
          { label: 'Shops', path: '/shops', icon: Store },
          { label: 'Events', path: '/events', icon: Calendar },
          { label: 'Nearby', path: '/nearby', icon: MapPin },
          { label: 'Friends', path: '/friends', icon: Users },
        ],
      },
      {
        title: 'CREATE',
        items: createItems,
      },
      {
        title: 'BUSINESS',
        items: businessItems,
      },
      {
        title: 'COMMUNITY',
        items: [
          { label: 'Messages', path: '/messages', icon: MessageSquare, badgeCount: unreadChats },
          { label: 'Notifications', path: '/notifications', icon: Bell, badgeCount: unreadNotifications },
          { label: 'Membership', path: '/membership', icon: Crown },
          { label: 'Creator Hub', path: '/creator', icon: Palette },
          { label: 'News & Blog', path: '/news', icon: Newspaper },
        ],
      },
      {
        title: 'ACCOUNT',
        items: [
          { label: 'Settings', path: '/settings', icon: Settings },
          { label: 'Profile', path: `/profile/${user.uid}`, icon: UserIcon },
          { label: 'AI Assistant', action: () => openAiModal(), icon: Sparkles, isAction: true },
          ...(isAdmin ? [{ label: 'Admin Panel', path: '/admin', icon: ShieldCheck }] : []),
        ],
      },
    ];
  }, [user, isAdmin, isShopOwner, isFreelancer, unreadChats, unreadNotifications]);

  const isActive = (path?: string) => {
    if (!path) return false;
    const currentPath = location.pathname;
    const [targetBase, targetQuery] = path.split('?');

    if (targetQuery) {
      return currentPath === targetBase && location.search.includes(targetQuery);
    }

    if (targetBase === '/') {
      return currentPath === '/';
    }

    // Prevent /jobs from highlighting when on /jobs?tab=dashboard
    if (targetBase === '/jobs' && location.search.includes('tab=dashboard')) {
      return false;
    }

    return currentPath === targetBase || (currentPath.startsWith(targetBase + '/') && targetBase !== '/');
  };

  const handleNavClick = (path: string) => {
    playUiSound('tap');
    setIsMobileDrawerOpen(false);
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new CustomEvent('newaro:refresh_feed'));
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleDarkMode = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSetting('theme', nextTheme);
    addToast(`${nextTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'info');
  };

  const handleAdminQuickLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBrandLogo(true);
    try {
      const res = await uploadToImgBB(file);
      await saveLogo(res.url, user?.email || 'admin');
      addToast('NEWARO logo updated!', 'success');
    } catch {
      addToast('Failed to upload brand logo', 'error');
    } finally {
      setUploadingBrandLogo(false);
      if (brandLogoInputRef.current) brandLogoInputRef.current.value = '';
    }
  };

  if (isBanned) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Ban className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900">Account Suspended</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your account ({user?.email}) has been suspended by the platform administrator.
          </p>
          <button
            onClick={() => logout()}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col text-[#172033] selection:bg-blue-600 selection:text-white">
      <PwaInstallBanner />

      {/* 1. FIXED TOP HEADER (Height: 56px on mobile, 64px on desktop, fixed top-0 with safe-area support) */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-[#E7EAF0] shadow-xs pt-[env(safe-area-inset-top)]">
        <div className="w-full h-full px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3">
          {/* Header Left: Mobile Drawer Trigger / Desktop Collapse Toggle + Logo + Search */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {/* Mobile Hamburger Drawer Menu Button */}
            <button
              type="button"
              onClick={() => {
                playUiSound('tap');
                setIsMobileDrawerOpen(true);
              }}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            {/* Desktop Sidebar Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden md:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle Sidebar Navigation"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {/* Brand Logo & Name */}
            <button
              onClick={() => handleNavClick('/')}
              className="flex items-center gap-1.5 sm:gap-2 group text-left cursor-pointer shrink-0"
              title="NEWARO Home"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="NEWARO"
                  className="h-7 sm:h-8 w-auto max-w-[100px] sm:max-w-[140px] object-contain rounded-lg"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm sm:base shadow-xs group-hover:bg-blue-700 transition-colors shrink-0">
                  N
                </div>
              )}
              <span className="font-black text-sm sm:text-lg tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap max-[420px]:hidden">
                NEWARO
              </span>
            </button>

            {isAdmin && (
              <>
                <input
                  type="file"
                  ref={brandLogoInputRef}
                  accept="image/*"
                  onChange={handleAdminQuickLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => brandLogoInputRef.current?.click()}
                  disabled={uploadingBrandLogo}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0 cursor-pointer hidden lg:inline-flex"
                  title="Admin: Quick Logo Upload"
                >
                  {uploadingBrandLogo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}

            {/* Search Input Button - Compact on mobile, full width on desktop */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 max-sm:flex-none max-sm:w-10 max-sm:h-10 max-sm:p-0 sm:flex-1 sm:max-w-md lg:max-w-lg rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 text-xs font-semibold transition-all border border-transparent hover:border-slate-200 min-w-0 cursor-pointer"
              title="Search marketplace and gigs"
            >
              <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-500 sm:text-slate-400 shrink-0" />
              <span className="truncate text-left hidden sm:block">Search...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white rounded-md border border-slate-200 ml-auto shrink-0 shadow-2xs">
                /
              </kbd>
            </button>
          </div>

          {/* Header Right: Community, Messages, Notifications, Cart, Create, Profile */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {/* Friends / Community Link (Desktop / Tablet) */}
            <Link
              to="/friends"
              className={`p-2 rounded-xl transition-colors shrink-0 hidden sm:inline-flex ${
                isActive('/friends')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              }`}
              title="Friends & Community"
            >
              <Users className="w-4.5 h-4.5" />
            </Link>

            {/* Messages Icon with unread badge */}
            <Link
              to="/messages"
              className={`p-2 rounded-xl transition-colors relative shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center ${
                isActive('/chat') || isActive('/messages')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              }`}
              title="Messages"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              {unreadChats > 0 && (
                <span className="absolute top-1 right-1 px-1 min-w-[15px] h-3.5 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {unreadChats > 99 ? '99+' : unreadChats}
                </span>
              )}
            </Link>

            {/* Notifications Icon with live unread badge */}
            <Link
              to="/notifications"
              className={`p-2 rounded-xl transition-colors relative shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center ${
                isActive('/notifications')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              }`}
              title="Notification Hub"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 px-1 min-w-[15px] h-3.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>

            {/* Shopping Cart Button */}
            <button
              onClick={openCart}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors relative shrink-0 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              {totalCartCount > 0 && (
                <span className="absolute top-1 right-1 px-1 min-w-[15px] h-3.5 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Gift Coins Wallet Badge (Desktop) */}
            <Link
              to="/wallet"
              className="hidden lg:flex px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-800 text-xs font-black items-center gap-1 transition-all shrink-0 tabular-nums shadow-2xs"
              title="Gift Coins Balance"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{coinBalance}</span>
            </Link>

            {/* Quick + Create Dropdown Menu (Desktop / Tablet) */}
            <div className="relative hidden sm:block" ref={createDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  playUiSound('tap');
                  if (!user) {
                    addToast('Please sign in to publish content or listings', 'info');
                    navigate('/auth?redirect=/create-post');
                    return;
                  }
                  setIsCreateDropdownOpen(!isCreateDropdownOpen);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                title="Create content or listing"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
                <ChevronDown className="w-3 h-3 text-blue-200" />
              </button>

              {isCreateDropdownOpen && user && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#E7EAF0] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Create for {role.replace('_', ' ')}
                    </span>
                  </div>
                  {(isAdmin
                    ? [
                        { label: 'Create Post', path: '/create-post', icon: Edit3, desc: 'Share story update' },
                        { label: 'Add Product', path: '/create-product', icon: Package, desc: 'List item to shop' },
                        { label: 'Open Shop', path: '/create-shop', icon: ShoppingBag, desc: 'Sell on NEWARO' },
                        { label: 'Post Gig / Job', path: '/create-job', icon: Briefcase, desc: 'Hire freelancers' },
                        { label: 'Host Event', path: '/create-event', icon: Calendar, desc: 'Community meetup' },
                      ]
                    : isShopOwner
                    ? [
                        { label: 'Add Product', path: '/create-product', icon: Package, desc: 'List item in shop' },
                        { label: 'Create Post', path: '/create-post', icon: Edit3, desc: 'Share story update' },
                        { label: 'Seller Dashboard', path: '/shop-dashboard', icon: LayoutDashboard, desc: 'Manage store orders' },
                        { label: 'Host Event', path: '/create-event', icon: Calendar, desc: 'Community meetup' },
                      ]
                    : isFreelancer
                    ? [
                        { label: 'Post Gig / Service', path: '/create-job', icon: Briefcase, desc: 'Offer freelance service' },
                        { label: 'Create Post', path: '/create-post', icon: Edit3, desc: 'Share story update' },
                        { label: 'Contractor Hub', path: '/jobs?tab=dashboard', icon: Target, desc: 'View gig proposals' },
                        { label: 'Host Event', path: '/create-event', icon: Calendar, desc: 'Community meetup' },
                      ]
                    : [
                        { label: 'Create Post', path: '/create-post', icon: Edit3, desc: 'Share story update' },
                        { label: 'Open Shop', path: '/create-shop', icon: ShoppingBag, desc: 'Sell products with COD' },
                        { label: 'Post Gig / Job', path: '/create-job', icon: Briefcase, desc: 'Hire freelancers' },
                        { label: 'Host Event', path: '/create-event', icon: Calendar, desc: 'Community meetup' },
                      ]
                  ).map((cItem, cIdx) => {
                    const Icon = cItem.icon;
                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => {
                          setIsCreateDropdownOpen(false);
                          handleNavClick(cItem.path);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {cItem.label}
                          </p>
                          <p className="text-[10px] text-slate-400">{cItem.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Profile Avatar & Menu Dropdown */}
            {user ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('tap');
                    setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  }}
                  className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-blue-600/30 transition-all cursor-pointer shrink-0 min-w-[36px] min-h-[36px] justify-center"
                  title="Account Menu"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden border border-slate-200 shrink-0">
                    {profile?.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt={profile.displayName || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile?.displayName?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-68 bg-white rounded-2xl border border-[#E7EAF0] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                    {/* User Card Header */}
                    <div className="px-3.5 py-2 border-b border-slate-100 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                        {profile?.photoURL ? (
                          <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          profile?.displayName?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {profile?.displayName || 'User'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {isAdmin ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 text-[9px] font-black uppercase">
                              Admin
                            </span>
                          ) : isShopOwner ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 text-[9px] font-black uppercase">
                              Store Owner
                            </span>
                          ) : isFreelancer ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-purple-50 text-purple-700 text-[9px] font-black uppercase">
                              Freelancer
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[9px] font-black uppercase">
                              Member
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5">
                            <Coins className="w-2.5 h-2.5 text-amber-500" />
                            <span>{coinBalance}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Role Quick Switcher */}
                    <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>Role Mode</span>
                        <span className="capitalize text-slate-800 font-extrabold">{role.replace('_', ' ')}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await switchRole('user');
                            addToast('Switched to Member mode', 'info');
                          }}
                          className={`py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            role === 'user'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          Member
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await switchRole('shop_owner');
                            addToast('Switched to Store Owner mode', 'info');
                          }}
                          className={`py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            role === 'shop_owner'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          Store
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await switchRole('freelancer');
                            addToast('Switched to Freelancer mode', 'info');
                          }}
                          className={`py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            role === 'freelancer'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          Freelance
                        </button>
                      </div>
                    </div>

                    {/* Nav Links */}
                    <div className="py-1 text-xs font-semibold text-slate-700 divide-y divide-slate-50">
                      <div className="space-y-0.5 px-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            navigate(`/profile/${user.uid}`);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <span>View Profile</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            navigate('/orders');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Package className="w-4 h-4 text-slate-400" />
                          <span>My Orders</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            navigate('/favorites');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Heart className="w-4 h-4 text-slate-400" />
                          <span>Saved Wishlist</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            navigate('/wallet?tab=coins');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Coins className="w-4 h-4 text-amber-500" />
                          <span>Gift Coins Wallet</span>
                        </button>

                        {(isFreelancer || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              navigate('/jobs?tab=dashboard');
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl hover:bg-purple-50 text-purple-700 font-bold flex items-center gap-2 text-left cursor-pointer"
                          >
                            <Target className="w-4 h-4 text-purple-600" />
                            <span>Contractor Performance</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-0.5 px-1.5 pt-1">
                        {(isShopOwner || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              navigate('/shop-dashboard');
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl hover:bg-blue-50 text-blue-700 font-bold flex items-center gap-2 text-left cursor-pointer"
                          >
                            <LayoutDashboard className="w-4 h-4 text-blue-600" />
                            <span>Seller Dashboard</span>
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              navigate('/admin');
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-rose-700 font-bold flex items-center gap-2 text-left cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-rose-600" />
                            <span>Admin Panel</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            navigate('/settings');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Account Settings</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            toggleDarkMode();
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            {settings.theme === 'dark' ? (
                              <Sun className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Moon className="w-4 h-4 text-slate-400" />
                            )}
                            <span>Dark Theme</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {settings.theme}
                          </span>
                        </button>
                      </div>

                      {/* Sign Out Action */}
                      <div className="px-1.5 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setIsProfileDropdownOpen(false);
                            await logout();
                            playUiSound('tap');
                            addToast('You have signed out successfully.', 'info');
                            navigate('/');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="text-xs font-bold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. SLIDE-IN NAVIGATION DRAWER FOR MOBILE (Smooth left slide, dimmed backdrop, touch-friendly) */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-[84vw] max-w-[320px] bg-white z-50 shadow-2xl flex flex-col md:hidden transition-transform duration-200 ease-in-out select-none ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header with user card & close button */}
        <div className="p-4 border-b border-[#E7EAF0] flex items-center justify-between gap-3 pt-[calc(1rem+env(safe-area-inset-top))]">
          {user ? (
            <Link
              to={`/profile/${user.uid}`}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="flex items-center gap-2.5 min-w-0"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.displayName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">
                  {profile?.displayName || 'NEWARO Member'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md">
                    {coinBalance} Coins
                  </span>
                  {isAdmin && (
                    <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-md uppercase">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <Link to="/" className="flex items-center gap-2" aria-label="NEWARO home">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                N
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">NEWARO</p>
                <p className="text-[10px] text-slate-400">Social Commerce Nepal</p>
              </div>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close Navigation Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Links Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          {navigationGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item: any, iIdx) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  if (item.isAction) {
                    return (
                      <button
                        key={iIdx}
                        type="button"
                        onClick={() => {
                          setIsMobileDrawerOpen(false);
                          item.action();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left text-blue-600 hover:bg-blue-50/70 min-h-[44px]"
                      >
                        <Icon className="w-4 h-4 shrink-0 text-blue-600" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={iIdx}
                      type="button"
                      onClick={() => handleNavClick(item.path!)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap min-h-[44px] ${
                        active
                          ? 'bg-[#EFF6FF] text-blue-600 font-extrabold shadow-2xs'
                          : 'text-slate-600 hover:bg-[#F1F5F9] hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black tabular-nums">
                          {item.badgeCount > 99 ? '99+' : item.badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drawer Footer with Theme & Sign Out */}
        <div className="p-3 border-t border-[#E7EAF0] bg-slate-50/50 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-1">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-between cursor-pointer min-h-[40px]"
          >
            <span className="flex items-center gap-2">
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500" />
              )}
              <span>Dark Theme</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">{settings.theme}</span>
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => {
                setIsMobileDrawerOpen(false);
                logout();
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer min-h-[40px]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsMobileDrawerOpen(false);
                navigate('/auth');
              }}
              className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-xl text-center shadow-xs cursor-pointer min-h-[40px]"
            >
              Sign In to Your Account
            </button>
          )}
        </div>
      </aside>

      {/* 3. PERMANENT DESKTOP SIDEBAR (Visible ONLY on md: and above) */}
      <aside
        className={`hidden md:flex flex-col fixed top-14 sm:top-16 left-0 bottom-0 z-30 bg-white border-r border-[#E7EAF0] transition-all duration-200 ease-in-out select-none ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Scrollable Groups Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          {navigationGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!sidebarCollapsed ? (
                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>
              ) : (
                <div className="h-2 border-t border-slate-100 my-1 mx-2" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item: any, iIdx) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  if (item.isAction) {
                    return (
                      <button
                        key={iIdx}
                        type="button"
                        onClick={item.action}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap group cursor-pointer ${
                          sidebarCollapsed ? 'justify-center px-2' : ''
                        } text-blue-600 hover:bg-blue-50/70`}
                        title={item.label}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-blue-600 group-hover:scale-110 transition-transform" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={iIdx}
                      type="button"
                      onClick={() => handleNavClick(item.path!)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap group cursor-pointer relative ${
                        sidebarCollapsed ? 'justify-center px-2' : ''
                      } ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-extrabold shadow-2xs border-l-4 border-blue-600 pl-2'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-semibold'
                      }`}
                      title={item.label}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                          active ? 'text-blue-600' : 'text-slate-500'
                        }`}
                      />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      {item.badgeCount !== undefined && item.badgeCount > 0 && !sidebarCollapsed && (
                        <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black tabular-nums">
                          {item.badgeCount > 99 ? '99+' : item.badgeCount}
                        </span>
                      )}
                      {item.badgeCount !== undefined && item.badgeCount > 0 && sidebarCollapsed && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Pinned Bottom Collapse Toggle Control */}
        <div className="p-2.5 border-t border-[#E7EAF0] bg-white">
          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-2' : ''
            }`}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600">Collapse menu</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 4. MAIN SCROLLABLE CONTENT AREA (Responsive margins, sensible max-width, centered, and footer) */}
      <div
        className={`flex-1 transition-all duration-200 ease-in-out pt-14 sm:pt-16 min-w-0 ${
          sidebarCollapsed
            ? 'md:ml-[72px] md:w-[calc(100%-72px)]'
            : 'md:ml-[240px] md:w-[calc(100%-240px)]'
        } w-full overflow-x-hidden min-h-screen flex flex-col justify-between`}
      >
        <main
          className={`w-full flex-1 min-w-0 ${
            isInsideChatConversation
              ? 'p-0 pb-0'
              : isChatRoute
              ? 'p-1.5 sm:p-4 pb-20 md:pb-6'
              : isProductDetailRoute
              ? 'px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-28 sm:pb-12 max-w-7xl mx-auto'
              : 'px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 md:pb-12 max-w-7xl mx-auto'
          }`}
        >
          <ErrorBoundary resetKey={location.pathname}>
            <React.Suspense
              fallback={<div className="py-16 text-center text-sm font-semibold text-slate-500">Loading...</div>}
            >
              <div key={location.pathname} className="page-enter">
                <Outlet />
              </div>
            </React.Suspense>
          </ErrorBoundary>
        </main>

        {/* Global Desktop & Mobile Footer with About, Contact, Terms, and Privacy */}
        {!isInsideChatConversation && <Footer />}
      </div>

      {/* 5. MOBILE BOTTOM NAVIGATION (Fixed, compact ~60-64px, touch targets >= 44x44px, safe-area inset) */}
      {!hideMobileBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E7EAF0] pb-[env(safe-area-inset-bottom)] transition-all shadow-lg">
          <div className="grid grid-cols-5 h-14 sm:h-16 items-center px-1">
            <button
              onClick={() => handleNavClick('/')}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer min-h-[44px] ${
                isActive('/') ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] leading-none font-bold">Home</span>
            </button>
            <button
              onClick={() => handleNavClick('/explore')}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer min-h-[44px] ${
                isActive('/explore') ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] leading-none font-bold">Explore</span>
            </button>
            <div className="flex items-center justify-center -mt-3.5">
              <button
                onClick={() => {
                  playUiSound('pop');
                  setIsCreateModalOpen(true);
                }}
                className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer min-w-[44px] min-h-[44px]"
                aria-label="Create New Post or Listing"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => handleNavClick('/shops')}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer min-h-[44px] ${
                isActive('/shops') ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Store className="w-5 h-5" />
              <span className="text-[10px] leading-none font-bold">Shops</span>
            </button>
            <button
              onClick={() => handleNavClick(user ? `/profile/${user.uid}` : '/auth')}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer min-h-[44px] ${
                isActive('/profile') || isActive('/auth')
                  ? 'text-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px] leading-none font-bold">Profile</span>
            </button>
          </div>
        </nav>
      )}

      {/* FLOATING AI ASSISTANT BUTTON (Desktop only) */}
      {platformConfig.enableAiAssistant !== false && !isChatRoute && (
        <button
          onClick={() => openAiModal()}
          className="hidden md:flex fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3.5 rounded-full shadow-lg items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          aria-label="Open AI Assistant"
          title="Ask NEWARO AI"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
        </button>
      )}

      {/* SHARED MODALS & DRAWERS */}
      <CartDrawer />
      <AiAssistantModal />
      <SearchModal />
      <CreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <ToastContainer />
    </div>
  );
};
