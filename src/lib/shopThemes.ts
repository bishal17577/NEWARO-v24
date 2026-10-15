import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  BookOpen,
  Car,
  Cpu,
  Dumbbell,
  Flower2,
  Gem,
  HeartPulse,
  Palette,
  PartyPopper,
  PawPrint,
  Puzzle,
  Shirt,
  ShoppingBasket,
  Sofa,
  Sparkles,
  Store,
  UtensilsCrossed,
  Frame,
  Hammer,
} from 'lucide-react';

/** How products are laid out inside a shop of this kind. */
export type ShopLayout = 'portrait' | 'square' | 'list' | 'wide' | 'compact';
export type ShopPattern = 'grid' | 'dots' | 'diagonal' | 'petals' | 'plus' | 'waves' | 'none';

export interface ShopTheme {
  key: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  /** Main brand colour of the shop: buttons, prices, highlights */
  accent: string;
  /** Text colour that is readable on top of the accent colour */
  onAccent: string;
  /** Very light tint used for chips and soft surfaces */
  soft: string;
  /** Header background */
  hero: string;
  /** true when the hero is dark and needs white text */
  heroDark: boolean;
  pattern: ShopPattern;
  layout: ShopLayout;
  /** Tailwind classes */
  heading: string;
  cardRadius: string;
  cardBorder: string;
  /** Wording that changes with the kind of shop */
  addLabel: string;
  sectionTitle: string;
  searchHint: string;
}

const T = (t: ShopTheme): ShopTheme => t;

