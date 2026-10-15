import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { SeoManager } from './lib/seo';
import { DragonCursor } from './components/effects/DragonCursor';
const HomePage = lazy(() => import('./features/feed/HomePage').then((m) => ({ default: m.HomePage })));
const ExplorePage = lazy(() => import('./features/explore/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const ShopsPage = lazy(() => import('./features/shops/ShopsPage').then((m) => ({ default: m.ShopsPage })));
const ShopDetailPage = lazy(() => import('./features/shops/ShopDetailPage').then((m) => ({ default: m.ShopDetailPage })));
const ShopDashboardPage = lazy(() => import('./features/shops/ShopDashboardPage').then((m) => ({ default: m.ShopDashboardPage })));
const CreateShopPage = lazy(() => import('./features/shops/CreateShopPage').then((m) => ({ default: m.CreateShopPage })));
const ProductDetailPage = lazy(() => import('./features/products/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CreateProductPage = lazy(() => import('./features/products/CreateProductPage').then((m) => ({ default: m.CreateProductPage })));
const CreatePostPage = lazy(() => import('./features/feed/CreatePostPage').then((m) => ({ default: m.CreatePostPage })));
const CreateEventPage = lazy(() => import('./features/events/CreateEventPage').then((m) => ({ default: m.CreateEventPage })));
const JobsPage = lazy(() => import('./features/jobs/JobsPage').then((m) => ({ default: m.JobsPage })));
const CreateJobPage = lazy(() => import('./features/jobs/CreateJobPage').then((m) => ({ default: m.CreateJobPage })));
const CheckoutPage = lazy(() => import('./features/cart/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrdersPage = lazy(() => import('./features/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const AnalyticsDashboardPage = lazy(() => import('./features/dashboard/AnalyticsDashboardPage').then((m) => ({ default: m.AnalyticsDashboardPage })));
const ChatPage = lazy(() => import('./features/chat/ChatPage').then((m) => ({ default: m.ChatPage })));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const MembershipPage = lazy(() => import('./features/membership/MembershipPage').then((m) => ({ default: m.MembershipPage })));
const CreatorPage = lazy(() => import('./features/creator/CreatorPage').then((m) => ({ default: m.CreatorPage })));
const NewsPage = lazy(() => import('./features/news/NewsPage').then((m) => ({ default: m.NewsPage })));
const NearbyPage = lazy(() => import('./features/nearby/NearbyPage').then((m) => ({ default: m.NearbyPage })));
const FriendsPage = lazy(() => import('./features/friends/FriendsPage').then((m) => ({ default: m.FriendsPage })));
const FavoritesPage = lazy(() => import('./features/favorites/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const WalletPage = lazy(() => import('./features/wallet/WalletPage').then((m) => ({ default: m.WalletPage })));
const AppsPage = lazy(() => import('./features/apps/AppsPage').then((m) => ({ default: m.AppsPage })));
const BookingPage = lazy(() => import('./features/booking/BookingPage').then((m) => ({ default: m.BookingPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const EditProfilePage = lazy(() => import('./features/profile/EditProfilePage').then((m) => ({ default: m.EditProfilePage })));
const AdminPage = lazy(() => import('./features/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const AuthPage = lazy(() => import('./features/auth/AuthPage').then((m) => ({ default: m.AuthPage })));
const NotFoundPage = lazy(() => import('./components/layout/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
import { ProtectedRoute } from './components/auth/ProtectedRoute';
const EventsPage = lazy(() => import('./features/events/EventsPage').then((m) => ({ default: m.EventsPage })));
const AboutPage = lazy(() => import('./features/info/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./features/info/ContactPage').then((m) => ({ default: m.ContactPage })));
const TermsPage = lazy(() => import('./features/info/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./features/info/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SeoManager />
        <DragonCursor />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="shops" element={<ShopsPage />} />
            <Route path="apps" element={<AppsPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="shops/:shopId" element={<ShopDetailPage />} />
            <Route path="products/:productId" element={<ProductDetailPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="nearby" element={<NearbyPage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="membership" element={<MembershipPage />} />
            <Route path="creator" element={<CreatorPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/:userId" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Protected Pages - Login required (redirect to /auth if guest) */}
            <Route
              path="checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="messages"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-shop"
              element={
                <ProtectedRoute>
                  <CreateShopPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-product"
              element={
                <ProtectedRoute>
                  <CreateProductPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-post"
              element={
                <ProtectedRoute>
                  <CreatePostPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-event"
              element={
                <ProtectedRoute>
                  <CreateEventPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-job"
              element={
                <ProtectedRoute>
                  <CreateJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="shop-dashboard"
              element={
                <ProtectedRoute>
                  <ShopDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="wallet"
              element={
                <ProtectedRoute>
                  <WalletPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="favourites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit-profile"
              element={
                <ProtectedRoute>
                  <EditProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            <Route path="auth" element={<AuthPage />} />
            <Route path="login" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
