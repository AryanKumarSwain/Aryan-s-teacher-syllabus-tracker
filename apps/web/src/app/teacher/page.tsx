'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ChevronRight,
  Target,
  Zap,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Chapters',
      value: totalChapters,
      icon: Target,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Completed',
      value: completedChapters,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Overall Progress',
      value: `${progress}%`,
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200">
                <BookOpen className="h-3 w-3" /> Teacher Workspace
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Welcome back, {user?.name?.split(' ')[0] ?? 'Teacher'} 👋
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Overview of your teaching syllabus progress, timelines, and active classes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/teacher/classes"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Manage Classes
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))
            : stats.map(({ label, value, icon: Icon, color, bg }, i) => (
                <div
                  key={label}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {label}
                          </p>
                          <p className={cn('mt-1 text-2xl font-black tracking-tight', color)}>
                            {value}
                          </p>
                        </div>
                        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-xs', bg)}>
                          <Icon className={cn('h-5 w-5', color)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
        </div>

        {/* Timeline Card */}
        {timelineLoading ? (
          <Skeleton className="h-44 rounded-2xl" />
        ) : timeline ? (
          <Card
            className={cn(
              'animate-in fade-in slide-in-from-top-2 border shadow-sm transition-all duration-300 rounded-2xl overflow-hidden',
              timeline.progress.isBehindSchedule
                ? 'border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-white'
                : 'border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-white',
            )}
          >
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Academic Timeline — {timeline.academicTerm.name}
                    </CardTitle>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    {new Date(timeline.academicTerm.startDate).toLocaleDateString()} —{' '}
                    {new Date(timeline.academicTerm.endDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border',
                    timeline.progress.isBehindSchedule
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  )}
                >
                  {timeline.progress.isBehindSchedule ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Behind Schedule
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> On Track
                    </>
                  )}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      label: 'Days Remaining',
                      value: timeline.timeline.daysRemaining,
                      color: 'text-blue-700',
                      bg: 'bg-blue-50/70 border-blue-100',
                    },
                    {
                      label: 'Teaching Days',
                      value: timeline.teachingDays.availableDays,
                      color: 'text-purple-700',
                      bg: 'bg-purple-50/70 border-purple-100',
                    },
                    {
                      label: 'Days Elapsed',
                      value: timeline.timeline.daysElapsed,
                      color: 'text-slate-700',
                      bg: 'bg-slate-50 border-slate-200/70',
                    },
                    {
                      label: 'Per Chapter',
                      value: timeline.teachingDays.daysPerChapterRequired,
                      color: 'text-amber-700',
                      bg: 'bg-amber-50/70 border-amber-100',
                    },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={cn('rounded-xl p-3 border', bg)}>
                      <div className={cn('text-xl font-black', color)}>{value}</div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3.5 flex flex-col justify-center">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Your Progress</span>
                      <span className="text-blue-600">
                        {timeline.progress.completionPercentage}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700"
                        style={{ width: `${timeline.progress.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500 flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-purple-600" /> Target Pace
                      </span>
                      <span className="text-purple-600">
                        {timeline.progress.targetProgress}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-700"
                        style={{ width: `${timeline.progress.targetProgress}%` }}
                      />
                    </div>
                  </div>
                  <div
                    className={cn(
                      'rounded-xl px-3 py-2 text-xs font-bold border',
                      timeline.progress.isBehindSchedule
                        ? 'bg-amber-50/80 text-amber-900 border-amber-200'
                        : 'bg-emerald-50/80 text-emerald-900 border-emerald-200',
                    )}
                  >
                    {timeline.progress.isBehindSchedule
                      ? `${Math.abs(timeline.progress.progressDifference)}% behind target`
                      : `${timeline.progress.progressDifference}% ahead of target`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Classes Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Assigned Classes</h2>
              <p className="text-xs text-slate-500">
                Select a class to record syllabus and chapter milestones.
              </p>
            </div>
            <Link
              href="/teacher/classes"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              View all ({classes.length}) <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
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
              {classes.slice(0, 6).map((cls, i) => (
                <div
                  key={cls.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Link href={`/teacher/classes/${cls.id}`}>
                    <Card className="group h-full cursor-pointer rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5">
                      <CardHeader className="p-4 sm:p-5 pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {cls.name}
                            </CardTitle>
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
                      </CardHeader>
                      <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>{cls._count.subjects} Subjects</span>
                          <span>{cls.totalChapters} Chapters</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-400 font-medium">
                              {cls.completedChapters} of {cls.totalChapters} completed
                            </span>
                            <span className="text-blue-600 font-bold">
                              {Math.round(cls.progress)}%
                            </span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700"
                              style={{ width: `${cls.progress}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
