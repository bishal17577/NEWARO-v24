import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Package, ShoppingBag, Edit3, Calendar, Briefcase } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useToast } from '../ui/Toast';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateModal: React.FC<CreateModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, role, isAdmin, isShopOwner, isFreelancer } = useAuth();
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSelect = (path: string) => {
    onClose();
    if (!user) {
      addToast('Please sign in first to publish content', 'info');
      navigate(`/auth?redirect=${encodeURIComponent(path)}`);
      return;
    }
    navigate(path);
  };

  const allOptions = [
    {
      title: 'Create Post / Story',
      description: 'Share a photo, story update or announcement',
      icon: Edit3,
      path: '/create-post',
      color: 'bg-blue-50 text-blue-600',
      roles: ['user', 'shop_owner', 'freelancer', 'admin'],
    },
    {
      title: 'List a Product',
      description: 'Add a new product to your shop with AI background removal',
      icon: Package,
      path: '/create-product',
      color: 'bg-emerald-50 text-emerald-600',
      roles: ['shop_owner', 'admin'],
    },
    {
      title: 'Open Storefront',
      description: 'Launch your store to sell products with Cash on Delivery',
      icon: ShoppingBag,
      path: '/create-shop',
      color: 'bg-purple-50 text-purple-600',
      roles: ['user', 'admin'],
    },
    {
      title: 'Post Job / Freelance Gig',
      description: 'Hire local talent or offer freelance services',
      icon: Briefcase,
      path: '/create-job',
      color: 'bg-indigo-50 text-indigo-600',
      roles: ['user', 'freelancer', 'admin'],
    },
    {
      title: 'Host an Event',
      description: 'Post a meetup, community workshop or program',
      icon: Calendar,
      path: '/create-event',
      color: 'bg-amber-50 text-amber-600',
      roles: ['user', 'shop_owner', 'freelancer', 'admin'],
    },
  ];

  const options = !user
    ? allOptions
    : allOptions.filter((opt) => opt.roles.includes(role) || isAdmin);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Create on NEWARO</h3>
            <p className="text-xs text-slate-500">What would you like to share or publish?</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3.5 space-y-1.5">
          {options.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <button
                key={i}
                onClick={() => handleSelect(opt.path)}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-slate-50 text-left transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${opt.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{opt.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
