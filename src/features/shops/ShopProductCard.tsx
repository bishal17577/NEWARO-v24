import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Package } from 'lucide-react';
import { Product } from '../../types';
import { ShopTheme } from '../../lib/shopThemes';

interface Props {
  product: Product;
  theme: ShopTheme;
  onAdd: (p: Product) => void;
}

const npr = (n: number) => `Rs. ${(Number(n) || 0).toLocaleString()}`;

const Price: React.FC<{ p: Product; theme: ShopTheme }> = ({ p, theme }) => (
  <div className="flex items-baseline gap-1.5 flex-wrap">
    <span className="text-sm font-extrabold tabular-nums" style={{ color: theme.accent === '#eab308' ? '#a16207' : theme.accent }}>
      {npr(p.price)}
    </span>
    {p.originalPrice && p.originalPrice > p.price ? (
      <span className="text-[11px] tabular-nums text-slate-400 line-through">{npr(p.originalPrice)}</span>
    ) : null}
  </div>
);

const StockBadge: React.FC<{ p: Product; theme: ShopTheme }> = ({ p, theme }) => {
  if (typeof p.stock !== 'number') return null;
  const out = p.stock <= 0;
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={out ? { background: '#fee2e2', color: '#b91c1c' } : { background: theme.soft, color: '#334155' }}
    >
      {out ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}
    </span>
  );
};

const AddButton: React.FC<{ p: Product; theme: ShopTheme; onAdd: (p: Product) => void; compact?: boolean }> = ({
  p,
  theme,
  onAdd,
  compact,
}) => {
  const out = typeof p.stock === 'number' && p.stock <= 0;
  return (
    <button
      type="button"
      disabled={out}
      onClick={() => onAdd(p)}
      className={`${compact ? 'px-3 py-2' : 'w-full py-2.5 mt-2.5'} rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0`}
      style={{ background: theme.accent, color: theme.onAccent }}
    >
      <ShoppingBag className="w-3.5 h-3.5" />
      <span>{out ? 'Sold out' : theme.addLabel}</span>
    </button>
  );
};

const Img: React.FC<{ p: Product; className: string; fit: 'cover' | 'contain' }> = ({ p, className, fit }) =>
  p.images?.[0] ? (
    <img
      src={p.images[0]}
      alt={p.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${className} ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
    />
  ) : (
    <Package className="w-8 h-8 text-slate-300" />
  );

export const ShopProductCard: React.FC<Props> = ({ product: p, theme, onAdd }) => {
  const shell = `bg-white dark:bg-slate-900 border ${theme.cardBorder} ${theme.cardRadius} overflow-hidden shadow-2xs hover:shadow-lg transition-shadow`;
  const title = `text-slate-900 dark:text-slate-100 line-clamp-2 ${theme.heading}`;

  // List layout: food, grocery-style rows and services. Photo on the left, price and button on the right.
  if (theme.layout === 'list') {
    return (
      <div className={`${shell} p-3 flex items-center gap-3`}>
        <Link to={`/products/${p.id}`} className="shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: theme.soft }}>
            <Img p={p} className="w-full h-full" fit="cover" />
          </div>
        </Link>
        <div className="min-w-0 flex-1 space-y-1">
          <Link to={`/products/${p.id}`}>
            <h3 className={`text-sm font-bold ${title}`}>{p.name}</h3>
          </Link>
          {p.description ? <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{p.description.replace(/\*\*/g, '')}</p> : null}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="space-y-0.5">
              <Price p={p} theme={theme} />
              <StockBadge p={p} theme={theme} />
            </div>
            <AddButton p={p} theme={theme} onAdd={onAdd} compact />
          </div>
        </div>
      </div>
    );
  }

  const imageBox: Record<string, string> = {
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    wide: 'aspect-[4/3]',
    compact: 'aspect-square',
  };
  const fit = theme.layout === 'portrait' || theme.layout === 'wide' ? 'cover' : 'contain';

  return (
    <div className={`${shell} flex flex-col ${theme.layout === 'compact' ? 'p-2.5' : ''}`}>
      <Link to={`/products/${p.id}`} className="block flex-1">
        <div
          className={`${imageBox[theme.layout]} w-full overflow-hidden flex items-center justify-center ${
            theme.layout === 'compact' ? 'rounded-lg' : ''
          } ${fit === 'contain' ? 'p-3' : ''}`}
          style={{ background: theme.soft }}
        >
          <Img p={p} className="w-full h-full" fit={fit} />
        </div>
        <div className={theme.layout === 'compact' ? 'pt-2 space-y-1' : 'p-3 space-y-1'}>
          <h3 className={`text-xs sm:text-sm font-bold ${title}`}>{p.name}</h3>
          <Price p={p} theme={theme} />
          <StockBadge p={p} theme={theme} />
        </div>
      </Link>
      <div className={theme.layout === 'compact' ? '' : 'px-3 pb-3'}>
        <AddButton p={p} theme={theme} onAdd={onAdd} />
      </div>
    </div>
  );
};

export const gridClassFor = (layout: ShopTheme['layout']): string => {
  switch (layout) {
    case 'list':
      return 'grid grid-cols-1 lg:grid-cols-2 gap-3';
    case 'portrait':
      return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5';
    case 'wide':
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
    case 'compact':
      return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3';
    default:
      return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5';
  }
};
