'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  Pencil,
  Check,
  Search,
  Layers,
  GraduationCap,
  FileText,
  Trash2,
  Plus,
  Filter,
  Eye,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useSchool } from '@/features/syllabus/hooks/use-school';

interface Chapter {
  id: string;
  title: string;
  chapterNo?: number;
  termName?: string;
}

interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

interface ClassNode {
  id: string;
  name: string;
  subjects: Subject[];
}

type EditingItem =
  | { type: 'subject'; id: string; name: string }
  | {
    type: 'chapter';
    id: string;
    title: string;
    chapterNo: string;
    termKey: string;
  };

interface AcademicTerm {
  name: string;
  startDate: string;
  endDate: string;
}

interface AcademicYear {
  id: string;
  name: string;
  terms: AcademicTerm[];
}

interface TermOption {
  key: string; // `${academicYearId}::${termIndex}`
  academicYearId: string;
  termIndex: number;
  termName: string;
  label: string;
}

const TERM_COLORS = [
  {
    bg: 'bg-indigo-500',
    light: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    ring: 'ring-indigo-300',
    day: 'bg-indigo-100 text-indigo-800',
  },
  {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    ring: 'ring-emerald-300',
    day: 'bg-emerald-100 text-emerald-800',
  },
  {
    bg: 'bg-amber-500',
    light: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    ring: 'ring-amber-300',
    day: 'bg-amber-100 text-amber-800',
  },
  {
    bg: 'bg-rose-500',
    light: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    ring: 'ring-rose-300',
    day: 'bg-rose-100 text-rose-800',
  },
] as const;

