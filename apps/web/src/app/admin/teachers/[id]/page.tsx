'use client';

import { use, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Eye, Activity, Clock, CheckCircle2, RotateCw, Mail, Loader2, KeyRound } from 'lucide-react';
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
import { formatPercent, cn, getTermBadgeStyle } from '@/lib/utils';
import { useRealtimeSync, formatActivityDateTime, formatRelativeTime } from '@/lib/realtime-sync';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { getTeacherColorStyles } from '@/features/teachers/utils/teacher-styles';
import { useResendCredentials } from '@/features/teachers/hooks/use-teachers';
import { ResendCredentialsDialog } from '@/features/teachers/components/resend-credentials-dialog';

interface TeacherActivityLogItem {
  id: string;
  action: string;
  description: string;
  chapterTitle: string;
  chapterNo?: number;
  termName?: string;
  subjectName?: string;
  className?: string;
  teachingCompleted: boolean;
  qaCompleted: boolean;
  copyChecked: boolean;
  chapterStatus: string;
  completionPercentage: number;
  changes: string[];
  userName: string;
  createdAt: string;
}

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
  const { school, isViewMode } = useSchool();
  const [assignOpen, setAssignOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const resendCredentials = useResendCredentials();

  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  useRealtimeSync([['teacher', id], ['teacher-activity-logs', id]]);

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', id, school?.currentAcademicSessionId],
    queryFn: () =>
      api.get<TeacherProfile>(`/teachers/${id}`, {
        ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
      }),
    refetchInterval: 5000,
  });

  const {
    data: activityLogs = [],
    isLoading: logsLoading,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['teacher-activity-logs', id],
    queryFn: () => api.get<TeacherActivityLogItem[]>(`/teachers/${id}/activity-logs`),
    refetchInterval: 5000,
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
    queryKey: syllabusKeys.classesList(schoolId, school?.currentAcademicSessionId),
    queryFn: () =>
      api.getPaginated<{ id: string; name: string }>('/syllabus/classes', {
        page: 1,
        pageSize: 100,
        ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
      }),
    enabled: assignOpen && !isViewMode,
  });

  const classes = classesData?.items ?? [];

  const {
    data: subjects = [],
    isLoading: subjectsLoading,
    isError: subjectsError,
  } = useQuery({
    queryKey: [...syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId), selectedClassIds] as const,
    queryFn: async () => {
      if (selectedClassIds.length === 0) return [];

      const requests = selectedClassIds.map((classId) =>
        api.get<SubjectItem[]>('/syllabus/subjects', {
          classId,
          ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
        }),
      );

      const results = await Promise.all(requests);
      const flatSubjects = results.flat();
      return Array.from(new Map(flatSubjects.map((s) => [s.id, s])).values());
    },
    enabled: assignOpen && selectedClassIds.length > 0 && !isViewMode,
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
      if (isViewMode) {
        throw new Error('Cannot add assignments in View Mode');
      }
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
        targets.map((payload) =>
          api.post(`/teachers/${id}/assignments`, {
            ...payload,
            ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
          }),
        ),
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
    mutationFn: (assignmentId: string) => {
      if (isViewMode) {
        throw new Error('Cannot delete assignment in View Mode');
      }
      return api.delete(`/teachers/${id}/assignments/${assignmentId}`);
    },
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
            {!isViewMode && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200/80 font-semibold"
                onClick={() => setCredentialsDialogOpen(true)}
              >
                <KeyRound className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Resend credentials
              </Button>
            )}
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
            {!isViewMode ? (
              <Button onClick={() => setAssignOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            ) : (
              <span className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs">
                <Eye className="h-3.5 w-3.5 text-amber-600" /> Read-Only View Mode
              </span>
            )}
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
                    {!isViewMode && (
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teacher Activity Log Card */}
        <Card className="lg:col-span-3 overflow-hidden border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Teacher Activity Log</CardTitle>
                <p className="text-muted-foreground text-xs">
                  Real-time timeline of syllabus updates, teaching steps, and chapter completions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Live Updates
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLogs()}
                disabled={logsFetching}
                className="h-8 gap-1.5 text-xs"
              >
                <RotateCw className={cn('h-3.5 w-3.5', logsFetching && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {logsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-blue-50 p-3 text-blue-500">
                  <Clock className="h-6 w-6" />
                </div>
                <h4 className="mt-3 text-sm font-semibold">No activity recorded yet</h4>
                <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                  When this teacher updates chapters, marks teaching, Q&amp;A, or copy checking on the portal, activity will appear here with live timestamps.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 before:absolute before:bottom-3 before:left-2.5 before:top-3 before:w-[2px] before:bg-slate-200">
                <div className="space-y-4">
                  {activityLogs.map((log, idx) => {
                    const isDone = log.chapterStatus === 'COMPLETED';
                    return (
                      <div key={log.id || idx} className="relative group">
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            'absolute -left-6 top-2 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs transition-transform group-hover:scale-125',
                            isDone
                              ? 'bg-emerald-500 ring-2 ring-emerald-100'
                              : 'bg-blue-500 ring-2 ring-blue-100',
                          )}
                        />

                        {/* Activity Card */}
                        <div className="rounded-xl border bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">
                                  {log.chapterTitle}
                                </span>
                                {log.termName && (
                                  <span
                                    className={cn(
                                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                                      getTermBadgeStyle(log.termName),
                                    )}
                                  >
                                    {log.termName}
                                  </span>
                                )}
                                {(log.subjectName || log.className) && (
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                    {[log.subjectName, log.className].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 font-medium">
                                {log.description}
                              </p>
                            </div>

                            {/* Timestamp */}
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                <Clock className="h-3 w-3 text-slate-500" />
                                {formatRelativeTime(log.createdAt)}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatActivityDateTime(log.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Steps badges */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                                  log.teachingCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border border-slate-200',
                                )}
                              >
                                {log.teachingCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                                Teaching
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                                  log.qaCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border border-slate-200',
                                )}
                              >
                                {log.qaCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                                Q&amp;A
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                                  log.copyChecked
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border border-slate-200',
                                )}
                              >
                                {log.copyChecked && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                                Copy Checked
                              </span>
                            </div>

                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800',
                              )}
                            >
                              {isDone ? '✓ Chapter Completed' : `${log.completionPercentage}% Done`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
            <DialogTitle>Add</DialogTitle>
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
                      className={`rounded-md border px-3 py-1 text-sm font-medium transition-all ${isSelected
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
                        className={`rounded-md border px-3 py-1 text-sm font-medium transition-all ${isSelected
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

      <ResendCredentialsDialog
        open={credentialsDialogOpen}
        onOpenChange={setCredentialsDialogOpen}
        teacher={
          teacher
            ? {
                id: teacher.id,
                name: teacher.user.name,
                email: teacher.user.email,
              }
            : null
        }
      />
    </DashboardShell>
  );
}
