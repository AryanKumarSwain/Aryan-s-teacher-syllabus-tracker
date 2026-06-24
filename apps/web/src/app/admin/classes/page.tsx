'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Trash2, Pencil, Eye, Filter } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import type { PaginatedResponse } from '@school-syllabus/types';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

interface ClassItem {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  description?: string | null;
  _count?: { subjects: number };
}

// Utility to reliably compute matching visual colors uniquely mapped to each Class Name layout
function getClassColorStyles(className: string) {
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

export default function AdminClassesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const schoolId = useSchoolId();

  // Dialog & Form States
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');

  // Dropdown Filtering State
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Delete States
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');

  // Fetch Classes Data Hook
  const { data, isLoading, isFetching } = useQuery({
    queryKey: syllabusKeys.classes(schoolId),
    queryFn: () => api.getPaginated<ClassItem>('/syllabus/classes', { page: 1, pageSize: 100 }),
    enabled: Boolean(schoolId),
  });

  const rawClassesList = data?.items ?? [];

  // Computed Filter List Logic
  const filteredClassesList = useMemo(() => {
    if (selectedClassId === 'all') return rawClassesList;
    return rawClassesList.filter((item) => item.id === selectedClassId);
  }, [rawClassesList, selectedClassId]);

  // Helper to open dialog for editing
  const handleEditClick = (cls: ClassItem) => {
    setEditingClass(cls);
    setName(cls.name);
    setSection(cls.section || '');
    setDescription(cls.description || '');
    setOpen(true);
  };

  // Helper to open dialog for creating
  const handleCreateClick = () => {
    setEditingClass(null);
    setName('');
    setSection('');
    setDescription('');
    setOpen(true);
  };

  // Create Mutation
  const createClass = useMutation({
    mutationFn: () =>
      api.post<ClassItem>('/syllabus/classes', {
        name,
        section: section || undefined,
        description: description || undefined,
      }),
    onSuccess: async (created) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId), (old) => {
        if (!old?.items) return old;
        return { ...old, items: [created, ...old.items], total: old.total + 1 };
      });
      await invalidateSyllabusStructure(qc, schoolId);
      toast.success('Class created');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Edit/Update Mutation
  const updateClass = useMutation({
    mutationFn: (id: string) =>
      api.patch<ClassItem>(`/syllabus/classes/${id}`, {
        name,
        section: section || undefined,
        description: description || undefined,
      }),
    onSuccess: async (updated) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId), (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        };
      });
      await invalidateSyllabusStructure(qc, schoolId);
      toast.success('Class updated');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete Mutation
  const deleteClass = useMutation({
    mutationFn: (id: string) => api.delete(`/syllabus/classes/${id}`),
    onSuccess: async (_, deletedId) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId), (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter((c: ClassItem) => c.id !== deletedId),
          total: Math.max(0, old.total - 1),
        };
      });
      await invalidateSyllabusStructure(qc, schoolId);
      toast.success('Class deleted');
      setDeleteTarget(null);
      setDeleteConfirmValue('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (editingClass) {
      updateClass.mutate(editingClass.id);
    } else {
      createClass.mutate();
    }
  };

  return (
    <DashboardShell title="Classes Management">
      <div className="space-y-6">
        {/* Filter Selection Panel Row */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="bg-background flex w-full max-w-xs items-center gap-2 rounded-md border px-3 py-1.5 shadow-sm">
            <Filter className="text-muted-foreground h-4 w-4 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full cursor-pointer bg-transparent text-sm font-medium focus:outline-none"
            >
              <option value="all">Show All Classes</option>
              {rawClassesList.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `(${cls.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleCreateClick} className="self-end sm:self-auto">
            <Plus className="mr-2 h-4 w-4" /> Add class
          </Button>
        </div>

        {isLoading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filteredClassesList.length === 0 && !isFetching ? (
          <EmptyState
            icon={GraduationCap}
            title="No classes matches"
            description={
              selectedClassId !== 'all'
                ? 'The selected single class cannot be parsed or located.'
                : 'Create classes to organize subjects and syllabus.'
            }
            action={
              selectedClassId === 'all'
                ? { label: 'Add class', onClick: handleCreateClick }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClassesList.map((cls) => {
              const activeTheme = getClassColorStyles(cls.name);

              return (
                <div
                  key={cls.id}
                  className="animate-in fade-in group relative rounded-xl duration-200"
                >
                  <Card
                    className={cn(
                      'h-full border transition-all duration-300 hover:shadow-md',
                      activeTheme.card,
                    )}
                  >
                    <CardHeader className="pr-32">
                      <CardTitle className="line-clamp-1 text-lg font-bold tracking-tight">
                        {cls.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="flex flex-col gap-1.5">
                        {cls.section && (
                          <p className="text-muted-foreground font-medium">
                            Section:{' '}
                            <span className="text-foreground font-semibold">{cls.section}</span>
                          </p>
                        )}
                        <Badge
                          className={cn(
                            'mt-1 w-fit border-none font-semibold shadow-none',
                            activeTheme.badge,
                          )}
                        >
                          {cls._count?.subjects ?? 0} subjects allocated
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Operational Hover Actions Overlay Panel */}
                  <div className="bg-background/80 absolute right-3 top-3 flex items-center gap-0.5 rounded-lg border p-1 opacity-90 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      title="View details"
                      onClick={() => router.push(`/admin/classes/${cls.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      title="Edit class"
                      onClick={() => handleEditClick(cls)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      title="Delete class"
                      onClick={() => {
                        setDeleteTarget(cls);
                        setDeleteConfirmValue('');
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
      </div>

      {/* ── Add / Edit Class Dialog Modal ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingClass ? 'Edit class configuration' : 'New institutional class'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Class 10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Section</Label>
              <Input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. A"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional informational text"
              />
            </div>
            <Button
              className="mt-2 w-full"
              onClick={handleSubmit}
              disabled={!name.trim() || createClass.isPending || updateClass.isPending}
            >
              {editingClass ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Shield Dialog ── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmValue('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold">
              Destructive Action Warning
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> along with all
              nested subjects, chapters, and structural records. This layout change cannot be
              reverted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">
              Type <span className="text-foreground font-bold underline">{deleteTarget?.name}</span>{' '}
              below to confirm deletion:
            </Label>
            <Input
              value={deleteConfirmValue}
              onChange={(e) => setDeleteConfirmValue(e.target.value)}
              placeholder={deleteTarget?.name ?? ''}
              className="focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmValue !== deleteTarget?.name || deleteClass.isPending}
              onClick={() => deleteTarget && deleteClass.mutate(deleteTarget.id)}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
