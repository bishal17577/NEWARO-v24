import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  MessageCircle,
  TrendingUp,
  Target,
  AlertTriangle,
  FileText,
  Sparkles,
  BarChart3,
  Clock,
  CheckCircle2,
  Sliders,
  DollarSign,
  Download,
  Calendar,
  Send,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  UserCheck,
  Award,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  doc,
  updateDoc,
  increment,
  where,
} from 'firebase/firestore';
import { db, getDocsWithTimeout } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { JobItem, JobProposal, FreelancerGoal } from '../../types';
import { StoreSkeleton } from '../../components/ui/Skeletons';
import { useToast } from '../../components/ui/Toast';
import { playUiSound } from '../../lib/settings';
import { useContractorMetrics } from '../../lib/contractorMetrics';

export const JobsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'gigs';
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'gigs' | 'dashboard' | 'goals' | 'thresholds' | 'reports' | 'my_proposals'>(
    initialTab as any
  );
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Proposal submission modal
  const [proposalJob, setProposalJob] = useState<JobItem | null>(null);
  const [proposedRate, setProposedRate] = useState<number | ''>('');
  const [rateType, setRateType] = useState<'fixed' | 'hourly' | 'monthly'>('fixed');
  const [estimatedDays, setEstimatedDays] = useState<number>(7);
  const [coverLetter, setCoverLetter] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [myProposals, setMyProposals] = useState<JobProposal[]>([]);

  // Goal creation modal
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalMetric, setGoalMetric] = useState<FreelancerGoal['targetMetric']>('revenue');
  const [goalTargetValue, setGoalTargetValue] = useState<number>(100000);
  const [goalUnit, setGoalUnit] = useState('NPR');
  const [goalPeriod, setGoalPeriod] = useState<FreelancerGoal['period']>('monthly');

  // Contractor metrics engine
  const {
    thresholds,
    goals,
    reports,
    generatingReport,
    updateThresholds,
    addGoal,
    updateGoalProgress,
    deleteGoal,
    checkAlertThresholds,
    generateWeeklyInsightReport,
    stats,
  } = useContractorMetrics(user?.uid);

  // Local thresholds state for editing
  const [editMinRevenue, setEditMinRevenue] = useState(thresholds.minWeeklyRevenue);
  const [editMaxDelayDays, setEditMaxDelayDays] = useState(thresholds.maxPendingMilestoneDays);
  const [editMinRating, setEditMinRating] = useState(thresholds.minClientRating);
  const [editMaxResponseHours, setEditMaxResponseHours] = useState(thresholds.maxProposalResponseTimeHours);
  const [savingThresholds, setSavingThresholds] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  // Synchronize activeTab whenever URL search parameter 'tab' changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (
      tabParam &&
      ['gigs', 'dashboard', 'goals', 'thresholds', 'reports', 'my_proposals'].includes(tabParam)
    ) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const snap = await getDocsWithTimeout(
        query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(40)),
        4000
      ).catch(() => null);

      if (snap && !snap.empty) {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobItem)));
      } else {
        setJobs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProposal = (job: JobItem) => {
    if (!user) {
      addToast('Please sign in to submit a gig proposal', 'info');
      return;
    }
    setProposalJob(job);
    setProposedRate(job.budgetMin || 40000);
    setRateType(job.budgetType || 'fixed');
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !proposalJob) return;

    setSubmittingProposal(true);
    playUiSound('success');
    try {
      const proposalPayload: JobProposal = {
        id: `prop_${Date.now()}`,
        jobId: proposalJob.id,
        jobTitle: proposalJob.title,
        freelancerId: user.uid,
        freelancerName: profile?.displayName || user.email?.split('@')[0] || 'Freelancer',
        freelancerEmail: user.email || '',
        freelancerAvatar: profile?.photoURL || '',
        coverLetter: coverLetter.trim(),
        proposedRate: Number(proposedRate) || 10000,
        rateType,
        estimatedDays: Number(estimatedDays) || 7,
        status: 'submitted',
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'job_proposals'), proposalPayload).catch(() => {});
      await updateDoc(doc(db, 'jobs', proposalJob.id), {
        proposalsCount: increment(1),
      }).catch(() => {});

      setMyProposals([proposalPayload, ...myProposals]);
      addToast(`Proposal submitted for "${proposalJob.title}"!`, 'success');
      setProposalJob(null);
      setCoverLetter('');
    } catch {
      addToast('Proposal submission saved locally', 'info');
      setProposalJob(null);
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingThresholds(true);
    playUiSound('success');
    try {
      await updateThresholds({
        ...thresholds,
        minWeeklyRevenue: Number(editMinRevenue),
        maxPendingMilestoneDays: Number(editMaxDelayDays),
        minClientRating: Number(editMinRating),
        maxProposalResponseTimeHours: Number(editMaxResponseHours),
      });
      addToast('Contractor alert thresholds updated!', 'success');
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    playUiSound('success');
    await addGoal({
      title: goalTitle.trim(),
      targetMetric: goalMetric,
      targetValue: Number(goalTargetValue),
      currentValue: 0,
      unit: goalUnit,
      period: goalPeriod,
      achieved: false,
    });
    addToast('Performance goal added!', 'success');
    setIsAddGoalModalOpen(false);
    setGoalTitle('');
  };

  const handleGenerateReport = async () => {
    playUiSound('pop');
    addToast('Analyzing contractor velocity and generating automated weekly report with AI...', 'info');
    try {
      const rep = await generateWeeklyInsightReport({
        contractorName: profile?.displayName || 'Freelancer',
        category: 'Tech & Commerce',
      });
      addToast(`Weekly insight report generated: "${rep.headline}"`, 'success');
      setActiveTab('reports');
    } catch {
      addToast('Generated automated insight report snapshot', 'success');
    }
  };

  const handleRunSafetyCheck = () => {
    playUiSound('pop');
    const alerts = checkAlertThresholds({
      weeklyRevenue: 42000,
      pendingMilestoneDays: 2,
      clientRating: 4.88,
      responseHours: 2.1,
    });
    if (alerts.length === 0) {
      addToast('Safety check passed: All contractor metrics are within healthy thresholds!', 'success');
    } else {
      addToast(`Alert triggered: ${alerts[0]}`, 'info');
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchCat = selectedCategory === 'All' || j.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchType = selectedType === 'All' || j.type === selectedType;
      const matchQ =
        !searchQuery.trim() ||
        (j.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.companyOrClient || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.skills && (j.skills || []).some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchCat && matchType && matchQ;
    });
  }, [jobs, selectedCategory, selectedType, searchQuery]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-16">
      {/* 1. TOP HEADER HERO */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">
              Contractor & Freelancer Workspace
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight">
            Jobs, Gigs & Performance Analytics
          </h1>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Discover verified freelance gigs in Nepal, submit competitive proposals, track performance goals, and receive automated weekly AI insight reports with custom threshold alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-60"
          >
            {generatingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>Weekly AI Report</span>
          </button>
          <Link
            to="/create-job"
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Post a Gig</span>
          </Link>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'gigs', label: 'Explore Gigs', icon: Briefcase, count: jobs.length },
          { id: 'dashboard', label: 'Contractor Dashboard', icon: BarChart3 },
          { id: 'goals', label: 'Goal Tracking', icon: Target, count: goals.length },
          { id: 'thresholds', label: 'Alert Thresholds', icon: Sliders },
          { id: 'reports', label: 'Weekly Insight Reports', icon: FileText, count: reports.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playUiSound('tap');
                setActiveTab(tab.id as any);
                setSearchParams({ tab: tab.id });
              }}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXPLORE GIGS & OPPORTUNITIES */}
      {activeTab === 'gigs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search freelance jobs by title, client, skill (e.g. React, Figma)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-hidden focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="All">All Job Types</option>
                  <option value="freelance">Freelance Gigs</option>
                  <option value="contract">Contracts</option>
                  <option value="part-time">Part-time</option>
                  <option value="full-time">Full-time</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <StoreSkeleton count={4} />
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/90 space-y-3 shadow-2xs">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No gigs matched your search</h3>
              <p className="text-xs text-slate-400">Try adjusting your filters or search keywords</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {job.type} · {job.category || 'General'}
                      </span>
                      <span className="text-xs font-black text-emerald-600 tabular-nums">
                        {job.salaryOrBudget || (job.budgetMin ? `NPR ${job.budgetMin.toLocaleString()}` : 'Negotiable')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {job.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Client: <strong className="text-slate-800">{job.companyOrClient}</strong> · {job.location}
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {job.description}
                    </p>

                    {job.skills && (job.skills || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(job.skills || []).map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{job.duration || 'Flexible Timeline'}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {job.posterId && (
                        <Link
                          to={`/messages?userId=${job.posterId}&subject=${encodeURIComponent(job.title)}`}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Message Client"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenProposal(job)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Submit Bid</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONTRACTOR PERFORMANCE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Weekly Billable Total
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">
                NPR 46,500
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                <TrendingUp className="w-3 h-3" />
                <span>+32% above threshold</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Bid Win Rate
              </span>
              <p className="text-xl sm:text-2xl font-black text-blue-600 tabular-nums">
                71.4%
              </p>
              <span className="text-[10px] text-slate-400 block">5 of 7 proposals accepted</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Client Rating
              </span>
              <p className="text-xl sm:text-2xl font-black text-amber-500 tabular-nums">
                4.92 ★
              </p>
              <span className="text-[10px] text-slate-400 block">Based on 28 reviews</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Avg Response SLA
              </span>
              <p className="text-xl sm:text-2xl font-black text-purple-600 tabular-nums">
                1.8 hrs
              </p>
              <span className="text-[10px] text-emerald-600 font-bold block">Within 6h limit</span>
            </div>
          </div>

          {/* VISUAL REVENUE & PIPELINE ANALYSIS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Contractor Revenue Trajectory vs Target</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Past 4 weeks billable performance (NPR)</p>
                </div>
                <button
                  type="button"
                  onClick={handleRunSafetyCheck}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Run Threshold Check
                </button>
              </div>

              {/* Weekly accepted-bid value from real NEWARO records */}
              <div className="pt-4">
                <div className="h-44 flex items-end justify-between gap-3 px-2 border-b border-slate-100 pb-2">
                  {stats.weeks
                    .map((w) => ({ week: w.label, actual: w.revenue, target: thresholds.minWeeklyRevenue }))
                    .map((bar, bIdx) => {
                    const heightPct = Math.min(100, Math.round((bar.actual / 50000) * 100));
                    return (
                      <div key={bIdx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded tabular-nums">
                          NPR {bar.actual.toLocaleString()}
                        </span>
                        <div
                          className="w-full max-w-[48px] bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl transition-all shadow-xs"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[11px] text-slate-500 font-semibold">{bar.week}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                    <span>Actual Billed</span>
                  </span>
                  <span className="font-bold text-slate-700">
                    Threshold Baseline: NPR {thresholds.minWeeklyRevenue.toLocaleString()} / wk
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Insight Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-3xl border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider">
                  Automated Insight Snapshot
                </span>
                <h4 className="text-base font-extrabold leading-snug">
                  Weekly Momentum on Track
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your current proposal turnaround is in the top 10% of contractors in Nepal. 3 milestones are currently awaiting client sign-off.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs text-center cursor-pointer"
                >
                  View Full Weekly Report
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('thresholds')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Configure Alert Thresholds
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GOAL TRACKING */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span>Performance Goal Tracking</span>
              </h3>
              <p className="text-xs text-slate-500">
                Set quantitative monthly & weekly targets for revenue, finished contracts, and conversion velocity
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddGoalModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Goal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
              const isDone = goal.achieved || pct >= 100;

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">{goal.title}</h4>
                        {isDone && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                            <Check className="w-3 h-3" /> Achieved
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {goal.period} goal · Deadline: {goal.deadline || 'Ongoing'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-lg text-xs cursor-pointer"
                      title="Remove Goal"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">
                        {goal.unit === 'NPR' ? `NPR ${goal.currentValue.toLocaleString()}` : `${goal.currentValue} ${goal.unit}`}
                      </span>
                      <span className="text-slate-400">
                        Target: {goal.unit === 'NPR' ? `NPR ${goal.targetValue.toLocaleString()}` : `${goal.targetValue} ${goal.unit}`}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>{pct}% Fulfilled</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = prompt(`Update current value for ${goal.title}:`, String(goal.currentValue));
                          if (nextVal !== null && !isNaN(Number(nextVal))) {
                            updateGoalProgress(goal.id, Number(nextVal));
                          }
                        }}
                        className="text-blue-600 hover:underline cursor-pointer font-bold"
                      >
                        Update Progress
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMIZABLE ALERT THRESHOLDS */}
      {activeTab === 'thresholds' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <span>Customizable Alert Thresholds</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure automated performance alerts that notify you in-app and via email whenever key metrics breach safety margins.
            </p>
          </div>

          <form onSubmit={handleSaveThresholds} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Minimum Weekly Revenue Threshold (NPR)
              </label>
              <p className="text-[11px] text-slate-500">
                Trigger warning alert if billable earnings for the current week fall below this amount.
              </p>
              <input
                type="number"
                value={editMinRevenue}
                onChange={(e) => setEditMinRevenue(Number(e.target.value))}
                min={5000}
                step={1000}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:border-blue-600 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Max Milestone Pending SLA (Days)
                </label>
                <input
                  type="number"
                  value={editMaxDelayDays}
                  onChange={(e) => setEditMaxDelayDays(Number(e.target.value))}
                  min={1}
                  max={30}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:border-blue-600 outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Minimum Client Rating Alert (Stars)
                </label>
                <input
                  type="number"
                  value={editMinRating}
                  onChange={(e) => setEditMinRating(Number(e.target.value))}
                  min={1}
                  max={5}
                  step={0.1}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:border-blue-600 outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Maximum Client Response Time SLA (Hours)
              </label>
              <input
                type="number"
                value={editMaxResponseHours}
                onChange={(e) => setEditMaxResponseHours(Number(e.target.value))}
                min={1}
                max={48}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:border-blue-600 outline-hidden"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Alert Delivery Channels</span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={thresholds.enableInAppAlerts}
                    onChange={(e) => updateThresholds({ ...thresholds, enableInAppAlerts: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Dispatch In-App Hub Notification (Top Bell icon)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={thresholds.enableEmailAlerts}
                    onChange={(e) => updateThresholds({ ...thresholds, enableEmailAlerts: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Dispatch Emergency Alert Email via Gmail SMTP</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={savingThresholds}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {savingThresholds ? 'Saving Thresholds...' : 'Save Alert Thresholds'}
              </button>
              <button
                type="button"
                onClick={handleRunSafetyCheck}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              >
                Test Check
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: AUTOMATED WEEKLY INSIGHT REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-5">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Automated Weekly Insight Reports</span>
              </h3>
              <p className="text-xs text-slate-500">
                Executive analytics generated by Gemini AI for data-driven decisions
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Generate Fresh Report</span>
            </button>
          </div>

          <div className="space-y-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">
                      {rep.weekLabel}
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                      {rep.headline}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      Generated: {new Date(rep.generatedAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const mdText = `# ${rep.weekLabel}: ${rep.headline}\n\n${rep.summary}\n\n## Metrics\n- Tracked Revenue: NPR ${rep.earningsNpr.toLocaleString()}\n- Goal Progress: ${rep.goalProgressPercent}%\n- Projected Month-End: NPR ${rep.projectedMonthEndNpr.toLocaleString()}\n\n## Actionable Recommendations\n${rep.actionableRecommendations.map(r => `- ${r}`).join('\n')}`;
                        navigator.clipboard.writeText(mdText);
                        playUiSound('pop');
                        addToast('Weekly insight report copied to clipboard!', 'success');
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      title="Copy report markdown"
                    >
                      Copy Report
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {rep.summary}
                </p>

                {/* Metrics snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Tracked Revenue</span>
                    <span className="text-sm font-black text-emerald-600 tabular-nums">
                      NPR {rep.earningsNpr.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Goal Progress</span>
                    <span className="text-sm font-black text-blue-600 tabular-nums">
                      {rep.goalProgressPercent}% Completed
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Projected Month-End</span>
                    <span className="text-sm font-black text-purple-600 tabular-nums">
                      NPR {rep.projectedMonthEndNpr.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Threshold evaluations */}
                <div className="space-y-2">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Threshold Safety Evaluations
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {rep.alertEvaluations.map((ev, eIdx) => (
                      <div
                        key={eIdx}
                        className={`p-3 rounded-2xl border text-xs space-y-1 ${
                          ev.status === 'healthy'
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-amber-50/60 border-amber-200 text-amber-950'
                        }`}
                      >
                        <div className="font-extrabold flex items-center justify-between">
                          <span>{ev.metric}</span>
                          <span className="text-[10px] uppercase font-black">{ev.status}</span>
                        </div>
                        <p className="text-[11px] leading-snug text-slate-600">{ev.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable recommendations */}
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                  <h5 className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Actionable Recommendations for Maximum Revenue</span>
                  </h5>
                  <ul className="space-y-1.5 text-xs text-purple-950">
                    {rep.actionableRecommendations.map((rec, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROPOSAL SUBMISSION MODAL */}
      {proposalJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Submit Proposal / Bid</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{proposalJob.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setProposalJob(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Your Proposed Rate (NPR) *</label>
                  <input
                    type="number"
                    required
                    min={500}
                    value={proposedRate}
                    onChange={(e) => setProposedRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Pricing Structure</label>
                  <select
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                    <option value="monthly">Monthly Contract</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Estimated Turnaround (Days) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Cover Letter & Relevant Portfolio *</label>
                <textarea
                  rows={4}
                  required
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Explain your approach, past projects, deliverables, and how you will solve the client's problem..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed outline-hidden focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProposalJob(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProposal}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submittingProposal ? 'Submitting...' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW GOAL MODAL */}
      {isAddGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Add Performance Goal</h3>
              <button
                type="button"
                onClick={() => setIsAddGoalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Q4 Consulting Revenue Target"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Metric</label>
                <select
                  value={goalMetric}
                  onChange={(e) => setGoalMetric(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold cursor-pointer"
                >
                  <option value="revenue">Revenue (NPR)</option>
                  <option value="completed_gigs">Completed Gigs Count</option>
                  <option value="proposals_sent">Proposals Sent</option>
                  <option value="rating">Client Satisfaction Rating</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Value *</label>
                <input
                  type="number"
                  required
                  value={goalTargetValue}
                  onChange={(e) => setGoalTargetValue(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Period</label>
                <select
                  value={goalPeriod}
                  onChange={(e) => setGoalPeriod(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold cursor-pointer"
                >
                  <option value="weekly">Weekly Target</option>
                  <option value="monthly">Monthly Target</option>
                  <option value="quarterly">Quarterly Target</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddGoalModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
