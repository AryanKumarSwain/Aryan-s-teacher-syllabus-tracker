'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  AlertTriangle,
  Target,
  Activity,
  Award,
  Minus,
  Calendar,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { api } from '@/services/api-client';
import type { DashboardStats } from '@school-syllabus/types';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';

const CHART_COLORS = [
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#3b82f6',
  '#f43f5e',
];

function velocityFromPct(pct: number, target: number): 'behind' | 'onpace' | 'ahead' {
  if (pct < target - 10) return 'behind';
  if (pct > target + 10) return 'ahead';
  return 'onpace';
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  cardBg: string;
  borderColor: string;
  sub?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  cardBg,
  borderColor,
  sub,
}: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${borderColor} ${cardBg} px-5 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-current opacity-10" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500/80">{title}</p>
          <p className="mt-2 text-3xl font-black leading-none tracking-tight text-gray-800">
            {value}
          </p>
          {sub && <p className="mt-2 text-xs font-medium text-gray-500">{sub}</p>}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg} border border-white/20 shadow-sm`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  extra,
  children,
}: {
  title: string;
  icon: React.ElementType;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
            <Icon className="h-4 w-4 text-gray-500" />
          </div>
          <h3 className="text-sm font-bold tracking-wide text-gray-800">{title}</h3>
        </div>
        {extra && <div className="flex items-center">{extra}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const velocityStyles = {
  behind: { label: 'Behind', color: 'text-red-600', bg: 'bg-red-100', icon: TrendingDown },
  onpace: { label: 'On Pace', color: 'text-amber-600', bg: 'bg-amber-100', icon: Minus },
  ahead: { label: 'Ahead', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: TrendingUp },
};

type SortDirection = 'asc' | 'desc';

function CountUp({ end, duration = 1000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const endRef = useRef(end);
  const durationRef = useRef(duration);

  useEffect(() => {
    endRef.current = end;
    durationRef.current = duration;
  }, [end, duration]);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = count;
    const endValue = endRef.current;
    const animDuration = durationRef.current;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animDuration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOut);

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  return <>{count}</>;
}

export default function AdminDashboardPage() {
  const { school, isViewMode } = useSchool();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classSortDir, setClassSortDir] = useState<SortDirection>('desc');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [teacherSortDir, setTeacherSortDir] = useState<SortDirection>('desc');
  const [progressTimeRange, setProgressTimeRange] = useState<'1' | '3' | '6' | 'all'>('all');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>(
    school?.currentAcademicSessionId || ''
  );

  // Sync selected academic year with school's current session (viewed or active)
  useEffect(() => {
    if (school?.currentAcademicSessionId) {
      setSelectedAcademicYearId(school.currentAcademicSessionId);
    }
  }, [school?.currentAcademicSessionId]);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['dashboard', 'stats', school?.currentAcademicSessionId],
    queryFn: () =>
      api.get<DashboardStats>(
        '/dashboard/stats',
        school?.currentAcademicSessionId
          ? { academicSessionId: school.currentAcademicSessionId }
          : undefined,
      ),
  });

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery({
    queryKey: ['dashboard', 'analytics', selectedAcademicYearId || school?.currentAcademicSessionId],
    queryFn: () =>
      api.get<{
        globalTimeline?: {
          startDate: string;
          endDate: string;
          totalTeachingDays: number;
          elapsedTeachingDays: number;
          remainingTeachingDays: number;
          percentageComplete: number;
        } | null;
        subjectProgress: {
          name: string;
          progress: number;
          classId?: string;
          className?: string;
          totalChapters?: number;
          completed?: number;
          total?: number;
        }[];
        teacherProgress?: {
          name: string;
          progress: number;
          classId?: string;
          totalTopics?: number;
          completedTopics?: number;
        }[];
        classProgress?: {
          classId: string;
          className: string;
          totalTopics: number;
          completedTopics: number;
          percentageComplete: number;
        }[];
      }>(
        '/dashboard/analytics',
        (selectedAcademicYearId || school?.currentAcademicSessionId)
          ? { academicYearId: (selectedAcademicYearId || school?.currentAcademicSessionId) as string }
          : undefined,
      ),
  });

  const { data: academicYears } = useQuery({
    queryKey: ['academic-terms', school?.currentAcademicSessionId],
    queryFn: () =>
      api.getPaginated<any>(
        '/academic-terms',
        school?.currentAcademicSessionId
          ? { academicSessionId: school.currentAcademicSessionId }
          : undefined,
      ),
  });

  const { data: teacherProgressHistory } = useQuery({
    queryKey: ['teacher-progress-history', selectedTeacher, school?.currentAcademicSessionId],
    queryFn: () =>
      api.get<{ history: { date: string; progress: number }[]; totalTopics: number }>(
        `/dashboard/teacher-progress/${encodeURIComponent(selectedTeacher || '')}`,
        school?.currentAcademicSessionId
          ? { academicSessionId: school.currentAcademicSessionId }
          : undefined,
      ),
    enabled: !!selectedTeacher,
  });

  const isLoading = statsLoading || analyticsLoading;
  const error = statsError || analyticsError;

  const classOptions = useMemo(() => {
    if (!analytics?.subjectProgress) return [];
    const classMap = new Map<string, string>();
    analytics.subjectProgress.forEach((item) => {
      if (item.classId && item.className) classMap.set(item.classId, item.className);
    });
    return Array.from(classMap.entries()).map(([id, name]) => ({ id, name }));
  }, [analytics]);

  const classProgressionData = useMemo(() => {
    let data: {
      name: string;
      progress: number;
      completed: number;
      total: number;
      fillColor: string;
    }[] = [];

    if (analytics?.classProgress && analytics.classProgress.length > 0) {
      data = analytics.classProgress.map((c, i) => ({
        name: c.className,
        progress: Math.round(c.percentageComplete),
        completed: c.completedTopics,
        total: c.totalTopics,
        fillColor: CHART_COLORS[i % CHART_COLORS.length]!,
      }));
    } else if (analytics?.subjectProgress) {
      const byClass = new Map<
        string,
        { name: string; total: number; sum: number; count: number }
      >();
      analytics.subjectProgress.forEach((item) => {
        if (!item.classId || !item.className) return;
        const entry = byClass.get(item.classId) ?? {
          name: item.className,
          total: 0,
          sum: 0,
          count: 0,
        };
        entry.sum += item.progress || 0;
        entry.count += 1;
        byClass.set(item.classId, entry);
      });
      data = Array.from(byClass.values()).map((c, i) => ({
        name: c.name,
        progress: c.count > 0 ? Math.round(c.sum / c.count) : 0,
        completed: 0,
        total: 0,
        fillColor: CHART_COLORS[i % CHART_COLORS.length]!,
      }));
    }

    return [...data].sort((a, b) =>
      classSortDir === 'asc' ? a.progress - b.progress : b.progress - a.progress,
    );
  }, [analytics, classSortDir]);

  const filteredSubjectData = useMemo(() => {
    if (!analytics?.subjectProgress) return [];
    const base =
      selectedClass === 'all'
        ? analytics.subjectProgress
        : analytics.subjectProgress.filter((item) => item.classId === selectedClass);
    return base.map((item, index) => ({
      ...item,
      fillColor: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [analytics, selectedClass]);

  const pieChartData = useMemo(
    () =>
      filteredSubjectData.map((item) => ({
        name: item.name,
        value: item.progress || 0,
        color: item.fillColor,
      })),
    [filteredSubjectData],
  );

  const averageClassProgress = useMemo(() => {
    if (filteredSubjectData.length === 0) return 0;
    const total = filteredSubjectData.reduce((acc, curr) => acc + curr.progress, 0);
    return Math.round(total / filteredSubjectData.length);
  }, [filteredSubjectData]);

  const velocityBreakdown = useMemo(() => {
    const targetProgress = stats?.overallProgress ?? 50;
    const counts = { behind: 0, onpace: 0, ahead: 0 };
    filteredSubjectData.forEach((item) => {
      counts[velocityFromPct(item.progress, targetProgress)]++;
    });
    return counts;
  }, [filteredSubjectData, stats]);

  const radarData = useMemo(() => {
    return classProgressionData.map((c) => ({
      subject: c.name,
      progress: c.progress,
      fullMark: 100,
    }));
  }, [classProgressionData]);

  const radarHeight = Math.max(288, radarData.length * 28);

  const distributionBuckets = useMemo(() => {
    const buckets = [
      { range: '0-25%', count: 0, color: '#f43f5e' },
      { range: '26-50%', count: 0, color: '#f59e0b' },
      { range: '51-75%', count: 0, color: '#3b82f6' },
      { range: '76-100%', count: 0, color: '#10b981' },
    ];
    (analytics?.subjectProgress ?? []).forEach((item) => {
      const p = item.progress || 0;
      if (p <= 25) buckets[0]!.count++;
      else if (p <= 50) buckets[1]!.count++;
      else if (p <= 75) buckets[2]!.count++;
      else buckets[3]!.count++;
    });
    return buckets;
  }, [analytics]);

  const allTeachers = useMemo(() => {
    if (!analytics?.teacherProgress) return [];
    return [...analytics.teacherProgress].sort((a, b) =>
      teacherSortDir === 'asc' ? a.progress - b.progress : b.progress - a.progress,
    );
  }, [analytics, teacherSortDir]);

  // Generate months from academic timeline
  const timelineMonths = useMemo(() => {
    if (!analytics?.globalTimeline?.startDate || !analytics?.globalTimeline?.endDate) {
      return ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    }

    const startDate = new Date(analytics.globalTimeline.startDate);
    const endDate = new Date(analytics.globalTimeline.endDate);
    const months: string[] = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      months.push(current.toLocaleString('default', { month: 'short' }));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }, [analytics]);

  // Filter progress history based on selected time range
  const filteredProgressHistory = useMemo(() => {
    if (!teacherProgressHistory?.history) return [];

    const now = new Date();
    const cutoffDate = new Date();

    if (progressTimeRange === '1') {
      cutoffDate.setMonth(now.getMonth() - 1);
    } else if (progressTimeRange === '3') {
      cutoffDate.setMonth(now.getMonth() - 3);
    } else if (progressTimeRange === '6') {
      cutoffDate.setMonth(now.getMonth() - 6);
    } else {
      // 'all' - no filtering
      return teacherProgressHistory.history;
    }

    return teacherProgressHistory.history.filter((h) => new Date(h.date) >= cutoffDate);
  }, [teacherProgressHistory, progressTimeRange]);

  if (isLoading) {
    return (
      <DashboardShell title="Dashboard">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your school's syllabus progress</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Dashboard">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your school's syllabus progress</p>
          </div>
          <EmptyState
            icon={BarChart3}
            title="Unable to load dashboard data"
            description="There was an error fetching the dashboard analytics. Please check your connection and try again."
          />
        </div>
      </DashboardShell>
    );
  }

  const overallPct = stats?.overallProgress ?? 0;

  return (
    <DashboardShell title="Dashboard">
      <div className="animate-in fade-in space-y-6 pb-8 duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your school's syllabus progress</p>
          </div>
        </div>
        <Section title="System Overview" icon={Sparkles}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Teachers"
              value={stats?.totalTeachers ?? 0}
              icon={Users}
              iconBg="bg-indigo-500"
              iconColor="text-white"
              cardBg="bg-indigo-50/40"
              borderColor="border-indigo-100"
            />
            <StatCard
              title="Active Classes"
              value={stats?.totalClasses ?? 0}
              icon={GraduationCap}
              iconBg="bg-cyan-500"
              iconColor="text-white"
              cardBg="bg-cyan-50/40"
              borderColor="border-cyan-100"
            />
            <StatCard
              title="Syllabus Chapters"
              value={stats?.totalChapters ?? 0}
              icon={BookOpen}
              iconBg="bg-amber-500"
              iconColor="text-white"
              cardBg="bg-amber-50/40"
              borderColor="border-amber-100"
            />
            <StatCard
              title="Overall Progress"
              value={formatPercent(overallPct)}
              icon={CheckCircle2}
              iconBg="bg-emerald-500"
              iconColor="text-white"
              cardBg="bg-emerald-50/40"
              borderColor="border-emerald-100"
              sub={`${stats?.completedChapters ?? 0} chapters completed`}
            />
          </div>
        </Section>

        <Section title="Academic Timeline" icon={Calendar}>
          {analytics?.globalTimeline && analytics.globalTimeline.totalTeachingDays > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-blue-500 shadow-sm">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Start Date
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-blue-700">
                      {new Date(analytics.globalTimeline.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-purple-500 shadow-sm">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                      End Date
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-purple-700">
                      {new Date(analytics.globalTimeline.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-emerald-500 shadow-sm">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Elapsed Days
                    </p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-emerald-700">
                      {analytics.globalTimeline.elapsedTeachingDays}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-amber-500 shadow-sm">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                      Timeline Progress
                    </p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-amber-700">
                      {analytics.globalTimeline.percentageComplete.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-600">Academic Year Progress</span>
                  <span className="font-black text-[#1a73e8]">
                    {analytics.globalTimeline.percentageComplete.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1a73e8] via-indigo-500 to-[#34a853] transition-all duration-1000"
                    style={{
                      width: `${Math.min(analytics.globalTimeline.percentageComplete, 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                  <span>
                    {analytics.globalTimeline.remainingTeachingDays} teaching days remaining
                  </span>
                  <span>{analytics.globalTimeline.totalTeachingDays} total teaching days</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-6 text-center sm:flex-row sm:text-left">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">No Academic Timeline Configured</h4>
                  <p className="text-sm text-gray-500">
                    Create an academic timeline (start & end dates, working days, holidays) for this session to track teaching days and schedule progression.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/academic-timeline"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
              >
                Configure Timeline
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Section>

        <div className="grid grid-cols-3 gap-4">
          {(['behind', 'onpace', 'ahead'] as const).map((key) => {
            const cfg = velocityStyles[key];
            const Icon = cfg.icon;
            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                    cfg.bg,
                  )}
                >
                  <Icon className={cn('h-5 w-5', cfg.color)} />
                </div>
                <div>
                  <p className={cn('text-2xl font-black', cfg.color)}>{velocityBreakdown[key]}</p>
                  <p className="text-xs font-semibold text-gray-500">{cfg.label} Schedule</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Section
              title="Class Progression"
              icon={BarChart3}
              extra={
                <button
                  onClick={() => setClassSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {classSortDir === 'desc' ? (
                    <ArrowDown className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5" />
                  )}
                  {classSortDir === 'desc' ? 'Highest First' : 'Lowest First'}
                </button>
              }
            >
              {classProgressionData.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center text-center">
                  <AlertTriangle className="h-8 w-8 animate-bounce text-amber-500" />
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    No class progression data available yet.
                  </p>
                </div>
              ) : (
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classProgressionData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length && payload[0]) {
                            const item = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-xl">
                                <p className="text-xs font-bold text-gray-800">{item.name}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <div
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: item.fillColor }}
                                  />
                                  <p className="text-xs font-black text-gray-700">
                                    Progress: {item.progress}%
                                  </p>
                                </div>
                                {item.total > 0 && (
                                  <p className="mt-1 text-[10px] text-gray-400">
                                    {item.completed} / {item.total} topics
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="progress"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {classProgressionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fillColor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>
          </div>

          <div className="lg:col-span-1">
            <Section
              title="Subject Distribution by Class"
              icon={PieIcon}
              extra={
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none transition-colors hover:bg-gray-50"
                >
                  <option value="all">All Classes</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              }
            >
              {pieChartData.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center text-center text-gray-400">
                  <PieIcon className="h-8 w-8 stroke-1" />
                  <p className="mt-2 text-xs font-medium">No subjects to display for this class.</p>
                </div>
              ) : (
                <div className="relative flex h-80 flex-col items-center justify-center">
                  <div className="h-[62%] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart key={selectedClass}>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={82}
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={800}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, 'Completion']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute top-[26%] flex flex-col items-center text-center">
                    <span className="text-3xl font-black tracking-tight text-gray-800">
                      {selectedClass === 'all'
                        ? formatPercent(overallPct)
                        : `${averageClassProgress}%`}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                      Avg Progress
                    </span>
                  </div>
                  <div className="mt-2 max-h-[110px] w-full space-y-1.5 overflow-y-auto px-1">
                    {pieChartData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5 transition-all hover:bg-slate-100/50"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate text-xs font-semibold text-gray-600">
                            {item.name}
                          </span>
                        </div>
                        <span className="ml-2 text-xs font-black text-gray-700">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title={`Class Comparison Radar (${radarData.length} classes)`} icon={Target}>
            {radarData.length < 3 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-gray-400">
                <Target className="h-8 w-8 stroke-1" />
                <p className="mt-2 text-xs font-medium">
                  Need at least 3 classes for radar comparison.
                </p>
              </div>
            ) : (
              <div className="w-full" style={{ height: radarHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Radar
                      name="Progress"
                      dataKey="progress"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.35}
                      animationDuration={800}
                    />
                    <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          <Section title="Subject Completion Distribution" icon={Activity}>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distributionBuckets}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="range"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <Tooltip formatter={(value) => [`${value} subjects`, 'Count']} />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={56}
                    animationDuration={800}
                  >
                    {distributionBuckets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {allTeachers.length > 0 && (
          <Section
            title={`Teacher Progress Distribution (${allTeachers.length} teachers)`}
            icon={Award}
            extra={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTeacherSortDir('desc')}
                  className={cn(
                    'cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors',
                    teacherSortDir === 'desc'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                  )}
                >
                  Highest
                </button>
                <button
                  onClick={() => setTeacherSortDir('asc')}
                  className={cn(
                    'cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors',
                    teacherSortDir === 'asc'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                  )}
                >
                  Lowest
                </button>
              </div>
            }
          >
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {allTeachers.map((teacher, index) => {
                const pct = Math.round(teacher.progress);
                const barColor =
                  pct >= 70
                    ? 'from-emerald-400 to-emerald-600'
                    : pct >= 40
                      ? 'from-blue-400 to-indigo-500'
                      : 'from-amber-400 to-orange-500';
                return (
                  <div
                    key={`${teacher.name}-${index}`}
                    onClick={() => setSelectedTeacher(teacher.name)}
                    className={cn(
                      'animate-in fade-in slide-in-from-left-1 flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200',
                      selectedTeacher === teacher.name
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm',
                    )}
                    style={{ animationDelay: `${Math.min(index * 25, 400)}ms` }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    >
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-800">
                          {teacher.name}
                        </span>
                        <span className="flex-shrink-0 text-sm font-black text-gray-700">
                          <CountUp end={pct} duration={800} />%
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            'h-full rounded-full bg-gradient-to-r transition-all duration-700',
                            barColor,
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {selectedTeacher && (
          <Section
            title={`${selectedTeacher} - Progress Over Time`}
            icon={TrendingUp}
            extra={
              <select
                value={progressTimeRange}
                onChange={(e) => setProgressTimeRange(e.target.value as '1' | '3' | '6' | 'all')}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none transition-colors hover:bg-gray-50"
              >
                <option value="1">Last 1 Month</option>
                <option value="3">Last 3 Months</option>
                <option value="6">Last 6 Months</option>
                <option value="all">All Time</option>
              </select>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Current Progress</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    <CountUp
                      end={Math.round(
                        allTeachers.find((t) => t.name === selectedTeacher)?.progress || 0,
                      )}
                      duration={1000}
                    />
                    %
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Topics Completed</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    <CountUp
                      end={Math.round(
                        allTeachers.find((t) => t.name === selectedTeacher)?.completedTopics || 0,
                      )}
                      duration={1000}
                    />
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Status</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {Math.round(
                      allTeachers.find((t) => t.name === selectedTeacher)?.progress || 0,
                    ) >= 70
                      ? 'Excellent'
                      : Math.round(
                            allTeachers.find((t) => t.name === selectedTeacher)?.progress || 0,
                          ) >= 40
                        ? 'Good'
                        : 'Needs Improvement'}
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      filteredProgressHistory?.map((h) => ({
                        month: new Date(h.date).toLocaleString('default', { month: 'short' }),
                        progress: h.progress,
                      })) ||
                      timelineMonths.map((month) => ({
                        month,
                        progress: Math.round(
                          allTeachers.find((t) => t.name === selectedTeacher)?.progress || 0,
                        ),
                      }))
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
                    <Line
                      type="monotone"
                      dataKey="progress"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>
        )}

        <Section title="Performance Insights" icon={Sparkles}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">Teacher Efficiency</p>
                  <p className="text-lg font-bold text-gray-900">
                    {allTeachers.length > 0
                      ? formatPercent(
                          allTeachers.reduce((sum, t) => sum + t.progress, 0) / allTeachers.length,
                        )
                      : '0%'}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">Class Performance</p>
                  <p className="text-lg font-bold text-gray-900">
                    {classProgressionData.length > 0
                      ? formatPercent(
                          classProgressionData.reduce((sum, c) => sum + c.progress, 0) /
                            classProgressionData.length,
                        )
                      : '0%'}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">Pacing Status</p>
                  <p className="text-lg font-bold text-gray-900">
                    {velocityBreakdown.ahead > velocityBreakdown.behind ? 'Ahead' : 'Behind'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <Info className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Recommendation</p>
                <p className="mt-1 text-xs text-blue-700">
                  {velocityBreakdown.behind > velocityBreakdown.ahead
                    ? `${velocityBreakdown.behind} items are behind schedule. Consider reviewing teaching schedules and providing additional support.`
                    : velocityBreakdown.ahead > velocityBreakdown.behind
                      ? `${velocityBreakdown.ahead} items are ahead of schedule. Great progress! Consider maintaining current momentum.`
                      : 'Overall pacing is on track. Continue monitoring individual subject and class progress.'}
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </DashboardShell>
  );
}
