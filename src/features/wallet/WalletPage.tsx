import React, { useState } from 'react';
import {
  Coins,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Sparkles,
  ShoppingBag,
  Award,
  Zap,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Check,
  Flame,
  Tag,
  Copy,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useGiftCoins, useCoinTargetsManager } from '../../lib/giftCoins';
import { playUiSound } from '../../lib/settings';
import { useToast } from '../../components/ui/Toast';
import { Link } from 'react-router-dom';

export const WalletPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { balance, ledger, redeemBonusCode, addCoins, claimDailyBonus, refresh } = useGiftCoins(user?.uid, profile?.giftCoins);
  const { targets, claimTarget } = useCoinTargetsManager();
  const { addToast } = useToast();

  const [promoCode, setPromoCode] = useState('');
  const [submittingPromo, setSubmittingPromo] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'credit' | 'debit'>('all');

  // Daily Streak Check-in
  const [dailyClaimed, setDailyClaimed] = useState<boolean>(() => {
    try {
      const last = localStorage.getItem('newaro_daily_checkin');
      if (!last) return false;
      const today = new Date().toDateString();
      return last === today;
    } catch {
      return false;
    }
  });

  const handleDailyCheckIn = async () => {
    if (dailyClaimed) {
      addToast('You already claimed your daily bonus today! Come back tomorrow.', 'info');
      return;
    }
    try {
      await claimDailyBonus();
      setDailyClaimed(true);
      try { localStorage.setItem('newaro_daily_checkin', new Date().toDateString()); } catch {}
      addToast('+25 Gift Coins added for daily check-in! Keep the streak going!', 'success');
    } catch (error: any) {
      if (String(error?.message || '').toLowerCase().includes('already claimed')) setDailyClaimed(true);
      addToast(error?.message || 'Daily bonus could not be claimed. Please try again.', 'error');
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoCode.trim().toUpperCase();
    if (!clean) return;
    setSubmittingPromo(true);

    try {
      const res = await redeemBonusCode(clean);
      if (res.ok) {
        addToast(res.message, 'success');
        setPromoCode('');
      } else {
        addToast(res.message || 'Invalid or expired voucher', 'error');
      }
    } catch {
      addToast('Error redeeming code', 'error');
    } finally {
      setSubmittingPromo(false);
    }
  };

  const handleClaimQuest = async (targetId: string, coinAmount: number) => {
    if (!user) {
      addToast('Please login to claim task rewards', 'info');
      return;
    }
    const res = await claimTarget(targetId, user.uid);
    if (res.ok) {
      playUiSound('success');
      await refresh();
      addToast(res.message || `Quest completed. Claimed +${coinAmount} Gift Coins.`, 'success');
    } else {
      addToast(res.message || 'Already claimed or expired', 'info');
    }
  };

  const handleRedeemVoucherDiscount = async (discountNpr: number, coinCost: number) => {
    if (balance < coinCost) {
      addToast(`You need at least ${coinCost} coins to redeem this voucher (Current: ${balance}).`, 'error');
      return;
    }
    playUiSound('success');
    await addCoins(-coinCost, `Redeemed Rs. ${discountNpr} NPR Checkout Voucher`, 'debit');
    addToast(`Voucher active! Rs. ${discountNpr} NPR discount applied to your next COD order.`, 'success');
  };

  const displayLedger = ledger;

  const filteredLedger = displayLedger.filter((item) => {
    if (historyFilter === 'all') return true;
    return item.type === historyFilter;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-6 sm:p-10 text-white shadow-xl shadow-orange-500/10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide uppercase border border-white/20">
              <Gift className="w-3.5 h-3.5 text-amber-100" />
              <span>NEWARO Gift Coins Wallet</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
              {balance.toLocaleString()} <span className="text-amber-200 text-2xl font-bold">Coins</span>
            </h1>
            <p className="text-amber-100 text-xs sm:text-sm leading-relaxed">
              Earn Gift Coins on every Cash on Delivery purchase, verified product review, and daily quest in Nepal. Use coins for instant cart savings or delivery credits!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Value Exchange Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 flex flex-col justify-center min-w-[min(200px,100%)]">
              <span className="text-xs text-amber-200 font-semibold">Equivalent Cash Value:</span>
              <span className="text-2xl font-black text-white mt-0.5">
                Rs. {Math.floor(balance * 0.5).toLocaleString()} NPR
              </span>
              <span className="text-[11px] text-amber-100/90 mt-1">
                Rate: 1 Coin = Rs. 0.50 NPR
              </span>
            </div>

            {/* Daily Streak Check-in Button */}
            <button
              onClick={handleDailyCheckIn}
              disabled={dailyClaimed}
              className={`p-4 sm:p-5 rounded-2xl border transition-all text-left flex flex-col justify-center cursor-pointer min-w-[min(200px,100%)] ${
                dailyClaimed
                  ? 'bg-emerald-950/40 border-emerald-400/40 text-emerald-200'
                  : 'bg-white hover:bg-amber-50 text-slate-900 border-white shadow-md'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
                <Flame className={`w-4 h-4 ${dailyClaimed ? 'text-emerald-400' : 'text-orange-500'}`} />
                <span>{dailyClaimed ? 'Streak Active' : 'Daily Check-In'}</span>
              </div>
              <span className="text-sm font-extrabold mt-1">
                {dailyClaimed ? 'Claimed Today (+25)' : 'Claim Free +25 Coins'}
              </span>
              <span className="text-[10px] opacity-80 mt-0.5">
                {dailyClaimed ? 'Reset tomorrow at midnight' : '1-click instant reward'}
              </span>
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Grid: Redeem Voucher & Quests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Redeem Voucher Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/80">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Redeem Voucher Code</h3>
              <p className="text-xs text-slate-500">Apply creator, event, or partner promo</p>
            </div>
          </div>

          <form onSubmit={handleRedeem} className="space-y-3 pt-1">
            <div className="relative">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="e.g. WELCOME100, NEPAL2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={submittingPromo || !promoCode.trim()}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {submittingPromo ? 'Validating Voucher...' : 'Apply Voucher Code'}
            </button>
          </form>

          {/* Tested Promo Badges */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-2">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Available Community Codes:</span>
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { code: 'WELCOME100', val: '+100' },
                { code: 'NEPAL2026', val: '+200' },
                { code: 'KATHMANDU', val: '+75' },
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setPromoCode(c.code)}
                  className="px-2 py-1 bg-white hover:bg-amber-100/60 border border-amber-200 rounded-lg text-[11px] font-mono font-bold text-amber-800 transition-colors cursor-pointer flex items-center gap-1"
                  title="Click to fill"
                >
                  <span>{c.code}</span>
                  <span className="text-[10px] text-amber-600 font-sans font-black">({c.val})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Milestone Quests Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/80">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Community Quests & Milestones</h3>
                <p className="text-xs text-slate-500">Complete actions on NEWARO to earn coin bonuses</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {[
              {
                id: 'quest-profile',
                title: 'Complete Profile & Location in Nepal',
                desc: 'Add your city (Kathmandu, Pokhara, etc.) and delivery phone number',
                coins: 50,
              },
              {
                id: 'quest-first-order',
                title: 'Place First Cash on Delivery Order',
                desc: 'Support a verified local storefront anywhere across Nepal',
                coins: 150,
              },
              {
                id: 'quest-review',
                title: 'Write a Verified Product Review',
                desc: 'Share genuine feedback with photos on delivered items',
                coins: 75,
              },
              {
                id: 'quest-friend',
                title: 'Follow 3 Verified Local Stores',
                desc: 'Stay updated with artisan deals and flash discounts',
                coins: 40,
              },
            ].map((tgt) => (
              <div
                key={tgt.id}
                className="p-3.5 border border-slate-200/80 rounded-xl flex items-center justify-between gap-4 bg-slate-50/50 hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{tgt.title}</h4>
                    <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
                      +{tgt.coins} Coins
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{tgt.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimQuest(tgt.id, tgt.coins)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instant Checkout Vouchers Redemption */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/80">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Exchange Coins for Cart Discounts</h3>
            <p className="text-xs text-slate-500">Apply instant cash discounts toward your next Cash on Delivery checkout</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            { discount: 50, coins: 100, label: 'Delivery Subsidy', desc: 'Saves Rs. 50 on standard shipping' },
            { discount: 150, coins: 280, label: 'Storefront Voucher', desc: 'Saves Rs. 150 on any store item' },
            { discount: 300, coins: 500, label: 'VIP Shopper Pass', desc: 'Saves Rs. 300 on orders over Rs. 1,000' },
          ].map((v, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 flex flex-col justify-between space-y-3 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-purple-700">{v.label}</span>
                  <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {v.coins} Coins
                  </span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">Rs. {v.discount} NPR Off</div>
                <p className="text-[11px] text-slate-500 mt-0.5">{v.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => handleRedeemVoucherDiscount(v.discount, v.coins)}
                className="w-full py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Exchange Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Wallet Activity & Ledger</h3>
              <p className="text-xs text-slate-500">Detailed record of rewards, redemptions, and order credits</p>
            </div>
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            {(['all', 'credit', 'debit'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setHistoryFilter(mode)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                  historyFilter === mode
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode === 'all' ? 'All Activity' : mode === 'credit' ? 'Earned (+)' : 'Spent (-)'}
              </button>
            ))}
          </div>
        </div>

        {filteredLedger.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-1">
            <Coins className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold">No transactions recorded for this filter</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {filteredLedger.map((item) => {
              const isCredit = item.type === 'credit';
              const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {item.reason || (isCredit ? 'Coins Earned' : 'Coins Spent')}
                      </p>
                      <p className="text-[11px] text-slate-400">{formattedDate}</p>
                    </div>
                  </div>

                  <span
                    className={`font-black font-mono text-sm shrink-0 ${
                      isCredit ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isCredit ? `+${item.amount}` : `-${item.amount}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
