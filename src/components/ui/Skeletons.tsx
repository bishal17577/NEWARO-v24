import React from 'react';

export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/80 rounded-lg ${className}`} />
);

export const StorySkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="flex items-center gap-3 overflow-x-hidden py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-slate-200/90 animate-pulse">
            <div className="w-full h-full rounded-full bg-slate-100 border-2 border-white" />
          </div>
          <Shimmer className="w-12 h-2.5 rounded-full" />
        </div>
      ))}
    </div>
  );
};

export const PostSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <article
          key={i}
          className="bg-white rounded-3xl border border-slate-200/80 p-4 space-y-3.5 shadow-2xs animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-slate-200 rounded-md w-32" />
              <div className="h-2.5 bg-slate-100 rounded-md w-20" />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3 bg-slate-200 rounded-md w-11/12" />
            <div className="h-3 bg-slate-200 rounded-md w-3/4" />
          </div>
          <div className="h-56 sm:h-72 bg-slate-200 rounded-2xl w-full" />
        </article>
      ))}
    </div>
  );
};

export const StoreSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-slate-200 rounded-md w-28" />
              <div className="h-2.5 bg-slate-100 rounded-md w-20" />
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-md w-full" />
        </div>
      ))}
    </div>
  );
};

export const ProductSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-3 space-y-2.5 shadow-2xs animate-pulse"
        >
          <div className="aspect-square bg-slate-200 rounded-xl w-full" />
          <div className="h-3.5 bg-slate-200 rounded-md w-4/5" />
          <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
        </div>
      ))}
    </div>
  );
};

export const ProductDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
      <div className="h-4 bg-slate-200 rounded-md w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 bg-white p-4 sm:p-8 rounded-3xl border border-slate-200/80">
        <div className="aspect-square bg-slate-200 rounded-2xl w-full" />
        <div className="space-y-4">
          <div className="h-7 bg-slate-200 rounded-md w-3/4" />
          <div className="h-8 bg-slate-200 rounded-md w-36" />
          <div className="h-20 bg-slate-100 rounded-2xl w-full" />
        </div>
      </div>
    </div>
  );
};

export const FeedSkeleton = PostSkeleton;
