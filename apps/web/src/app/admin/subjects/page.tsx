'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  BookMarked,
  Trash2,
  Plus,
  Pencil,
  Search,
  MoreVertical,
  Loader2,
  Eye,
  Users,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  BookOpen,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Layers,
  FileCheck,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useSchool } from '@/features/syllabus/hooks/use-school';

interface AssignedTeacher {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  user?: {
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
  };
}

interface ChapterDetail {
  id: string;
  title: string;
  chapterNo?: number | null;
  termName?: string | null;
  estimatedTeachingDays?: number | null;
  topicsCount?: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  completionPercentage: number;
  teachingCompleted: boolean;
  qaCompleted: boolean;
  copyChecked: boolean;
  completedByTeacher?: string | null;
}

interface SubjectProgress {
  totalChapters: number;
  completedChapters: number;
  inProgressChapters: number;
  pendingChapters: number;
  percentage: number;
  teachingCompletedCount: number;
  qaCompletedCount: number;
  copyCheckedCount: number;
}

interface Subject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  class?: { id: string; name: string } | null;
  classId?: string | null;
  teachers?: AssignedTeacher[];
  progress?: SubjectProgress;
  totalChapters?: number;
  completedChapters?: number;
  inProgressChapters?: number;
  pendingChapters?: number;
  progressPercentage?: number;
  chapters?: ChapterDetail[];
  _count?: { chapters: number; teacherClasses: number };
}

interface ClassOption {
  id: string;
  name: string;
}

function getClassColorStyles(className?: string | null) {
  const fallbacks = {
    card: 'bg-card border-border/60 dark:bg-card/40 dark:border-border/30',
    badge: 'bg-muted text-muted-foreground border-transparent',
    accent: 'bg-primary/10 text-primary',
  };

  if (!className) return fallbacks;

  const variations = [
    {
      card: 'bg-blue-50/30 border-blue-100/80 dark:bg-blue-950/5 dark:border-blue-900/30',
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/40',
      accent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    },
    {
      card: 'bg-emerald-50/30 border-emerald-100/80 dark:bg-emerald-950/5 dark:border-emerald-900/30',
      badge:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/40',
      accent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    },
    {
      card: 'bg-purple-50/30 border-purple-100/80 dark:bg-purple-950/5 dark:border-purple-900/30',
      badge:
        'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200/40',
      accent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
    },
    {
      card: 'bg-amber-50/30 border-amber-100/80 dark:bg-amber-950/5 dark:border-amber-900/30',
      badge:
        'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/40',
      accent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    },
    {
      card: 'bg-rose-50/30 border-rose-100/80 dark:bg-rose-950/5 dark:border-rose-900/30',
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200/40',
      accent: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
    },
  ];

  let calculatedHash = 0;
  for (let idx = 0; idx < className.length; idx++) {
    calculatedHash = className.charCodeAt(idx) + ((calculatedHash << 5) - calculatedHash);
  }
  const selectionIndex = Math.abs(calculatedHash) % variations.length;
  return variations[selectionIndex];
}

