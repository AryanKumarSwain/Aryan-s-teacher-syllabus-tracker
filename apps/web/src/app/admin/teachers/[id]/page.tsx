'use client';

import { use, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, ApiError } from '@/services/api-client';
import { formatPercent, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { getTeacherColorStyles } from '../page';

interface TeacherProfile {
  id: string;
  user: { name: string; email: string; phone: string | null };
  teacherClasses: {
    id: string;
    class: { id: string; name: string };
    subject: { id: string; name: string } | null;
  }[];
  chapterProgress: { chapterStatus: string; chapter: { title: string } }[];
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
}

interface SubjectItem {
  id: string;
  name: string;
  classId: string | null;
}

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const schoolId = useSchoolId();
  const [assignOpen, setAssignOpen] = useState(false);

  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => api.get<TeacherProfile>(`/teachers/${id}`),
  });

  const completed = teacher?.completedChapters ?? 0;
  const total = teacher?.totalChapters ?? 0;
  const progress = teacher?.progressPercentage ?? 0;

  const theme = useMemo(() => (teacher ? getTeacherColorStyles(teacher.id) : null), [teacher]);

  const {
    data: classesData,
    isLoading: classesLoading,
    isError: classesError,
    error: classesQueryError,
  } = useQuery({
    queryKey: syllabusKeys.classesList(schoolId),
    queryFn: () =>
      api.getPaginated<{ id: string; name: string }>('/syllabus/classes', {
        page: 1,
        pageSize: 100,
      }),
    enabled: assignOpen,
  });

  const classes = classesData?.items ?? [];

  const {
    data: subjects = [],
    isLoading: subjectsLoading,
    isError: subjectsError,
  } = useQuery({
    queryKey: [...syllabusKeys.subjects(schoolId), selectedClassIds] as const,
    queryFn: async () => {
      if (selectedClassIds.length === 0) return [];

      const requests = selectedClassIds.map((classId) =>
        api.get<SubjectItem[]>('/syllabus/subjects', { classId }),
      );

      const results = await Promise.all(requests);
      const flatSubjects = results.flat();
      return Array.from(new Map(flatSubjects.map((s) => [s.id, s])).values());
    },
    enabled: assignOpen && selectedClassIds.length > 0,
  });

  const assignmentCards = useMemo(() => {
    const list = teacher?.teacherClasses ?? [];
    return list
      .filter((a) => a.subject !== null)
      .map((a) => ({
        id: a.id,
        label: `${a.subject!.name} · ${a.class.name}`,
      }));
  }, [teacher]);

  const addAssignments = useMutation({
    mutationFn: async () => {
      const targets: { classId: string; subjectId: string }[] = [];

      selectedClassIds.forEach((classId) => {
        const classSubjects = subjects.filter(
          (s) => s.classId === classId && selectedSubjectIds.includes(s.id),
        );
        classSubjects.forEach((sub) => {
          targets.push({ classId, subjectId: sub.id });
        });
      });

      if (targets.length === 0) {
        throw new Error('No matching class-subject pairings found.');
      }

      return Promise.all(
        targets.map((payload) => api.post(`/teachers/${id}/assignments`, payload)),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', id] });
      toast.success('Assignments added successfully');
      setSelectedClassIds([]);
      setSelectedSubjectIds([]);
      setAssignOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAssignment = useMutation({
    mutationFn: (assignmentId: string) => api.delete(`/teachers/${id}/assignments/${assignmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', id] });
      toast.success('Assignment removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) => {
      const isSelected = prev.includes(classId);
      const nextClasses = isSelected ? prev.filter((id) => id !== classId) : [...prev, classId];

      if (isSelected) {
        setSelectedSubjectIds((prevSubIds) =>
          prevSubIds.filter((subId) => {
            const matchSub = subjects.find((s) => s.id === subId);
            return matchSub ? matchSub.classId !== classId : true;
          }),
        );
      }
      return nextClasses;
    });
  };

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
    );
  };

  if (isLoading) {
    return (
      <DashboardShell title="Teacher profile">
        <Skeleton className="h-64 w-full" />
      </DashboardShell>
    );
  }

  if (!teacher || !theme) {
    return (
      <DashboardShell title="Teacher profile">
        <p className="text-muted-foreground">Teacher not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={teacher.user.name}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Color Accent Infused Profile Card */}
        <Card className={cn('border-t-4 lg:col-span-1', theme.border.replace('hover:', ''))}>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-foreground font-medium">{teacher.user.email}</p>
            {teacher.user.phone && <p className="text-muted-foreground">{teacher.user.phone}</p>}
            <p className="text-muted-foreground border-t pt-2 text-xs">
              Assignments are managed below.
            </p>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Chapter completion</span>
                <span className="font-semibold">{formatPercent(progress)}</span>
              </div>
              <Progress value={progress} />
            </div>
            <p className="text-muted-foreground text-sm">
              {completed} of {total} chapters completed · {total - completed} pending
            </p>
          </CardContent>
        </Card>

        {/* Assignments Display Card with uniquely colored tags */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subject assignments</CardTitle>
            <Button onClick={() => setAssignOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add assignment
            </Button>
          </CardHeader>
          <CardContent>
            {assignmentCards.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No subject assignments yet. Add class + subject pairings.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assignmentCards.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      'bg-card flex items-center justify-between rounded-lg border p-3 transition-all',
                      theme.border,
                    )}
                  >
                    <span className="text-sm font-semibold">{a.label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAssignment.mutate(a.id)}
                      disabled={deleteAssignment.isPending}
                      className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive h-8 w-8 rounded-md"
                      aria-label="Remove assignment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Multi-Selection Dialog */}
      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) {
            setSelectedClassIds([]);
            setSelectedSubjectIds([]);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add assignment</DialogTitle>
            <DialogDescription>
              Assign multiple subjects and classes simultaneously for this teacher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Classes ({selectedClassIds.length} selected)</p>
              {classesLoading && <p className="text-muted-foreground text-sm">Loading classes…</p>}
              {classesError && (
                <p className="text-destructive text-sm">
                  {classesQueryError instanceof ApiError
                    ? classesQueryError.message
                    : 'Failed to load classes'}
                </p>
              )}
              {!classesLoading && !classesError && classes.length === 0 && (
                <p className="text-muted-foreground text-sm">No classes found.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {classes.map((c) => {
                  const isSelected = selectedClassIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleToggleClass(c.id)}
                      className={`rounded-md border px-3 py-1 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'hover:border-muted-foreground bg-background'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Subjects ({selectedSubjectIds.length} selected)</p>
              {subjectsLoading && selectedClassIds.length > 0 && (
                <p className="text-muted-foreground text-sm">Loading subjects…</p>
              )}
              {subjectsError && (
                <p className="text-destructive text-sm">
                  Failed to load subjects for selection configurations.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {selectedClassIds.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Select one or more classes to load subjects.
                  </p>
                ) : !subjectsLoading && subjects.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No matching subjects linked to selection classes.
                  </p>
                ) : (
                  subjects.map((s) => {
                    const isSelected = selectedSubjectIds.includes(s.id);
                    const parentClassName = classes.find((c) => c.id === s.classId)?.name || '';
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleSubject(s.id)}
                        className={`rounded-md border px-3 py-1 text-sm font-medium transition-all ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'hover:border-muted-foreground bg-background'
                        }`}
                      >
                        {s.name}{' '}
                        <span className="text-xs font-normal opacity-60">({parentClassName})</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <Button
              className="mt-2 w-full"
              onClick={() => addAssignments.mutate()}
              disabled={
                selectedClassIds.length === 0 ||
                selectedSubjectIds.length === 0 ||
                addAssignments.isPending
              }
            >
              {addAssignments.isPending ? 'Adding assignments...' : 'Add assignments'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
