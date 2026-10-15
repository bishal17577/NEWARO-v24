import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  FreelancerGoal,
  AlertThresholdConfig,
  WeeklyInsightReport,
  JobProposal,
  JobItem,
} from '../types';
import { notify } from './notifications';

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholdConfig = {
  minWeeklyRevenue: 35000, // NPR 35,000 / week
  maxPendingMilestoneDays: 5, // Alert if milestone waiting > 5 days
  minClientRating: 4.5, // Alert if rating falls below 4.5
  maxProposalResponseTimeHours: 6, // Alert if client waiting > 6 hours
  minAcceptedProposalsTarget: 2, // Target bids won per week
  enableEmailAlerts: true,
  enableInAppAlerts: true,
  enablePushAlerts: true,
  frequency: 'daily_summary',
};

const THRESHOLDS_STORAGE_KEY = 'newaro_contractor_thresholds_v1';
const GOALS_STORAGE_KEY = 'newaro_contractor_goals_v1';
const REPORTS_STORAGE_KEY = 'newaro_weekly_reports_v1';

export const DEFAULT_INITIAL_GOALS: Omit<FreelancerGoal, 'id' | 'userId' | 'createdAt'>[] = [
  {
    title: 'Monthly Billable Target',
    targetMetric: 'revenue',
    targetValue: 125000,
    currentValue: 0,
    unit: 'NPR',
    period: 'monthly',
    deadline: 'End of Month',
    achieved: false,
  },
  {
    title: 'Completed Freelance Gigs',
    targetMetric: 'completed_gigs',
    targetValue: 4,
    currentValue: 0,
    unit: 'Gigs',
    period: 'monthly',
    deadline: 'This Month',
    achieved: false,
  },
  {
    title: 'Client Satisfaction Rating',
    targetMetric: 'rating',
    targetValue: 4.9,
    currentValue: 0,
    unit: '★',
    period: 'monthly',
    deadline: 'Continuous',
    achieved: false,
  },
  {
    title: 'Client Proposals Sent',
    targetMetric: 'proposals_sent',
    targetValue: 10,
    currentValue: 0,
    unit: 'Bids',
    period: 'weekly',
    deadline: 'Sunday',
    achieved: false,
  },
];

export function loadStoredThresholds(): AlertThresholdConfig {
  try {
    const raw = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_ALERT_THRESHOLDS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_ALERT_THRESHOLDS };
}

export function saveStoredThresholds(config: AlertThresholdConfig) {
  try {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('newaro:thresholds_updated', { detail: config }));
  } catch {}
}

