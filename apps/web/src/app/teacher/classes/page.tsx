'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  BookOpen, 
  ChevronRight, 
  GraduationCap, 
  CheckCircle2, 
  Target, 
  Layers, 
  ArrowRight,
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
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

export default function TeacherClassesPage() {
  const { school } = useSchool();
  const schoolId = school?.id;
  const academicSessionId = school?.currentAcademicSessionId;
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'chapters'>('name');

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
  const overallAvg = totalChapters > 0 ? Math.round((totalCompleted / totalChapters) * 100) : 0;

  const sortedClasses = [...classes].sort((a, b) => {
    if (sortBy === 'progress') return b.progress - a.progress;
    if (sortBy === 'chapters') return b.totalChapters - a.totalChapters;
    return a.name.localeCompare(b.name);
  });

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header - Matching Admin Styling */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200/80">
                <GraduationCap className="h-3 w-3" /> Teacher Directory
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {classes.length} Assigned Classes
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0b1c30] sm:text-3xl">
              Classes & Syllabus Portfolio
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              Monitor curriculum progress, chapter completion, and topic milestones for your assigned student divisions.
            </p>
          </div>
        </div>

        {/* 4 Top KPI Stat Cards - Matching Admin Styling */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classes</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">{classes.length}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Assigned sections</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subjects</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">{totalSubjects}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Subject curriculums</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chapters</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">{totalChapters}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Total chapters</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
                  <Target className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Completion</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">{overallAvg}%</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{totalCompleted} chapters done</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Wrapper */}
        <Section
          title="Assigned Classes & Syllabus Roster"
          icon={Layers}
          iconGradient="from-blue-600 to-teal-600"
          extra={
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-0 font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="name">Class Name</option>
                <option value="progress">Highest Progress</option>
                <option value="chapters">Most Chapters</option>
              </select>
            </div>
          }
        >
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : sortedClasses.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No assigned classes"
              description="Your administrator can assign you classes so you can manage progress from here."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedClasses.map((cls, i) => {
                const remaining = cls.totalChapters - cls.completedChapters;
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
                    <div className="h-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-1 text-base font-bold text-[#0b1c30] group-hover:text-blue-600 transition-colors">
                            {cls.name}
                          </h3>
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

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Subjects</span>
                          <span className="text-sm font-black text-slate-800">{cls._count.subjects}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Completed</span>
                          <span className="text-sm font-black text-emerald-600">{cls.completedChapters}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining</span>
                          <span className="text-sm font-black text-slate-600">{remaining}</span>
                        </div>
                      </div>

                      {/* Progress Track */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400 font-medium">Syllabus Completion</span>
                          <span className="text-[#0b1c30] font-black">{pct}%</span>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer link */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                        <span>View Class Chapters & Topics</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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
