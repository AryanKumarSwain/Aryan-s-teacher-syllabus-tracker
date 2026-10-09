'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  BookOpen, 
  ChevronRight, 
  GraduationCap, 
  CheckCircle2, 
  Target, 
  Search,
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { cn } from '@/lib/utils';

interface AssignedClass {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  description?: string | null;
  totalChapters: number;
  completedChapters: number;
  progress: number;
  _count: { subjects: number };
}

// 🎨 Dynamic color themes array for class cards (Matching Admin Classes UI)
const CARD_THEMES = [
  {
    border: 'hover:border-blue-200',
    accentBg: 'bg-blue-50/70',
    accentText: 'text-blue-600',
    iconColor: 'text-blue-500',
    progressGradient: 'from-blue-500 to-indigo-500',
  },
  {
    border: 'hover:border-purple-200',
    accentBg: 'bg-purple-50/70',
    accentText: 'text-purple-600',
    iconColor: 'text-purple-500',
    progressGradient: 'from-purple-500 to-indigo-600',
  },
  {
    border: 'hover:border-emerald-200',
    accentBg: 'bg-emerald-50/70',
    accentText: 'text-emerald-600',
    iconColor: 'text-emerald-500',
    progressGradient: 'from-emerald-500 to-teal-600',
  },
  {
    border: 'hover:border-amber-200',
    accentBg: 'bg-amber-50/70',
    accentText: 'text-amber-600',
    iconColor: 'text-amber-500',
    progressGradient: 'from-amber-500 to-orange-500',
  },
  {
    border: 'hover:border-rose-200',
    accentBg: 'bg-rose-50/70',
    accentText: 'text-rose-600',
    iconColor: 'text-rose-500',
    progressGradient: 'from-rose-500 to-pink-500',
  },
  {
    border: 'hover:border-cyan-200',
    accentBg: 'bg-cyan-50/70',
    accentText: 'text-cyan-600',
    iconColor: 'text-cyan-500',
    progressGradient: 'from-cyan-500 to-blue-500',
  },
];

export default function TeacherClassesPage() {
  const router = useRouter();
  const { school } = useSchool();
  const { sessions } = useAcademicSessions();
  const schoolId = school?.id;
  const academicSessionId = school?.currentAcademicSessionId;
  const currentSession = sessions?.find((s) => s.id === academicSessionId);
  const [search, setSearch] = useState('');
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

  const filteredClasses = useMemo(() => {
    return classes
      .filter((cls) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          cls.name.toLowerCase().includes(q) ||
          (cls.section && cls.section.toLowerCase().includes(q)) ||
          (cls.grade && cls.grade.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'progress') return b.progress - a.progress;
        if (sortBy === 'chapters') return b.totalChapters - a.totalChapters;
        return a.name.localeCompare(b.name);
      });
  }, [classes, search, sortBy]);

  return (
    <DashboardShell title="Classes & Syllabus">
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Welcome & Status Banner (Matching Image 1 / Admin Classes exact design) */}
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
                    Class & Cohort Management
                  </h1>
                  <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live: {currentSession?.name || 'Active Session'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Organize grade levels, sections, subject mappings, and curriculum pacing progress.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="h-9 inline-flex items-center gap-1.5 text-xs font-bold px-3 rounded-xl border border-indigo-200/80 bg-indigo-50 text-indigo-700 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {classes.length} / {classes.length} Classes
              </span>
            </div>
          </div>
        </div>

        {/* 4 Concise Overview KPI Metric Cards (Matching Image 1 exact UI) */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Total Classes Card - Blue */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Total Classes
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
              Active learning divisions
            </p>
          </div>

          {/* Total Subjects Card - Purple */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Total Subjects
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                Curriculum
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {totalSubjects}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">mapped</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Assigned across all classes
            </p>
          </div>

          {/* Chapters Tracked Card - Amber */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Chapters Tracked
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                {totalCompleted}/{totalChapters}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {totalChapters}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">total</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              {totalCompleted} chapters completed
            </p>
          </div>

          {/* Avg Syllabus Pace Card - Emerald */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Avg Syllabus Pace
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                {overallAvg}% Passed
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {overallAvg}%
              </span>
              <span className="text-[10px] font-semibold text-emerald-600">completion</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Average across all cohorts
            </p>
          </div>
        </div>

        {/* Search, Filter & Count Bar (Matching Image 1) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="relative w-full max-w-sm">
            <Search className="text-slate-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes by name or section..."
              className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-slate-50/60 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              Showing <strong className="text-slate-800 font-black">{filteredClasses.length}</strong> of {classes.length} Classes
            </span>
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 shadow-2xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="cursor-pointer bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="name">Name</option>
                <option value="progress">Progress</option>
                <option value="chapters">Chapters</option>
              </select>
            </div>
          </div>
        </div>

        {/* Class Cards (Matching Image 1 Card style) */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={search ? 'No classes match your search' : 'No classes assigned yet'}
            description={
              search
                ? 'Try a different search term or clear your search input.'
                : 'Your administrator can assign you classes to track syllabus progress.'
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((cls, i) => {
              const pct = Math.round(cls.progress ?? 0);
              const done = cls.completedChapters ?? 0;
              const total = cls.totalChapters ?? 0;
              const subjects = cls._count?.subjects ?? 0;
              const remaining = Math.max(0, total - done);
              const theme = CARD_THEMES[i % CARD_THEMES.length]!;

              return (
                <div
                  key={cls.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
                >
                  {/* Top Accent Gradient Line */}
                  <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', theme.progressGradient)} />

                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black tracking-tight text-[#0b1c30] truncate group-hover:text-emerald-700 transition-colors">
                            {cls.name}
                          </h3>
                          {cls.section && (
                            <span className="rounded-md bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                              Sec {cls.section}
                            </span>
                          )}
                        </div>
                        {cls.description ? (
                          <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                            {cls.description}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {subjects} subjects allocated
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => router.push(`/teacher/classes/${cls.id}`)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/70 bg-slate-50 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer"
                        title="View Class Details"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 3 Mini Stats Box */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className={cn('flex flex-col items-center justify-center rounded-xl p-2.5 transition-colors border border-slate-100', theme.accentBg)}>
                        <BookOpen className={cn('h-3.5 w-3.5 mb-1', theme.iconColor)} />
                        <span className={cn('text-sm font-black', theme.accentText)}>{subjects}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Subjects</span>
                      </div>
                      <div className={cn('flex flex-col items-center justify-center rounded-xl p-2.5 transition-colors border border-slate-100', theme.accentBg)}>
                        <CheckCircle2 className={cn('h-3.5 w-3.5 mb-1', theme.iconColor)} />
                        <span className={cn('text-sm font-black', theme.accentText)}>{done}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Done</span>
                      </div>
                      <div className={cn('flex flex-col items-center justify-center rounded-xl p-2.5 transition-colors border border-slate-100', theme.accentBg)}>
                        <Target className={cn('h-3.5 w-3.5 mb-1', theme.iconColor)} />
                        <span className={cn('text-sm font-black', theme.accentText)}>{remaining}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Left</span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold text-[11px]">
                          {done} of {total} chapters
                        </span>
                        <span className="font-black text-[#0b1c30] text-xs">{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', theme.progressGradient)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      onClick={() => router.push(`/teacher/classes/${cls.id}`)}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-bold text-emerald-700 border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-100/70 gap-1.5 rounded-xl transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      View Class
                    </Button>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {pct >= 100 ? 'Completed' : `${remaining} to go`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
