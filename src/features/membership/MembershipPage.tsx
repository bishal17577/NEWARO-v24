import React, { useState } from 'react';
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  HelpCircle,
  ArrowRight,
  X,
  CreditCard,
  Building,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { Link, useNavigate } from 'react-router-dom';

interface Tier {
  name: string;
  price: string;
  amountNpr: number;
  period: string;
  popular?: boolean;
  description: string;
  features: string[];
  current?: boolean;
  buttonLabel: string;
  buttonVariant: 'primary' | 'outline';
}

export const MembershipPage: React.FC = () => {
  const { user, profile, updateProfileData } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'esewa' | 'khalti' | 'bank' | 'cod'>('esewa');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
  const [enrolling, setEnrolling] = useState(false);

  const TIERS: Tier[] = [
    {
      name: 'Standard User',
      price: 'Free',
      amountNpr: 0,
      period: 'forever',
      description: 'Ideal for buyers, casual shoppers, and gig searchers across Nepal.',
      features: [
        'Browse all verified storefronts across Nepal',
        '100% Cash on Delivery (COD) order protection',
        'Direct chat with local shop owners',
        'Earn Gift Coins on reviews and daily quests',
        'Apply for freelance jobs and gigs',
      ],
      current: !profile?.role || profile.role === 'user',
      buttonLabel: 'Current Plan',
      buttonVariant: 'outline',
    },
    {
      name: 'Seller Pro',
      price: 'Rs. 999',
      amountNpr: 999,
      period: 'per month',
      popular: true,
      description: 'Built for active local merchants, e-commerce retailers, and high-growth stores.',
      features: [
        'Verified Seller Gold Badge on all listings',
        'Top ranking on Kathmandu & city local search',
        'Unlimited product catalog with optical zoom',
        'Automated AI product description generator',
        'Weekly AI automated performance reports',
        '0% platform commission on Cash on Delivery',
        'Priority customer support via WhatsApp',
      ],
      current: profile?.role === 'shop_owner',
      buttonLabel: profile?.role === 'shop_owner' ? 'Active Plan' : 'Upgrade to Seller Pro',
      buttonVariant: 'primary',
    },
    {
      name: 'Creator & Contractor VIP',
      price: 'Rs. 1,499',
      amountNpr: 1499,
      period: 'per month',
      description: 'Tailored for professional freelancers, agencies, and top Nepali creators.',
      features: [
        'Dedicated Freelancer Portfolio Showcase',
        'Custom goal tracking and alert thresholds',
        'Automated weekly contractor insight generation',
        'Featured placement on the Gigs & Jobs board',
        'Direct client contract billing tools',
        'VIP community badge and early feature access',
      ],
      current: profile?.isFreelancer || profile?.role === 'freelancer',
      buttonLabel: 'Join Creator VIP',
      buttonVariant: 'primary',
    },
  ];

  const handleSelectTier = (tier: Tier) => {
    if (tier.amountNpr === 0) {
      addToast('You already have access to the Free Standard plan.', 'info');
      return;
    }
    if (!user) {
      addToast('Please sign in first to upgrade membership', 'info');
      navigate('/auth');
      return;
    }
    playUiSound('tap');
    setSelectedTier(tier);
  };

  const handleConfirmUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier || !user) return;
    setEnrolling(true);
    playUiSound('success');

    try {
      // Simulate/apply upgrade
      const updates: any = {
        verifiedBadge: true,
      };
      if (selectedTier.name === 'Seller Pro') {
        updates.role = 'shop_owner';
        updates.isSeller = true;
      } else {
        updates.role = 'freelancer';
        updates.isFreelancer = true;
      }

      if (updateProfileData) {
        await updateProfileData(updates);
      }

      addToast(`Congratulations! Upgraded to ${selectedTier.name}. Verified badge activated!`, 'success');
      setSelectedTier(null);
    } catch {
      addToast(`Membership request submitted via ${paymentMethod.toUpperCase()}!`, 'success');
      setSelectedTier(null);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5" /> NEWARO Membership
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Supercharge Your Commerce & Freelance Business
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          From verified local retail stores to independent tech freelancers in Nepal, pick the plan that accelerates your reach and sales.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier, idx) => (
          <div
            key={idx}
            className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all ${
              tier.popular
                ? 'bg-gradient-to-b from-amber-500/10 via-white dark:via-slate-900 to-white dark:to-slate-900 border-2 border-amber-500 shadow-xl shadow-amber-500/10'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                Most Popular
              </div>
            )}

            <div>
              <div className="space-y-1 mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                <p className="text-xs text-slate-500 min-h-[32px]">{tier.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {tier.price}
                </span>
                <span className="text-xs text-slate-400 font-medium">/{tier.period}</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  What’s included:
                </p>
                {tier.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleSelectTier(tier)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tier.current
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default'
                    : tier.popular
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20'
                    : tier.buttonVariant === 'primary'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {tier.buttonLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade Checkout Modal */}
      {selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Upgrade to {selectedTier.name}
                </h3>
                <p className="text-xs text-slate-500">Confirm enrollment and payment options</p>
              </div>
              <button
                onClick={() => setSelectedTier(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpgrade} className="space-y-4">
              {/* Plan Summary */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-white">{selectedTier.name}</p>
                  <p className="text-[11px] text-slate-500">Includes verified badge & seller tools</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-amber-600 dark:text-amber-400">
                    {selectedTier.price}
                  </p>
                  <p className="text-[10px] text-slate-400">Monthly billing</p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method in Nepal
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'esewa', label: 'eSewa Mobile Wallet', icon: Smartphone },
                    { id: 'khalti', label: 'Khalti Digital Wallet', icon: Smartphone },
                    { id: 'bank', label: 'Direct Bank / FonePay', icon: Building },
                    { id: 'cod', label: 'Add to Next COD Order', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                          paymentMethod === m.id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact Phone */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nepali Contact Phone *
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9841000000"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTier(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Activate Membership</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQ Accordion Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-600" /> Frequently Asked Questions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white">How do payments work in Nepal?</h4>
            <p className="text-slate-500 leading-relaxed">
              We support eSewa, Khalti, bank transfers, and manual invoice verification for memberships. Marketplace product orders support 100% Cash on Delivery across Nepal.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white">Can I cancel anytime?</h4>
            <p className="text-slate-500 leading-relaxed">
              Yes, there are no long-term lock-in contracts. You can upgrade, downgrade, or cancel your subscription at any time without fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