export function loadStoredGoals(uid: string): FreelancerGoal[] {
  try {
    const raw = localStorage.getItem(`${GOALS_STORAGE_KEY}_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_INITIAL_GOALS.map((g, i) => ({
    ...g,
    id: `goal_default_${i}`,
    userId: uid,
    createdAt: Date.now() - 86400000 * (10 - i * 2),
  }));
}

export function saveStoredGoals(uid: string, goals: FreelancerGoal[]) {
  try {
    localStorage.setItem(`${GOALS_STORAGE_KEY}_${uid}`, JSON.stringify(goals));
    window.dispatchEvent(new CustomEvent('newaro:goals_updated', { detail: goals }));
  } catch {}
}

export function loadStoredReports(uid: string): WeeklyInsightReport[] {
  try {
    const raw = localStorage.getItem(`${REPORTS_STORAGE_KEY}_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveStoredReports(uid: string, reports: WeeklyInsightReport[]) {
  try {
    localStorage.setItem(`${REPORTS_STORAGE_KEY}_${uid}`, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent('newaro:reports_updated', { detail: reports }));
  } catch {}
}

export interface ContractorStats {
  loaded: boolean;
  totalProposals: number;
  acceptedProposals: number;
  acceptanceRate: number | null;
  weekProposals: number;
  weekRevenue: number;
  monthRevenue: number;
  monthAccepted: number;
  weeks: { label: string; revenue: number; proposals: number }[];
}

const EMPTY_STATS: ContractorStats = {
  loaded: false,
  totalProposals: 0,
  acceptedProposals: 0,
  acceptanceRate: null,
  weekProposals: 0,
  weekRevenue: 0,
  monthRevenue: 0,
  monthAccepted: 0,
  weeks: [],
};

// Reads this freelancer's real proposals from NEWARO. Values are 0 or null when there is no data yet.
export async function loadContractorStats(uid: string): Promise<ContractorStats> {
  if (!uid || uid === 'guest') return { ...EMPTY_STATS, loaded: true };
  const snap = await getDocs(query(collection(db, 'job_proposals'), where('freelancerId', '==', uid)));
  const proposals = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobProposal));
  const DAY = 86400000;
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const acceptedValue = (list: JobProposal[]) =>
    list.filter((p) => p.status === 'accepted').reduce((sum, p) => sum + (Number(p.proposedRate) || 0), 0);

  const weeks = [3, 2, 1, 0].map((weeksAgo) => {
    const end = now - weeksAgo * 7 * DAY;
    const start = end - 7 * DAY;
    const inWeek = proposals.filter((p) => p.createdAt >= start && p.createdAt < end);
    return {
      label: weeksAgo === 0 ? 'This week' : `${weeksAgo} wk ago`,
      revenue: acceptedValue(inWeek),
      proposals: inWeek.length,
    };
  });

  const thisMonth = proposals.filter((p) => p.createdAt >= monthStart.getTime());
  const accepted = proposals.filter((p) => p.status === 'accepted');
  const thisWeek = weeks[3];
  return {
    loaded: true,
    totalProposals: proposals.length,
    acceptedProposals: accepted.length,
    acceptanceRate: proposals.length ? Math.round((accepted.length / proposals.length) * 100) : null,
    weekProposals: thisWeek.proposals,
    weekRevenue: thisWeek.revenue,
    monthRevenue: acceptedValue(thisMonth),
    monthAccepted: thisMonth.filter((p) => p.status === 'accepted').length,
    weeks,
  };
}

// Only goal types NEWARO can measure from real records are updated. Custom goals keep their own values.
function measuredGoalValue(metric: string, s: ContractorStats): number | null {
  if (metric === 'revenue') return s.monthRevenue;
  if (metric === 'completed_gigs') return s.monthAccepted;
  if (metric === 'proposals_sent') return s.weekProposals;
  if (metric === 'rating') return 0; // NEWARO does not collect client ratings for proposals yet
  return null;
}

export function useContractorMetrics(userId?: string) {
  const uid = userId || auth.currentUser?.uid || 'guest';
  const [thresholds, setThresholds] = useState<AlertThresholdConfig>(() => loadStoredThresholds());
  const [goals, setGoals] = useState<FreelancerGoal[]>(() => loadStoredGoals(uid));
  const [reports, setReports] = useState<WeeklyInsightReport[]>(() => loadStoredReports(uid));
  const [generatingReport, setGeneratingReport] = useState(false);
  const [stats, setStats] = useState<ContractorStats>(EMPTY_STATS);

  // Writes real numbers into the goals. Nothing is estimated.
  useEffect(() => {
    let active = true;
    loadContractorStats(uid)
      .then((fresh) => {
        if (!active) return;
        setStats(fresh);
        setGoals((prev) =>
          prev.map((g) => {
            const value = measuredGoalValue(g.targetMetric, fresh);
            return value === null ? g : { ...g, currentValue: value, achieved: value >= g.targetValue };
          })
        );
      })
      .catch((err) => console.warn('Contractor stats unavailable:', err));
    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    const handleThresholds = (e: Event) => {
      const c = e as CustomEvent<AlertThresholdConfig>;
      if (c.detail) setThresholds(c.detail);
    };
    const handleGoals = (e: Event) => {
      const c = e as CustomEvent<FreelancerGoal[]>;
      if (c.detail) setGoals(c.detail);
    };
    const handleReports = (e: Event) => {
      const c = e as CustomEvent<WeeklyInsightReport[]>;
      if (c.detail) setReports(c.detail);
    };
    window.addEventListener('newaro:thresholds_updated', handleThresholds);
    window.addEventListener('newaro:goals_updated', handleGoals);
    window.addEventListener('newaro:reports_updated', handleReports);
    return () => {
      window.removeEventListener('newaro:thresholds_updated', handleThresholds);
      window.removeEventListener('newaro:goals_updated', handleGoals);
      window.removeEventListener('newaro:reports_updated', handleReports);
    };
  }, []);

  const updateThresholds = async (nextConfig: AlertThresholdConfig) => {
    setThresholds(nextConfig);
    saveStoredThresholds(nextConfig);
    if (uid && uid !== 'guest') {
      await setDoc(doc(db, 'contractor_settings', uid), { thresholds: nextConfig }, { merge: true }).catch(() => {});
    }
  };

  const addGoal = async (newGoal: Omit<FreelancerGoal, 'id' | 'userId' | 'createdAt'>) => {
    const goal: FreelancerGoal = {
      ...newGoal,
      id: `goal_${Date.now()}`,
      userId: uid,
      createdAt: Date.now(),
    };
    const next = [goal, ...goals];
    setGoals(next);
    saveStoredGoals(uid, next);
    if (uid && uid !== 'guest') {
      await addDoc(collection(db, 'contractor_goals'), goal).catch(() => {});
    }
    return goal;
  };

  const updateGoalProgress = async (goalId: string, currentVal: number, achieved?: boolean) => {
    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const willAchieve = achieved !== undefined ? achieved : currentVal >= g.targetValue;
      return { ...g, currentValue: currentVal, achieved: willAchieve };
    });
    setGoals(next);
    saveStoredGoals(uid, next);
  };

  const deleteGoal = async (goalId: string) => {
    const next = goals.filter((g) => g.id !== goalId);
    setGoals(next);
    saveStoredGoals(uid, next);
  };

  // Test and generate alerts if thresholds are breached
  const checkAlertThresholds = (currentStats: {
    weeklyRevenue: number;
    pendingMilestoneDays: number;
    clientRating: number;
    responseHours: number;
  }) => {
    const triggeredAlerts: string[] = [];
    if (currentStats.weeklyRevenue < thresholds.minWeeklyRevenue) {
      triggeredAlerts.push(
        `Weekly Revenue Warning: Currently at NPR ${currentStats.weeklyRevenue.toLocaleString()}, below your configured threshold of NPR ${thresholds.minWeeklyRevenue.toLocaleString()}.`
      );
    }
    if (currentStats.pendingMilestoneDays > thresholds.maxPendingMilestoneDays) {
      triggeredAlerts.push(
        `Milestone Delay Alert: Deliverable pending review for ${currentStats.pendingMilestoneDays} days (Threshold: ${thresholds.maxPendingMilestoneDays} days).`
      );
    }
    if (currentStats.clientRating < thresholds.minClientRating) {
      triggeredAlerts.push(
        `Rating Alert: Client rating is ${currentStats.clientRating.toFixed(2)}, below your target quality threshold of ${thresholds.minClientRating.toFixed(2)}.`
      );
    }

    if (triggeredAlerts.length > 0 && thresholds.enableInAppAlerts && uid && uid !== 'guest') {
      triggeredAlerts.forEach((alertMsg) => {
        notify({
          recipientId: uid,
          type: 'threshold_alert',
          title: 'Contractor Alert Threshold Triggered',
          message: alertMsg,
          link: '/jobs?tab=dashboard',
          linkTitle: 'Open Performance Dashboard',
          badge: 'PERFORMANCE ALERT',
        }).catch(() => {});
      });
    }

    return triggeredAlerts;
  };

  // Weekly report built from REAL NEWARO records only. Nothing is estimated or invented.
  const generateWeeklyInsightReport = async (options?: {
    forceFresh?: boolean;
    contractorName?: string;
    category?: string;
  }): Promise<WeeklyInsightReport> => {
    setGeneratingReport(true);
    try {
      const fresh = await loadContractorStats(uid);
      setStats(fresh);
      if (fresh.totalProposals === 0) {
        throw new Error('No proposals on NEWARO yet. Send a proposal to start your performance report.');
      }
      const monthlyTarget = goals.find((g) => g.targetMetric === 'revenue')?.targetValue || 0;

      const res = await fetch('/api/ai/freelancer-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorProfile: {
            name: options?.contractorName || 'Freelancer',
            category: options?.category || 'Freelance',
          },
          metrics: {
            acceptedValueThisWeekNpr: fresh.weekRevenue,
            acceptedValueThisMonthNpr: fresh.monthRevenue,
            proposalsThisWeek: fresh.weekProposals,
            totalProposals: fresh.totalProposals,
            acceptedProposals: fresh.acceptedProposals,
            acceptanceRatePercent: fresh.acceptanceRate,
            clientRatings: 'not collected yet',
          },
          goals: { monthlyTargetNpr: monthlyTarget },
          alertThresholds: thresholds,
        }),
      });
      const data = await res.json().catch(() => null);
      const reportData = data?.report;
      if (!res.ok || !data?.ok || !reportData?.headline || !reportData?.summary) {
        throw new Error(data?.error || 'The AI report is not available right now. Try again later.');
      }

      const newReport: WeeklyInsightReport = {
        id: `rep_${Date.now()}`,
        userId: uid,
        weekLabel: `Week of ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
        generatedAt: Date.now(),
        headline: String(reportData.headline),
        summary: String(reportData.summary),
        earningsNpr: fresh.weekRevenue,
        goalProgressPercent: monthlyTarget ? Math.min(100, Math.round((fresh.monthRevenue / monthlyTarget) * 100)) : 0,
        alertEvaluations: Array.isArray(reportData.alertEvaluations) ? reportData.alertEvaluations : [],
        actionableRecommendations: Array.isArray(reportData.actionableRecommendations)
          ? reportData.actionableRecommendations
          : [],
        projectedMonthEndNpr:
          typeof reportData.projectedMonthEndNpr === 'number' ? reportData.projectedMonthEndNpr : fresh.monthRevenue,
      };

      const nextReports = [newReport, ...reports];
      setReports(nextReports);
      saveStoredReports(uid, nextReports);

      if (uid && uid !== 'guest') {
        notify({
          recipientId: uid,
          type: 'weekly_report',
          title: `Weekly Performance Report: ${newReport.headline}`,
          message: newReport.summary.slice(0, 200),
          link: '/jobs?tab=dashboard',
          linkTitle: 'View Full Report',
          badge: 'WEEKLY INSIGHT',
        }).catch(() => {});
      }

      return newReport;
    } finally {
      setGeneratingReport(false);
    }
  };

  return {
    thresholds,
    stats,
    goals,
    reports,
    generatingReport,
    updateThresholds,
    addGoal,
    updateGoalProgress,
    deleteGoal,
    checkAlertThresholds,
    generateWeeklyInsightReport,
  };
}
