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
  CalendarRange,
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
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-200 hover:shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/30 px-4 py-3 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${iconGradient} text-white shadow-xs`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="text-sm font-black tracking-tight text-[#0b1c30]">{title}</h3>
        </div>
        {extra && <div className="flex items-center">{extra}</div>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

const velocityStyles = {
  behind: {
    label: 'Behind',
    color: 'text-rose-700',
    cardBg: 'bg-gradient-to-br from-rose-50/40 via-white to-slate-50/30',
    border: 'border-rose-200/80',
    iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',
    icon: TrendingDown,
  },
  onpace: {
    label: 'On Pace',
    color: 'text-amber-700',
    cardBg: 'bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30',
    border: 'border-amber-200/80',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    icon: Minus,
  },
  ahead: {
    label: 'Ahead',
    color: 'text-emerald-700',
    cardBg: 'bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30',
    border: 'border-emerald-200/80',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
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
  const { sessions } = useAcademicSessions();
  const currentSession = sessions.find((s) => s.id === school?.currentAcademicSessionId);
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
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Welcome & Status Banner (Matching Sessions page) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    Academic Operations Dashboard
                  </h1>
                  <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live: {currentSession?.name || '2025-26'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time syllabus completion analytics, faculty pacing velocities, and institutional coverage metrics.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span
                className={cn(
                  'h-9 inline-flex items-center gap-2 whitespace-nowrap text-xs font-bold px-3 rounded-lg border shrink-0 shadow-2xs',
                  velocityBreakdown.behind > velocityBreakdown.ahead
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200',
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    velocityBreakdown.behind > velocityBreakdown.ahead ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse',
                  )}
                />
                <span>{velocityBreakdown.ahead >= velocityBreakdown.behind ? 'On Schedule' : 'Pacing Review Needed'}</span>
              </span>
              <Link href="/admin/academic-timeline">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 shadow-2xs"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Timeline
                </Button>
              </Link>
              <Link href="/admin/sessions">
                <Button
                  size="sm"
                  className="h-9 font-bold text-xs shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 px-3.5 gap-1.5"
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  Sessions
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Concise Academic Overview Strip (Matching Sessions page styling) */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Teachers Card - Blue */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Teachers
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                Faculty
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                <CountUp end={stats?.totalTeachers ?? 0} duration={600} />
              </span>
              <span className="text-xs font-medium text-slate-400">active assigned</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                style={{ width: `${Math.min(100, ((stats?.totalTeachers ?? 0) / 25) * 100)}%` }}
              />
            </div>
          </div>

          {/* Classes Card - Indigo */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Classes
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                Enrolled
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                <CountUp end={stats?.totalClasses ?? 0} duration={600} />
              </span>
              <span className="text-xs font-medium text-slate-400">across grades</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
                style={{ width: `${Math.min(100, ((stats?.totalClasses ?? 0) / 50) * 100)}%` }}
              />
            </div>
          </div>

          {/* Chapters Card - Teal */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Chapters
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-teal-100 text-teal-700">
                {stats?.completedChapters ?? 0} Done
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                <CountUp end={stats?.totalChapters ?? 0} duration={600} />
              </span>
              <span className="text-xs font-medium text-slate-400">
                / {stats?.completedChapters ?? 0} completed
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 transition-all duration-500"
                style={{
                  width: `${
                    (stats?.totalChapters ?? 0) > 0
                      ? Math.min(100, ((stats?.completedChapters ?? 0) / (stats?.totalChapters ?? 1)) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Overall Progress Card - Purple */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Overall Progress
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                {Math.round(overallPct)}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                <CountUp end={Math.round(overallPct)} duration={600} />%
              </span>
              <span className="text-xs font-medium text-slate-400">target 100%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                style={{ width: `${Math.min(100, overallPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Academic Timeline Section */}
        <Section title="Academic Timeline" icon={Calendar} iconGradient="from-emerald-600 to-teal-600">
          {analytics?.globalTimeline && analytics.globalTimeline.totalTeachingDays > 0 ? (
            <>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-2xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white shadow-xs">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Start Date</p>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {new Date(analytics.globalTimeline.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-2xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-white shadow-xs">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">End Date</p>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {new Date(analytics.globalTimeline.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 shadow-2xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Elapsed Days</p>
                    <p className="text-sm font-black text-emerald-900">
                      <CountUp end={analytics.globalTimeline.elapsedTeachingDays} duration={600} />
                      <span className="text-[10px] font-normal text-emerald-700 ml-1">days</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-amber-50/30 p-3 shadow-2xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Timeline Progress</p>
                    <p className="text-sm font-black text-amber-900">
                      {analytics.globalTimeline.percentageComplete.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 p-3.5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0b1c30]">Academic Year Progress</span>
                  <span className="font-black text-emerald-700">
                    {analytics.globalTimeline.percentageComplete.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 transition-all duration-1000"
                    style={{
                      width: `${Math.min(analytics.globalTimeline.percentageComplete, 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#434655]">
                  <span>{analytics.globalTimeline.remainingTeachingDays} teaching days remaining</span>
                  <span>{analytics.globalTimeline.totalTeachingDays} total teaching days</span>
                </div>
              </div>
            </>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white p-4 sm:p-5 shadow-2xs">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-[#0b1c30]">
                        Setup Academic Timeline & Schedule Targets
                      </h4>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] py-0 px-1.5 font-bold">
                        Not Configured
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-0.5 max-w-xl">
                      Configure term dates, teaching days, and milestones to calculate automated pacing velocities.
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/academic-timeline"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
                >
                  Configure Timeline
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </Section>

        {/* Concise Velocity Schedule Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['behind', 'onpace', 'ahead'] as const).map((key) => {
            const cfg = velocityStyles[key];
            const Icon = cfg.icon;
            const count = velocityBreakdown[key];
            const badgeText = key === 'behind' ? 'Needs Review' : key === 'onpace' ? 'On Schedule' : 'Leading Pace';
            const badgeBg = key === 'behind' ? 'bg-rose-100 text-rose-700' : key === 'onpace' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
            const topBar = key === 'behind' ? 'from-rose-500 to-red-500' : key === 'onpace' ? 'from-amber-500 to-yellow-500' : 'from-emerald-500 to-teal-500';

            return (
              <div
                key={key}
                className={cn(
                  'group relative flex items-center justify-between overflow-hidden rounded-xl border p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs bg-white',
                  cfg.border,
                )}
              >
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', topBar)} />
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-xs text-white',
                      cfg.iconBg,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn('text-xl font-black leading-tight', cfg.color)}>
                        <CountUp end={count} duration={600} />
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400">
                      {key === 'behind' ? 'Lagging target timeline' : key === 'onpace' ? 'Aligned with milestones' : 'Trending ahead of pace'}
                    </p>
                  </div>
                </div>
                <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0', badgeBg)}>
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

        <Section
          title="Performance Insights"
          icon={Sparkles}
          iconGradient="from-emerald-500 to-teal-600"
          extra={
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Academic Health: {velocityBreakdown.behind > velocityBreakdown.ahead ? 'Needs Review' : 'Optimal'}
            </span>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Teacher Efficiency */}
            <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Teacher Efficiency
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 transition-transform">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {allTeachers.length > 0
                    ? Math.round(allTeachers.reduce((sum, t) => sum + t.progress, 0) / allTeachers.length)
                    : 0}
                  %
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {allTeachers.length} {allTeachers.length === 1 ? 'Faculty' : 'Faculty members'}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700"
                    style={{
                      width: `${
                        allTeachers.length > 0
                          ? Math.min(
                              Math.round(
                                allTeachers.reduce((sum, t) => sum + t.progress, 0) /
                                  allTeachers.length,
                              ),
                              100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  Average syllabus coverage across faculty
                </p>
              </div>
            </div>

            {/* Card 2: Class Performance */}
            <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Class Performance
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100 group-hover:scale-105 transition-transform">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {classProgressionData.length > 0
                    ? Math.round(
                        classProgressionData.reduce((sum, c) => sum + c.progress, 0) /
                          classProgressionData.length,
                      )
                    : 0}
                  %
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {classProgressionData.length} {classProgressionData.length === 1 ? 'Grade' : 'Grades tracked'}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-700"
                    style={{
                      width: `${
                        classProgressionData.length > 0
                          ? Math.min(
                              Math.round(
                                classProgressionData.reduce((sum, c) => sum + c.progress, 0) /
                                  classProgressionData.length,
                              ),
                              100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  Institution-wide grade completion benchmark
                </p>
              </div>
            </div>

            {/* Card 3: Pacing Status */}
            <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Pacing Status
                </span>
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl border group-hover:scale-105 transition-transform',
                    velocityBreakdown.ahead >= velocityBreakdown.behind
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border-rose-100',
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-extrabold border',
                    velocityBreakdown.ahead >= velocityBreakdown.behind
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200',
                  )}
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      velocityBreakdown.ahead >= velocityBreakdown.behind
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-rose-500',
                    )}
                  />
                  {velocityBreakdown.ahead >= velocityBreakdown.behind ? 'On Schedule' : 'Behind Pace'}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      velocityBreakdown.ahead >= velocityBreakdown.behind
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                        : 'bg-gradient-to-r from-rose-500 to-red-600',
                    )}
                    style={{
                      width: `${
                        filteredSubjectData.length > 0
                          ? Math.round(
                              ((velocityBreakdown.ahead + velocityBreakdown.onpace) /
                                filteredSubjectData.length) *
                                100,
                            )
                          : 100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span className="text-emerald-700 font-semibold">{velocityBreakdown.ahead} ahead</span>
                  <span>{velocityBreakdown.onpace} on pace</span>
                  <span className={cn(velocityBreakdown.behind > 0 ? 'text-rose-600 font-semibold' : '')}>
                    {velocityBreakdown.behind} behind
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Pacing Recommendations */}
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-900">
                    Academic Pacing Insights & Recommendations
                  </h4>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Institutional Overview
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed font-normal">
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
