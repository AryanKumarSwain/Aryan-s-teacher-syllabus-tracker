'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Trash2, Plus, Pencil, Search } from 'lucide-react';
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

// Helper to systematically determine cohesive dynamic colors mapped to Class Names
function getClassColorStyles(className?: string | null) {
  const fallbacks = {
    card: 'bg-card/50 border-border/60 dark:bg-card/30 dark:border-border/40',
    badge: 'bg-muted text-muted-foreground border-transparent',
  };

  if (!className) return fallbacks;

  const variations = [
    {
      card: 'bg-blue-50/40 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/50',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    },
    {
      card: 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/50',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    {
      card: 'bg-violet-50/40 border-violet-200 dark:bg-violet-950/10 dark:border-violet-900/50',
      badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    },
    {
      card: 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/50',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    },
    {
      card: 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/10 dark:border-rose-900/50',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    },
    {
      card: 'bg-cyan-50/40 border-cyan-200 dark:bg-cyan-950/10 dark:border-cyan-900/50',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();

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
    queryKey: syllabusKeys.subjects(schoolId),
    queryFn: () => api.get<Subject[]>('/syllabus/subjects'),
    enabled: Boolean(schoolId),
  });

  // Fetch classes list for the dropdown filter (always active when schoolId exists)
  const { data: classesData } = useQuery({
    queryKey: syllabusKeys.classesList(schoolId),
    queryFn: () => api.getPaginated<ClassOption>('/syllabus/classes', { page: 1, pageSize: 100 }),
    enabled: Boolean(schoolId),
  });

  const classes = classesData?.items ?? [];
  const subjects = data ?? [];

  // Client-side filtering logic
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

  // Helper actions
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
    mutationFn: () =>
      api.post<Subject>('/syllabus/subjects', {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        classId: classId || undefined,
      }),
    onSuccess: async (created) => {
      queryClient.setQueryData<Subject[]>(syllabusKeys.subjects(schoolId), (old) =>
        old ? [...old, created] : [created],
      );
      await invalidateSyllabusStructure(queryClient, schoolId);
      toast.success('Subject created');
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
      queryClient.setQueryData<Subject[]>(syllabusKeys.subjects(schoolId), (old) =>
        old ? old.map((s) => (s.id === updated.id ? updated : s)) : [updated],
      );
      await invalidateSyllabusStructure(queryClient, schoolId);
      toast.success('Subject updated');
      setOpen(false);
    },
    onError: () => toast.error('Failed to update subject'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/syllabus/subjects/${id}`),
    onSuccess: async (_, deletedId) => {
      queryClient.setQueryData<Subject[]>(syllabusKeys.subjects(schoolId), (old) =>
        old ? old.filter((s) => s.id !== deletedId) : old,
      );
      await invalidateSyllabusStructure(queryClient, schoolId);
      toast.success('Subject deleted');
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

  return (
    <DashboardShell title="Subjects">
      <p className="text-muted-foreground mb-6 max-w-2xl text-sm">
        Create and manage subjects used in the syllabus and teacher assignments.
      </p>

      {/* Control Utility Toolbar (Search & Filter dropdown) */}
      <div className="bg-muted/20 border-border/60 mb-6 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background pl-9"
            />
          </div>
          <div className="relative">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full min-w-[160px] cursor-pointer rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleCreateClick} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Add subject
        </Button>
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
              ? 'Try adjusting your search query or dropdown filters.'
              : 'Add subjects to get started with syllabus and teacher assignments.'
          }
          action={
            searchQuery || selectedClassFilter !== 'all'
              ? undefined
              : { label: 'Add subject', onClick: handleCreateClick }
          }
        />
      ) : (
        /* Animated Responsive Grid container */
        <div className="animate-fade-in grid gap-4 duration-300 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((s) => {
            const activeTheme = getClassColorStyles(s.class?.name);

            return (
              <div
                key={s.id}
                className="group relative transform transition-all duration-200 hover:-translate-y-1"
              >
                <Card
                  className={cn(
                    'h-full border backdrop-blur-sm transition-all hover:shadow-md',
                    activeTheme.card,
                  )}
                >
                  <CardHeader className="pb-2 pr-28">
                    <CardTitle className="line-clamp-1 text-base font-bold tracking-tight">
                      {s.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {s.code && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {s.code}
                        </Badge>
                      )}
                      {s.class && (
                        <Badge
                          className={cn('border-none font-semibold shadow-none', activeTheme.badge)}
                        >
                          {s.class.name}
                        </Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-muted-foreground line-clamp-2 min-h-[2rem] text-xs">
                        {s.description}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Action utilities */}
                <div className="bg-background/80 absolute right-3 top-3 flex items-center gap-0.5 rounded-lg border p-1 opacity-90 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-8 w-8 transition-colors"
                    title="Edit subject"
                    onClick={() => handleEditClick(s)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 transition-colors"
                    disabled={deleteMutation.isPending}
                    title="Delete subject"
                    onClick={() => {
                      if (confirm('Delete this subject? This cannot be undone.')) {
                        deleteMutation.mutate(s.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Dialog Wrapper ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] scale-95 transform flex-col gap-0 p-0 transition-all duration-300 data-[state=open]:scale-100">
          <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
            <DialogTitle>{editingSubject ? 'Edit subject' : 'Add subject'}</DialogTitle>
            <DialogDescription>
              Provide subject info and optionally target its specific class assignment map.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mathematics"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Code <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MATH-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2 pb-2">
              <label className="text-sm font-medium">Class</label>
              {classes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No classes found. Create classes first.
                </p>
              ) : (
                <div className="bg-muted/20 flex max-h-[140px] flex-wrap gap-2 overflow-y-auto rounded-md border p-1">
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClassId(classId === c.id ? '' : c.id)}
                      className={`rounded-md border px-3 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
                        classId === c.id
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'bg-background hover:border-muted-foreground text-foreground'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="bg-muted/10 shrink-0 border-t px-6 py-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingSubject ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
