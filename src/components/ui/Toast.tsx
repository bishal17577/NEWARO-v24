import React from 'react';
import { create } from 'zustand';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed top-16 md:top-4 right-0 left-0 md:left-auto md:right-4 z-50 flex flex-col items-center md:items-end gap-2 max-w-sm md:w-80 mx-auto md:mx-0 pointer-events-none px-3"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`pointer-events-auto cursor-pointer flex items-center justify-between p-3.5 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold transition-all transform animate-in fade-in slide-in-from-top-2 w-full max-w-sm backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-white/95 text-emerald-950 border-emerald-200 shadow-emerald-500/10'
              : toast.type === 'error'
              ? 'bg-white/95 text-rose-950 border-rose-200 shadow-rose-500/10'
              : 'bg-white/95 text-blue-950 border-blue-200 shadow-blue-500/10'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="truncate">{toast.message}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
            className="text-slate-400 hover:text-slate-600 ml-2 p-1 rounded-lg hover:bg-slate-100 shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
