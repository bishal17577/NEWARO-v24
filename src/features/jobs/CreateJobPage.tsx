import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, ArrowLeft, Loader2, Check } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';

export const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [companyOrClient, setCompanyOrClient] = useState('');
  const [location, setLocation] = useState('Kathmandu (Remote / Hybrid)');
  const [salaryOrBudget, setSalaryOrBudget] = useState('');
  const [type, setType] = useState<'freelance' | 'contract' | 'full-time' | 'part-time'>('freelance');
  const [category, setCategory] = useState('Software Engineering');
  const [duration, setDuration] = useState('1 - 3 Months');
  const [skills, setSkills] = useState('React, TypeScript, UI/UX');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('Please sign in to post a job', 'info');
      navigate('/auth');
      return;
    }

    setSubmitting(true);
    try {
      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const newJob = {
        posterId: user.uid,
        posterName: profile?.displayName || 'Employer',
        posterEmail: user.email || '',
        title: title.trim(),
        companyOrClient: companyOrClient.trim(),
        type,
        category,
        location: location.trim(),
        salaryOrBudget: salaryOrBudget.trim(),
        duration,
        skills: skillsArray,
        description: description.trim(),
        proposalsCount: 0,
        status: 'open',
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'jobs'), newJob);
      addToast('Job / Freelance gig posted successfully!', 'success');
      navigate('/jobs?tab=gigs');
    } catch {
      addToast('Failed to post job', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12">
      <div className="flex items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <Link to="/jobs" className="p-2 hover:bg-slate-100 rounded-xl text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base sm:text-lg font-extrabold text-slate-900">Post a Job / Freelance Gig</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Role Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Mobile React Engineer or E-commerce Brand Designer"
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Company / Client Name *</label>
          <input
            type="text"
            required
            value={companyOrClient}
            onChange={(e) => setCompanyOrClient(e.target.value)}
            placeholder="e.g. Kathmandu Handicrafts or Tech Nepal"
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Engagement Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
            >
              <option value="freelance">Freelance Gig</option>
              <option value="contract">Fixed Contract</option>
              <option value="part-time">Part-Time</option>
              <option value="full-time">Full-Time</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
            >
              <option value="Software Engineering">Software Engineering</option>
              <option value="Design & Creative">Design & Creative</option>
              <option value="E-Commerce & Marketing">E-Commerce & Marketing</option>
              <option value="Photography & Media">Photography & Media</option>
              <option value="Writing & Translation">Writing & Translation</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Budget / Compensation (NPR)</label>
            <input
              type="text"
              value={salaryOrBudget}
              onChange={(e) => setSalaryOrBudget(e.target.value)}
              placeholder="e.g. NPR 60,000 / gig"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Project Duration</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 2 Weeks or 6 Months"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Skills Required (comma-separated)</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, Figma, Next.js"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Requirements & Scope *</label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain project scope, deliverables, milestones, and how contractors should apply..."
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Publish Opportunity</span>
        </button>
      </form>
    </div>
  );
};
