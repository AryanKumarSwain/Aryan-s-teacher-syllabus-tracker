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

interface AssignedClass {
  id: string;
  name: string;
  grade: string | null;
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

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () =>
      api.getPaginated<AssignedClass>('/syllabus/classes/assigned', { page: 1, pageSize: 100 }),
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
    <DashboardShell title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Teacher'} 👋`}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            : stats.map(({ label, value, icon: Icon, color, bg }, i) => (
                <div
                  key={label}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Card className="border shadow-sm transition-shadow duration-300 hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('rounded-lg p-2.5', bg)}>
                          <Icon className={cn('h-5 w-5', color)} />
                        </div>
                        <div>
                          <div className={cn('text-2xl font-bold', color)}>{value}</div>
                          <div className="text-muted-foreground text-xs">{label}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
        </div>

        {/* Timeline Card */}
        {timelineLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : timeline ? (
          <Card
            className={cn(
              'animate-in fade-in slide-in-from-top-2 border-2 transition-all duration-300',
              timeline.progress.isBehindSchedule
                ? 'border-orange-300 bg-orange-50/30'
                : 'border-emerald-300 bg-emerald-50/30',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Academic Timeline — {timeline.academicTerm.name}
                </CardTitle>
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                    timeline.progress.isBehindSchedule
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-emerald-100 text-emerald-700',
                  )}
                >
                  {timeline.progress.isBehindSchedule ? (
                    <>
                      <AlertTriangle className="h-3 w-3" /> Behind Schedule
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3" /> On Track
                    </>
                  )}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {new Date(timeline.academicTerm.startDate).toLocaleDateString()} —{' '}
                {new Date(timeline.academicTerm.endDate).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: 'Days Remaining',
                      value: timeline.timeline.daysRemaining,
                      color: 'text-blue-600',
                      bg: 'bg-blue-50',
                    },
                    {
                      label: 'Teaching Days',
                      value: timeline.teachingDays.availableDays,
                      color: 'text-purple-600',
                      bg: 'bg-purple-50',
                    },
                    {
                      label: 'Days Elapsed',
                      value: timeline.timeline.daysElapsed,
                      color: 'text-gray-600',
                      bg: 'bg-gray-50',
                    },
                    {
                      label: 'Per Chapter',
                      value: timeline.teachingDays.daysPerChapterRequired,
                      color: 'text-amber-600',
                      bg: 'bg-amber-50',
                    },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={cn('rounded-lg p-3', bg)}>
                      <div className={cn('text-xl font-bold', color)}>{value}</div>
                      <div className="text-muted-foreground text-[11px]">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Progress</span>
                      <span className="font-bold text-blue-600">
                        {timeline.progress.completionPercentage}%
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                        style={{ width: `${timeline.progress.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> Target
                      </span>
                      <span className="font-bold text-purple-600">
                        {timeline.progress.targetProgress}%
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-purple-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-700"
                        style={{ width: `${timeline.progress.targetProgress}%` }}
                      />
                    </div>
                  </div>
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-medium',
                      timeline.progress.isBehindSchedule
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-emerald-100 text-emerald-700',
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

        {/* Classes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your Classes</h2>
              <p className="text-muted-foreground text-sm">
                Open a class to update chapter progress.
              </p>
            </div>
            <Link
              href="/teacher/classes"
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No assigned classes"
              description="Ask your administrator to assign classes."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {classes.slice(0, 3).map((cls, i) => (
                <div
                  key={cls.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <Link href={`/teacher/classes/${cls.id}`}>
                    <Card className="group h-full cursor-pointer border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-bold">{cls.name}</CardTitle>
                            {cls.section && (
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                Section {cls.section}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-muted-foreground text-xs">
                          {cls._count.subjects} subjects · {cls.totalChapters} chapters
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {cls.completedChapters} completed
                            </span>
                            <span className="font-bold text-blue-600">
                              {Math.round(cls.progress)}%
                            </span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-blue-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700"
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
