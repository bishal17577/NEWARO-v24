import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageSeo {
  match: RegExp;
  title: string;
  description: string;
  indexable: boolean;
}

const SITE_NAME = 'NEWARO';

// Public pages that search engines may index. Each title and description is written from real NEWARO features.
const PAGE_SEO: PageSeo[] = [
  { match: /^\/$/, title: 'NEWARO | Online Shopping and Local Shops in Nepal', description: 'Shop from local stores in Nepal with Cash on Delivery. Discover products, shops, events, and freelance work on NEWARO.', indexable: true },
  { match: /^\/explore\/?$/, title: 'Explore Products | NEWARO', description: 'Browse products from NEWARO sellers in Nepal. Cash on Delivery available.', indexable: true },
  { match: /^\/shops\/?$/, title: 'Local Shops in Nepal | NEWARO', description: 'Find local shops and businesses in Nepal on NEWARO.', indexable: true },
  { match: /^\/apps\/?$/, title: 'Apps and Tools | NEWARO', description: 'Discover useful apps and community tools on NEWARO.', indexable: true },
  { match: /^\/booking\/?$/, title: 'Bus and Travel Booking | NEWARO', description: 'Browse listed bus, hotel, and ride services and send booking requests on NEWARO.', indexable: true },
  { match: /^\/shops\/[^/]+/, title: 'Local Shop | NEWARO', description: 'View this local shop and its products on NEWARO.', indexable: true },
  { match: /^\/products\/[^/]+/, title: 'Product | NEWARO', description: 'View this product, its price, and its seller on NEWARO.', indexable: true },
  { match: /^\/jobs\/?$/, title: 'Freelance Jobs and Gigs in Nepal | NEWARO', description: 'Find freelance jobs and gigs in Nepal and send proposals on NEWARO.', indexable: true },
  { match: /^\/events\/?$/, title: 'Community Events in Nepal | NEWARO', description: 'Discover community events in Nepal on NEWARO.', indexable: true },
  { match: /^\/nearby\/?$/, title: 'Shops Near You | NEWARO', description: 'Find local shops near you on NEWARO.', indexable: true },
  { match: /^\/news\/?$/, title: 'News and Updates | NEWARO', description: 'Announcements and updates from NEWARO.', indexable: true },
  { match: /^\/membership\/?$/, title: 'Membership | NEWARO', description: 'NEWARO membership tiers.', indexable: true },
  { match: /^\/creator\/?$/, title: 'Creator Hub | NEWARO', description: 'The NEWARO creator hub.', indexable: true },
  { match: /^\/about\/?$/, title: 'About NEWARO', description: 'Learn about NEWARO, a local social-commerce and freelance platform in Nepal.', indexable: true },
  { match: /^\/contact\/?$/, title: 'Contact NEWARO', description: 'Contact NEWARO support.', indexable: true },
  { match: /^\/terms\/?$/, title: 'Terms of Service | NEWARO', description: 'NEWARO terms of service.', indexable: true },
  { match: /^\/privacy\/?$/, title: 'Privacy Policy | NEWARO', description: 'How NEWARO handles personal information.', indexable: true },
];

// Everything else (accounts, cart, orders, admin, unknown pages) stays out of search results
const DEFAULT_PRIVATE: PageSeo = {
  match: /.*/,
  title: SITE_NAME,
  description: 'NEWARO social commerce platform for Nepal.',
  indexable: false,
};

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

// Updates title, description, social tags, robots, and canonical link on every route change
export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PAGE_SEO.find((p) => p.match.test(pathname)) || DEFAULT_PRIVATE;
    const url = window.location.origin + pathname;
    document.title = page.title;
    setMeta('name', 'description', page.description);
    setMeta('property', 'og:title', page.title);
    setMeta('property', 'og:description', page.description);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:url', url);
    setMeta('name', 'robots', page.indexable ? 'index, follow' : 'noindex, nofollow');
    setCanonical(page.indexable ? url : null);
  }, [pathname]);

  return null;
}