export const SHOP_THEMES: Record<string, ShopTheme> = {
  fashion: T({
    key: 'fashion', label: 'Fashion boutique', tagline: 'Style, curated for you.', icon: Shirt,
    accent: '#be185d', onAccent: '#ffffff', soft: '#fdf2f8',
    hero: 'linear-gradient(135deg,#1c1118 0%,#5b1d3d 55%,#be185d 100%)', heroDark: true,
    pattern: 'diagonal', layout: 'portrait',
    heading: 'font-serif tracking-tight', cardRadius: 'rounded-xl', cardBorder: 'border-rose-100 dark:border-rose-900/40',
    addLabel: 'Add to bag', sectionTitle: 'The collection', searchHint: 'Search dresses, shoes, bags…',
  }),
  electronics: T({
    key: 'electronics', label: 'Tech & electronics', tagline: 'Gadgets, parts and gear.', icon: Cpu,
    accent: '#0891b2', onAccent: '#ffffff', soft: '#ecfeff',
    hero: 'linear-gradient(135deg,#06122b 0%,#0b2a52 55%,#0e7490 100%)', heroDark: true,
    pattern: 'grid', layout: 'square',
    heading: 'font-mono tracking-tight', cardRadius: 'rounded-lg', cardBorder: 'border-cyan-100 dark:border-cyan-900/40',
    addLabel: 'Add to cart', sectionTitle: 'Gadgets & gear', searchHint: 'Search boards, sensors, laptops…',
  }),
  flowers: T({
    key: 'flowers', label: 'Flowers & gifts', tagline: 'Fresh blooms for every moment.', icon: Flower2,
    accent: '#db2777', onAccent: '#ffffff', soft: '#fdf2f8',
    hero: 'linear-gradient(135deg,#fce7f3 0%,#fbcfe8 45%,#bbf7d0 100%)', heroDark: false,
    pattern: 'petals', layout: 'square',
    heading: 'font-serif italic tracking-tight', cardRadius: 'rounded-[28px]', cardBorder: 'border-pink-100 dark:border-pink-900/40',
    addLabel: 'Send a bouquet', sectionTitle: 'Fresh blooms', searchHint: 'Search roses, bouquets, gifts…',
  }),
  food: T({
    key: 'food', label: 'Food & bakery', tagline: 'Fresh from the kitchen.', icon: UtensilsCrossed,
    accent: '#ea580c', onAccent: '#ffffff', soft: '#fff7ed',
    hero: 'linear-gradient(135deg,#7c2d12 0%,#ea580c 55%,#f59e0b 100%)', heroDark: true,
    pattern: 'dots', layout: 'list',
    heading: 'tracking-tight', cardRadius: 'rounded-2xl', cardBorder: 'border-orange-100 dark:border-orange-900/40',
    addLabel: 'Add to order', sectionTitle: "Today's menu", searchHint: 'Search cakes, momo, snacks…',
  }),
  grocery: T({
    key: 'grocery', label: 'Grocery & daily needs', tagline: 'Everyday essentials, delivered.', icon: ShoppingBasket,
    accent: '#16a34a', onAccent: '#ffffff', soft: '#f0fdf4',
    hero: 'linear-gradient(135deg,#14532d 0%,#15803d 55%,#4ade80 100%)', heroDark: true,
    pattern: 'dots', layout: 'compact',
    heading: 'tracking-tight', cardRadius: 'rounded-xl', cardBorder: 'border-green-100 dark:border-green-900/40',
    addLabel: 'Add to basket', sectionTitle: 'Fresh aisles', searchHint: 'Search rice, oil, vegetables…',
  }),
  beauty: T({
    key: 'beauty', label: 'Beauty & care', tagline: 'Glow with confidence.', icon: Sparkles,
    accent: '#c026d3', onAccent: '#ffffff', soft: '#fdf4ff',
    hero: 'linear-gradient(135deg,#4a044e 0%,#a21caf 50%,#f472b6 100%)', heroDark: true,
    pattern: 'dots', layout: 'portrait',
    heading: 'font-serif tracking-tight', cardRadius: 'rounded-3xl', cardBorder: 'border-fuchsia-100 dark:border-fuchsia-900/40',
    addLabel: 'Add to bag', sectionTitle: 'The glow edit', searchHint: 'Search skincare, makeup, perfume…',
  }),
  health: T({
    key: 'health', label: 'Health & wellness', tagline: 'Feel good, live well.', icon: HeartPulse,
    accent: '#0d9488', onAccent: '#ffffff', soft: '#f0fdfa',
    hero: 'linear-gradient(135deg,#134e4a 0%,#0f766e 55%,#5eead4 100%)', heroDark: true,
    pattern: 'plus', layout: 'compact',
    heading: 'tracking-tight', cardRadius: 'rounded-2xl', cardBorder: 'border-teal-100 dark:border-teal-900/40',
    addLabel: 'Add to cart', sectionTitle: 'Wellness picks', searchHint: 'Search vitamins, supplements, care…',
  }),
  home: T({
    key: 'home', label: 'Home & furniture', tagline: 'Make every room feel like home.', icon: Sofa,
    accent: '#b45309', onAccent: '#ffffff', soft: '#fffbeb',
    hero: 'linear-gradient(135deg,#292524 0%,#78350f 55%,#d97706 100%)', heroDark: true,
    pattern: 'diagonal', layout: 'wide',
    heading: 'font-serif tracking-tight', cardRadius: 'rounded-2xl', cardBorder: 'border-amber-100 dark:border-amber-900/40',
    addLabel: 'Add to cart', sectionTitle: 'The showroom', searchHint: 'Search sofas, lamps, kitchenware…',
  }),
  sports: T({
    key: 'sports', label: 'Sports & outdoors', tagline: 'Gear up. Go further.', icon: Dumbbell,
    accent: '#4d7c0f', onAccent: '#ffffff', soft: '#f7fee7',
    hero: 'linear-gradient(135deg,#052e16 0%,#3f6212 55%,#a3e635 100%)', heroDark: true,
    pattern: 'diagonal', layout: 'wide',
    heading: 'font-black italic uppercase tracking-tight', cardRadius: 'rounded-lg', cardBorder: 'border-lime-200 dark:border-lime-900/40',
    addLabel: 'Add to kit', sectionTitle: 'Gear up', searchHint: 'Search shoes, bikes, fitness…',
  }),
  books: T({
    key: 'books', label: 'Books & stationery', tagline: 'Stories, study and stationery.', icon: BookOpen,
    accent: '#4f46e5', onAccent: '#ffffff', soft: '#eef2ff',
    hero: 'linear-gradient(135deg,#1e1b4b 0%,#3730a3 55%,#818cf8 100%)', heroDark: true,
    pattern: 'plus', layout: 'compact',
    heading: 'font-serif tracking-tight', cardRadius: 'rounded-md', cardBorder: 'border-indigo-100 dark:border-indigo-900/40',
    addLabel: 'Add to shelf', sectionTitle: 'On the shelves', searchHint: 'Search books, notebooks, pens…',
  }),
  art: T({
    key: 'art', label: 'Art & collectibles', tagline: 'Pieces worth keeping.', icon: Frame,
    accent: '#a16207', onAccent: '#ffffff', soft: '#fefce8',
    hero: 'linear-gradient(135deg,#0a0a0a 0%,#27272a 55%,#713f12 100%)', heroDark: true,
    pattern: 'plus', layout: 'wide',
    heading: 'font-serif tracking-wide', cardRadius: 'rounded-sm', cardBorder: 'border-yellow-200 dark:border-yellow-900/40',
    addLabel: 'Reserve piece', sectionTitle: 'The gallery', searchHint: 'Search paintings, prints, collectibles…',
  }),
  jewellery: T({
    key: 'jewellery', label: 'Jewellery & watches', tagline: 'Details that shine.', icon: Gem,
    accent: '#ca8a04', onAccent: '#1c1917', soft: '#fefce8',
    hero: 'linear-gradient(135deg,#0c0a09 0%,#292524 50%,#854d0e 100%)', heroDark: true,
    pattern: 'plus', layout: 'portrait',
    heading: 'font-serif tracking-widest uppercase', cardRadius: 'rounded-xl', cardBorder: 'border-yellow-200 dark:border-yellow-900/40',
    addLabel: 'Add to bag', sectionTitle: 'The vitrine', searchHint: 'Search rings, necklaces, watches…',
  }),
  handmade: T({
    key: 'handmade', label: 'Handmade & handicrafts', tagline: 'Made by hand, made with heart.', icon: Palette,
    accent: '#c2410c', onAccent: '#ffffff', soft: '#fff7ed',
    hero: 'linear-gradient(135deg,#431407 0%,#9a3412 55%,#fb923c 100%)', heroDark: true,
    pattern: 'dots', layout: 'square',
    heading: 'font-serif tracking-tight', cardRadius: 'rounded-3xl', cardBorder: 'border-dashed border-orange-300 dark:border-orange-800/60',
    addLabel: 'Add to cart', sectionTitle: 'Made by hand', searchHint: 'Search pottery, thangka, woolens…',
  }),
  auto: T({
    key: 'auto', label: 'Automotive & tools', tagline: 'Parts, tools and know-how.', icon: Car,
    accent: '#eab308', onAccent: '#1c1917', soft: '#fefce8',
    hero: 'linear-gradient(135deg,#09090b 0%,#27272a 60%,#52525b 100%)', heroDark: true,
    pattern: 'diagonal', layout: 'square',
    heading: 'font-black uppercase tracking-tight', cardRadius: 'rounded-sm', cardBorder: 'border-zinc-300 dark:border-zinc-700',
    addLabel: 'Add to cart', sectionTitle: 'Parts & tools', searchHint: 'Search helmets, oil, drills…',
  }),
  pets: T({
    key: 'pets', label: 'Pets & pet supplies', tagline: 'Happy pets, happy home.', icon: PawPrint,
    accent: '#d97706', onAccent: '#ffffff', soft: '#fffbeb',
    hero: 'linear-gradient(135deg,#134e4a 0%,#0f766e 45%,#fbbf24 100%)', heroDark: true,
    pattern: 'dots', layout: 'square',
    heading: 'tracking-tight', cardRadius: 'rounded-3xl', cardBorder: 'border-amber-200 dark:border-amber-900/40',
    addLabel: 'Add to cart', sectionTitle: 'For your pet', searchHint: 'Search food, toys, beds…',
  }),
  toys: T({
    key: 'toys', label: 'Toys & baby', tagline: 'Play, grow, repeat.', icon: Puzzle,
    accent: '#e11d48', onAccent: '#ffffff', soft: '#fff1f2',
    hero: 'linear-gradient(135deg,#fef08a 0%,#fda4af 55%,#a5b4fc 100%)', heroDark: false,
    pattern: 'dots', layout: 'square',
    heading: 'font-black tracking-tight', cardRadius: 'rounded-[28px]', cardBorder: 'border-rose-200 dark:border-rose-900/40',
    addLabel: 'Add to cart', sectionTitle: 'Playroom', searchHint: 'Search toys, baby care, games…',
  }),
  services: T({
    key: 'services', label: 'Services & repairs', tagline: 'Skilled help, close by.', icon: Hammer,
    accent: '#2563eb', onAccent: '#ffffff', soft: '#eff6ff',
    hero: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#3b82f6 100%)', heroDark: true,
    pattern: 'grid', layout: 'list',
    heading: 'tracking-tight', cardRadius: 'rounded-xl', cardBorder: 'border-blue-100 dark:border-blue-900/40',
    addLabel: 'Book / add', sectionTitle: 'Services offered', searchHint: 'Search repairs, installs, help…',
  }),
  freelance: T({
    key: 'freelance', label: 'Freelance & gigs', tagline: 'Talent for hire.', icon: Briefcase,
    accent: '#0f766e', onAccent: '#ffffff', soft: '#f0fdfa',
    hero: 'linear-gradient(135deg,#0f172a 0%,#115e59 60%,#2dd4bf 100%)', heroDark: true,
    pattern: 'grid', layout: 'list',
    heading: 'tracking-tight', cardRadius: 'rounded-xl', cardBorder: 'border-teal-100 dark:border-teal-900/40',
    addLabel: 'Hire / add', sectionTitle: 'Gigs offered', searchHint: 'Search design, writing, coding…',
  }),
  events: T({
    key: 'events', label: 'Events & experiences', tagline: 'Moments worth showing up for.', icon: PartyPopper,
    accent: '#7c3aed', onAccent: '#ffffff', soft: '#f5f3ff',
    hero: 'linear-gradient(135deg,#2e1065 0%,#7c3aed 55%,#f472b6 100%)', heroDark: true,
    pattern: 'waves', layout: 'wide',
    heading: 'font-black tracking-tight', cardRadius: 'rounded-3xl', cardBorder: 'border-violet-100 dark:border-violet-900/40',
    addLabel: 'Reserve', sectionTitle: 'Experiences', searchHint: 'Search tickets, packages, venues…',
  }),
  default: T({
    key: 'default', label: 'NEWARO store', tagline: 'Local shop, delivered across Nepal.', icon: Store,
    accent: '#2563eb', onAccent: '#ffffff', soft: '#eff6ff',
    hero: 'linear-gradient(135deg,#dbeafe 0%,#c7d2fe 55%,#f5f5ff 100%)', heroDark: false,
    pattern: 'dots', layout: 'square',
    heading: 'tracking-tight', cardRadius: 'rounded-2xl', cardBorder: 'border-slate-200/80 dark:border-slate-700',
    addLabel: 'Add to cart', sectionTitle: 'Products in this store', searchHint: 'Search this store…',
  }),
};

