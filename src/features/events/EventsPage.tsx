import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Search,
  Plus,
  CheckCircle2,
  ExternalLink,
  Share2,
  X,
  Sparkles,
  Ticket,
  Filter,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface CommunityEvent {
  id: string;
  title: string;
  category: 'Tech & AI' | 'Workshops' | 'Markets & Popups' | 'Arts & Heritage' | 'Networking';
  city: 'Kathmandu' | 'Pokhara' | 'Lalitpur' | 'Bhaktapur';
  venue: string;
  date: string;
  time: string;
  organizer: string;
  organizerRole: string;
  price: string;
  attendeesCount: number;
  maxCapacity: number;
  coverImage: string;
  description: string;
  agenda: { time: string; title: string }[];
  tags: string[];
}

const EVENT_CITIES = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur'] as const;
const EVENT_PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><rect width='800' height='450' fill='%23e2e8f0'/></svg>";

const toCommunityEvent = (e: any): CommunityEvent => ({
  id: e.id,
  title: e.title || 'Untitled event',
  category: (e.category as CommunityEvent['category']) || 'Networking',
  city:
    (EVENT_CITIES.find((c) => (e.location || '').toLowerCase().includes(c.toLowerCase())) as CommunityEvent['city']) ||
    'Kathmandu',
  venue: e.location || 'Nepal',
  date: e.date || e.eventDate || 'Upcoming',
  time: e.time || '',
  organizer: e.organizerName || e.creatorName || 'Community member',
  organizerRole: 'Host',
  price: e.price || 'Free',
  attendeesCount: e.goingCount || 0,
  maxCapacity: e.maxCapacity || 0,
  coverImage: e.bannerUrl || EVENT_PLACEHOLDER_IMG,
  description: e.description || '',
  agenda: Array.isArray(e.agenda) ? e.agenda : [],
  tags: Array.isArray(e.tags) ? e.tags : e.category ? [e.category] : [],
});

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(100)));
        if (active) setEvents(snap.docs.map((d) => toCommunityEvent({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('Events load failed:', err);
        addToast('Could not load events. Please try again.', 'error');
      } finally {
        if (active) setLoadingEvents(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);

  // Joined event IDs persisted in localStorage
  const [joinedEventIds, setJoinedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('newaro_joined_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleRsvp = (event: CommunityEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!user) {
      addToast('Please sign in to RSVP for community events.', 'info');
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    const isJoined = joinedEventIds.includes(event.id);
    let nextIds: string[];

    if (isJoined) {
      nextIds = joinedEventIds.filter((id) => id !== event.id);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === event.id ? { ...ev, attendeesCount: Math.max(0, ev.attendeesCount - 1) } : ev))
      );
      playUiSound('tap');
      addToast(`You have cancelled your RSVP for "${event.title}".`, 'info');
    } else {
      nextIds = [...joinedEventIds, event.id];
      setEvents((prev) =>
        prev.map((ev) => (ev.id === event.id ? { ...ev, attendeesCount: ev.attendeesCount + 1 } : ev))
      );
      playUiSound('success');
      addToast(`RSVP Confirmed! You are attending "${event.title}".`, 'success');
    }

    updateDoc(doc(db, 'events', event.id), { goingCount: increment(isJoined ? -1 : 1) }).catch(() => {});
    setJoinedEventIds(nextIds);
    try {
      localStorage.setItem('newaro_joined_events', JSON.stringify(nextIds));
    } catch {}
  };

  const handleShareEvent = (event: CommunityEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `Join ${event.title} in ${event.city} on NEWARO!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('Event link copied to clipboard!', 'info');
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      (ev.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.venue || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || ev.category === selectedCategory;
    const matchesCity = selectedCity === 'All' || ev.city === selectedCity;

    return matchesSearch && matchesCategory && matchesCity;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-10 text-white shadow-xl shadow-blue-900/10">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide uppercase border border-white/20">
            <Calendar className="w-3.5 h-3.5 text-blue-200" />
            <span>Community Events & Gatherings</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Discover What’s Happening Across Nepal
          </h1>

          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Explore verified artisan popups, developer hackathons, local craft workshops, and merchant masterclasses in Kathmandu, Pokhara, Lalitpur, and beyond.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/create-event"
              className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-extrabold rounded-xl transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Host an Event</span>
            </Link>
            <div className="text-xs text-blue-200 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Free RSVP on Community Meetups</span>
            </div>
          </div>
        </div>

        {/* Subtle decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search input and City selector */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title, topic, or venue in Nepal..."
              className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-hidden bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs font-bold text-slate-700 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 outline-hidden cursor-pointer"
            >
              <option value="All">All Cities in Nepal</option>
              <option value="Kathmandu">Kathmandu</option>
              <option value="Lalitpur">Lalitpur</option>
              <option value="Pokhara">Pokhara</option>
              <option value="Bhaktapur">Bhaktapur</option>
            </select>
          </div>
        </div>

        {/* Category Filter Buttons (Functional Buttons, No Static Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {['All', 'Tech & AI', 'Workshops', 'Markets & Popups', 'Arts & Heritage', 'Networking'].map(
            (cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Events Grid */}
      {loadingEvents ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-sm font-semibold text-slate-500">
          Loading events...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            {events.length === 0 ? 'No events yet. Be the first to host one!' : 'No events found matching your criteria'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords, city filter, or category selection to discover more gatherings.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedCity('All');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
          <div>
            <Link
              to="/create-event"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Host an Event
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((evt) => {
            const isJoined = joinedEventIds.includes(evt.id);
            return (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Event Cover Image */}
                  <div className="relative h-44 sm:h-48 overflow-hidden bg-slate-100">
                    <img
                      src={evt.coverImage}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-slate-900 px-2.5 py-1 rounded-xl text-[11px] font-black tracking-tight shadow-xs border border-slate-200/60">
                      {evt.city}
                    </div>
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xs">
                      {evt.price}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-3">
                    {/* Date & Time Header */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{evt.date}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-500 font-semibold">{evt.time.split('–')[0]}</span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {evt.title}
                    </h3>

                    <div className="flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{evt.venue}</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    {/* Organizer & Capacity */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        By <strong className="text-slate-800 font-bold">{evt.organizer}</strong>
                      </span>
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{evt.attendeesCount}{evt.maxCapacity ? ` / ${evt.maxCapacity}` : ''}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 sm:p-5 pt-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleRsvp(evt, e)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isJoined
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>RSVP Confirmed</span>
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>RSVP / Join Event</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleShareEvent(evt, e)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer shrink-0"
                    title="Share Event"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl relative">
            {/* Header Image */}
            <div className="relative h-56 sm:h-64 bg-slate-100">
              <img
                src={selectedEvent.coverImage}
                alt={selectedEvent.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3.5 right-3.5 p-2 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md transition-all cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-xs font-bold">
                {selectedEvent.city} · {selectedEvent.category}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-7 space-y-5">
              <div className="space-y-1.5">
                <div className="text-xs font-extrabold text-blue-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedEvent.date}</span>
                  <span aria-hidden="true">·</span>
                  <Clock className="w-4 h-4" />
                  <span>{selectedEvent.time}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {selectedEvent.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedEvent.venue}</span>
                </div>
              </div>

              {/* Host & Pricing Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Organized By:</span>
                  <span className="font-extrabold text-slate-900">{selectedEvent.organizer}</span>
                  <span className="block text-[11px] text-blue-600 font-semibold">{selectedEvent.organizerRole}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold">Admission:</span>
                  <span className="text-base font-black text-slate-900">{selectedEvent.price}</span>
                  <span className="block text-[11px] text-slate-500 font-semibold">
                    {selectedEvent.attendeesCount}{selectedEvent.maxCapacity ? ` / ${selectedEvent.maxCapacity}` : ''} Attending
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">About This Event</h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedEvent.description}
                </p>
              </div>

              {/* Agenda / Schedule */}
              {selectedEvent.agenda && selectedEvent.agenda.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Event Schedule</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl bg-white overflow-hidden text-xs">
                    {selectedEvent.agenda.map((ag, i) => (
                      <div key={i} className="p-3 flex items-start gap-3">
                        <span className="font-mono font-bold text-blue-600 shrink-0 w-16">{ag.time}</span>
                        <span className="font-semibold text-slate-800">{ag.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareEvent(selectedEvent)}
                    className="p-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleRsvp(selectedEvent)}
                    className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      joinedEventIds.includes(selectedEvent.id)
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {joinedEventIds.includes(selectedEvent.id) ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Attending (Click to Cancel)</span>
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>Confirm RSVP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
