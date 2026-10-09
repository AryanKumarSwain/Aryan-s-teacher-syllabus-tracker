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
  GraduationCap,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
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
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    bar: 'from-rose-500 to-red-600',
    icon: TrendingDown,
    dot: 'bg-rose-500',
  },
  neutral: {
    label: 'On Pace',
    fullLabel: 'On pace',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    bar: 'from-amber-400 to-orange-500',
    icon: Minus,
    dot: 'bg-amber-500',
  },
  more: {
    label: 'Ahead',
    fullLabel: 'Ahead of schedule',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bar: 'from-emerald-500 to-teal-600',
    icon: TrendingUp,
    dot: 'bg-emerald-500',
  },
};

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

  const subjectProgress = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'all') return rawSubjectProgress;
    return rawSubjectProgress.filter((s) => s.classId === selectedClassId);
  }, [rawSubjectProgress, selectedClassId]);

  const selectedClass = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'all') return null;
    return classes.find((c) => c.id === selectedClassId) ?? null;
  }, [classes, selectedClassId]);

  const velocityCounts = useMemo(() => {
    return {
      all: subjectProgress.length,
      less: subjectProgress.filter((s) => s.velocity === 'less').length,
      neutral: subjectProgress.filter((s) => s.velocity === 'neutral').length,
      more: subjectProgress.filter((s) => s.velocity === 'more').length,
    };
  }, [subjectProgress]);

  const filteredSubjects = useMemo(() => {
    if (velocityFilter === 'all') return subjectProgress;
    return subjectProgress.filter((s) => s.velocity === velocityFilter);
  }, [subjectProgress, velocityFilter]);

  const avgCompletion = useMemo(() => {
    if (selectedClass) return selectedClass.progress.toFixed(0);
    const totalTopics = subjectProgress.reduce((sum, s) => sum + (s.totalTopics || 0), 0);
    const completedTopics = subjectProgress.reduce((sum, s) => sum + (s.completedTopics || 0), 0);
    if (totalTopics === 0) return '0';
    return ((completedTopics / totalTopics) * 100).toFixed(0);
  }, [selectedClass, subjectProgress]);

  const totalTopicsCount = subjectProgress.reduce((sum, s) => sum + (s.totalTopics || 0), 0);
  const completedTopicsCount = subjectProgress.reduce((sum, s) => sum + (s.completedTopics || 0), 0);

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header - Matching Admin Dashboard Style */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200/80">
                <Target className="h-3 w-3" /> Syllabus Progression Analytics
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                Velocity Tracker
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0b1c30] sm:text-3xl">
              Teacher Curriculum Velocity
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              Real-time velocity tracking against academic calendar benchmarks, chapter milestones, and topic coverage.
            </p>
          </div>
        </div>

        {/* 4 Top KPI Stat Cards - Matching Admin Dashboard Design */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completion</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">{avgCompletion}%</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Total syllabus progress</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
                <Target className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Topics Done</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                  {completedTopicsCount} <span className="text-sm text-slate-400 font-bold">/ {totalTopicsCount}</span>
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Milestones achieved</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Subjects</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">{subjectProgress.length}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Tracked curriculums</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Behind Schedule</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">{velocityCounts.less}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Subjects needing focus</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Academic Timeline Progress Card */}
        {timeline && (
          <Section
            title={`Academic Timeline Schedule Pacing — ${timeline.academicTerm.name}`}
            icon={Calendar}
            iconGradient="from-indigo-600 to-blue-600"
            extra={
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
                      Behind Schedule ({Math.abs(timeline.progress.progressDifference)}% gap)
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      On Schedule ({timeline.progress.progressDifference}% lead)
                    </>
                  )}
                </span>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 items-center">
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
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600">Target Pace</span>
                  <span className="text-xl font-black text-amber-900 mt-0.5 block">{timeline.progress.targetProgress}%</span>
                  <span className="text-[10px] text-amber-600/70 font-semibold">Term progress benchmark</span>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                      Your Current Completion
                    </span>
                    <span className="text-blue-600 font-black">{timeline.progress.completionPercentage}%</span>
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
                      Expected Calendar Schedule
                    </span>
                    <span className="text-amber-600 font-black">{timeline.progress.targetProgress}%</span>
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
          </Section>
        )}

        {/* Class Filter Tabs & Velocity Breakdown */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Class Pill Selectors */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedClassId('all')}
                className={cn(
                  'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all border shadow-2xs',
                  selectedClassId === 'all'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                )}
              >
                All Classes ({classes.length})
              </button>
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={cn(
                    'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all border shadow-2xs',
                    selectedClassId === cls.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {cls.name}
                  {cls.section && <span className="ml-1 opacity-80 font-normal">({cls.section})</span>}
                </button>
              ))}
            </div>

            {/* Velocity Filters */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
              {(['all', 'less', 'neutral', 'more'] as const).map((v) => {
                const cfg = v === 'all' ? null : velocityConfig[v];
                const count = velocityCounts[v];
                const isActive = velocityFilter === v;
                return (
                  <button
                    key={v}
                    onClick={() => setVelocityFilter(v)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                      isActive
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    {cfg && <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />}
                    <span>{v === 'all' ? 'All' : cfg?.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subject Cards Section */}
        <Section
          title={selectedClass ? `${selectedClass.name} — Subject Progression` : 'All Subject Syllabi Progression'}
          icon={BookOpen}
          iconGradient="from-blue-600 to-indigo-600"
          extra={
            <span className="text-xs font-bold text-slate-500">
              {filteredSubjects.length} of {subjectProgress.length} subjects shown
            </span>
          }
        >
          {progressionLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
              <p className="font-bold text-slate-700 text-sm">No subjects matching current filter</p>
              <p className="text-xs text-slate-400 mt-0.5">Try selecting All Subjects or clearing filter tags.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSubjects.map((subject, index) => {
                const cfg = velocityConfig[subject.velocity];
                const Icon = cfg.icon;
                const remaining = subject.totalTopics - subject.completedTopics;
                return (
                  <div
                    key={subject.subjectId}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-1 text-base font-bold text-[#0b1c30]">
                          {subject.subjectName}
                        </h4>
                        {subject.className && (
                          <p className="text-slate-500 font-medium mt-0.5 text-xs truncate">
                            {subject.className}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                          cfg.badge,
                        )}
                      >
                        <Icon className="h-3 w-3 stroke-[2.5]" />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400 font-medium">
                          {subject.completedTopics} / {subject.totalTopics} topics done
                        </span>
                        <span className={cn('font-black text-sm', cfg.color)}>
                          {subject.percentageComplete.toFixed(1)}%
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            'h-full rounded-full bg-gradient-to-r transition-all duration-700',
                            cfg.bar,
                          )}
                          style={{ width: `${subject.percentageComplete}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                      <div className="rounded-lg bg-emerald-50/50 p-1.5 border border-emerald-100">
                        <span className="text-xs font-black text-emerald-700 block">{subject.completedTopics}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Done</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
                        <span className="text-xs font-black text-slate-700 block">{remaining}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Remaining</span>
                      </div>
                      <div className="rounded-lg bg-blue-50/50 p-1.5 border border-blue-100">
                        <span className="text-xs font-black text-blue-700 block">{subject.totalTopics}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </DashboardShell>
  );
}