export default function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  const { school, isViewMode } = useSchool();

  // Dialog State for Create / Edit
  const [open, setOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');

  // Detail Modal State (Card Click)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');
  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  // Queries
  const { data, isLoading, isFetching } = useQuery({
    queryKey: syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId),
    queryFn: () =>
      api.get<Subject[]>(
        '/syllabus/subjects',
        school?.currentAcademicSessionId
          ? { academicSessionId: school.currentAcademicSessionId }
          : undefined,
      ),
    enabled: Boolean(schoolId),
  });

  const { data: classesData } = useQuery({
    queryKey: syllabusKeys.classesList(schoolId, school?.currentAcademicSessionId),
    queryFn: () =>
      api.getPaginated<ClassOption>('/syllabus/classes', {
        page: 1,
        pageSize: 100,
        ...(school?.currentAcademicSessionId && {
          academicSessionId: school.currentAcademicSessionId,
        }),
      }),
    enabled: Boolean(schoolId),
  });

  const classes = classesData?.items ?? [];
  const subjects = useMemo(() => data ?? [], [data]);

  // Fetch full detailed chapter breakdown on-demand when a card is clicked
  const { data: subjectDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['subject-detail', schoolId, school?.currentAcademicSessionId, selectedSubject?.id],
    queryFn: () =>
      api.get<Subject>(
        `/syllabus/subjects/${selectedSubject?.id}`,
        school?.currentAcademicSessionId
          ? { academicSessionId: school.currentAcademicSessionId }
          : undefined,
      ),
    enabled: Boolean(schoolId && selectedSubject?.id),
    staleTime: 60000,
  });

  // Keep selectedSubject in sync with fresh data and detail response
  const activeSubject = useMemo(() => {
    if (!selectedSubject) return null;
    const base = subjects.find((s) => s.id === selectedSubject.id) || selectedSubject;
    if (subjectDetail && subjectDetail.id === base.id) {
      return { ...base, ...subjectDetail };
    }
    return base;
  }, [subjects, selectedSubject, subjectDetail]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch =
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (subject.code && subject.code.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesClass =
        selectedClassFilter === 'all' || subject.class?.id === selectedClassFilter;

      return matchesSearch && matchesClass;
    });
  }, [subjects, searchQuery, selectedClassFilter]);

  // Extract unique terms for the active subject in the detail modal
  const termsList = useMemo(() => {
    if (!activeSubject?.chapters) return [];
    const set = new Set<string>();
    activeSubject.chapters.forEach((ch) => {
      if (ch.termName) set.add(ch.termName);
    });
    return Array.from(set);
  }, [activeSubject]);

  // Filter chapters inside the detail modal
  const modalFilteredChapters = useMemo(() => {
    if (!activeSubject?.chapters) return [];
    return activeSubject.chapters.filter((ch) => {
      const matchesTerm = selectedTermFilter === 'all' || ch.termName === selectedTermFilter;
      const matchesQuery =
        !chapterSearchQuery.trim() ||
        ch.title.toLowerCase().includes(chapterSearchQuery.toLowerCase()) ||
        (ch.chapterNo !== null &&
          ch.chapterNo !== undefined &&
          ch.chapterNo.toString().includes(chapterSearchQuery));
      return matchesTerm && matchesQuery;
    });
  }, [activeSubject, selectedTermFilter, chapterSearchQuery]);

  const handleCreateClick = () => {
    if (isViewMode) {
      toast.error('Cannot create subject in View Mode');
      return;
    }
    setEditingSubject(null);
    setName('');
    setCode('');
    setDescription('');
    setClassId('');
    setOpen(true);
  };

  const handleEditClick = (subject: Subject) => {
    if (isViewMode) {
      toast.error('Cannot edit subject in View Mode');
      return;
    }
    setEditingSubject(subject);
    setName(subject.name);
    setCode(subject.code || '');
    setDescription(subject.description || '');
    setClassId(subject.class?.id || '');
    setOpen(true);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      if (isViewMode) {
        throw new Error(
          'Cannot create subject in View Mode. Switch to active session to make changes.',
        );
      }
      if (!school?.currentAcademicSessionId) {
        throw new Error('No active academic session found. Please create or select a session first.');
      }
      return api.post<Subject>('/syllabus/subjects', {
        academicSessionId: school.currentAcademicSessionId,
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        classId: classId || undefined,
      });
    },
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      await queryClient.invalidateQueries({
        queryKey: syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId),
      });
      toast.success('Subject created successfully');
      setOpen(false);
    },
    onError: (err: unknown) =>
      toast.error((err as Error)?.message || 'Failed to create subject'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => {
      if (isViewMode) {
        throw new Error(
          'Cannot edit subject in View Mode. Switch to active session to make changes.',
        );
      }
      return api.patch<Subject>(`/syllabus/subjects/${id}`, {
        academicSessionId: school?.currentAcademicSessionId,
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        classId: classId || undefined,
      });
    },
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      await queryClient.invalidateQueries({
        queryKey: syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId),
      });
      toast.success('Subject updated successfully');
      setOpen(false);
    },
    onError: (err: unknown) =>
      toast.error((err as Error)?.message || 'Failed to update subject'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (isViewMode) {
        throw new Error(
          'Cannot delete subject in View Mode. Switch to active session to make changes.',
        );
      }
      return api.delete(`/syllabus/subjects/${id}`);
    },
    onSuccess: async (_, deletedId) => {
      if (selectedSubject?.id === deletedId) {
        setSelectedSubject(null);
      }
      queryClient.setQueryData<Subject[]>(
        syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId),
        (old) => (old ? old.filter((s) => s.id !== deletedId) : old),
      );
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      toast.success('Subject deleted successfully');
    },
    onError: (err: unknown) =>
      toast.error((err as Error)?.message || 'Failed to delete subject'),
  });

  const handleSubmit = () => {
    if (!name.trim()) return toast.error('Name is required');
    if (!classId) return toast.error('Please select a class');

    if (editingSubject) {
      updateMutation.mutate(editingSubject.id);
    } else {
      createMutation.mutate();
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardShell title="Subjects">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Create, track, and monitor academic subjects, syllabus completion progress, and assigned
            teachers.
          </p>
        </div>
      </div>

      {/* Control Utility Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Custom Styled Native Select */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 sm:w-[180px]"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {!isViewMode ? (
            <Button onClick={handleCreateClick} className="shrink-0 shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Add subject
            </Button>
          ) : (
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs">
              <Eye className="h-3.5 w-3.5 text-amber-600" /> Read-Only View Mode
            </span>
          )}
        </div>
      </div>

      {isLoading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredSubjects.length === 0 && !isFetching ? (
        <EmptyState
          icon={BookMarked}
          title="No subjects found"
          description={
            searchQuery || selectedClassFilter !== 'all'
              ? 'Try adjusting your search query or class filter.'
              : 'Add academic subjects to initiate school syllabus mappings.'
          }
          action={
            searchQuery || selectedClassFilter !== 'all' || isViewMode
              ? undefined
              : { label: 'Add subject', onClick: handleCreateClick }
          }
        />
      ) : (
        /* Grid Container */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((s, i) => {
            const activeTheme = getClassColorStyles(s.class?.name) || {
              card: 'bg-card border-border/60 dark:bg-card/40 dark:border-border/30',
              badge: 'bg-muted text-muted-foreground border-transparent',
              accent: 'bg-primary/10 text-primary',
            };

            const progressPct = s.progressPercentage ?? s.progress?.percentage ?? 0;
            const completedCh = s.completedChapters ?? s.progress?.completedChapters ?? 0;
            const totalCh =
              s.totalChapters ?? s.progress?.totalChapters ?? s._count?.chapters ?? 0;
            const teachersList = s.teachers ?? [];

            return (
              <Card
                key={s.id}
                onClick={() => {
                  setSelectedSubject(s);
                  setSelectedTermFilter('all');
                  setChapterSearchQuery('');
                }}
                className={cn(
                  'group relative flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border',
                  'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activeTheme.card,
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1 pr-2 flex-1 min-w-0">
                      <CardTitle className="text-foreground line-clamp-1 text-base font-semibold tracking-tight group-hover:text-primary transition-colors">
                        {s.name}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {s.code && (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider bg-background/60"
                          >
                            {s.code}
                          </Badge>
                        )}
                        {s.class && (
                          <Badge
                            variant="outline"
                            className={cn('text-[11px] font-medium', activeTheme.badge)}
                          >
                            {s.class.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {!isViewMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="hover:bg-muted/80 h-8 w-8 p-0 text-muted-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(s);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={deleteMutation.isPending}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this subject permanently?')) {
                                  deleteMutation.mutate(s.id);
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3.5 pt-1">
                    {s.description && (
                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {s.description}
                      </p>
                    )}

                    {/* Progress Bar & Status */}
                    <div className="space-y-1.5 rounded-lg bg-background/50 p-2.5 border border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                          <BarChart3 className="h-3.5 w-3.5 text-primary" />
                          Syllabus Progress
                        </span>
                        <span
                          className={cn(
                            'font-semibold text-xs tabular-nums',
                            progressPct === 100
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : progressPct > 0
                                ? 'text-primary'
                                : 'text-muted-foreground',
                          )}
                        >
                          {progressPct}%
                        </span>
                      </div>

                      <Progress
                        value={progressPct}
                        className={cn(
                          'h-1.5 bg-muted/60',
                          progressPct === 100 && '[&>div]:bg-emerald-600',
                        )}
                      />

                      <div className="flex items-center justify-between pt-0.5 text-[11px]">
                        <span className="text-muted-foreground">
                          {completedCh}/{totalCh} chapters completed
                        </span>
                        {progressPct === 100 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </span>
                        ) : progressPct > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                            <Clock className="h-3 w-3" /> In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Circle className="h-2.5 w-2.5" /> Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assigned Teacher & Quick Action */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-2.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {teachersList.length > 0 ? (
                          <span
                            className="truncate text-[11px] font-medium text-foreground"
                            title={teachersList.map((t) => t.name || t.user?.name).join(', ')}
                          >
                            {teachersList.length === 1
                              ? teachersList[0]?.name || teachersList[0]?.user?.name
                              : `${teachersList.length} Teachers Assigned`}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Unassigned
                          </span>
                        )}
                      </div>

                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-0.5">
                        View details <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Subject Detail Modal (Opened on Card Click) */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(activeSubject)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedSubject(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto p-0 gap-0">
          {activeSubject && (
            <div>
              {/* Header Banner */}
              <div className="bg-muted/40 p-6 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground tracking-tight">
                        {activeSubject.name}
                      </h2>
                      {activeSubject.code && (
                        <Badge variant="outline" className="font-mono text-xs bg-background/80">
                          {activeSubject.code}
                        </Badge>
                      )}
                      {activeSubject.class && (
                        <Badge variant="secondary" className="text-xs font-semibold">
                          Class: {activeSubject.class.name}
                        </Badge>
                      )}
                    </div>
                    {activeSubject.description ? (
                      <p className="text-muted-foreground text-xs leading-relaxed max-w-xl pt-0.5">
                        {activeSubject.description}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Subject curriculum overview and assigned faculty details.
                      </p>
                    )}
                  </div>

                  {!isViewMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleEditClick(activeSubject);
                      }}
                      className="shrink-0 h-8 gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit Subject
                    </Button>
                  )}
                </div>

                {/* Metrics Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  <div className="bg-background rounded-lg p-3 border border-border/60 shadow-xs">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" /> Overall Progress
                    </span>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                      {activeSubject.progressPercentage ?? activeSubject.progress?.percentage ?? 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeSubject.completedChapters ?? activeSubject.progress?.completedChapters ?? 0} of{' '}
                      {activeSubject.totalChapters ?? activeSubject.progress?.totalChapters ?? 0} chapters
                    </p>
                  </div>

                  <div className="bg-background rounded-lg p-3 border border-border/60 shadow-xs">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5 text-emerald-600" /> Teaching Done
                    </span>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                      {activeSubject.progress?.teachingCompletedCount ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Chapters taught in class
                    </p>
                  </div>

                  <div className="bg-background rounded-lg p-3 border border-border/60 shadow-xs">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Q&A Completed
                    </span>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                      {activeSubject.progress?.qaCompletedCount ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Questions & doubts solved
                    </p>
                  </div>

                  <div className="bg-background rounded-lg p-3 border border-border/60 shadow-xs">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-purple-600" /> Assigned Teachers
                    </span>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                      {activeSubject.teachers?.length ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Faculty members assigned
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* 1. Assigned Teachers Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Assigned Teachers
                    </h3>
                    <Link
                      href="/admin/teachers"
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      Manage Teacher Assignments <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {activeSubject.teachers && activeSubject.teachers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeSubject.teachers.map((t) => {
                        const teacherName = t.name || t.user?.name || 'Unnamed Teacher';
                        const teacherEmail = t.email || t.user?.email || 'No email provided';
                        const teacherPhone = t.phone || t.user?.phone;
                        const initials =
                          teacherName
                            .split(' ')
                            .map((n) => n[0] || '')
                            .filter(Boolean)
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'T';

                        return (
                          <div
                            key={t.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card shadow-2xs hover:border-primary/40 transition-colors"
                          >
                            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm text-foreground truncate">
                                  {teacherName}
                                </p>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                  Teacher
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{teacherEmail}</p>
                              {teacherPhone && (
                                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                                  📞 {teacherPhone}
                                </p>
                              )}
                            </div>
                            <Link href={`/admin/teachers/${t.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold">No teacher assigned to this subject</p>
                          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                            Assigning a teacher allows them to mark daily class progress, chapter
                            completion, and Q&A workflows.
                          </p>
                        </div>
                      </div>
                      <Link href="/admin/teachers">
                        <Button size="sm" variant="outline" className="border-amber-300 bg-white dark:bg-amber-900/40 hover:bg-amber-100 text-xs shrink-0 font-medium">
                          Assign Teacher
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* 2. Chapter Progress Breakdown */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" /> Chapter-wise Syllabus Progress
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Track individual chapter statuses, milestone achievements, and completion.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-44">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Filter chapters..."
                          value={chapterSearchQuery}
                          onChange={(e) => setChapterSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs"
                        />
                      </div>

                      {termsList.length > 0 && (
                        <select
                          value={selectedTermFilter}
                          onChange={(e) => setSelectedTermFilter(e.target.value)}
                          className="border-input bg-background h-8 rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        >
                          <option value="all">All Terms</option>
                          {termsList.map((term) => (
                            <option key={term} value={term}>
                              {term}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {isLoadingDetail && (!activeSubject.chapters || activeSubject.chapters.length === 0) ? (
                    <div className="space-y-2 py-1">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : modalFilteredChapters.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/20 border-dashed">
                      <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium text-foreground">
                        {activeSubject.chapters && activeSubject.chapters.length > 0
                          ? 'No chapters matching filter criteria'
                          : 'No chapters created for this subject yet'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        {activeSubject.chapters && activeSubject.chapters.length > 0
                          ? 'Try clearing your search query or term filter.'
                          : 'Add chapters and syllabus topics in the Syllabus Editor to track progress.'}
                      </p>
                      <Link href="/admin/syllabus">
                        <Button size="sm" className="mt-3 text-xs gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Go to Syllabus Editor
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {modalFilteredChapters.map((ch, idx) => {
                        return (
                          <div
                            key={ch.id}
                            className="p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground font-semibold">
                                  #{ch.chapterNo ?? idx + 1}
                                </span>
                                <p className="font-medium text-sm text-foreground truncate">
                                  {ch.title}
                                </p>
                                {ch.termName && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-background">
                                    {ch.termName}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {/* Workflow Checkmarks */}
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border',
                                    ch.teachingCompleted
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-muted/50 text-muted-foreground border-border/40',
                                  )}
                                >
                                  {ch.teachingCompleted ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Circle className="h-2.5 w-2.5" />
                                  )}
                                  Teaching
                                </span>

                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border',
                                    ch.qaCompleted
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800'
                                      : 'bg-muted/50 text-muted-foreground border-border/40',
                                  )}
                                >
                                  {ch.qaCompleted ? (
                                    <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                  ) : (
                                    <Circle className="h-2.5 w-2.5" />
                                  )}
                                  Q&A
                                </span>

                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border',
                                    ch.copyChecked
                                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800'
                                      : 'bg-muted/50 text-muted-foreground border-border/40',
                                  )}
                                >
                                  {ch.copyChecked ? (
                                    <CheckCircle2 className="h-3 w-3 text-purple-600" />
                                  ) : (
                                    <Circle className="h-2.5 w-2.5" />
                                  )}
                                  Copy Checked
                                </span>

                                {ch.completedByTeacher && (
                                  <span className="text-[10px] text-muted-foreground italic">
                                    by {ch.completedByTeacher}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status Badge & Percentage */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0">
                              {ch.status === 'COMPLETED' ? (
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px] gap-1 px-2">
                                  <CheckCircle2 className="h-3 w-3" /> Completed
                                </Badge>
                              ) : ch.status === 'IN_PROGRESS' ? (
                                <Badge variant="secondary" className="text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40 text-[11px] gap-1 px-2">
                                  <Clock className="h-3 w-3" /> In Progress ({ch.completionPercentage}%)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[11px] gap-1 px-2">
                                  <Circle className="h-2.5 w-2.5" /> Pending
                                </Badge>
                              )}

                              {ch.estimatedTeachingDays ? (
                                <span className="text-[10px] text-muted-foreground">
                                  ~{ch.estimatedTeachingDays} days estimated
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-border/60 p-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <Link href="/admin/syllabus">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full sm:w-auto">
                    <BookOpen className="h-3.5 w-3.5" /> Open Syllabus Editor
                  </Button>
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedSubject(null)}
                    className="text-xs w-full sm:w-auto"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Add / Edit Dialog */}
      {/* ========================================================================= */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Create Subject'}</DialogTitle>
            <DialogDescription>
              Provide configuration settings below to structure internal course properties.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mathematics"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Code <span className="text-muted-foreground/70 font-normal">(Optional)</span>
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MATH-10"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Description <span className="text-muted-foreground/70 font-normal">(Optional)</span>
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief curriculum summary"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Class Assignment
              </label>
              {classes.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No classes verified. Build a class registry node first.
                </p>
              ) : (
                /* Custom Styled Native Select */
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                >
                  <option value="" disabled>
                    Select assigned tracking class
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
