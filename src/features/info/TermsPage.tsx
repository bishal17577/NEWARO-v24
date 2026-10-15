import React from 'react';
import { Shield, FileText, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <FileText className="w-7 h-7 text-blue-600" />
          Terms of Service
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Last Updated: October 2026 · NEWARO Platform Nepal
        </p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-xs space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing, creating an account, browsing storefronts, or placing an order on NEWARO (newaro.com), you agree to be bound by these Terms of Service and all applicable laws and regulations of Nepal. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">2. Cash on Delivery (COD) Rules & Buyer Conduct</h2>
          <p>
            NEWARO utilizes Cash on Delivery as the primary transaction model across Nepal to safeguard buyer trust. When an order is placed:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Buyers are required to provide a valid delivery address and active Nepali mobile number.</li>
            <li>Buyers agree to inspect the parcel upon delivery and pay the agreed amount in Nepalese Rupees (NPR).</li>
            <li>Repeated frivolous cancellations or refusal of authentic COD deliveries without reasonable cause may result in temporary account suspension.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">3. Store Owner & Merchant Obligations</h2>
          <p>
            Storefront merchants registered on NEWARO agree to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Accurately represent product quality, origin, specifications, and availability.</li>
            <li>Fulfill verified customer orders within 48 to 72 business hours.</li>
            <li>Prohibit the sale of counterfeit, hazardous, or illegal goods under the laws of the Government of Nepal.</li>
            <li>Honor genuine customer returns or replacements for damaged or misdescribed items.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">4. Freelancer Contracts & Gigs</h2>
          <p>
            Freelancers offering services and clients hiring contractors through the Gigs & Jobs portal agree to establish clear project milestones. Payments and delivery terms agreed between client and contractor are protected under NEWARO’s milestone guidelines.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">5. Gift Coins & Promotional Vouchers</h2>
          <p>
            Gift Coins earned through reviews, milestones, or referral quests carry no physical cash redemption value outside of the NEWARO platform. Coins may only be exchanged for platform discounts and delivery subsidies as defined in the Gift Coins policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">6. Governing Law</h2>
          <p>
            These terms are governed by and construed in accordance with the laws of Nepal, and you irrevocably submit to the exclusive jurisdiction of the courts located in Kathmandu, Nepal.
          </p>
        </section>
      </div>
    </div>
  );
};
