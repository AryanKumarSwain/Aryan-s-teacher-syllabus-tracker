'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Trash2, Plus, Pencil, Search, MoreVertical, Loader2 } from 'lucide-react';
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
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { ImportDataButton } from '@/components/admin/import-data-button';

interface Subject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  class?: { id: string; name: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
}

function getClassColorStyles(className?: string | null) {
  const fallbacks = {
    card: 'bg-card border-border/60 dark:bg-card/40 dark:border-border/30',
    badge: 'bg-muted text-muted-foreground border-transparent',
  };

  if (!className) return fallbacks;

  const variations = [
    {
      card: 'bg-blue-50/30 border-blue-100/80 dark:bg-blue-950/5 dark:border-blue-900/30',
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/40',
    },
    {
      card: 'bg-emerald-50/30 border-emerald-100/80 dark:bg-emerald-950/5 dark:border-emerald-900/30',
      badge:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/40',
    },
    {
      card: 'bg-purple-50/30 border-purple-100/80 dark:bg-purple-950/5 dark:border-purple-900/30',
      badge:
        'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200/40',
    },
    {
      card: 'bg-amber-50/30 border-amber-100/80 dark:bg-amber-950/5 dark:border-amber-900/30',
      badge:
        'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/40',
    },
    {
      card: 'bg-rose-50/30 border-rose-100/80 dark:bg-rose-950/5 dark:border-rose-900/30',
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200/40',
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
  const { school } = useSchool();

  // Modal & Form State
  const [open, setOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  // Queries
  const { data, isLoading, isFetching } = useQuery({
    queryKey: syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId),
    queryFn: () => api.get<Subject[]>('/syllabus/subjects', 
      school?.currentAcademicSessionId ? { academicSessionId: school.currentAcademicSessionId } : undefined
    ),
    enabled: Boolean(schoolId),
  });

  const { data: classesData } = useQuery({
    queryKey: syllabusKeys.classesList(schoolId, school?.currentAcademicSessionId),
    queryFn: () => api.getPaginated<ClassOption>('/syllabus/classes', { 
      page: 1, 
      pageSize: 100,
      ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
    }),
    enabled: Boolean(schoolId),
  });

  const classes = classesData?.items ?? [];
  const subjects = data ?? [];

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

  const handleCreateClick = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setDescription('');
    setClassId('');
    setOpen(true);
  };

  const handleEditClick = (subject: Subject) => {
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
    onSuccess: async (created) => {
      queryClient.setQueryData<Subject[]>(syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId), (old) =>
        old ? [...old, created] : [created],
      );
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      toast.success('Subject created successfully');
      setOpen(false);
    },
    onError: () => toast.error('Failed to create subject'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<Subject>(`/syllabus/subjects/${id}`, {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        classId: classId || undefined,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData<Subject[]>(syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId), (old) =>
        old ? old.map((s) => (s.id === updated.id ? updated : s)) : [updated],
      );
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      toast.success('Subject updated successfully');
      setOpen(false);
    },
    onError: () => toast.error('Failed to update subject'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/syllabus/subjects/${id}`),
    onSuccess: async (_, deletedId) => {
      queryClient.setQueryData<Subject[]>(syllabusKeys.subjects(schoolId, school?.currentAcademicSessionId), (old) =>
        old ? old.filter((s) => s.id !== deletedId) : old,
      );
      await invalidateSyllabusStructure(queryClient, schoolId, school?.currentAcademicSessionId);
      toast.success('Subject deleted successfully');
    },
    onError: () => toast.error('Failed to delete subject'),
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
      <p className="text-muted-foreground mb-6 max-w-2xl text-sm">
        Create and manage academic subjects mapped to specific class tracks and system frameworks.
      </p>

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
          <ImportDataButton type="subjects" label="Import Subjects" />
          <Button onClick={handleCreateClick} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Add subject
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredSubjects.length === 0 && !isFetching ? (
        <EmptyState
          icon={BookMarked}
          title="No subjects found"
          description={
            searchQuery || selectedClassFilter !== 'all'
              ? 'Try adjusting your search query or tracking criteria.'
              : 'Add academic subjects to initiate school syllabus mappings.'
          }
          action={
            searchQuery || selectedClassFilter !== 'all'
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
            };

            return (
              <Card
                key={s.id}
                className={cn(
                  'hover:border-border/80 animate-in fade-in slide-in-from-bottom-2 relative flex flex-col justify-between transition-all duration-200 hover:shadow-sm',
                  activeTheme.card,
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-foreground/90 line-clamp-1 text-sm font-semibold tracking-tight">
                      {s.name}
                    </CardTitle>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="hover:bg-muted h-8 w-8 p-0">
                          <MoreVertical className="text-muted-foreground h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => handleEditClick(s)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={deleteMutation.isPending}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => {
                            if (confirm('Delete this subject permanently?')) {
                              deleteMutation.mutate(s.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {s.code && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider"
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
                    {s.description && (
                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {s.description}
                      </p>
                    )}
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
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
