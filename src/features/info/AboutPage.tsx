import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Store,
  Users,
  MapPin,
  Heart,
  Truck,
  Award,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-8 sm:p-14 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>About NEWARO</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Nepal’s Local Social-Commerce & Freelance Ecosystem
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            We are building the economic bridge that empowers independent store owners, artisans, and skilled freelancers across Nepal to connect directly with local buyers with 100% Cash on Delivery protection.
          </p>
        </div>
      </div>

      {/* Core Mission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">Empowering Local Merchants</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            From handicraft workshops in Patan and Bhaktapur to modern boutique stores in Kathmandu and Pokhara, we give Nepali sellers professional online storefronts with zero platform barrier.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">100% Cash on Delivery Trust</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            We understand trust is everything in Nepal. Buyers inspect their physical package before paying a single rupee, creating maximum peace of mind for buyers across all 7 provinces.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/60">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">Freelancer & Talent Network</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Local businesses need logos, websites, marketing, and photography. NEWARO connects verified Nepali freelancers with local store owners through safe milestone contracts.
          </p>
        </div>
      </div>

      {/* Story & Values Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Our Story</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Why We Started NEWARO
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="space-y-4">
            <p>
              For years, Nepali small business owners and creators relied solely on foreign social media pages to display their products, answering endless comments manually and dealing with untracked courier shipments.
            </p>
            <p>
              NEWARO was designed to bring the warmth and community of a local neighborhood bazaar into the digital age: automated inventory, direct seller-to-buyer messaging, transparent Cash on Delivery logistics, and real customer reviews.
            </p>
          </div>
          <div className="space-y-4">
            <p>
              We believe in fair trade, digital sovereignty, and rewarding community members through our Gift Coins program. When you buy from a verified NEWARO storefront, your money directly supports a local family and maker in Nepal.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Headquartered in Kathmandu, Nepal</span>
                <span className="text-[11px] text-slate-500">Supporting merchants in Kathmandu, Pokhara, Lalitpur, Bhaktapur, and nationwide.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Ready to sell or shop on NEWARO?</h3>
          <p className="text-xs text-blue-100">Join thousands of local buyers, store merchants, and freelancers today.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/create-shop"
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Open a Storefront
          </Link>
          <Link
            to="/explore"
            className="px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-all border border-blue-400/30"
          >
            Explore Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
};