/** Ordered rules. The first match wins, so more specific words come first. */
const RULES: Array<[RegExp, keyof typeof SHOP_THEMES]> = [
  [/jewel|watch|\bgem|ornament/, 'jewellery'],
  [/handmade|handicraft|\bcraft/, 'handmade'],
  [/\bart\b|collectible|antique/, 'art'],
  [/flower|florist|gift|bouquet/, 'flowers'],
  [/food|bakery|cake|restaurant|cafe|kitchen|sweet|snack/, 'food'],
  [/grocer|daily need|vegetable|supermarket/, 'grocery'],
  [/beauty|cosmetic|makeup|salon|skincare|personal care/, 'beauty'],
  [/health|wellness|pharma|medic|fitness care/, 'health'],
  [/electronic|computer|phone|mobile|gadget|laptop|tech/, 'electronics'],
  [/fashion|cloth|apparel|wear|shoe|boutique|garment|textile/, 'fashion'],
  [/furniture|decor|home|living|interior/, 'home'],
  [/sport|outdoor|gym|bike|cycle/, 'sports'],
  [/book|stationer|education|school/, 'books'],
  [/auto|vehicle|car\b|tool|hardware|motor/, 'auto'],
  [/\bpets?\b|animal/, 'pets'],
  [/toy|baby|kid|child/, 'toys'],
  [/freelance|gig/, 'freelance'],
  [/event|experience|ticket/, 'events'],
  [/service|repair|maintenance/, 'services'],
];