export default function AdminSyllabusPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<EditingItem | null>(null);
  const [value, setValue] = useState('');
  const [editChapterNo, setEditChapterNo] = useState('');
  const [editTermKey, setEditTermKey] = useState('');
  const [search, setSearch] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [creatingChapterFor, setCreatingChapterFor] = useState<{
    classId: string;
    subjectId: string;
  } | null>(null);
  const [newChapterNo, setNewChapterNo] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterTermKey, setNewChapterTermKey] = useState('');
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  const { school, isViewMode } = useSchool();

  const { data: tree = [], isLoading } = useQuery({
    queryKey: syllabusKeys.syllabusTree(schoolId, school?.currentAcademicSessionId),
    queryFn: () => api.get<ClassNode[]>('/syllabus/tree',
      school?.currentAcademicSessionId ? { academicSessionId: school.currentAcademicSessionId } : undefined
    ),
    enabled: Boolean(schoolId),
  });

  const { data: academicYearsResponse } = useQuery({
    queryKey: ['academic-terms', schoolId, school?.currentAcademicSessionId],
    queryFn: async () => {
      const response = await api.getPaginated<any>(
        '/academic-terms',
        {
          ...(schoolId && { schoolId }),
          ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
        },
      );
      return response;
    },
    enabled: Boolean(schoolId),
  });

  const academicYears = useMemo<AcademicYear[]>(() => {
    const sourceItems = Array.isArray(academicYearsResponse)
      ? academicYearsResponse
      : Array.isArray((academicYearsResponse as any)?.items)
        ? (academicYearsResponse as any).items
        : Array.isArray((academicYearsResponse as any)?.data?.items)
          ? (academicYearsResponse as any).data.items
          : [];

    return sourceItems.map((year: any) => ({
      ...year,
      terms: (() => {
        if (Array.isArray(year.terms)) return year.terms;
        if (typeof year.terms === 'string') {
          try {
            const parsed = JSON.parse(year.terms);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      })(),
    }));
  }, [academicYearsResponse]);

  const termOptions: TermOption[] = useMemo(() => {
    return academicYears.flatMap((year) =>
      (year.terms || []).map((term, idx) => ({
        key: `${year.id}::${idx}`,
        academicYearId: year.id,
        termIndex: idx,
        termName: term.name,
        label: academicYears.length > 1 ? `${term.name} (${year.name})` : term.name,
      })),
    );
  }, [academicYears]);

  const termFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { termName: string; label: string }[] = [];
    termOptions.forEach((t) => {
      if (!seen.has(t.termName)) {
        seen.add(t.termName);
        opts.push({ termName: t.termName, label: t.label });
      }
    });
    return opts;
  }, [termOptions]);

  const getTermColor = (termName: string | undefined) => {
    if (!termName) return TERM_COLORS[0];
    const termIndex = termOptions.findIndex((t: TermOption) => t.termName === termName);
    const colorIndex = termIndex >= 0 ? termIndex % TERM_COLORS.length : 0;
    return TERM_COLORS[colorIndex] ?? TERM_COLORS[0];
  };

  const mutation = useMutation({
    mutationFn: async (vars: {
      type: 'subject' | 'chapter';
      id: string;
      name: string;
      chapterNo?: number;
      academicYearId?: string;
      termIndex?: number;
      termName?: string;
    }) => {
      if (isViewMode) {
        return Promise.reject(new Error('Cannot edit syllabus in View Mode. Switch to active session to make changes.'));
      }
      if (vars.type === 'subject')
        return api.patch(`/syllabus/subjects/${vars.id}`, { name: vars.name });
      if (vars.type === 'chapter')
        return api.patch(`/syllabus/chapters/${vars.id}`, {
          title: vars.name,
          chapterNo: vars.chapterNo,
          academicYearId: vars.academicYearId,
          termIndex: vars.termIndex,
          termName: vars.termName,
        });
      return Promise.reject(new Error('Invalid edit type'));
    },
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      toast.success('Syllabus updated');
      setEditing(null);
      setEditChapterNo('');
      setEditTermKey('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save changes'),
  });

  const resetChapterForm = () => {
    setCreatingChapterFor(null);
    setNewChapterNo('');
    setNewChapterTitle('');
    setNewChapterTermKey('');
  };

  const createChapterMutation = useMutation({
    mutationFn: (payload: {
      classId: string;
      subjectId: string;
      title: string;
      chapterNo: number;
      academicYearId?: string;
      termIndex?: number;
      termName?: string;
    }) => {
      if (isViewMode) {
        throw new Error('Cannot create chapter in View Mode. Switch to active session to make changes.');
      }
      if (!school?.currentAcademicSessionId) {
        throw new Error('No active academic session found. Please create or select a session first.');
      }
      return api.post('/syllabus/chapters', {
        ...payload,
        academicSessionId: school.currentAcademicSessionId,
      });
    },
    onSuccess: async (_, vars) => {
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      queryClient.invalidateQueries({ queryKey: syllabusKeys.class(schoolId, vars.classId, school?.currentAcademicSessionId) });
      queryClient.invalidateQueries({ queryKey: ['teacher-class', vars.classId] });
      toast.success('Chapter created');
      resetChapterForm();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create chapter'),
  });

  const deleteChapterMutation = useMutation({
    mutationFn: ({ chapterId }: { chapterId: string }) => {
      if (isViewMode) {
        throw new Error('Cannot delete chapter in View Mode. Switch to active session to make changes.');
      }
      return api.delete(`/syllabus/chapters/${chapterId}`);
    },
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      toast.success('Chapter deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete chapter'),
  });

  const createClassMutation = useMutation({
    mutationFn: (payload: { name: string }) => {
      if (isViewMode) {
        throw new Error('Cannot create class in View Mode. Switch to active session to make changes.');
      }
      if (!school?.currentAcademicSessionId) {
        throw new Error('No active academic session found. Please create or select a session first.');
      }
      return api.post('/syllabus/classes', {
        ...payload,
        academicSessionId: school.currentAcademicSessionId,
      });
    },
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      toast.success('Class created');
      setAddClassDialogOpen(false);
      setNewClassName('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create class'),
  });

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const handleToggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    if (expand) {
      tree.forEach((cls) => {
        next[`class-${cls.id}`] = true;
        cls.subjects.forEach((sub) => {
          next[`subject-${sub.id}`] = true;
        });
      });
    }
    setExpanded(next);
  };

  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tree
      .map((cls) => {
        const subjectsAfterTermFilter = cls.subjects
          .map((sub) => ({
            ...sub,
            chapters: sub.chapters.filter((c) => !termFilter || c.termName === termFilter),
          }))
          .filter((sub) => (termFilter ? sub.chapters.length > 0 : true));

        const clsAfterTermFilter: ClassNode = { ...cls, subjects: subjectsAfterTermFilter };

        if (!q) return clsAfterTermFilter;

        if (cls.name.toLowerCase().includes(q)) return clsAfterTermFilter;

        const matchedSubjects = clsAfterTermFilter.subjects.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.chapters.some((c) => c.title.toLowerCase().includes(q)),
        );
        return matchedSubjects.length > 0
          ? { ...clsAfterTermFilter, subjects: matchedSubjects }
          : null;
      })
      .filter((cls): cls is ClassNode => {
        if (cls === null) return false;
        if (termFilter && cls.subjects.length === 0) return false;
        return true;
      });
  }, [tree, search, termFilter]);

  const openEdit = (item: EditingItem) => {
    setEditing(item);
    if (item.type === 'subject') {
      setValue(item.name);
    } else {
      setValue(item.title);
      setEditChapterNo(item.chapterNo);
      setEditTermKey(item.termKey);
    }
  };

  const openEditChapter = (chapter: Chapter) => {
    const matchedTerm = termOptions.find((t) => t.termName === chapter.termName);
    const chNo = chapter.chapterNo ?? (chapter as any).chapter_no;
    openEdit({
      type: 'chapter',
      id: chapter.id,
      title: chapter.title,
      chapterNo: chNo != null ? String(chNo) : '',
      termKey: matchedTerm?.key ?? '',
    });
  };

  const handleSaveChapter = (classId: string, subjectId: string) => {
    if (!newChapterNo.trim()) return toast.error('Chapter no. is required');
    if (Number.isNaN(Number(newChapterNo)) || Number(newChapterNo) <= 0)
      return toast.error('Chapter no. must be a valid number');
    if (!newChapterTitle.trim()) return toast.error('Chapter name is required');
    if (!newChapterTermKey) return toast.error('Please select a term');

    const selectedTermOption = termOptions.find((t) => t.key === newChapterTermKey);

    createChapterMutation.mutate({
      classId,
      subjectId,
      title: newChapterTitle.trim(),
      chapterNo: parseInt(newChapterNo, 10),
      academicYearId: selectedTermOption?.academicYearId,
      termIndex: selectedTermOption?.termIndex,
      termName: selectedTermOption?.termName,
    });
  };

  const handleSaveEdit = () => {
    if (!editing) return;

    if (editing.type === 'subject') {
      if (!value.trim()) return toast.error('Subject name is required');
      mutation.mutate({ id: editing.id, type: 'subject', name: value.trim() });
      return;
    }

    if (!editChapterNo.trim()) return toast.error('Chapter no. is required');
    if (Number.isNaN(Number(editChapterNo)) || Number(editChapterNo) <= 0)
      return toast.error('Chapter no. must be a valid number');
    if (!value.trim()) return toast.error('Chapter name is required');
    if (!editTermKey) return toast.error('Please select a term');

    const selectedTermOption = termOptions.find((t) => t.key === editTermKey);

    mutation.mutate({
      id: editing.id,
      type: 'chapter',
      name: value.trim(),
      chapterNo: Number(editChapterNo),
      academicYearId: selectedTermOption?.academicYearId,
      termIndex: selectedTermOption?.termIndex,
      termName: selectedTermOption?.termName,
    });
  };

  const handleSaveClass = () => {
    if (!newClassName.trim()) return toast.error('Class name is required');
    createClassMutation.mutate({ name: newClassName.trim() });
  };

  const totalSubjects = tree.reduce((s, c) => s + c.subjects.length, 0);
  const totalChapters = tree.reduce(
    (s, c) => s + c.subjects.reduce((s2, sub) => s2 + sub.chapters.length, 0),
    0,
  );

  return (
    <DashboardShell title="Syllabus Management">
      <div className="space-y-6">
        {/* Stats */}
        {!isLoading && tree.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-3 gap-3 duration-300">
            {[
              {
                label: 'Classes',
                value: tree.length,
                icon: GraduationCap,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Subjects',
                value: totalSubjects,
                icon: BookOpen,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                label: 'Chapters',
                value: totalChapters,
                icon: FileText,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2.5', bg)}>
                      <Icon className={cn('h-4 w-4', color)} />
                    </div>
                    <div>
                      <div className={cn('text-2xl font-bold', color)}>{value}</div>
                      <div className="text-muted-foreground text-xs">{label}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search classes, subjects, chapters..."
                className="pl-9"
              />
            </div>

            <div className="relative">
              <Filter className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="border-input bg-background h-9 rounded-md border pl-8 pr-3 text-xs"
              >
                <option value="">All Terms</option>
                {termFilterOptions.map((opt) => (
                  <option key={opt.termName} value={opt.termName}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleToggleAll(true)}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleToggleAll(false)}
            >
              Collapse All
            </Button>
            {!isViewMode ? (
              <Button size="sm" className="gap-1 text-xs" onClick={() => setAddClassDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Class
              </Button>
            ) : (
              <span className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
                <Eye className="h-3.5 w-3.5 text-amber-600" /> Read-Only View Mode
              </span>
            )}
          </div>
        </div>

        {/* Tree */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredTree.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={search || termFilter ? 'No matches found' : 'No syllabus structure'}
            description={
              search || termFilter
                ? 'Try a different search term or filter.'
                : 'Create classes and subjects first, then add chapters.'
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredTree.map((cls, ci) => {
              const isClassExpanded = !!expanded[`class-${cls.id}`];
              const classChapterCount = cls.subjects.reduce((s, sub) => s + sub.chapters.length, 0);

              return (
                <div
                  key={cls.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                  style={{ animationDelay: `${ci * 50}ms` }}
                >
                  <Card className="overflow-hidden border bg-white transition-all duration-300 hover:shadow-md">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50"
                      onClick={() => toggle(`class-${cls.id}`)}
                    >
                      <ChevronRight
                        className={cn(
                          'text-muted-foreground h-4 w-4 flex-shrink-0 transition-transform duration-200',
                          isClassExpanded && 'rotate-90',
                        )}
                      />
                      <div className="rounded-lg bg-blue-50 p-1.5">
                        <GraduationCap className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-bold tracking-tight">{cls.name}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                          {cls.subjects.length} subjects
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {classChapterCount} chapters
                        </span>
                      </div>
                    </button>

                    <div
                      className={cn(
                        'grid bg-white transition-all duration-300 ease-in-out',
                        isClassExpanded
                          ? 'grid-rows-[1fr] border-t opacity-100'
                          : 'grid-rows-[0fr] opacity-0',
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-3 px-4 pb-4 pt-4">
                          {cls.subjects.map((subject) => {
                            const isSubjectExpanded = !!expanded[`subject-${subject.id}`];
                            const isAddingHere =
                              creatingChapterFor?.subjectId === subject.id &&
                              creatingChapterFor?.classId === cls.id;
                            return (
                              <div
                                key={subject.id}
                                className="rounded-xl border bg-gray-50/50 p-4 transition-all duration-200 hover:border-gray-300"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 text-sm font-semibold hover:opacity-80"
                                    onClick={() => toggle(`subject-${subject.id}`)}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        'text-muted-foreground h-3.5 w-3.5 transition-transform duration-200',
                                        isSubjectExpanded && 'rotate-90',
                                      )}
                                    />
                                    <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                                    {subject.name}
                                    <span className="text-muted-foreground text-xs font-normal">
                                      ({subject.chapters.length})
                                    </span>
                                  </button>
                                  {!isViewMode && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 text-xs"
                                      onClick={() =>
                                        openEdit({
                                          type: 'subject',
                                          id: subject.id,
                                          name: subject.name,
                                        })
                                      }
                                    >
                                      <Pencil className="h-3 w-3" /> Edit
                                    </Button>
                                  )}
                                </div>

                                <div
                                  className={cn(
                                    'grid transition-all duration-300 ease-in-out',
                                    isSubjectExpanded
                                      ? 'mt-3 grid-rows-[1fr] opacity-100'
                                      : 'grid-rows-[0fr] opacity-0',
                                  )}
                                >
                                  <div className="overflow-hidden pl-5">
                                    <div className="space-y-1.5 border-l-2 border-gray-200 py-1 pl-4">
                                      {subject.chapters.map((chapter) => {
                                        // Safe extraction matching the backend field naming conventions
                                        const chNo = chapter.chapterNo ?? (chapter as any).chapter_no;
                                        const tName = chapter.termName ?? (chapter as any).term_name;
                                        const tc = getTermColor(tName);

                                        return (
                                          <div
                                            key={chapter.id}
                                            className="group flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-all duration-200 hover:shadow-sm"
                                          >
                                            {/* Left side: Chapter Number & Title + Term Tag Badge */}
                                            <div className="flex items-center gap-3 text-xs font-medium text-gray-700">
                                              <span className="font-bold text-gray-900">
                                                {chNo ? `Chapter ${chNo} ` : ''}{chapter.title}
                                              </span>

                                              {tName && (
                                                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', tc.light, tc.text, `ring-1 ring-inset ${tc.ring}`)}>
                                                  {tName}
                                                </span>
                                              )}
                                            </div>

                                            {/* Right side: Action Buttons */}
                                            {!isViewMode && (
                                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                                                  onClick={() => openEditChapter(chapter)}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 px-2 text-xs"
                                                  onClick={() => {
                                                    if (confirm(`Delete "${chapter.title}"?`)) {
                                                      deleteChapterMutation.mutate({
                                                        chapterId: chapter.id,
                                                      });
                                                    }
                                                  }}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}

                                      {!isViewMode && (
                                        <div className="pt-2">
                                          {isAddingHere ? (
                                            <div className="animate-in slide-in-from-left-2 flex max-w-xl flex-wrap items-center gap-2 duration-200">
                                              <Input
                                                value={newChapterNo}
                                                onChange={(e) => setNewChapterNo(e.target.value)}
                                                placeholder="Chapter No."
                                                type="number"
                                                min={1}
                                                className="h-8 w-24 text-xs"
                                                autoFocus
                                              />
                                              <Input
                                                value={newChapterTitle}
                                                onChange={(e) => setNewChapterTitle(e.target.value)}
                                                placeholder="Chapter Name"
                                                className="h-8 min-w-[10rem] flex-1 text-xs"
                                              />
                                              <select
                                                value={newChapterTermKey}
                                                onChange={(e) => setNewChapterTermKey(e.target.value)}
                                                disabled={termOptions.length === 0}
                                                className="border-input bg-background h-8 rounded-md border px-2 text-xs disabled:opacity-50"
                                              >
                                                <option value="">
                                                  {termOptions.length === 0
                                                    ? 'No terms available'
                                                    : 'Select term'}
                                                </option>
                                                {termOptions.map((opt) => (
                                                  <option key={opt.key} value={opt.key}>
                                                    {opt.label}
                                                  </option>
                                                ))}
                                              </select>
                                              <Button
                                                size="sm"
                                                className="h-8 gap-1 px-3 text-xs"
                                                onClick={() => handleSaveChapter(cls.id, subject.id)}
                                                disabled={createChapterMutation.isPending}
                                              >
                                                <Check className="h-3 w-3" /> Save
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs"
                                                onClick={resetChapterForm}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="text-muted-foreground hover:text-foreground h-8 border-dashed text-xs"
                                              onClick={() =>
                                                setCreatingChapterFor({
                                                  classId: cls.id,
                                                  subjectId: subject.id,
                                                })
                                              }
                                            >
                                              + Add Chapter
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Class Dialog */}
      <Dialog
        open={addClassDialogOpen}
        onOpenChange={(open) => !open && setAddClassDialogOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>Create a new class in the syllabus structure.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Class 6"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddClassDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveClass}
              disabled={!newClassName.trim() || createClassMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (subject or chapter) */}
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setEditChapterNo('');
            setEditTermKey('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">Edit {editing?.type}</DialogTitle>
            <DialogDescription>
              Update the details. This applies everywhere it's used.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editing?.type === 'chapter' && (
              <div className="flex gap-2">
                <Input
                  value={editChapterNo}
                  onChange={(e) => setEditChapterNo(e.target.value)}
                  placeholder="Chapter No."
                  type="number"
                  min={1}
                  className="w-28"
                />
                <select
                  value={editTermKey}
                  onChange={(e) => setEditTermKey(e.target.value)}
                  disabled={termOptions.length === 0}
                  className="border-input bg-background h-9 flex-1 rounded-md border px-2 text-xs disabled:opacity-50"
                >
                  <option value="">
                    {termOptions.length === 0 ? 'No terms available' : 'Select term'}
                  </option>
                  {termOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={editing?.type === 'chapter' ? "Chapter Name" : `Enter new ${editing?.type} name`}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!value.trim() || mutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}