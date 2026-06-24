'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Ban, CheckCircle2, Plus, Search, Trash2, Upload, Users, Eye } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { CreateTeacherDialog } from '@/features/teachers/components/create-teacher-dialog';
import { BulkImportTeachersDialog } from '@/features/teachers/components/bulk-import-dialog';
import { cn } from '@/lib/utils';
import {
  useTeachers,
  useDeleteTeacher,
  useUpdateTeacherStatus,
} from '@/features/teachers/hooks/use-teachers';

function teacherStatusBadge(status: string) {
  if (status === 'SUSPENDED') {
    return (
      <Badge variant="warning" className="animate-pulse">
        Suspended
      </Badge>
    );
  }
  if (status === 'ACTIVE') {
    return <Badge variant="success">Active</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

export function getTeacherColorStyles(id: string) {
  const themes = [
    {
      border: 'hover:border-blue-500/50 dark:hover:border-blue-400/40',
      accent: 'text-blue-600 dark:text-blue-400 bg-blue-500/5',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    {
      border: 'hover:border-emerald-500/50 dark:hover:border-emerald-400/40',
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    {
      border: 'hover:border-violet-500/50 dark:hover:border-violet-400/40',
      accent: 'text-violet-600 dark:text-violet-400 bg-violet-500/5',
      badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    },
    {
      border: 'hover:border-amber-500/50 dark:hover:border-amber-400/40',
      accent: 'text-amber-600 dark:text-amber-400 bg-amber-500/5',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    },
    {
      border: 'hover:border-rose-500/50 dark:hover:border-rose-400/40',
      accent: 'text-rose-600 dark:text-rose-400 bg-rose-500/5',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    },
    {
      border: 'hover:border-cyan-500/50 dark:hover:border-cyan-400/40',
      accent: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/5',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    },
    {
      border: 'hover:border-indigo-500/50 dark:hover:border-indigo-400/40',
      accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/5',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    },
    {
      border: 'hover:border-fuchsia-500/50 dark:hover:border-fuchsia-400/40',
      accent: 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/5',
      badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
    },
  ];

  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return themes[sum % themes.length];
}

export default function AdminTeachersPage() {
  const [search, setSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data, isLoading } = useTeachers({ search: search || undefined });
  const deleteTeacher = useDeleteTeacher();
  const updateStatus = useUpdateTeacherStatus();

  const teachers = data?.items ?? [];

  const classOptions = useMemo(() => {
    const classesMap = new Map<string, string>();
    teachers.forEach((t) => {
      t.teacherClasses?.forEach((tc) => {
        if (tc.class?.id && tc.class?.name) {
          classesMap.set(tc.class.id, tc.class.name);
        }
      });
    });
    return Array.from(classesMap.entries()).map(([id, name]) => ({ id, name }));
  }, [teachers]);

  const subjectOptions = useMemo(() => {
    const subjectsMap = new Map<string, string>();
    teachers.forEach((t) => {
      t.teacherClasses?.forEach((tc) => {
        if (tc.subject?.id && tc.subject?.name) {
          subjectsMap.set(tc.subject.id, tc.subject.name);
        }
      });
    });
    return Array.from(subjectsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesClass =
        selectedClassFilter === 'all' ||
        teacher.teacherClasses.some((tc) => tc.classId === selectedClassFilter);

      const matchesSubject =
        selectedSubjectFilter === 'all' ||
        teacher.teacherClasses.some((tc) => tc.subjectId === selectedSubjectFilter);

      return matchesClass && matchesSubject;
    });
  }, [teachers, selectedClassFilter, selectedSubjectFilter]);

  return (
    <DashboardShell title="Teachers">
      <div className="space-y-6">
        {/* Filtering Toolbar */}
        <div className="bg-muted/20 border-border/60 flex flex-col gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search teachers..."
                className="bg-background pl-9 transition-all focus-visible:ring-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-1"
              >
                <option value="all">All Classes</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-1"
              >
                <option value="all">All Subjects</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkOpen(true)}
              className="hover:bg-muted/80 transition-all active:scale-95"
            >
              <Upload className="mr-2 h-4 w-4" /> Bulk import
            </Button>
            <Button
              onClick={() => setDialogOpen(true)}
              className="shadow-sm transition-all active:scale-95"
            >
              <Plus className="mr-2 h-4 w-4" /> Add teacher
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredTeachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              selectedClassFilter !== 'all' || selectedSubjectFilter !== 'all' || search
                ? 'No matches found'
                : 'No teachers yet'
            }
            description="Try altering your search filters or structure configuration tags."
            action={
              selectedClassFilter !== 'all' || selectedSubjectFilter !== 'all' || search
                ? undefined
                : { label: 'Add teacher', onClick: () => setDialogOpen(true) }
            }
          />
        ) : (
          <Card className="border-border/60 animate-fade-in overflow-hidden border shadow-sm duration-300">
            <div className="divide-border/40 divide-y">
              {filteredTeachers.map((teacher) => {
                const status = teacher.status ?? teacher.user.status;
                const theme = getTeacherColorStyles(teacher.id);

                return (
                  <div
                    key={teacher.id}
                    className={cn(
                      'hover:bg-muted/5 flex flex-col gap-4 border-l-4 border-l-transparent p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between',
                      theme.border,
                    )}
                  >
                    {/* Left Side: Text Details (Status badge removed from here) */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/teachers/${teacher.id}`}
                          className="text-foreground hover:text-primary truncate font-semibold decoration-2 underline-offset-2 transition-colors hover:underline"
                        >
                          {teacher.user.name}
                        </Link>
                      </div>
                      <p className="text-muted-foreground truncate text-xs font-medium tracking-tight">
                        {teacher.user.email}
                      </p>
                      {teacher.user.phone && (
                        <p className="text-muted-foreground text-xs">{teacher.user.phone}</p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                        {teacher.teacherClasses.length === 0 && (
                          <Badge variant="secondary" className="text-[10px] tracking-tight">
                            No subject assigned
                          </Badge>
                        )}
                        {teacher.teacherClasses.map((tc) => (
                          <Badge
                            key={`${tc.classId}-${tc.subjectId || 'all'}`}
                            variant="outline"
                            className={cn(
                              'border-border/80 text-[11px] font-medium shadow-none',
                              theme.badge,
                            )}
                          >
                            {tc.class.name}
                            {tc.subject?.name ? ` (${tc.subject.name})` : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Right Side: Stacked Status Badge directly above the Actions Layout */}
                    <div className="flex shrink-0 flex-col items-end gap-2 self-end sm:self-center">
                      {/* Status Badge Positioned Precisely Above */}
                      <div>{teacherStatusBadge(status)}</div>

                      {/* Action Icon Row */}
                      <div className="bg-background/40 border-border/40 flex items-center gap-1.5 rounded-lg border p-1 sm:border-none sm:bg-transparent sm:p-0">
                        <Link href={`/admin/teachers/${teacher.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-muted bg-background border-border/40 text-muted-foreground hover:text-foreground h-8 w-8 rounded-md border shadow-sm transition-colors"
                            title="View profile details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-muted bg-background border-border/40 h-8 w-8 rounded-md border shadow-sm transition-colors"
                          title={status === 'SUSPENDED' ? 'Reactivate teacher' : 'Suspend teacher'}
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              id: teacher.id,
                              status: status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                            })
                          }
                        >
                          {status === 'SUSPENDED' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Ban className="h-4 w-4 text-amber-600" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-background border-border/40 h-8 w-8 rounded-md border shadow-sm transition-colors"
                          title="Delete teacher"
                          onClick={() => {
                            if (
                              confirm(
                                'Permanently delete this teacher? They will be removed from the system.',
                              )
                            ) {
                              deleteTeacher.mutate(teacher.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <CreateTeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <BulkImportTeachersDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </DashboardShell>
  );
}
