import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfWeek, format, subWeeks } from 'date-fns';

export interface OverdueByAssignee {
  userId: string;
  firstName: string;
  lastName: string;
  overdueCount: number;
  avgDelayDays: number;
  maxDelayDays: number;
  criticalCount: number;
}

export interface OverdueTask {
  id: string;
  taskName: string;
  projectName: string;
  deadline: string;
  delayDays: number;
}

export interface BurnRate {
  projectId: string;
  projectName: string;
  status: string;
  deadline: string | null;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  elapsedRatio: number;
  completionRatio: number;
  burnRate: number | null;
  category: 'ok' | 'warning' | 'danger' | 'no_data';
}

export interface VelocityWeek {
  weekLabel: string;
  completed: number;
  movingAvg: number;
}

export interface VelocityData {
  weeks: VelocityWeek[];
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  avgWeekly: number;
}

export interface ValidationMetrics {
  firstTimeApprovalRate: number;
  avgReviewTimeHours: number;
  totalSubmissions: number;
  totalReviews: number;
  topValidators: {
    userId: string;
    firstName: string;
    lastName: string;
    reviewCount: number;
    avgTimeHours: number;
  }[];
}

export interface WorkloadItem {
  userId: string;
  firstName: string;
  lastName: string;
  activeTasks: number;
  overdueTasks: number;
  workloadScore: number;
}

export interface RiskScoreProject {
  projectId: string;
  projectName: string;
  status: string;
  score: number;
  category: 'ok' | 'warning' | 'danger';
  factors: {
    burnRate: number;
    overduePct: number;
    blockedCount: number;
    deadlineUrgency: boolean;
  };
}

const COMPLETED_STATUSES = ['approved', 'vso', 'vao', 'closed', 'finalized', 'validated'];

