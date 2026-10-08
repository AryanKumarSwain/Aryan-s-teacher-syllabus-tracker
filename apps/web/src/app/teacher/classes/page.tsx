'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, GraduationCap, CheckCircle2, Target } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { useSchool } from '@/features/syllabus/hooks/use-school';
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

export default function TeacherClassesPage() {
  const { school } = useSchool();
  const schoolId = school?.id;
  const academicSessionId = school?.currentAcademicSessionId;

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-classes', schoolId, academicSessionId],
    queryFn: () =>
      api.getPaginated<AssignedClass>('/syllabus/classes/assigned', {
        page: 1,
        pageSize: 100,
        ...(academicSessionId && { academicSessionId }),
      }),
    enabled: !!schoolId,
  });

  const classes = data?.items ?? [];
  const totalSubjects = classes.reduce((s, c) => s + (c._count?.subjects || 0), 0);
  const totalChapters = classes.reduce((s, c) => s + (c.totalChapters || 0), 0);
  const totalCompleted = classes.reduce((s, c) => s + (c.completedChapters || 0), 0);

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200">
                <GraduationCap className="h-3 w-3" /> My Teaching Classes
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {classes.length} Active
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Classes & Syllabus
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Select any class to review topics, teaching progress, and syllabus workflows.
            </p>
          </div>
        </div>

        {/* Top Summary Bar */}
        {!isLoading && classes.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classes</p>
              <p className="mt-0.5 text-2xl font-black text-slate-900">{classes.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subjects</p>
              <p className="mt-0.5 text-2xl font-black text-blue-600">{totalSubjects}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chapters</p>
              <p className="mt-0.5 text-2xl font-black text-purple-600">{totalChapters}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
              <p className="mt-0.5 text-2xl font-black text-emerald-600">{totalCompleted}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No assigned classes"
            description="Your administrator can assign you classes so you can manage progress from here."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((cls, i) => {
              const remaining = cls.totalChapters - cls.completedChapters;
              const pct = Math.round(cls.progress);
              const barColor =
                pct >= 70
                  ? 'from-emerald-500 to-teal-600'
                  : pct >= 40
                    ? 'from-blue-500 to-indigo-600'
                    : 'from-amber-400 to-orange-500';

              return (
                <div
                  key={cls.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Link href={`/teacher/classes/${cls.id}`}>
                    <Card className="group h-full cursor-pointer rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5">
                      <CardHeader className="p-4 sm:p-5 pb-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="line-clamp-1 text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {cls.name}
                            </CardTitle>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {cls.grade && (
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-100">
                                  Grade {cls.grade}
                                </span>
                              )}
                              {cls.section && (
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                  Section {cls.section}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                        {/* Mini stats */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: 'Subjects',
                              value: cls._count.subjects,
                              icon: BookOpen,
                              color: 'text-blue-700',
                              bg: 'bg-blue-50/70 border-blue-100',
                            },
                            {
                              label: 'Done',
                              value: cls.completedChapters,
                              icon: CheckCircle2,
                              color: 'text-emerald-700',
                              bg: 'bg-emerald-50/70 border-emerald-100',
                            },
                            {
                              label: 'Left',
                              value: remaining,
                              icon: Target,
                              color: 'text-amber-700',
                              bg: 'bg-amber-50/70 border-amber-100',
                            },
                          ].map(({ label, value, icon: Icon, color, bg }) => (
                            <div key={label} className={cn('rounded-xl p-2.5 text-center border', bg)}>
                              <Icon className={cn('mx-auto mb-1 h-3.5 w-3.5', color)} />
                              <div className={cn('text-sm font-black', color)}>{value}</div>
                              <div className="text-[10px] font-semibold text-slate-500">{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-400 font-medium">
                              {cls.completedChapters} of {cls.totalChapters} chapters
                            </span>
                            <span className="text-slate-800">{pct}%</span>
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
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
