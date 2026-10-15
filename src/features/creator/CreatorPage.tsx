import React from 'react';
import {
  Palette,
  Sparkles,
  Video,
  Share2,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Gift,
  Camera,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CreatorPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-amber-600 p-6 sm:p-10 text-white shadow-xl shadow-purple-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase">
            <Palette className="w-3.5 h-3.5" /> Creator Hub Nepal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black">Turn Your Creativity into Income</h1>
          <p className="text-purple-100 text-xs sm:text-sm leading-relaxed">
            Create 24h stories, product unboxing posts, and video reviews for verified local brands in Nepal. Earn commission and Gift Coins on every sale your posts generate!
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/create-post"
              className="px-5 py-2.5 bg-white text-purple-900 rounded-xl font-bold text-xs hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> Create a Story / Post
            </Link>
            <Link
              to="/jobs?tab=gigs"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              Find Brand Collaborations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          to="/create-post?isStory=true"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 hover:border-purple-400 dark:hover:border-purple-500 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
              Shoppable Stories
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tag products directly in your 24-hour stories. Followers can tap and buy with instant Cash on Delivery.
            </p>
          </div>
          <div className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 pt-2">
            <span>Create Story</span> <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/wallet?tab=coins"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 hover:border-amber-400 dark:hover:border-amber-500 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
              Earn Gift Coins
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Get rewarded when users like, bookmark, or purchase through your reviews. Redeem coins directly into your wallet.
            </p>
          </div>
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-2">
            <span>Open Wallet</span> <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/jobs?tab=gigs"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              Brand Sponsorships
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connect directly with verified local store owners in Kathmandu, Pokhara, and Lalitpur looking for authentic creators.
            </p>
          </div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-2">
            <span>View Gigs</span> <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
};
