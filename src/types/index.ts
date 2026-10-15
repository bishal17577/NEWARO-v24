export type UserRole = 'user' | 'shop_owner' | 'admin' | 'freelancer';

export interface EmailNotificationPrefs {
  orders: boolean;
  announcements: boolean;
  messages: boolean;
  comments: boolean;
  likes: boolean;
  follows: boolean;
  productUpdates: boolean;
  gigAlerts?: boolean;
  weeklyInsights?: boolean;
  thresholdAlerts?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  phone?: string;
  address?: string;
  city?: string;
  role: UserRole;
  createdAt: number;
  emailVerified?: boolean;
  welcomeEmailSentAt?: number;
  broadcastReadAt?: number;
  emailNotifications?: boolean;
  notificationPrefs?: {
    email?: Partial<EmailNotificationPrefs>;
  };
  followersCount?: number;
  followingCount?: number;
  isSeller?: boolean;
  isFreelancer?: boolean;
  freelancerTitle?: string;
  hourlyRate?: number;
  verifiedBadge?: boolean;
  isBanned?: boolean;
  giftCoins?: number;
  redeemedCodes?: string[];
  claimedTasks?: string[];
  lastDailyClaimAt?: number;
  dailyStreak?: number;
  referralCode?: string;
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    github?: string;
    linkedin?: string;
  };
}

