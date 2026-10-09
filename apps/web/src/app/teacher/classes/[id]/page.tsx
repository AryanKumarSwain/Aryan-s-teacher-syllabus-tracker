'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ChevronDown, CheckCircle2, Target, Layers, GraduationCap } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { ChapterWorkflowCard } from '@/features/chapters/components/chapter-workflow-card';
import { cn, getTermBadgeStyle } from '@/lib/utils';
import { useRealtimeSync } from '@/lib/realtime-sync';

interface ChapterItem {
  id: string;
  title: string;
  chapterNo?: number;
  termName?: string;
  chapterProgress?: {
    teachingCompleted: boolean;
    qaCompleted: boolean;
    copyChecked: boolean;
    chapterStatus: string;
    completionPercentage: number;
  }[];
}

interface SubjectItem {
  id: string;
  name: string;
  chapters: ChapterItem[];
}

interface ClassDetails {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  overallProgress: number;
  totalChapters: number;
  completedChapters: number;
  subjects: SubjectItem[];
}

export default function TeacherClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  useRealtimeSync([['teacher-class', id], ['teacher-classes']]);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-class', id],
    queryFn: () => api.get<ClassDetails>(`/syllabus/classes/${id}`),
    refetchInterval: 5000,
  });

  const toggleSubject = (subjectId: string) =>
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));

  const pct = Math.round(data?.overallProgress ?? 0);

  return (
    <DashboardShell title={data ? `${data.name} Syllabus` : 'Class Syllabus'}>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : !data ? (
        <EmptyState
          icon={ArrowLeft}
          title="Class not found"
          description="This class doesn't exist or you don't have access."
          action={{ label: 'Back to classes', onClick: () => router.push('/teacher/classes') }}
        />
      ) : (
        <div className="animate-in fade-in space-y-4 pb-8 duration-300">
          {/* Executive Welcome & Status Banner (Matching Image 1 exact UI) */}
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
                      {data.name}
                    </h1>
                    <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Live: Class Syllabus
                    </Badge>
                    {data.section && (
                      <span className="rounded-md bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                        Sec {data.section}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Track and update teaching workflows, topics, and question-answers for this class.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-9 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 shadow-2xs rounded-xl"
                >
                  <Link href="/teacher/classes">
                    <ArrowLeft className="mr-1 h-3.5 w-3.5 text-slate-500" /> Back to Classes
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* 4 Concise Overview KPI Metric Cards (Matching Image 1 UI) */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {/* Card 1 - Blue: Progress */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                  Avg Syllabus Pace
                </span>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                  {pct}% Passed
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#0b1c30]">
                  {pct}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">completion</span>
              </div>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                Overall syllabus completion
              </p>
            </div>

            {/* Card 2 - Emerald: Completed Chapters */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                  Chapters Completed
                </span>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  {data.completedChapters}/{data.totalChapters}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#0b1c30]">
                  {data.completedChapters}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">done</span>
              </div>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                Chapters fully completed
              </p>
            </div>

            {/* Card 3 - Amber: Remaining Chapters */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                  Chapters Tracked
                </span>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                  Pending
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#0b1c30]">
                  {Math.max(0, data.totalChapters - data.completedChapters)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">left</span>
              </div>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                Chapters left in curriculum
              </p>
            </div>

            {/* Card 4 - Purple: Total Subjects */}
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
                  {data.subjects.length}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">mapped</span>
              </div>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                Assigned class subjects
              </p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-slate-900">Syllabus Completion Pace</span>
                <span className="ml-2 text-xs text-slate-500 font-medium">
                  ({data.completedChapters} of {data.totalChapters} chapters complete)
                </span>
              </div>
              <span className="text-sm font-bold text-emerald-600">{pct}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Subjects */}
          {data.subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No syllabus available"
              description="This class doesn't have any subjects or chapters assigned yet."
            />
          ) : (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h2 className="text-base font-bold text-slate-900">Subjects & Chapters</h2>
                <span className="text-xs text-slate-400 font-medium">
                  Click on a subject to expand chapter workflows
                </span>
              </div>
              {data.subjects.map((subject, i) => {
                const isOpen = expandedSubjects[subject.id];
                const subjectCompleted = subject.chapters.filter((c) => {
                  const progress = c.chapterProgress?.[0];
                  if (!progress) return false;
                  return progress.teachingCompleted || progress.qaCompleted;
                }).length;
                const subjectPct =
                  subject.chapters.length > 0
                    ? Math.round((subjectCompleted / subject.chapters.length) * 100)
                    : 0;

                return (
                  <div
                    key={subject.id}
                    className="animate-in fade-in duration-200"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 text-left transition-colors hover:bg-slate-50/60"
                        onClick={() => toggleSubject(subject.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">{subject.name}</h3>
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] sm:text-[11px] font-semibold text-slate-600">
                              {subject.chapters.length} Chapters
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2.5 sm:gap-3 flex-wrap">
                            <div className="relative h-1.5 w-28 sm:w-40 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  subjectPct >= 70
                                    ? 'bg-emerald-500'
                                    : subjectPct >= 40
                                      ? 'bg-blue-500'
                                      : 'bg-amber-500',
                                )}
                                style={{ width: `${subjectPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                              {subjectPct}% completed
                            </span>
                          </div>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-300',
                              isOpen && 'rotate-180 text-emerald-600',
                            )}
                          />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 duration-200">
                          {subject.chapters.map((chapter) => {
                            const status = chapter.chapterProgress?.[0]?.chapterStatus;
                            const term = chapter.termName || (chapter as any).term_name;
                            return (
                              <div
                                key={chapter.id}
                                className={cn(
                                  'rounded-xl border bg-white p-4 shadow-xs transition-all duration-200',
                                  status === 'COMPLETED'
                                    ? 'border-emerald-200 bg-emerald-50/20'
                                    : 'border-slate-200/80',
                                )}
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-900">
                                      {chapter.title}
                                    </h4>
                                    {term && (
                                      <span
                                        className={cn(
                                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                                          getTermBadgeStyle(term),
                                        )}
                                      >
                                        {term}
                                      </span>
                                    )}
                                  </div>
                                  {status === 'COMPLETED' && (
                                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Done
                                    </span>
                                  )}
                                </div>
                                <ChapterWorkflowCard
                                  chapterId={chapter.id}
                                  title={chapter.title}
                                  termName={term}
                                  progress={chapter.chapterProgress?.[0] ?? null}
                                  invalidateQueryKeys={[['teacher-class', id], ['teacher-classes']]}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
