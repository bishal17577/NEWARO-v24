import React from 'react';
import { Shield, Lock, Eye } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Shield className="w-7 h-7 text-blue-600" />
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Last Updated: October 2026 · NEWARO Platform Nepal
        </p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-xs space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">1. Information We Collect</h2>
          <p>
            When you register, place orders, open a store, or apply for freelance gigs on NEWARO, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Account Details:</strong> Full name, email address, password hash, and profile image.</li>
            <li><strong>Delivery Information:</strong> Physical delivery address, city (e.g. Kathmandu, Pokhara), and contact telephone number for courier fulfillment.</li>
            <li><strong>Store / Gig Details:</strong> Store name, inventory catalogs, service descriptions, and business contact numbers.</li>
            <li><strong>Technical Usage:</strong> Device type, browser preferences, audio cue settings, and cookie tokens.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">2. How We Protect & Use Your Data</h2>
          <p>
            We strictly use your information to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Coordinate Cash on Delivery dispatches between buyers and verified store merchants.</li>
            <li>Notify you regarding order updates, live chat replies, and quest milestone rewards.</li>
            <li>Prevent fraud, abusive reviews, and bogus COD orders across the network.</li>
            <li>Provide personalized search rankings based on your selected city or nearby region.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">3. Data Sharing & Third Parties</h2>
          <p>
            <strong>We never sell your personal data.</strong> Information is only shared with:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>The specific merchant fulfilling your COD order (to complete delivery).</li>
            <li>Firebase / Google Cloud services for secure authentication and database persistence.</li>
            <li>Image hosting (ImgBB) solely for uploaded product photos and storefront logos.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-extrabold text-slate-900">4. Your Rights & Data Deletion</h2>
          <p>
            You have the right to access, edit, or delete your profile information at any time via <strong>Account Settings</strong> or by emailing our data protection officer at <strong className="text-slate-900">privacy@newaro.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};