export function getShopTheme(category?: string | null): ShopTheme {
  const c = (category || '').toLowerCase().trim();
  if (!c) return SHOP_THEMES.default;
  for (const [re, key] of RULES) {
    if (re.test(c)) return SHOP_THEMES[key];
  }
  return SHOP_THEMES.default;
}

/** CSS for the decorative pattern laid over a shop header */
export function patternStyle(theme: ShopTheme): { backgroundImage?: string; backgroundSize?: string } {
  const ink = theme.heroDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.07)';
  switch (theme.pattern) {
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`,
        backgroundSize: '26px 26px',
      };
    case 'dots':
      return { backgroundImage: `radial-gradient(${ink} 2px, transparent 2.5px)`, backgroundSize: '20px 20px' };
    case 'diagonal':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${ink} 0, ${ink} 1px, transparent 1px, transparent 14px)` };
    case 'plus':
      return {
        backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      };
    case 'waves':
      return { backgroundImage: `repeating-radial-gradient(circle at 0 100%, transparent 0, transparent 18px, ${ink} 19px, ${ink} 20px)` };
    case 'petals':
      return {
        backgroundImage:
          'radial-gradient(circle at 12% 30%, rgba(244,114,182,0.30) 0 38px, transparent 39px),' +
          'radial-gradient(circle at 88% 70%, rgba(74,222,128,0.28) 0 52px, transparent 53px),' +
          'radial-gradient(circle at 60% 15%, rgba(251,207,232,0.55) 0 28px, transparent 29px)',
      };
    default:
      return {};
  }
}

export const THEME_COUNT = Object.keys(SHOP_THEMES).length - 1;
