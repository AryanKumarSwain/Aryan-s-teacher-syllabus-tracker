'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Target,
  Calendar,
  Info,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

interface AssignedClass {
  id: string;
  name: string;
  section: string | null;
  totalChapters: number;
  completedChapters: number;
  progress: number;
  _count: { subjects: number };
}

interface SubjectProgressItem {
  subjectId: string;
  subjectName: string;
  classId?: string;
  className?: string;
  totalTopics: number;
  completedTopics: number;
  percentageComplete: number;
  velocity: 'less' | 'neutral' | 'more';
}

type VelocityFilter = 'all' | 'less' | 'neutral' | 'more';

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

const velocityConfig = {
  less: {
    label: 'Behind',
    fullLabel: 'Behind schedule',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700 border-red-200',
    bar: 'bg-red-400',
    icon: TrendingDown,
    dot: 'bg-red-500',
  },
  neutral: {
    label: 'On Pace',
    fullLabel: 'On pace',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    bar: 'bg-amber-400',
    icon: Minus,
    dot: 'bg-amber-500',
  },
  more: {
    label: 'Ahead',
    fullLabel: 'Ahead of schedule',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bar: 'bg-emerald-400',
    icon: TrendingUp,
    dot: 'bg-emerald-500',
  },
};

export default function TeacherProgressPage() {
  const user = useAuthStore((s) => s.user);
  const [selectedClassId, setSelectedClassId] = useState<string | null>('all');
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>('all');
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const academicSessionId = useAuthStore((s) => s.user?.school?.currentAcademicSessionId);

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['teacher-classes', schoolId, academicSessionId],
    queryFn: () =>
      api
        .get<AssignedClass[]>('/syllabus/classes/assigned', {
          page: 1,
          pageSize: 100,
          ...(academicSessionId && { academicSessionId }),
        })
        .then((res) => {
          // Handle variations in api delivery formats safely
          return Array.isArray(res) ? res : (res as any).items || [];
        }),
    enabled: !!schoolId,
  });

  const { data: progressionData, isLoading: progressionLoading } = useQuery({
    queryKey: ['teacher-progression', user?.teacherId, user?.schoolId],
    queryFn: () =>
      api.get<{ subjectProgress: SubjectProgressItem[] }>('/progression/teacher', {
        teacherId: user?.teacherId || undefined,
        schoolId: user?.schoolId || undefined,
      }),
    enabled: !!user?.teacherId && !!user?.schoolId,
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

  const classes: AssignedClass[] = Array.isArray(classesData)
    ? classesData
    : (classesData as any)?.items || (classesData as any)?.data || [];
  const rawSubjectProgress = progressionData?.subjectProgress ?? [];
  const timeline = timelineData?.data;

  // Re-evaluate velocity dynamically relative to Timeline target progress threshold
  const subjectProgress = useMemo(() => {
    if (!timeline) return rawSubjectProgress;

    const target = timeline.progress.targetProgress;

    return rawSubjectProgress.map((subject) => {
      let calculatedVelocity: 'less' | 'neutral' | 'more' = 'neutral';

      if (subject.percentageComplete < target) {
        calculatedVelocity = 'less';
      } else if (subject.percentageComplete > target) {
        calculatedVelocity = 'more';
      }

      return {
        ...subject,
        velocity: calculatedVelocity,
      };
    });
  }, [rawSubjectProgress, timeline]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const filteredSubjects = useMemo(() => {
    let subjects =
      selectedClassId === 'all'
        ? subjectProgress
        : selectedClassId
          ? subjectProgress.filter((s) => s.classId === selectedClassId)
          : subjectProgress;
    if (velocityFilter !== 'all') {
      subjects = subjects.filter((s) => s.velocity === velocityFilter);
    }
    return subjects;
  }, [subjectProgress, selectedClassId, velocityFilter]);

  const velocityCounts = useMemo(() => {
    const base =
      selectedClassId === 'all'
        ? subjectProgress
        : selectedClassId
          ? subjectProgress.filter((s) => s.classId === selectedClassId)
          : subjectProgress;
    return {
      all: base.length,
      less: base.filter((s) => s.velocity === 'less').length,
      neutral: base.filter((s) => s.velocity === 'neutral').length,
      more: base.filter((s) => s.velocity === 'more').length,
    };
  }, [subjectProgress, selectedClassId]);

  const isLoading = classesLoading || progressionLoading || timelineLoading;

  return (
    <DashboardShell title="My Progress">
      <div className="space-y-6">
        {/* Header Stats Row */}
        {((selectedClassId === 'all' && subjectProgress.length > 0) || selectedClass) &&
          !isLoading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: 'Overall Progress',
                  value: selectedClass
                    ? `${selectedClass.progress.toFixed(0)}%`
                    : `${(
                        (subjectProgress.reduce((sum, s) => sum + (s.completedTopics || 0), 0) /
                          Math.max(
                            subjectProgress.reduce((sum, s) => sum + (s.totalTopics || 0), 0),
                            1,
                          )) *
                        100
                      ).toFixed(0)}%`,
                  icon: Target,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  label: selectedClass ? 'Chapters Done' : 'Topics Done',
                  value: selectedClass
                    ? `${selectedClass.completedChapters}/${selectedClass.totalChapters}`
                    : `${subjectProgress.reduce((sum, s) => sum + (s.completedTopics || 0), 0)}/${subjectProgress.reduce((sum, s) => sum + (s.totalTopics || 0), 0)}`,
                  icon: CheckCircle2,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'Subjects',
                  value: selectedClass ? selectedClass._count.subjects : subjectProgress.length,
                  icon: BookOpen,
                  color: 'text-purple-600',
                  bg: 'bg-purple-50',
                },
                {
                  label: 'Behind Schedule',
                  value: velocityCounts.less,
                  icon: AlertTriangle,
                  color: 'text-red-600',
                  bg: 'bg-red-50',
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('rounded-lg p-2', bg)}>
                        <Icon className={cn('h-4 w-4', color)} />
                      </div>
                      <div>
                        <div className={cn('text-xl font-bold', color)}>{value}</div>
                        <div className="text-muted-foreground text-xs">{label}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        {/* Academic Timeline Progress Card */}
        {timeline && (
          <Card
            className={cn(
              'border-2 transition-all duration-300',
              timeline.progress.isBehindSchedule
                ? 'border-orange-300 bg-orange-50/30'
                : 'border-emerald-300 bg-emerald-50/30',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="relative flex items-center gap-2 text-base font-bold">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Academic Timeline — {timeline.academicTerm.name}
                  {/* Custom Popover Container */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowInfoPopover(!showInfoPopover)}
                      onBlur={() => setTimeout(() => setShowInfoPopover(false), 200)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 outline-none hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Info className="h-4 w-4" />
                    </button>

                    {showInfoPopover && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl transition-all duration-200">
                        <div className="space-y-2 text-xs font-normal normal-case tracking-normal">
                          <h4 className="text-sm font-bold text-gray-900">
                            How pacing is calculated:
                          </h4>
                          <p className="leading-relaxed text-gray-600">
                            Subject progress markers are determined relative to the current
                            <span className="font-semibold text-purple-700">
                              {' '}
                              Teaching Days Progress ({timeline.progress.targetProgress}%)
                            </span>
                            :
                          </p>
                          <ul className="list-disc space-y-1 pl-4 text-gray-600">
                            <li>
                              <span className="font-semibold text-red-600">Behind:</span> Progress
                              is less than {timeline.progress.targetProgress}%
                            </li>
                            <li>
                              <span className="font-semibold text-amber-600">On Pace:</span>{' '}
                              Progress matches exactly {timeline.progress.targetProgress}%
                            </li>
                            <li>
                              <span className="font-semibold text-emerald-600">Ahead:</span>{' '}
                              Progress is greater than {timeline.progress.targetProgress}%
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
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
        )}

        {/* Class Tabs */}
        <div>
          {classesLoading ? (
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-lg" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BookOpen className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">No assigned classes found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedClassId('all')}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95',
                  selectedClassId === 'all'
                    ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50',
                )}
              >
                All Classes
              </button>
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95',
                    selectedClassId === cls.id
                      ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50',
                  )}
                >
                  {cls.name}
                  {cls.section && (
                    <span
                      className={cn(
                        'ml-1.5 text-xs',
                        selectedClassId === cls.id ? 'text-blue-100' : 'text-muted-foreground',
                      )}
                    >
                      §{cls.section}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Class Dashboard Summary */}
        {selectedClassId && selectedClassId !== 'all' && selectedClass && (
          <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-blue-900">{selectedClass.name} — Overall</span>
              <span className="font-bold text-blue-700">{selectedClass.progress.toFixed(1)}%</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700"
                style={{ width: `${selectedClass.progress}%` }}
              />
            </div>
            <div className="text-muted-foreground mt-1.5 text-xs">
              {selectedClass.completedChapters} of {selectedClass.totalChapters} chapters completed
            </div>
          </div>
        )}

        {/* Aggregate progress summary for All Classes */}
        {selectedClassId === 'all' && subjectProgress.length > 0 && (
          <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-blue-900">All Classes — Overall</span>
              <span className="font-bold text-blue-700">
                {(
                  (subjectProgress.reduce((sum, s) => sum + (s.completedTopics || 0), 0) /
                    Math.max(
                      subjectProgress.reduce((sum, s) => sum + (s.totalTopics || 0), 0),
                      1,
                    )) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700"
                style={{
                  width: `${
                    (subjectProgress.reduce((sum, s) => sum + (s.completedTopics || 0), 0) /
                      Math.max(
                        subjectProgress.reduce((sum, s) => sum + (s.totalTopics || 0), 0),
                        1,
                      )) *
                    100
                  }%`,
                }}
              />
            </div>
            <div className="text-muted-foreground mt-1.5 text-xs">
              {subjectProgress.reduce((sum, s) => sum + (s.completedTopics || 0), 0)} of{' '}
              {subjectProgress.reduce((sum, s) => sum + (s.totalTopics || 0), 0)} topics completed
              across {subjectProgress.length} subjects
            </div>
          </div>
        )}

        {/* Velocity Filter Tabs */}
        {(selectedClass || selectedClassId === 'all') && (
          <div className="flex flex-wrap gap-2">
            {(['all', 'less', 'neutral', 'more'] as const).map((v) => {
              const cfg = v === 'all' ? null : velocityConfig[v];
              const count = velocityCounts[v];
              const isActive = velocityFilter === v;
              return (
                <button
                  key={v}
                  onClick={() => setVelocityFilter(v)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                    isActive && v === 'all' && 'border-gray-800 bg-gray-800 text-white',
                    isActive && v !== 'all' && cfg && `${cfg.badge} border`,
                    !isActive &&
                      'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {cfg && <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />}
                  {v === 'all' ? 'All Subjects' : cfg?.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      isActive && v === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-600',
                      isActive && v !== 'all' && cfg ? `${cfg.bg} ${cfg.color}` : '',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Subject Cards Grid */}
        {progressionLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : !selectedClassId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                Select a class to view your assigned subjects.
              </p>
            </CardContent>
          </Card>
        ) : filteredSubjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
              <p className="font-medium text-gray-700">
                {velocityFilter === 'all'
                  ? 'No assigned subjects found.'
                  : `No subjects ${velocityConfig[velocityFilter as 'less' | 'neutral' | 'more']?.fullLabel}.`}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {velocityFilter !== 'all' && 'Try clearing the filter.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((subject, index) => {
              const cfg = velocityConfig[subject.velocity];
              const Icon = cfg.icon;
              const remaining = subject.totalTopics - subject.completedTopics;
              return (
                <div
                  key={subject.subjectId}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Card className="group h-full border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="line-clamp-1 text-base font-bold">
                            {subject.subjectName}
                          </CardTitle>
                          {subject.className && (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {subject.className}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                            cfg.badge,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Metrics */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs">
                            {subject.completedTopics} / {subject.totalTopics} topics
                          </span>
                          <span className={cn('text-sm font-bold', cfg.color)}>
                            {subject.percentageComplete.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-700',
                              cfg.bar,
                            )}
                            style={{ width: `${subject.percentageComplete}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Layout Matrix Row */}
                      <div className="flex items-center justify-between border-t pt-3">
                        <div className="text-center">
                          <div className="text-sm font-bold text-emerald-600">
                            {subject.completedTopics}
                          </div>
                          <div className="text-muted-foreground text-[10px]">Done</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-500">{remaining}</div>
                          <div className="text-muted-foreground text-[10px]">Remaining</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-blue-600">
                            {subject.totalTopics}
                          </div>
                          <div className="text-muted-foreground text-[10px]">Total</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
