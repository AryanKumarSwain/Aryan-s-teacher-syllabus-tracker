'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  Target,
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
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>('all');

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () =>
      api.getPaginated<AssignedClass>('/syllabus/classes/assigned', { page: 1, pageSize: 100 }),
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

  const classes = classesData?.items ?? [];
  const subjectProgress = progressionData?.subjectProgress ?? [];

  // Auto-select first class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const filteredSubjects = useMemo(() => {
    let subjects = selectedClassId
      ? subjectProgress.filter((s) => s.classId === selectedClassId)
      : subjectProgress;
    if (velocityFilter !== 'all') {
      subjects = subjects.filter((s) => s.velocity === velocityFilter);
    }
    return subjects;
  }, [subjectProgress, selectedClassId, velocityFilter]);

  // Summary counts for filter buttons
  const velocityCounts = useMemo(() => {
    const base = selectedClassId
      ? subjectProgress.filter((s) => s.classId === selectedClassId)
      : subjectProgress;
    return {
      all: base.length,
      less: base.filter((s) => s.velocity === 'less').length,
      neutral: base.filter((s) => s.velocity === 'neutral').length,
      more: base.filter((s) => s.velocity === 'more').length,
    };
  }, [subjectProgress, selectedClassId]);

  const isLoading = classesLoading || progressionLoading;

  return (
    <DashboardShell title="My Progress">
      <div className="space-y-6">
        {/* Header Stats Row */}
        {selectedClass && !isLoading && (
          <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-3 duration-300 sm:grid-cols-4">
            {[
              {
                label: 'Overall Progress',
                value: `${selectedClass.progress.toFixed(0)}%`,
                icon: Target,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Chapters Done',
                value: `${selectedClass.completedChapters}/${selectedClass.totalChapters}`,
                icon: CheckCircle2,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                label: 'Subjects',
                value: selectedClass._count.subjects,
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

        {/* Class Tabs */}
        <div className="animate-in fade-in duration-200">
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
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95',
                    selectedClassId === cls.id
                      ? 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-200'
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

        {/* Progress bar for selected class */}
        {selectedClass && (
          <div className="animate-in fade-in slide-in-from-top-1 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-4 duration-200">
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

        {/* Velocity Filter Pills */}
        {selectedClass && (
          <div className="animate-in fade-in flex flex-wrap gap-2 duration-200">
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
                  <Card
                    className={cn(
                      'group h-full border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                    )}
                  >
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
                      {/* Progress bar */}
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

                      {/* Footer stats */}
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
