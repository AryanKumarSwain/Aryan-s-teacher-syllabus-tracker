'use client';

import { useState, use, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  GraduationCap,
  Plus,
  BookOpen,
  Users,
  CheckCircle2,
  Target,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api, ApiError } from '@/services/api-client';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { cn } from '@/lib/utils';

interface ClassSubject {
  id: string;
  name: string;
  code?: string | null;
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
  _count: { chapters: number };
  teachers: { id: string; user: { name: string } }[];
}

interface ClassDetails {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  description: string | null;
  overallProgress: number;
  totalChapters: number;
  completedChapters: number;
  subjects: ClassSubject[];
  assignedTeachers: { id: string; name: string; email: string; subject: string | null }[];
}

interface SubjectForAssignment {
  id: string;
  name: string;
  code?: string | null;
}

function getBarColor(pct: number) {
  if (pct >= 70) return 'from-emerald-400 to-emerald-600';
  if (pct >= 40) return 'from-blue-400 to-indigo-500';
  return 'from-amber-400 to-orange-500';
}

export default function AdminClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  const { school } = useSchool();
  const [addSubjectDialogOpen, setAddSubjectDialogOpen] = useState(false);
  const [selectedSubjectIdForAssign, setSelectedSubjectIdForAssign] = useState<string | null>(null);

  const classQueryKey = syllabusKeys.class(schoolId, id, school?.currentAcademicSessionId);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: classQueryKey,
    queryFn: () => api.get<ClassDetails>(`/syllabus/classes/${id}`),
    enabled: Boolean(schoolId && id),
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: syllabusKeys.subjectsForAssignment(schoolId, id, school?.currentAcademicSessionId),
    queryFn: () => api.get<SubjectForAssignment[]>('/syllabus/subjects', { 
      classId: id,
      ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
    }),
    enabled: Boolean(schoolId && addSubjectDialogOpen),
  });

  const assignSubjectMutation = useMutation({
    mutationFn: (subjectId: string) =>
      api.patch(`/syllabus/subjects/${subjectId}`, { classId: id }),
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      await queryClient.refetchQueries({ queryKey: classQueryKey });
      toast.success('Subject assigned');
      setAddSubjectDialogOpen(false);
      setSelectedSubjectIdForAssign(null);
    },
    onError: () => toast.error('Failed to assign subject'),
  });

  useEffect(() => {
    if (!id) router.push('/admin/classes');
  }, [id, router]);

  if (isLoading) {
    return (
      <DashboardShell title="Class Details">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (isError || !data) {
    const message = error instanceof ApiError ? error.message : 'Failed to load class';
    return (
      <DashboardShell title="Class Details">
        <EmptyState
          icon={ArrowLeft}
          title="Could not load class"
          description={message}
          action={{
            label: isError ? 'Retry' : 'Back to classes',
            onClick: () => (isError ? refetch() : router.push('/admin/classes')),
          }}
        />
      </DashboardShell>
    );
  }

  const pct = Math.round(data.overallProgress);

  return (
    <DashboardShell title={data.name}>
      <div className="animate-in fade-in space-y-6 duration-300">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Class Overview
            </p>
            <h2 className="text-2xl font-bold">{data.name}</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {data.grade && `Grade ${data.grade}`}
              {data.grade && data.section && ' · '}
              {data.section && `Section ${data.section}`}
            </p>
            {data.description && (
              <p className="text-muted-foreground mt-1 max-w-xl text-xs">{data.description}</p>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/classes')} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Overall Progress',
              value: `${pct}%`,
              icon: Target,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              label: 'Completed',
              value: data.completedChapters,
              icon: CheckCircle2,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              label: 'Remaining',
              value: data.totalChapters - data.completedChapters,
              icon: Layers,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
            {
              label: 'Teachers',
              value: data.assignedTeachers.length,
              icon: Users,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
            },
          ].map(({ label, value, icon: Icon, color, bg }, i) => (
            <div
              key={label}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card className="border shadow-sm transition-shadow duration-300 hover:shadow-md">
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
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="animate-in fade-in rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-4 duration-300">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold text-blue-900">Chapter Completion</span>
            <span className="font-bold text-blue-700">
              {data.completedChapters} / {data.totalChapters}
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r transition-all duration-700',
                getBarColor(pct),
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">{pct}% complete</p>
        </div>

        {/* Teachers */}
        <Card className="border transition-shadow duration-300 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-purple-50 p-1.5">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              Assigned Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.assignedTeachers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No teachers assigned yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.assignedTeachers.map((teacher, i) => (
                  <div
                    key={teacher.id}
                    className="animate-in fade-in flex items-start gap-3 rounded-lg border bg-purple-50/30 p-3 duration-200"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{teacher.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{teacher.email}</p>
                      {teacher.subject && (
                        <Badge className="mt-1 border-none bg-purple-100 text-[10px] text-purple-700">
                          {teacher.subject}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subjects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Subjects</h3>
              <p className="text-muted-foreground text-xs">
                Chapter counts, progress and assigned teachers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="border-none bg-blue-100 text-blue-700">
                {data.subjects.length} subjects
              </Badge>
              <Button size="sm" onClick={() => setAddSubjectDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Subject
              </Button>
            </div>
          </div>

          {data.subjects.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No subjects yet"
              description="Add subjects to start tracking progress."
              action={{ label: 'Add Subject', onClick: () => setAddSubjectDialogOpen(true) }}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.subjects.map((subject, i) => {
                const sPct = Math.round(subject.progressPercentage);
                return (
                  <div
                    key={subject.id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <Card className="border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="line-clamp-1 text-base">{subject.name}</CardTitle>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {subject._count.chapters} chapters · {subject.teachers.length} teacher
                              {subject.teachers.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          {subject.teachers[0] && (
                            <Badge className="flex-shrink-0 border-none bg-blue-100 text-[11px] text-blue-700">
                              {subject.teachers[0].user.name}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {subject.completedChapters} of {subject.totalChapters} chapters
                            </span>
                            <span
                              className={cn(
                                'font-bold',
                                sPct >= 70
                                  ? 'text-emerald-600'
                                  : sPct >= 40
                                    ? 'text-blue-600'
                                    : 'text-amber-600',
                              )}
                            >
                              {sPct}%
                            </span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={cn(
                                'h-full rounded-full bg-gradient-to-r transition-all duration-700',
                                getBarColor(sPct),
                              )}
                              style={{ width: `${sPct}%` }}
                            />
                          </div>
                        </div>
                        {subject.teachers.length > 1 && (
                          <div className="flex flex-wrap gap-1">
                            {subject.teachers.slice(1).map((t) => (
                              <Badge
                                key={t.id}
                                className="border-none bg-gray-100 text-[10px] text-gray-600"
                              >
                                {t.user.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Subject Dialog */}
      <Dialog open={addSubjectDialogOpen} onOpenChange={setAddSubjectDialogOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
            <DialogTitle>Add Subject to {data.name}</DialogTitle>
            <DialogDescription>Select a subject to assign to this class.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
            {allSubjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">No subjects available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubjectIdForAssign(subject.id)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150',
                      selectedSubjectIdForAssign === subject.id
                        ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                    )}
                  >
                    {subject.name}
                    {subject.code && (
                      <span className="ml-1.5 text-xs opacity-75">({subject.code})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setAddSubjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedSubjectIdForAssign) {
                  toast.error('Select a subject');
                  return;
                }
                assignSubjectMutation.mutate(selectedSubjectIdForAssign);
              }}
              disabled={assignSubjectMutation.isPending}
            >
              Assign Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
