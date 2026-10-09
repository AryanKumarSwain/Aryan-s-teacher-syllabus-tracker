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
  iconGradient = 'from-blue-600 to-indigo-600',
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
      unit: 'Classes',
      icon: GraduationCap,
      gradient: 'from-blue-600 to-indigo-600',
      textColor: 'text-blue-600',
      bgGlow: 'from-blue-50/50 to-transparent',
    },
    {
      label: 'Total Chapters',
      value: totalChapters,
      unit: 'In Curriculum',
      icon: Target,
      gradient: 'from-purple-600 to-indigo-600',
      textColor: 'text-purple-600',
      bgGlow: 'from-purple-50/50 to-transparent',
    },
    {
      label: 'Completed Chapters',
      value: completedChapters,
      unit: 'Finished',
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600',
      bgGlow: 'from-emerald-50/50 to-transparent',
    },
    {
      label: 'Overall Completion',
      value: progress,
      isPercent: true,
      unit: 'Avg Velocity',
      icon: Zap,
      gradient: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-600',
      bgGlow: 'from-amber-50/50 to-transparent',
    },
  ];

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Banner - Matching Admin Dashboard Style */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200/80">
                <BookOpen className="h-3 w-3" /> Teacher Workspace
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/80">
                Batch: {user?.school?.currentAcademicSessionId ? 'Active Session' : '2026-27'}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0b1c30] sm:text-3xl">
              Welcome back, {user?.name?.split(' ')[0] ?? 'Teacher'} 👋
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              Real-time syllabus completion metrics, term pacing, and student assessment workflows.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/teacher/classes"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all hover:border-slate-300"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              Classes ({classes.length})
            </Link>
            <Link
              href="/teacher/exam-papers/create"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all hover:shadow"
            >
              <FileText className="h-3.5 w-3.5" />
              Create Exam Paper
            </Link>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))
            : stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs relative"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${stat.bgGlow} rounded-full blur-xl pointer-events-none`} />
                    <div className="flex items-start justify-between relative">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#0b1c30]">
                          <CountUp end={stat.value} />
                          {stat.isPercent ? '%' : ''}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          {stat.unit}
                        </p>
                      </div>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-xs`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    <div className="h-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-bold text-[#0b1c30] group-hover:text-blue-600 transition-colors">
                            {cls.name}
                          </h4>
                          {cls.section && (
                            <span className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              Section {cls.section}
                            </span>
                          )}
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
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
