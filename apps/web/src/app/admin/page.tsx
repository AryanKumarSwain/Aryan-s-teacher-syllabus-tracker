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
  value: React.ReactNode;
  icon: React.ElementType;
  iconBg: string;
  iconColor?: string;
  cardBg?: string;
  borderColor?: string;
  accentBar?: string;
  glowColor?: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
  progress?: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor = 'text-white',
  cardBg = 'bg-white',
  borderColor = 'border-slate-200',
  accentBar,
  glowColor,
  sub,
  badge,
  badgeColor,
  progress,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        borderColor,
        cardBg,
      )}
    >
      {/* Top accent gradient line */}
      {accentBar && (
        <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', accentBar)} />
      )}
      {/* Corner colorful blur glow */}
      {glowColor && (
        <div
          className={cn(
            'pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl transition-opacity duration-300 group-hover:scale-125',
            glowColor,
          )}
        />
      )}

      {/* Top Row: Title on Left, Icon on Right */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-wider text-[#434655] truncate">
          {title}
        </p>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-105',
            iconBg,
          )}
        >
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>

      {/* Middle Row: Value + Badge */}
      <div className="relative z-10 mt-2 mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-black leading-none tracking-tight text-[#0b1c30]">
          {value}
        </span>
        {badge && (
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0',
              badgeColor || 'bg-slate-100 text-slate-700',
            )}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Bottom Row: Subtext & Progress Track (Aligned across all cards) */}
      <div className="relative z-10 pt-2.5 border-t border-slate-200/50">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
            <span className="truncate">{sub}</span>
            {progress !== undefined && (
              <span className="font-black text-emerald-700 shrink-0 ml-1">{progress}%</span>
            )}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100/80 overflow-hidden">
            {progress !== undefined ? (
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            ) : (
              <div className="h-full rounded-full bg-transparent" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  iconGradient = 'from-emerald-500 to-teal-600',
  extra,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconGradient?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${iconGradient} text-white shadow-sm`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-extrabold tracking-wide text-[#0b1c30]">{title}</h3>
        </div>
        {extra && <div className="flex items-center">{extra}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const velocityStyles = {
  behind: {
    label: 'Behind',
    color: 'text-rose-700',
    cardBg: 'bg-gradient-to-br from-rose-50 via-red-50/40 to-white',
    border: 'border-rose-200/90',
    iconBg: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25',
    icon: TrendingDown,
  },
  onpace: {
    label: 'On Pace',
    color: 'text-amber-700',
    cardBg: 'bg-gradient-to-br from-amber-50 via-yellow-50/40 to-white',
    border: 'border-amber-200/90',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25',
    icon: Minus,
  },
  ahead: {
    label: 'Ahead',
    color: 'text-emerald-700',
    cardBg: 'bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white',
    border: 'border-emerald-200/90',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25',
    icon: TrendingUp,
  },
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
        {/* Executive Welcome & Status Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-6 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />
          
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Academic Coverage
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {school?.name || 'Academic Operations'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0b1c30]">
                Academic Operations Dashboard
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-2xl">
                Real-time syllabus completion analytics, faculty pacing velocities, and institutional coverage metrics.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="hidden md:flex flex-col items-end text-right mr-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current Pacing</span>
                <span className={cn(
                  'text-xs font-black',
                  velocityBreakdown.behind > velocityBreakdown.ahead ? 'text-rose-600' : 'text-emerald-700'
                )}>
                  {velocityBreakdown.ahead >= velocityBreakdown.behind ? '✓ On Schedule' : '⚠ Pacing Review Needed'}
                </span>
              </div>
              <Link
                href="/admin/academic-timeline"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Timeline
              </Link>
              <Link
                href="/admin/classes"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 transition-colors"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Classes
              </Link>
            </div>
          </div>
        </div>

        {/* System Overview Stat Cards */}
        <Section title="System Overview" icon={Sparkles} iconGradient="from-indigo-600 to-blue-600">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Teachers"
              value={<CountUp end={stats?.totalTeachers ?? 0} duration={800} />}
              icon={Users}
              iconBg="bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/30"
              iconColor="text-white"
              cardBg="bg-gradient-to-br from-blue-50/70 via-indigo-50/20 to-white"
              borderColor="border-blue-200/80"
              accentBar="from-blue-600 to-indigo-600"
              glowColor="bg-blue-500/15"
              badge="Faculty"
              badgeColor="bg-blue-100 text-blue-800"
              sub={`${stats?.totalTeachers ?? 0} active assigned`}
            />
            <StatCard
              title="Active Classes"
              value={<CountUp end={stats?.totalClasses ?? 0} duration={800} />}
              icon={GraduationCap}
              iconBg="bg-gradient-to-br from-teal-600 to-emerald-600 shadow-teal-500/30"
              iconColor="text-white"
              cardBg="bg-gradient-to-br from-teal-50/70 via-emerald-50/20 to-white"
              borderColor="border-teal-200/80"
              accentBar="from-teal-500 to-emerald-600"
              glowColor="bg-teal-500/15"
              badge="Enrolled"
              badgeColor="bg-teal-100 text-teal-800"
              sub="Across all grades"
            />
            <StatCard
              title="Syllabus Chapters"
              value={<CountUp end={stats?.totalChapters ?? 0} duration={800} />}
              icon={BookOpen}
              iconBg="bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
              iconColor="text-white"
              cardBg="bg-gradient-to-br from-amber-50/70 via-orange-50/20 to-white"
              borderColor="border-amber-200/80"
              accentBar="from-amber-500 to-orange-500"
              glowColor="bg-amber-500/15"
              badge="Curriculum"
              badgeColor="bg-amber-100 text-amber-800"
              sub={`${stats?.completedChapters ?? 0} completed`}
            />
            <StatCard
              title="Overall Progress"
              value={<><CountUp end={Math.round(overallPct)} duration={800} />%</>}
              icon={CheckCircle2}
              iconBg="bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-500/30"
              iconColor="text-white"
              cardBg="bg-gradient-to-br from-emerald-50/70 via-green-50/20 to-white"
              borderColor="border-emerald-200/80"
              accentBar="from-emerald-500 to-teal-500"
              glowColor="bg-emerald-500/15"
              badge="Target 100%"
              badgeColor="bg-emerald-100 text-emerald-800"
              sub={`${stats?.completedChapters ?? 0} / ${stats?.totalChapters ?? 0} chapters`}
              progress={Math.round(overallPct)}
            />
          </div>
        </Section>

        {/* Academic Timeline */}
        <Section title="Academic Timeline" icon={Calendar} iconGradient="from-emerald-600 to-teal-600">
          {analytics?.globalTimeline && analytics.globalTimeline.totalTeachingDays > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-2xs">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-sm">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#434655]">
                      Start Date
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[#0b1c30]">
                      {new Date(analytics.globalTimeline.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-2xs">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-sm">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#434655]">
                      End Date
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[#0b1c30]">
                      {new Date(analytics.globalTimeline.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-2xs">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/20">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                      Elapsed Days
                    </p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-emerald-900">
                      <CountUp end={analytics.globalTimeline.elapsedTeachingDays} duration={700} />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-2xs">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                      Timeline Progress
                    </p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-amber-900">
                      {analytics.globalTimeline.percentageComplete.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0b1c30]">Academic Year Progress</span>
                  <span className="font-black text-emerald-700">
                    {analytics.globalTimeline.percentageComplete.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 transition-all duration-1000"
                    style={{
                      width: `${Math.min(analytics.globalTimeline.percentageComplete, 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#434655]">
                  <span>
                    {analytics.globalTimeline.remainingTeachingDays} teaching days remaining
                  </span>
                  <span>{analytics.globalTimeline.totalTeachingDays} total teaching days</span>
                </div>
              </div>
            </>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-blue-50/30 p-6 sm:p-7 shadow-xs">
              <div className="pointer-events-none absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="pointer-events-none absolute top-0 left-1/3 h-32 w-32 rounded-full bg-teal-400/15 blur-2xl" />
              
              <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-500/10">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-[#0b1c30]">
                        Setup Academic Timeline & Schedule Targets
                      </h4>
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Not Configured
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-xl">
                      Define start & end dates, working days, and seasonal breaks for this academic session to enable automated syllabus velocity calculations and pacing alerts.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 border border-slate-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        ✓ Teaching Days Calendar
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 border border-slate-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        ✓ Behind / Ahead Pacing
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 border border-slate-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        ✓ Session Completion Forecast
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/admin/academic-timeline"
                  className="relative z-10 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-600/30 transition-all hover:shadow-lg active:scale-95"
                >
                  Configure Academic Timeline
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </Section>

        {/* Velocity Schedule Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['behind', 'onpace', 'ahead'] as const).map((key) => {
            const cfg = velocityStyles[key];
            const Icon = cfg.icon;
            const count = velocityBreakdown[key];
            const badgeText = key === 'behind' ? 'Needs Review' : key === 'onpace' ? 'On Schedule' : 'Leading Pace';
            const badgeBg = key === 'behind' ? 'bg-rose-100 text-rose-800' : key === 'onpace' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';

            return (
              <div
                key={key}
                className={cn(
                  'relative overflow-hidden flex items-center justify-between gap-3.5 rounded-2xl border p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md',
                  cfg.cardBg,
                  cfg.border,
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                      cfg.iconBg,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className={cn('text-2xl sm:text-3xl font-black leading-tight', cfg.color)}>
                      <CountUp end={count} duration={600} />
                    </p>
                    <p className="text-xs font-bold text-[#0b1c30]">{cfg.label} Schedule</p>
                  </div>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-extrabold shrink-0', badgeBg)}>
                  {badgeText}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Section
              title="Class Progression"
              icon={BarChart3}
              iconGradient="from-blue-600 to-indigo-600"
              extra={
                <button
                  onClick={() => setClassSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="flex items-center gap-1.5 rounded-xl border border-[#c4c5d7]/50 bg-white px-3 py-1.5 text-xs font-bold text-[#0b1c30] shadow-2xs transition-colors hover:bg-slate-50"
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
                <div className="flex h-72 flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 mb-3 shadow-2xs">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#0b1c30]">No Class Progression Data</h4>
                  <p className="mt-1 text-xs font-medium text-slate-500 max-w-sm">
                    Assign subjects and log chapter progress for classes to see comparative completion bars here.
                  </p>
                  <Link
                    href="/admin/classes"
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    Go to Classes <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
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
              iconGradient="from-purple-500 to-pink-600"
              extra={
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="cursor-pointer rounded-xl border border-[#c4c5d7]/50 bg-white px-3 py-1.5 text-xs font-bold text-[#0b1c30] outline-none transition-colors hover:bg-slate-50"
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
                    <span className="text-3xl font-black tracking-tight text-[#0b1c30]">
                      {selectedClass === 'all'
                        ? formatPercent(overallPct)
                        : `${averageClassProgress}%`}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#434655]">
                      Avg Progress
                    </span>
                  </div>
                  <div className="mt-2 max-h-[110px] w-full space-y-1.5 overflow-y-auto px-1">
                    {pieChartData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border border-[#c4c5d7]/30 bg-[#f8f9ff] px-3 py-1.5 transition-all hover:bg-slate-100/60"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate text-xs font-bold text-[#0b1c30]">
                            {item.name}
                          </span>
                        </div>
                        <span className="ml-2 text-xs font-black text-emerald-800">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title={`Class Comparison Radar (${radarData.length} classes)`} icon={Target} iconGradient="from-violet-600 to-indigo-600">
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
                      stroke="#059669"
                      fill="#059669"
                      fillOpacity={0.25}
                      animationDuration={800}
                    />
                    <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          <Section title="Subject Completion Distribution" icon={Activity} iconGradient="from-amber-500 to-orange-600">
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
            iconGradient="from-rose-500 to-pink-600"
            extra={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTeacherSortDir('desc')}
                  className={cn(
                    'cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                    teacherSortDir === 'desc'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'border-[#c4c5d7]/50 bg-white text-[#434655] hover:bg-slate-50',
                  )}
                >
                  Highest
                </button>
                <button
                  onClick={() => setTeacherSortDir('asc')}
                  className={cn(
                    'cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                    teacherSortDir === 'asc'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'border-[#c4c5d7]/50 bg-white text-[#434655] hover:bg-slate-50',
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
                    ? 'from-emerald-500 to-teal-500'
                    : pct >= 40
                      ? 'from-blue-500 to-indigo-500'
                      : 'from-amber-500 to-orange-500';
                return (
                  <div
                    key={`${teacher.name}-${index}`}
                    onClick={() => setSelectedTeacher(teacher.name)}
                    className={cn(
                      'animate-in fade-in slide-in-from-left-1 flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200',
                      selectedTeacher === teacher.name
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-[#c4c5d7]/30 bg-white hover:border-emerald-200/80 hover:shadow-xs',
                    )}
                    style={{ animationDelay: `${Math.min(index * 25, 400)}ms` }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white shadow-2xs"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    >
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-[#0b1c30]">
                          {teacher.name}
                        </span>
                        <span className="flex-shrink-0 text-sm font-black text-emerald-800">
                          <CountUp end={pct} duration={800} />%
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
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
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#065f46' }}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>
        )}

        <Section title="Performance Insights" icon={Sparkles} iconGradient="from-emerald-500 to-teal-600">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-blue-50/50 to-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#434655]">Teacher Efficiency</p>
                  <p className="text-2xl font-black text-[#0b1c30]">
                    {allTeachers.length > 0
                      ? formatPercent(
                          allTeachers.reduce((sum, t) => sum + t.progress, 0) / allTeachers.length,
                        )
                      : '0%'}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Average across faculty</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-teal-50/50 to-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#434655]">Class Performance</p>
                  <p className="text-2xl font-black text-[#0b1c30]">
                    {classProgressionData.length > 0
                      ? formatPercent(
                          classProgressionData.reduce((sum, c) => sum + c.progress, 0) /
                            classProgressionData.length,
                        )
                      : '0%'}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Grade-wide benchmark</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-50/50 to-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md',
                  velocityBreakdown.ahead >= velocityBreakdown.behind
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25'
                    : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/25'
                )}>
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#434655]">Pacing Status</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      'text-2xl font-black',
                      velocityBreakdown.ahead >= velocityBreakdown.behind ? 'text-emerald-700' : 'text-rose-700'
                    )}>
                      {velocityBreakdown.ahead >= velocityBreakdown.behind ? 'On Schedule' : 'Behind Pace'}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {velocityBreakdown.ahead} ahead vs {velocityBreakdown.behind} behind
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 p-4.5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#0b1c30]">Academic Pacing Insights & Recommendations</p>
                <p className="mt-1 text-xs font-medium text-slate-700 leading-relaxed">
                  {velocityBreakdown.behind > velocityBreakdown.ahead
                    ? `${velocityBreakdown.behind} subjects or classes are currently lagging behind the target timeline pace. We recommend reviewing teacher assignments, scheduling catch-up modules, or adjusting academic milestone targets.`
                    : velocityBreakdown.ahead > velocityBreakdown.behind
                      ? `${velocityBreakdown.ahead} subjects or classes are trending ahead of the projected schedule! Pacing momentum is optimal across the institution.`
                      : 'Institutional syllabus coverage is well-balanced and aligned with academic session milestones. Keep monitoring individual class progression charts.'}
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </DashboardShell>
  );
}