export interface Shop {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  logoUrl: string;
  coverUrl?: string;
  phone: string;
  whatsapp?: string;
  address: string;
  city?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  rating: number;
  reviewCount: number;
  followersCount: number;
  createdAt: number;
  verified?: boolean;
  featured?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'blocked';
  approved?: boolean;
  isBlocked?: boolean;
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface ProductReview {
  id: string;
  productId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  verifiedPurchase?: boolean;
  createdAt: number;
}

export interface Product {
  id: string;
  shopId: string;
  shopName: string;
  shopLogo?: string;
  sellerId: string;
  sellerEmail?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  images: string[];
  deleteUrls?: string[];
  variants?: ProductVariant[];
  viewsCount?: number;
  likesCount?: number;
  ordersCount?: number;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  createdAt: number;
  sku?: string;
  warrantyPeriod?: string;
  brand?: string;
  specifications?: Record<string, string>;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  imageUrl?: string;
  mediaUrl: string;
  caption?: string;
  shopId?: string;
  shopName?: string;
  likesCount?: number;
  viewsCount?: number;
  createdAt: number;
  expiresAt: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorRole?: string;
  shopId?: string;
  shopName?: string;
  content: string;
  images?: string[];
  link?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  createdAt: number;
}

export interface EventItem {
  id: string;
  creatorId?: string;
  organizerId?: string;
  creatorName?: string;
  organizerName?: string;
  creatorEmail?: string;
  title: string;
  description: string;
  category?: string;
  date?: string;
  eventDate?: string;
  time?: string;
  location: string;
  bannerUrl?: string;
  interestedCount?: number;
  goingCount?: number;
  createdAt: number;
}

export interface JobItem {
  id: string;
  posterId: string;
  posterName?: string;
  posterEmail?: string;
  posterAvatar?: string;
  title: string;
  companyOrClient: string;
  type: 'full-time' | 'part-time' | 'freelance' | 'remote' | 'contract';
  category: string;
  location: string;
  salaryOrBudget?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: 'fixed' | 'hourly' | 'monthly';
  duration?: string;
  skills?: string[];
  imageUrl?: string;
  description: string;
  proposalsCount?: number;
  status?: 'open' | 'in_progress' | 'completed' | 'closed';
  deadline?: string;
  createdAt: number;
}

export interface JobProposal {
  id: string;
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail?: string;
  freelancerAvatar?: string;
  coverLetter: string;
  proposedRate: number;
  rateType: 'fixed' | 'hourly' | 'monthly';
  estimatedDays: number;
  status: 'submitted' | 'under_review' | 'accepted' | 'declined';
  createdAt: number;
}

export interface FreelancerGoal {
  id: string;
  userId: string;
  title: string;
  targetMetric: 'revenue' | 'completed_gigs' | 'hours' | 'proposals_sent' | 'rating';
  targetValue: number;
  currentValue: number;
  unit: string;
  period: 'weekly' | 'monthly' | 'quarterly';
  deadline?: string;
  achieved?: boolean;
  createdAt: number;
}

export interface AlertThresholdConfig {
  minWeeklyRevenue: number;
  maxPendingMilestoneDays: number;
  minClientRating: number;
  maxProposalResponseTimeHours: number;
  minAcceptedProposalsTarget: number;
  enableEmailAlerts: boolean;
  enableInAppAlerts: boolean;
  enablePushAlerts: boolean;
  frequency: 'realtime' | 'daily_summary' | 'weekly';
}

export interface WeeklyInsightReport {
  id: string;
  userId: string;
  weekLabel: string;
  generatedAt: number;
  headline: string;
  summary: string;
  earningsNpr: number;
  goalProgressPercent: number;
  alertEvaluations: Array<{
    metric: string;
    status: 'healthy' | 'warning' | 'critical';
    message: string;
  }>;
  actionableRecommendations: string[];
  projectedMonthEndNpr: number;
}

export interface CartItem {
  productId: string;
  shopId: string;
  shopName: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedVariants?: Record<string, string>;
  stock: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  deliveryOption?: 'standard' | 'express';
  fulfilment?: 'seller' | 'newaro_rider' | 'pickup';
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  sellerId: string;
  shopId: string;
  shopName: string;
  shopOwnerEmail?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee?: number;
  total: number;
  shippingAddress: string;
  city?: string;
  paymentMethod: 'COD';
  status: OrderStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatProductSnippet {
  id: string;
  name: string;
  price: number;
  image?: string;
  shopId?: string;
  shopName?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  imageUrl?: string;
  imageThumbUrl?: string;
  fileUrl?: string;
  fileName?: string;
  linkUrl?: string;
  product?: ChatProductSnippet;
  pinned?: boolean;
  replyToId?: string;
  replyToText?: string;
  reactions?: Record<string, string>;
  createdAt: number;
  read: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ChatConversation {
  id: string;
  participants: string[];
  shopId?: string;
  shopOwnerEmail?: string;
  pinnedMessage?: string;
  participantDetails: {
    [uid: string]: {
      name: string;
      email?: string;
      avatar?: string;
      shopName?: string;
      shopId?: string;
      online?: boolean;
      lastSeen?: number;
    };
  };
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: { [uid: string]: number };
  isRequest?: boolean;
  updatedAt: number;
}

export type AnnouncementAudience = 'all' | 'shop_owners' | 'customers' | 'freelancers';

export interface AnnouncementRecord {
  id: string;
  title: string;
  message?: string;
  imageUrl?: string;
  link?: string;
  createdAt: number;
  sentBy: string;
  audience: AnnouncementAudience;
  counts: {
    sent: number;
    failed: number;
    skipped: number;
    remaining: number;
  };
  remainingRecipients?: string[];
}

export type NotificationType =
  | 'order_placed'
  | 'order_status'
  | 'like'
  | 'follow'
  | 'comment'
  | 'message'
  | 'product_update'
  | 'shop_approved'
  | 'welcome'
  | 'system'
  | 'announcement'
  | 'gig_proposal'
  | 'gig_accepted'
  | 'threshold_alert'
  | 'weekly_report';

export interface NotificationItem {
  id: string;
  recipientId: string;
  userId?: string;
  audience?: AnnouncementAudience;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  linkTitle?: string;
  actionUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  metadata?: any;
  badge?: string;
  imageUrl?: string;
  read: boolean;
  createdAt: number;
}

export interface ApiKeyEntry {
  id: string;
  provider: 'imgbb' | 'gemini' | 'resend';
  label: string;
  key: string;
  addedBy: string;
  addedByName?: string;
  addedByEmail?: string;
  enabled: boolean;
  active?: boolean;
  quotaExhausted?: boolean;
  priority: number;
  failCount: number;
  usageCount: number;
  lastUsedAt?: number;
  createdAt: number;
}

export interface RedeemCode {
  id: string;
  code: string;
  coins: number;
  coinAmount?: number;
  description?: string;
  maxUses: number;
  usedCount: number;
  usedBy: string[];
  active: boolean;
  expiresAt?: number;
  createdAt: number;
}

export interface CoinTarget {
  id: string;
  title: string;
  description: string;
  coins: number;
  active: boolean;
  claimedBy: string[];
  createdAt: number;
}

export interface PlatformConfig {
  bannerEnabled: boolean;
  bannerText: string;
  bannerLink: string;
  announcementText?: string;
  announcementActive?: boolean;
  showHeroBanner?: boolean;
  showStoriesBar: boolean;
  showQuickComposer: boolean;
  showFeaturedProducts: boolean;
  showFeaturedStores: boolean;
  enableAiAssistant?: boolean;
  enableGiftCoins?: boolean;
  requireShopApproval: boolean;
  standardDeliveryFee?: number;
  expressDeliveryFee?: number;
  minimumOrderNpr?: number;
}
