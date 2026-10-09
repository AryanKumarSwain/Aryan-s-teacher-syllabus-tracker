'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronRight,
  Target,
  Zap,
  GraduationCap,
  FileText,
  Award,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { useRealtimeSync } from '@/lib/realtime-sync';

interface AssignedClass {
  id: string;
  name: string;
  section: string | null;
  totalChapters: number;
  completedChapters: number;
  progress: number;
  _count: { subjects: number };
}

interface TimelineProgress {
  academicTerm: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    totalWorkingDays: number;
    actualAvailableDays: number;
  };
  timeline: {
    totalDaysInTerm: number;
    daysElapsed: number;
    daysRemaining: number;
    timeElapsedPercentage: number;
  };
  progress: {
    totalChapters: number;
    completedChapters: number;
    completionPercentage: number;
    targetProgress: number;
    progressDifference: number;
    isBehindSchedule: boolean;
  };
  teachingDays: {
    totalEstimatedDays: number;
    availableDays: number;
    daysPerChapterRequired: number;
  };
}

function Section({
  title,
  icon: Icon,
  iconBg = 'bg-blue-50',
  iconColor = 'text-blue-600',
  iconGradient,
  extra,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  iconGradient?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/30 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-2.5">
          <div className={cn('rounded-xl p-2', iconGradient ? cn(iconGradient, 'text-white') : iconBg)}>
            <Icon className={cn('h-4 w-4', iconGradient ? 'text-white' : iconColor)} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
        </div>
        {extra && <div className="flex items-center">{extra}</div>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function CountUp({ end, duration = 800 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const endRef = useRef(end);

  useEffect(() => {
    endRef.current = end;
  }, [end]);

  useEffect(() => {
    const startTime = performance.now();
    const endValue = endRef.current;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(endValue * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return <>{count}</>;
}

export default function TeacherDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const academicSessionId = useAuthStore((s) => s.user?.school?.currentAcademicSessionId);

  useRealtimeSync([['teacher-classes'], ['teacher-timeline-progress']]);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-classes', schoolId, academicSessionId],
    queryFn: () =>
      api.getPaginated<AssignedClass>('/syllabus/classes/assigned', {
        page: 1,
        pageSize: 100,
        ...(academicSessionId && { academicSessionId }),
      }),
    enabled: !!schoolId,
    refetchInterval: 5000,
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['teacher-timeline-progress'],
    queryFn: () =>
      api.get<{ data: TimelineProgress }>('/academic-terms/teacher-progress', {
        teacherId: user?.teacherId || undefined,
        schoolId: user?.schoolId || undefined,
      }),
    enabled: !!user?.teacherId && !!user?.schoolId,
  });

  const classes = data?.items ?? [];
  const totalChapters = classes.reduce((s, c) => s + c.totalChapters, 0);
  const completedChapters = classes.reduce((s, c) => s + c.completedChapters, 0);
  const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
  const timeline = timelineData?.data;

  const stats = [
    {
      label: 'Assigned Classes',
      value: classes.length,
      desc: 'Active course sections',
      tag: 'Classes',
      icon: GraduationCap,
      topBar: 'from-blue-500 to-indigo-500',
      badgeClass: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Chapters',
      value: totalChapters,
      desc: 'In assigned curriculum',
      tag: 'Curriculum',
      icon: Target,
      topBar: 'from-purple-500 to-pink-500',
      badgeClass: 'bg-purple-50 text-purple-700',
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Completed Chapters',
      value: completedChapters,
      desc: 'Finished chapters',
      tag: 'Progress',
      icon: CheckCircle2,
      topBar: 'from-emerald-500 to-teal-500',
      badgeClass: 'bg-emerald-50 text-emerald-700',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Overall Completion',
      value: progress,
      isPercent: true,
      desc: 'Curriculum coverage',
      tag: 'Velocity',
      icon: Zap,
      topBar: 'from-amber-500 to-orange-500',
      badgeClass: 'bg-amber-50 text-amber-700',
      iconBg: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <DashboardShell title="Teacher Dashboard">
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    Welcome back, {user?.name?.split(' ')[0] ?? 'Teacher'} 👋
                  </h1>
                  <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live: {user?.school?.name || 'Active Session'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time syllabus completion metrics, term pacing, and student assessment workflows.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/teacher/classes"
                className="h-9 inline-flex items-center gap-1.5 text-xs font-bold px-3 rounded-xl border border-indigo-200/80 bg-indigo-50 text-indigo-700 shadow-2xs hover:bg-indigo-100/60 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {classes.length} Assigned Classes
              </Link>
              <Link
                href="/teacher/exam-papers/create"
                className="h-9 font-bold text-xs shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 px-3.5 gap-1.5 rounded-xl cursor-pointer active:scale-95 transition-all inline-flex items-center"
              >
                <FileText className="h-3.5 w-3.5" />
                Create Exam Paper
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Concise Overview KPI Metric Cards (Matching Image 1 UI) */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Card 1 - Blue: Total Classes */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Assigned Classes
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                Cohorts
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {classes.length}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">grades</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Active course sections
            </p>
          </div>

          {/* Card 2 - Purple: Total Chapters */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Total Chapters
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                Curriculum
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {totalChapters}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">topics</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Assigned syllabus curriculum
            </p>
          </div>

          {/* Card 3 - Amber: Chapters Completed */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Chapters Covered
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                {completedChapters}/{totalChapters}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {completedChapters}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">finished</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              {Math.max(0, totalChapters - completedChapters)} chapters remaining
            </p>
          </div>

          {/* Card 4 - Emerald: Syllabus Velocity */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Overall Velocity
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                {progress}% Pace
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {progress}%
              </span>
              <span className="text-[10px] font-semibold text-emerald-600">coverage</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Average across all classes
            </p>
          </div>
        </div>

        {/* Academic Timeline Section - Styled from Admin Global Timeline */}
        {timelineLoading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : timeline ? (
          <Section
            title={`Academic Timeline — ${timeline.academicTerm.name}`}
            icon={Calendar}
            iconGradient="from-indigo-600 to-blue-600"
            extra={
              <Link
                href="/teacher/academic-timeline"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Calendar Details <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Term Duration: {new Date(timeline.academicTerm.startDate).toLocaleDateString()} —{' '}
                    {new Date(timeline.academicTerm.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border shadow-2xs',
                      timeline.progress.isBehindSchedule
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    )}
                  >
                    {timeline.progress.isBehindSchedule ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        Behind Pace ({Math.abs(timeline.progress.progressDifference)}% gap)
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        On Track ({timeline.progress.progressDifference}% lead)
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-center">
                {/* 4 Stat Boxes */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 shadow-2xs">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600">Days Remaining</span>
                    <span className="text-xl font-black text-blue-900 mt-0.5 block">{timeline.timeline.daysRemaining}</span>
                    <span className="text-[10px] text-blue-600/70 font-semibold">{timeline.timeline.daysElapsed} days elapsed</span>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 shadow-2xs">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-600">Teaching Days</span>
                    <span className="text-xl font-black text-purple-900 mt-0.5 block">{timeline.teachingDays.availableDays}</span>
                    <span className="text-[10px] text-purple-600/70 font-semibold">Of {timeline.academicTerm.totalWorkingDays} working days</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 shadow-2xs">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Per Chapter Goal</span>
                    <span className="text-xl font-black text-slate-800 mt-0.5 block">{timeline.teachingDays.daysPerChapterRequired}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Teaching days / chapter</span>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 shadow-2xs">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600">Expected Pace</span>
                    <span className="text-xl font-black text-amber-900 mt-0.5 block">{timeline.progress.targetProgress}%</span>
                    <span className="text-[10px] text-amber-600/70 font-semibold">Calendar benchmark</span>
                  </div>
                </div>

                {/* Progress Comparison Gauges */}
                <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        Your Actual Completion
                      </span>
                      <span className="text-blue-600 font-black">
                        {timeline.progress.completionPercentage}%
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700"
                        style={{ width: `${timeline.progress.completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Target Term Schedule Pace
                      </span>
                      <span className="text-amber-600 font-black">
                        {timeline.progress.targetProgress}%
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                        style={{ width: `${timeline.progress.targetProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        ) : null}

        {/* Assigned Classes Cards Section */}
        <Section
          title="Assigned Classes & Syllabus"
          icon={Layers}
          iconGradient="from-blue-600 to-teal-600"
          extra={
            <Link
              href="/teacher/classes"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All ({classes.length}) <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No assigned classes"
              description="Ask your school administrator to assign classes to your teacher account."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.slice(0, 6).map((cls, i) => {
                const pct = Math.round(cls.progress);
                const barColor =
                  pct >= 70
                    ? 'from-emerald-500 to-teal-600'
                    : pct >= 40
                    ? 'from-blue-500 to-indigo-600'
                    : 'from-amber-400 to-orange-500';

                return (
                  <Link 
                    key={cls.id} 
                    href={`/teacher/classes/${cls.id}`}
                    className="group"
                  >
                    <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                            {cls.name}
                          </h4>
                          {cls.section && (
                            <span className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              Section {cls.section}
                            </span>
                          )}
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                          <span className="text-[10px] text-slate-400 block uppercase">Subjects</span>
                          <span className="font-bold text-slate-800 text-sm">{cls._count.subjects}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                          <span className="text-[10px] text-slate-400 block uppercase">Chapters</span>
                          <span className="font-bold text-slate-800 text-sm">{cls.completedChapters} / {cls.totalChapters}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400 font-medium">Completion</span>
                          <span className="text-[#0b1c30] font-bold">{pct}%</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </DashboardShell>
  );
}
