import React from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  ShieldCheck,
  Heart,
  Mail,
  MapPin,
  Phone,
  Truck,
  Sparkles,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { useBrandSettings } from '../../lib/branding';

export const Footer: React.FC = () => {
  const { logoUrl } = useBrandSettings();

  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800 mt-12 sm:mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="NEWARO"
                  className="h-8 w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                  N
                </div>
              )}
              <span className="font-black text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
                NEWARO
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Nepal’s premier local social-commerce and freelance ecosystem. Empowering independent store owners, artisans, and skilled creators with 100% Cash on Delivery trust.
            </p>

            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Gajuri, Dhading, Nepal</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a href="mailto:bishalxtha17@gmail.com" className="hover:text-white transition-colors">bishalxtha17@gmail.com</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a href="tel:+9779761409400" className="hover:text-white transition-colors">+977 9761409400</a>
              </div>
            </div>
          </div>

          {/* Column 1: Marketplace */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Marketplace</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/explore" className="hover:text-white transition-colors">
                  Explore Products
                </Link>
              </li>
              <li>
                <Link to="/shops" className="hover:text-white transition-colors">
                  Verified Stores
                </Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-white transition-colors">
                  Community Events
                </Link>
              </li>
              <li>
                <Link to="/nearby" className="hover:text-white transition-colors">
                  Nearby Shopping
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-white transition-colors">
                  Gigs & Freelance Jobs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Community & Creators */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Community</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/membership" className="hover:text-white transition-colors">
                  Membership Tiers
                </Link>
              </li>
              <li>
                <Link to="/creator" className="hover:text-white transition-colors">
                  Creator Hub
                </Link>
              </li>
              <li>
                <Link to="/news" className="hover:text-white transition-colors">
                  News & Blog
                </Link>
              </li>
              <li>
                <Link to="/wallet" className="hover:text-white transition-colors flex items-center gap-1">
                  <span>Gift Coins Wallet</span>
                  <Coins className="w-3 h-3 text-amber-400" />
                </Link>
              </li>
              <li>
                <Link to="/create-shop" className="hover:text-white transition-colors">
                  Open a Storefront
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Company (Working Links) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Company & Trust</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-white transition-colors font-semibold">
                  About NEWARO
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors font-semibold">
                  Contact & Support
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors font-semibold">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors font-semibold">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-white transition-colors">
                  Account Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature Badges Banner */}
        <div className="pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Truck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Cash on Delivery Across Nepal</p>
              <p className="text-[11px] text-slate-400">Inspect parcel before payment</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Verified Store Merchants</p>
              <p className="text-[11px] text-slate-400">Authentic local products & reviews</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Coins className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Earn Free Gift Coins</p>
              <p className="text-[11px] text-slate-400">Save Rs. NPR on future deliveries</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} NEWARO Technologies Nepal. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/contact" className="hover:text-white transition-colors">
              Help Desk
            </Link>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400">Crafted with pride in Nepal 🇳🇵</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
