import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, Loader2, Check } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';

export const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Kathmandu');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        creatorId: user.uid,
        creatorName: profile?.displayName || 'Member',
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date: date || 'Upcoming',
        createdAt: Date.now(),
      });
      addToast('Event published!', 'success');
      navigate('/events');
    } catch {
      addToast('Failed to post event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-2.5 bg-white p-3.5 rounded-2xl border">
        <Link to="/events" className="p-2 hover:bg-slate-100 rounded-xl text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base sm:text-lg font-extrabold text-slate-900">Host an Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border p-5 space-y-4 shadow-2xs">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Event Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Kathmandu Tech & Maker Meetup"
            className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="e.g. Saturday, 2:00 PM"
              className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Location *</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Event details, agenda, and instructions..."
            className="w-full text-xs p-2.5 bg-slate-50 border rounded-xl"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Publish Event</span>
        </button>
      </form>
    </div>
  );
};