export function useAdvancedKPIs(tenantId: string | undefined) {
  const [overdueByAssignee, setOverdueByAssignee] = useState<OverdueByAssignee[]>([]);
  const [myOverdueTasks, setMyOverdueTasks] = useState<OverdueTask[]>([]);
  const [burnRates, setBurnRates] = useState<BurnRate[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityData | null>(null);
  const [validationMetrics, setValidationMetrics] = useState<ValidationMetrics | null>(null);
  const [workloadData, setWorkloadData] = useState<WorkloadItem[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScoreProject[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOverdueByAssignee = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const now = new Date().toISOString();

      const { data: tasks, error } = await supabase
        .from('task_assignments_view')
        .select('id, task_name, project_name, status, deadline, assigned_to, project_id')
        .eq('tenant_id', tenantId)
        .not('deadline', 'is', null)
        .lt('deadline', now);

      if (error) throw error;

      const overdueTasks = (tasks || []).filter(
        (t: any) => !COMPLETED_STATUSES.includes(t.status)
      );

      const userTaskMap = new Map<string, { count: number; delays: number[]; critical: number }>();

      for (const task of overdueTasks) {
        const assignees: string[] = task.assigned_to || [];
        const delayMs = new Date(now).getTime() - new Date(task.deadline).getTime();
        const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));

        for (const userId of assignees) {
          const entry = userTaskMap.get(userId) || { count: 0, delays: [], critical: 0 };
          entry.count += 1;
          entry.delays.push(delayDays);
          if (delayDays > 15) entry.critical += 1;
          userTaskMap.set(userId, entry);
        }
      }

      const userIds = Array.from(userTaskMap.keys());
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      const nameMap = new Map<string, { first: string; last: string }>();
      (profiles || []).forEach((p: any) => {
        nameMap.set(p.user_id, { first: p.first_name || '', last: p.last_name || '' });
      });

      const result: OverdueByAssignee[] = Array.from(userTaskMap.entries())
        .map(([userId, data]) => {
          const name = nameMap.get(userId) || { first: 'Inconnu', last: '' };
          return {
            userId,
            firstName: name.first,
            lastName: name.last,
            overdueCount: data.count,
            avgDelayDays: Math.round((data.delays.reduce((a, b) => a + b, 0) / data.delays.length) * 10) / 10,
            maxDelayDays: Math.max(...data.delays),
            criticalCount: data.critical,
          };
        })
        .sort((a, b) => b.overdueCount - a.overdueCount);

      setOverdueByAssignee(result);
    } catch (err) {
      console.error('Error fetching overdue by assignee:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchMyOverdueTasks = useCallback(async (userId: string) => {
    if (!tenantId || !userId) return;
    setLoading(true);

    try {
      const now = new Date().toISOString();

      const { data: tasks, error } = await supabase
        .from('task_assignments_view')
        .select('id, task_name, project_name, status, deadline')
        .eq('tenant_id', tenantId)
        .not('deadline', 'is', null)
        .lt('deadline', now);

      if (error) throw error;

      const myOverdue = (tasks || [])
        .filter((t: any) => !COMPLETED_STATUSES.includes(t.status))
        .map((t: any) => {
          const delayMs = new Date(now).getTime() - new Date(t.deadline).getTime();
          const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));
          return {
            id: t.id,
            taskName: t.task_name || 'Tâche sans nom',
            projectName: t.project_name || 'Projet inconnu',
            deadline: t.deadline,
            delayDays,
          };
        })
        .sort((a: OverdueTask, b: OverdueTask) => b.delayDays - a.delayDays);

      setMyOverdueTasks(myOverdue);
    } catch (err) {
      console.error('Error fetching my overdue tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchBurnRates = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const now = new Date();

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, deadline, created_at')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'in_progress', 'assigned', 'pending']);

      if (projectsError) throw projectsError;

      const projectIds = (projects || []).map((p: any) => p.id);
      if (projectIds.length === 0) {
        setBurnRates([]);
        return;
      }

      const { data: tasks, error: tasksError } = await supabase
        .from('task_assignments_view')
        .select('id, project_id, status')
        .eq('tenant_id', tenantId)
        .in('project_id', projectIds);

      if (tasksError) throw tasksError;

      const tasksByProject = new Map<string, any[]>();
      (tasks || []).forEach((t: any) => {
        const list = tasksByProject.get(t.project_id) || [];
        list.push(t);
        tasksByProject.set(t.project_id, list);
      });

      const result: BurnRate[] = (projects || []).map((project: any) => {
        const projectTasks = tasksByProject.get(project.id) || [];
        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter((t: any) =>
          COMPLETED_STATUSES.includes(t.status)
        ).length;

        if (!project.created_at || totalTasks === 0) {
          return {
            projectId: project.id,
            projectName: project.name,
            status: project.status,
            deadline: project.deadline || null,
            createdAt: project.created_at,
            totalTasks,
            completedTasks,
            elapsedRatio: 0,
            completionRatio: 0,
            burnRate: null,
            category: 'no_data',
          };
        }

        const createdDate = new Date(project.created_at);
        const endDate = project.deadline ? new Date(project.deadline) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        const totalDuration = endDate.getTime() - createdDate.getTime();
        const elapsedTime = now.getTime() - createdDate.getTime();

        const elapsedRatio = Math.min(1, Math.max(0, elapsedTime / totalDuration));
        const completionRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;

        let burnRate: number | null = null;
        let category: BurnRate['category'] = 'no_data';

        if (completionRatio > 0) {
          burnRate = Math.round((elapsedRatio / completionRatio) * 10) / 10;
          if (burnRate < 0.9) category = 'ok';
          else if (burnRate < 1.2) category = 'warning';
          else category = 'danger';
        }

        return {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          deadline: project.deadline || null,
          createdAt: project.created_at,
          totalTasks,
          completedTasks,
          elapsedRatio: Math.round(elapsedRatio * 100),
          completionRatio: Math.round(completionRatio * 100),
          burnRate,
          category,
        };
      });

      setBurnRates(result.sort((a, b) => {
        const order = { danger: 0, warning: 1, no_data: 2, ok: 3 };
        return (order[a.category] ?? 99) - (order[b.category] ?? 99);
      }));
    } catch (err) {
      console.error('Error fetching burn rates:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchVelocity = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const now = new Date();
      const weeksCount = 12;
      const weekStartDates: Date[] = [];
      for (let i = weeksCount - 1; i >= 0; i--) {
        weekStartDates.push(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }));
      }

      const since = weekStartDates[0].toISOString();

      const { data: tasks, error } = await supabase
        .from('task_assignments_view')
        .select('updated_at')
        .eq('tenant_id', tenantId)
        .in('status', COMPLETED_STATUSES)
        .not('updated_at', 'is', null)
        .gte('updated_at', since);

      if (error) throw error;

      const weekCounts = weekStartDates.map((start, idx) => {
        const end = idx < weeksCount - 1 ? weekStartDates[idx + 1] : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const count = (tasks || []).filter((t: any) => {
          const d = new Date(t.updated_at);
          return d >= start && d < end;
        }).length;
        return { weekLabel: format(start, '\'S\'w'), completed: count };
      });

      const weeksWithAvg = weekCounts.map((week, idx) => {
        const slice = weekCounts.slice(Math.max(0, idx - 3), idx + 1);
        const movingAvg = Math.round((slice.reduce((sum, w) => sum + w.completed, 0) / slice.length) * 10) / 10;
        return { ...week, movingAvg };
      });

      const recent4 = weeksWithAvg.slice(-4).reduce((sum, w) => sum + w.completed, 0);
      const prev4 = weeksWithAvg.slice(-8, -4).reduce((sum, w) => sum + w.completed, 0);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendValue = 0;
      if (prev4 > 0) {
        trendValue = Math.round(((recent4 - prev4) / prev4) * 100);
        if (trendValue > 10) trend = 'up';
        else if (trendValue < -10) trend = 'down';
      }

      const avgWeekly = weeksWithAvg.length > 0
        ? Math.round((weeksWithAvg.reduce((sum, w) => sum + w.completed, 0) / weeksWithAvg.length) * 10) / 10
        : 0;

      setVelocityData({ weeks: weeksWithAvg, trend, trendValue, avgWeekly });
    } catch (err) {
      console.error('Error fetching velocity:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchValidationMetrics = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('standard_tasks')
        .select('id')
        .eq('tenant_id', tenantId);

      if (tasksError) throw tasksError;
      const taskIds = (tasks || []).map((t: any) => t.id);

      if (taskIds.length === 0) {
        setValidationMetrics(null);
        return;
      }

      const { data: submissions, error: subError } = await supabase
        .from('standard_task_submissions')
        .select('id, task_id, submitted_at')
        .in('task_id', taskIds)
        .order('submitted_at', { ascending: true });

      if (subError) throw subError;

      const submissionIds = (submissions || []).map((s: any) => s.id);

      let reviews: any[] = [];
      if (submissionIds.length > 0) {
        const { data: rData, error: revError } = await supabase
          .from('standard_task_reviews')
          .select('id, submission_id, validator_id, opinion, reviewed_at')
          .in('submission_id', submissionIds);

        if (revError) throw revError;
        reviews = rData || [];
      }

      const totalSubmissions = submissions?.length || 0;
      const totalReviews = reviews.length;

      const firstSubByTask = new Map<string, any>();
      (submissions || []).forEach((s: any) => {
        if (!firstSubByTask.has(s.task_id)) {
          firstSubByTask.set(s.task_id, s);
        }
      });

      let firstTimeApprovals = 0;
      let totalReviewedFirstSubs = 0;

      firstSubByTask.forEach((sub: any) => {
        const subReviews = reviews.filter((r: any) => r.submission_id === sub.id);
        if (subReviews.length > 0) {
          totalReviewedFirstSubs++;
          if (subReviews[0].opinion === 'F') {
            firstTimeApprovals++;
          }
        }
      });

      const firstTimeApprovalRate = totalReviewedFirstSubs > 0
        ? Math.round((firstTimeApprovals / totalReviewedFirstSubs) * 100)
        : 0;

      const reviewTimeDiffs = reviews
        .map((r: any) => {
          const sub = (submissions || []).find((s: any) => s.id === r.submission_id);
          if (!sub || !sub.submitted_at || !r.reviewed_at) return null;
          return (new Date(r.reviewed_at).getTime() - new Date(sub.submitted_at).getTime()) / (1000 * 60 * 60);
        })
        .filter((d: number | null): d is number => d !== null && d >= 0);

      const avgReviewTimeHours = reviewTimeDiffs.length > 0
        ? Math.round((reviewTimeDiffs.reduce((a: number, b: number) => a + b, 0) / reviewTimeDiffs.length) * 10) / 10
        : 0;

      const validatorCounts = new Map<string, { count: number; times: number[] }>();
      reviews.forEach((r: any) => {
        const entry = validatorCounts.get(r.validator_id) || { count: 0, times: [] };
        entry.count++;
        if (r.reviewed_at) {
          const sub = (submissions || []).find((s: any) => s.id === r.submission_id);
          if (sub?.submitted_at) {
            entry.times.push(
              (new Date(r.reviewed_at).getTime() - new Date(sub.submitted_at).getTime()) / (1000 * 60 * 60)
            );
          }
        }
        validatorCounts.set(r.validator_id, entry);
      });

      const validatorIds = Array.from(validatorCounts.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', validatorIds);

      const profileMap = new Map<string, { first: string; last: string }>();
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.user_id, { first: p.first_name || '', last: p.last_name || '' });
      });

      const topValidators = Array.from(validatorCounts.entries())
        .map(([userId, data]) => {
          const name = profileMap.get(userId) || { first: 'Inconnu', last: '' };
          const avgTime = data.times.length > 0
            ? Math.round((data.times.reduce((a, b) => a + b, 0) / data.times.length) * 10) / 10
            : 0;
          return { userId, firstName: name.first, lastName: name.last, reviewCount: data.count, avgTimeHours: avgTime };
        })
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 5);

      setValidationMetrics({
        firstTimeApprovalRate,
        avgReviewTimeHours,
        totalSubmissions,
        totalReviews,
        topValidators,
      });
    } catch (err) {
      console.error('Error fetching validation metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchWorkloadDistribution = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const now = new Date();

      const { data: tasks, error } = await supabase
        .from('task_assignments_view')
        .select('id, status, deadline, assigned_to')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const activeTasks = (tasks || []).filter(
        (t: any) => !COMPLETED_STATUSES.includes(t.status)
      );

      const userData = new Map<string, { active: number; overdue: number }>();

      for (const task of activeTasks) {
        const assignees: string[] = task.assigned_to || [];
        const isOverdue = task.deadline && new Date(task.deadline) < now;

        for (const userId of assignees) {
          const entry = userData.get(userId) || { active: 0, overdue: 0 };
          entry.active++;
          if (isOverdue) entry.overdue++;
          userData.set(userId, entry);
        }
      }

      const userIds = Array.from(userData.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const profileMap = new Map<string, { first: string; last: string }>();
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.user_id, { first: p.first_name || '', last: p.last_name || '' });
      });

      const avgActive = userIds.length > 0
        ? Array.from(userData.values()).reduce((sum, d) => sum + d.active, 0) / userIds.length
        : 0;

      const result: WorkloadItem[] = Array.from(userData.entries())
        .map(([userId, data]) => {
          const name = profileMap.get(userId) || { first: 'Inconnu', last: '' };
          const workloadScore = avgActive > 0
            ? Math.min(100, Math.round((data.active / avgActive) * 100))
            : 0;
          return {
            userId,
            firstName: name.first,
            lastName: name.last,
            activeTasks: data.active,
            overdueTasks: data.overdue,
            workloadScore,
          };
        })
        .sort((a, b) => b.workloadScore - a.workloadScore);

      setWorkloadData(result);
    } catch (err) {
      console.error('Error fetching workload distribution:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchRiskScores = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const now = new Date();

      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select('id, name, status, deadline, created_at')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'in_progress', 'assigned', 'pending']);

      if (projError) throw projError;

      const projectIds = (projects || []).map((p: any) => p.id);
      if (projectIds.length === 0) {
        setRiskScores([]);
        return;
      }

      const { data: tasks, error: tasksError } = await supabase
        .from('task_assignments_view')
        .select('id, project_id, status, deadline, assignment_type')
        .eq('tenant_id', tenantId)
        .in('project_id', projectIds);

      if (tasksError) throw tasksError;

      const tasksByProject = new Map<string, any[]>();
      (tasks || []).forEach((t: any) => {
        const list = tasksByProject.get(t.project_id) || [];
        list.push(t);
        tasksByProject.set(t.project_id, list);
      });

      const result: RiskScoreProject[] = (projects || []).map((project: any) => {
        const projectTasks = tasksByProject.get(project.id) || [];
        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter((t: any) =>
          COMPLETED_STATUSES.includes(t.status)
        ).length;
        const overdueTasks = projectTasks.filter((t: any) =>
          !COMPLETED_STATUSES.includes(t.status) &&
          t.deadline && new Date(t.deadline) < now
        ).length;
        const blockedCount = projectTasks.filter((t: any) =>
          t.status === 'blocked' || t.status === 'rejected'
        ).length;

        let score = 0;

        const overduePct = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
        if (overduePct > 50) score += 25;
        else if (overduePct > 30) score += 20;
        else if (overduePct > 15) score += 10;
        else if (overduePct > 5) score += 5;

        let burnRate = 0;
        if (project.created_at && totalTasks > 0 && completedTasks > 0) {
          const createdDate = new Date(project.created_at);
          const endDate = project.deadline
            ? new Date(project.deadline)
            : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          const totalDuration = endDate.getTime() - createdDate.getTime();
          const elapsedTime = now.getTime() - createdDate.getTime();
          if (totalDuration > 0) {
            const elapsedRatio = Math.min(1, Math.max(0, elapsedTime / totalDuration));
            const completionRatio = completedTasks / totalTasks;
            burnRate = Math.round((elapsedRatio / completionRatio) * 10) / 10;
            if (burnRate > 1.5) score += 30;
            else if (burnRate > 1.2) score += 20;
            else if (burnRate > 0.9) score += 10;
          }
        }

        if (blockedCount > 0) score += 15;

        const deadlineUrgency = !!(project.deadline &&
          (totalTasks === 0 || completedTasks / totalTasks < 0.5) &&
          Math.ceil((new Date(project.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 7);
        if (deadlineUrgency) score += 10;

        let category: RiskScoreProject['category'] = 'ok';
        if (score > 60) category = 'danger';
        else if (score > 30) category = 'warning';

        return {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          score: Math.min(100, score),
          category,
          factors: {
            burnRate,
            overduePct: Math.round(overduePct * 10) / 10,
            blockedCount,
            deadlineUrgency,
          },
        };
      });

      setRiskScores(result.sort((a, b) => b.score - a.score));
    } catch (err) {
      console.error('Error fetching risk scores:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  return {
    overdueByAssignee,
    myOverdueTasks,
    burnRates,
    velocityData,
    validationMetrics,
    workloadData,
    riskScores,
    loading,
    fetchOverdueByAssignee,
    fetchMyOverdueTasks,
    fetchBurnRates,
    fetchVelocity,
    fetchValidationMetrics,
    fetchWorkloadDistribution,
    fetchRiskScores,
  };
}
