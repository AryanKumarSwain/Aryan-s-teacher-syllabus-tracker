'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, ChevronDown, ChevronRight, Pencil, Filter, Check } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface Chapter {
  id: string;
  title: string;
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
  | { type: 'chapter'; id: string; title: string };

// Helper to systematically determine cohesive, accessible accent colors based on the Class Name string
function getClassColorStyles(className: string) {
  const colors = [
    {
      card: 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/50',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    },
    {
      card: 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/50',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    {
      card: 'bg-violet-50/50 border-violet-200 dark:bg-violet-950/10 dark:border-violet-900/50',
      badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    },
    {
      card: 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/50',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    },
    {
      card: 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/10 dark:border-rose-900/50',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    },
    {
      card: 'bg-cyan-50/50 border-cyan-200 dark:bg-cyan-950/10 dark:border-cyan-900/50',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    },
  ];

  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function AdminSyllabusPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<EditingItem | null>(null);
  const [value, setValue] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [creatingChapterFor, setCreatingChapterFor] = useState<{
    classId: string;
    subjectId: string;
  } | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();

  const { data: tree = [], isLoading } = useQuery({
    queryKey: syllabusKeys.syllabusTree(schoolId),
    queryFn: () => api.get<ClassNode[]>('/syllabus/tree'),
    enabled: Boolean(schoolId),
  });

  const mutation = useMutation({
    mutationFn: async ({
      id,
      type,
      name,
    }: {
      id: string;
      type: EditingItem['type'];
      name: string;
    }) => {
      if (type === 'subject') {
        return api.patch(`/syllabus/subjects/${id}`, { name });
      }
      if (type === 'chapter') {
        return api.patch(`/syllabus/chapters/${id}`, { title: name });
      }
      return Promise.reject(new Error('Invalid edit type'));
    },
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId);
      toast.success('Syllabus updated');
      setEditing(null);
    },
    onError: () => {
      toast.error('Failed to save changes');
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: (payload: { classId: string; subjectId: string; title: string }) =>
      api.post('/syllabus/chapters', payload),
    onSuccess: async (_, vars) => {
      await invalidateSyllabusStructure(queryClient, schoolId);
      queryClient.invalidateQueries({
        queryKey: syllabusKeys.class(schoolId, vars.classId),
      });
      queryClient.invalidateQueries({ queryKey: ['teacher-class', vars.classId] });
      toast.success('Chapter created');
      setCreatingChapterFor(null);
      setNewChapterTitle('');
    },
    onError: () => toast.error('Failed to create chapter'),
  });

  const deleteChapterMutation = useMutation({
    mutationFn: ({ chapterId }: { chapterId: string }) =>
      api.delete(`/syllabus/chapters/${chapterId}`),
    onSuccess: async () => {
      await invalidateSyllabusStructure(queryClient, schoolId);
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      toast.success('Chapter deleted');
    },
    onError: () => toast.error('Failed to delete chapter'),
  });

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const handleToggleAll = (expand: boolean) => {
    const nextExpanded: Record<string, boolean> = {};
    if (expand) {
      tree.forEach((cls) => {
        nextExpanded[`class-${cls.id}`] = true;
        cls.subjects.forEach((sub) => {
          nextExpanded[`subject-${sub.id}`] = true;
        });
      });
    }
    setExpanded(nextExpanded);
  };

  // Dropdown Filtering Selection Logic
  const filteredTree = useMemo(() => {
    if (selectedClassId === 'all') return tree;
    return tree.filter((cls) => cls.id === selectedClassId);
  }, [tree, selectedClassId]);

  const openEdit = (item: EditingItem) => {
    setEditing(item);
    setValue(item.type === 'subject' ? item.name : item.title);
  };

  return (
    <DashboardShell title="Syllabus Management">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground max-w-xl text-sm">
          Update subject and chapter structures in real-time. Changes instantly sync down to your
          assigned teaching staff.
        </p>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(true)}
            className="text-xs"
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(false)}
            className="text-xs"
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Class Dropdown Filter Selector */}
      <div className="bg-background mb-6 flex max-w-xs items-center gap-2 rounded-md border px-3 py-1.5 shadow-sm">
        <Filter className="text-muted-foreground h-4 w-4 shrink-0" />
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full cursor-pointer bg-transparent text-sm font-medium focus:outline-none"
        >
          <option value="all">All Classes Displayed</option>
          {tree.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredTree.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No syllabus structure"
          description="Create classes and subjects first, then add chapters to build your syllabus."
        />
      ) : (
        <div className="space-y-4">
          {filteredTree.map((cls) => {
            const isClassExpanded = !!expanded[`class-${cls.id}`];
            const colors = getClassColorStyles(cls.name);

            return (
              <Card
                key={cls.id}
                className={cn(
                  'overflow-hidden border transition-all duration-300 hover:shadow-sm',
                  colors.card,
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => toggle(`class-${cls.id}`)}
                >
                  <ChevronRight
                    className={cn(
                      'text-muted-foreground h-4 w-4 transition-transform duration-200 ease-out',
                      isClassExpanded && 'rotate-90',
                    )}
                  />
                  <span className="tracking-tight">{cls.name}</span>
                  <Badge
                    className={cn('ml-auto border-none font-semibold shadow-none', colors.badge)}
                  >
                    {cls.subjects.length} subjects
                  </Badge>
                </button>

                <div
                  className={cn(
                    'bg-background grid transition-all duration-300 ease-in-out',
                    isClassExpanded
                      ? 'grid-rows-[1fr] border-t opacity-100'
                      : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-4 px-4 pb-4 pt-4">
                      {cls.subjects.map((subject) => {
                        const isSubjectExpanded = !!expanded[`subject-${subject.id}`];
                        return (
                          <div
                            key={subject.id}
                            className="border-muted/50 bg-card hover:border-muted-foreground/30 rounded-xl border p-4 transition-all duration-200"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <button
                                type="button"
                                className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80"
                                onClick={() => toggle(`subject-${subject.id}`)}
                              >
                                <ChevronRight
                                  className={cn(
                                    'text-muted-foreground h-3.5 w-3.5 transition-transform duration-200 ease-out',
                                    isSubjectExpanded && 'rotate-90',
                                  )}
                                />
                                {subject.name}
                              </button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() =>
                                  openEdit({ type: 'subject', id: subject.id, name: subject.name })
                                }
                              >
                                <Pencil className="h-3 w-3" /> Edit Subject
                              </Button>
                            </div>

                            <div
                              className={cn(
                                'duration-250 grid transition-all ease-in-out',
                                isSubjectExpanded
                                  ? 'mt-3 grid-rows-[1fr] opacity-100'
                                  : 'grid-rows-[0fr] opacity-0',
                              )}
                            >
                              <div className="overflow-hidden pl-5">
                                <div className="border-muted/60 space-y-2 border-l-2 py-1 pl-4">
                                  {subject.chapters.map((chapter) => (
                                    <div
                                      key={chapter.id}
                                      className="bg-muted/20 hover:border-muted hover:bg-muted/40 animate-in fade-in group flex items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 transition-all duration-200"
                                    >
                                      <span className="text-foreground/90 text-xs font-medium">
                                        {chapter.title}
                                      </span>
                                      <div className="flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                                          onClick={() =>
                                            openEdit({
                                              type: 'chapter',
                                              id: chapter.id,
                                              title: chapter.title,
                                            })
                                          }
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 px-2 text-xs"
                                          onClick={() => {
                                            if (
                                              confirm(
                                                `Are you sure you want to completely delete "${chapter.title}"?`,
                                              )
                                            ) {
                                              deleteChapterMutation.mutate({
                                                chapterId: chapter.id,
                                              } as any);
                                            }
                                          }}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  ))}

                                  <div className="pt-2">
                                    {creatingChapterFor?.subjectId === subject.id ? (
                                      <div className="animate-in slide-in-from-left-2 flex max-w-md items-center gap-2 duration-200">
                                        <Input
                                          value={newChapterTitle}
                                          onChange={(e) => setNewChapterTitle(e.target.value)}
                                          placeholder="e.g. Chapter 1: Introduction"
                                          className="h-8 text-xs"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          className="h-8 gap-1 px-3 text-xs"
                                          onClick={() => {
                                            if (!newChapterTitle.trim())
                                              return toast.error('Title is required');
                                            createChapterMutation.mutate({
                                              classId: creatingChapterFor.classId,
                                              subjectId: creatingChapterFor.subjectId,
                                              title: newChapterTitle.trim(),
                                            });
                                          }}
                                          disabled={createChapterMutation.isPending}
                                        >
                                          <Check className="h-3 w-3" /> Save
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 text-xs"
                                          onClick={() => setCreatingChapterFor(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="dashed"
                                        size="sm"
                                        className="text-muted-foreground hover:text-foreground h-8 text-xs"
                                        onClick={() =>
                                          setCreatingChapterFor({
                                            classId: cls.id,
                                            subjectId: subject.id,
                                          })
                                        }
                                      >
                                        + Add Chapter Module
                                      </Button>
                                    )}
                                  </div>
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
            );
          })}
        </div>
      )}

      {/* Editing Metadata Dialog Modal */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">Modify {editing?.type}</DialogTitle>
            <DialogDescription>
              Update structural identification titles across your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={`Enter new ${editing?.type} name`}
              className="focus-visible:ring-primary"
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end sm:gap-0">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editing &&
                mutation.mutate({ id: editing.id, type: editing.type, name: value.trim() })
              }
              disabled={!value.trim() || mutation.isPending}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
