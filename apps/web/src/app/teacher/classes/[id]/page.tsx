'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ChevronDown, CheckCircle2, Target, Layers, GraduationCap } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <DashboardShell>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-28 rounded-2xl" />
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
        <div className="animate-in fade-in space-y-6 duration-300">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200">
                  <GraduationCap className="h-3 w-3" /> Class Syllabus
                </span>
                {data.grade && (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    Grade {data.grade}
                  </span>
                )}
                {data.section && (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    Section {data.section}
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {data.name}
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                Track and update teaching workflows, topics, and question-answers for this class.
              </p>
            </div>
            <Button
              variant="outline"
              asChild
              className="w-fit rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
            >
              <Link href="/teacher/classes">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Classes
              </Link>
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Overall Progress',
                value: `${pct}%`,
                color: 'text-blue-700',
                bg: 'bg-blue-50/70 border-blue-100',
                icon: Target,
              },
              {
                label: 'Completed Chapters',
                value: data.completedChapters,
                color: 'text-emerald-700',
                bg: 'bg-emerald-50/70 border-emerald-100',
                icon: CheckCircle2,
              },
              {
                label: 'Remaining Chapters',
                value: data.totalChapters - data.completedChapters,
                color: 'text-amber-700',
                bg: 'bg-amber-50/70 border-amber-100',
                icon: Layers,
              },
              {
                label: 'Total Subjects',
                value: data.subjects.length,
                color: 'text-purple-700',
                bg: 'bg-purple-50/70 border-purple-100',
                icon: BookOpen,
              },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className={cn('rounded-2xl border p-4 bg-white shadow-xs', bg)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className={cn('mt-0.5 text-2xl font-black tracking-tight', color)}>{value}</p>
                  </div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-xs', color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall progress bar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-slate-900">Syllabus Completion Pace</span>
                <span className="ml-2 text-xs text-slate-500 font-medium">
                  ({data.completedChapters} of {data.totalChapters} chapters complete)
                </span>
              </div>
              <span className="text-sm font-black text-blue-600">{pct}%</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700"
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
              <div className="flex items-center justify-between">
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
                    <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:border-slate-300">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/60"
                        onClick={() => toggleSubject(subject.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{subject.name}</h3>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {subject.chapters.length} Chapters
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="relative h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
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
                              isOpen && 'rotate-180 text-blue-600',
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
