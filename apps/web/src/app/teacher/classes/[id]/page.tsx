'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ChevronDown, CheckCircle2, Target, Layers } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { ChapterWorkflowCard } from '@/features/chapters/components/chapter-workflow-card';
import { cn } from '@/lib/utils';

interface ChapterItem {
  id: string;
  title: string;
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

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-class', id],
    queryFn: () => api.get<ClassDetails>(`/syllabus/classes/${id}`),
  });

  const toggleSubject = (subjectId: string) =>
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));

  const pct = Math.round(data?.overallProgress ?? 0);

  return (
    <DashboardShell title={data?.name ?? 'Class Syllabus'}>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                Assigned Class
              </p>
              <h1 className="text-2xl font-bold">{data.name}</h1>
              {(data.grade || data.section) && (
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {data.grade && `Grade ${data.grade}`}
                  {data.grade && data.section && ' · '}
                  {data.section && `Section ${data.section}`}
                </p>
              )}
            </div>
            <Button variant="outline" asChild className="w-fit">
              <Link href="/teacher/classes">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Overall Progress',
                value: `${pct}%`,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                icon: Target,
              },
              {
                label: 'Completed',
                value: data.completedChapters,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                icon: CheckCircle2,
              },
              {
                label: 'Remaining',
                value: data.totalChapters - data.completedChapters,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                icon: Layers,
              },
              {
                label: 'Subjects',
                value: data.subjects.length,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                icon: BookOpen,
              },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <Card key={label} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2', bg)}>
                      <Icon className={cn('h-4 w-4', color)} />
                    </div>
                    <div>
                      <div className={cn('text-xl font-bold', color)}>{value}</div>
                      <div className="text-muted-foreground text-[11px]">{label}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall progress bar */}
          <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold text-blue-900">Chapter Completion</span>
              <span className="font-bold text-blue-700">
                {data.completedChapters} / {data.totalChapters}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs">{pct}% complete</p>
          </div>

          {/* Subjects */}
          {data.subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No syllabus available"
              description="This class doesn't have any syllabus assigned yet."
            />
          ) : (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Subjects & Chapters</h2>
              {data.subjects.map((subject, i) => {
                const isOpen = expandedSubjects[subject.id];
                const subjectCompleted = subject.chapters.filter((c) => {
                  const progress = c.chapterProgress?.[0];
                  if (!progress) return false;
                  // Count as completed if teaching OR Q/A is done
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
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <Card className="overflow-hidden border transition-all duration-300 hover:shadow-md">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        onClick={() => toggleSubject(subject.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold">{subject.name}</h3>
                          <div className="mt-1 flex items-center gap-3">
                            <span className="text-muted-foreground text-xs">
                              {subject.chapters.length} chapters
                            </span>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-xs font-medium text-blue-600">
                              {subjectPct}% done
                            </span>
                          </div>
                          {/* Mini progress */}
                          <div className="relative mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
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
                        </div>
                        <ChevronDown
                          className={cn(
                            'text-muted-foreground h-4 w-4 flex-shrink-0 transition-transform duration-300',
                            isOpen && 'rotate-180',
                          )}
                        />
                      </button>

                      {isOpen && (
                        <div className="animate-in slide-in-from-top-2 space-y-3 border-t bg-gray-50/50 px-5 pb-5 pt-4 duration-200">
                          {subject.chapters.map((chapter) => {
                            const status = chapter.chapterProgress?.[0]?.chapterStatus;
                            return (
                              <div
                                key={chapter.id}
                                className={cn(
                                  'rounded-xl border bg-white p-4 shadow-sm transition-all duration-200',
                                  status === 'COMPLETED' && 'border-emerald-200 bg-emerald-50/30',
                                )}
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <h4 className="text-sm font-medium">{chapter.title}</h4>
                                  {status === 'COMPLETED' && (
                                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      <CheckCircle2 className="h-3 w-3" /> Done
                                    </span>
                                  )}
                                </div>
                                <ChapterWorkflowCard
                                  chapterId={chapter.id}
                                  title={chapter.title}
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
