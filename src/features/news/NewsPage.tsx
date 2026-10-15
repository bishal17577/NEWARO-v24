import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { Megaphone } from 'lucide-react';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { AnnouncementRecord } from '../../types';

// Real announcements sent by NEWARO. Empty until the first one is published.
export const NewsPage: React.FC = () => {
  const [items, setItems] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const snap = await getDocsWithTimeout(
          query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(30)),
          6000
        );
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AnnouncementRecord))
          .filter((a) => !a.audience || a.audience === 'all');
        if (active) setItems(list);
      } catch (err) {
        console.warn('News unavailable:', err);
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">News and updates</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Announcements from NEWARO</p>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center">
          <p className="font-bold text-slate-900 dark:text-white">No announcements yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Updates from NEWARO will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isExternal = typeof item.link === 'string' && /^https?:\/\//.test(item.link);
            const isInternal = typeof item.link === 'string' && item.link.startsWith('/');
            return (
              <article
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden"
              >
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title} className="w-full max-h-64 object-cover" />
                )}
                <div className="p-5 space-y-2">
                  <p className="text-[11px] text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <h2 className="font-bold text-slate-900 dark:text-white">{item.title}</h2>
                  {item.message && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{item.message}</p>
                  )}
                  {isExternal && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-blue-600">
                      Open link
                    </a>
                  )}
                  {isInternal && (
                    <Link to={item.link as string} className="inline-block text-sm font-semibold text-blue-600">
                      Open
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
