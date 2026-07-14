'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Ban,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  Eye,
  BookOpen,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { CreateTeacherDialog } from '@/features/teachers/components/create-teacher-dialog';
import { BulkImportTeachersDialog } from '@/features/teachers/components/bulk-import-dialog';
import { EditTeacherDialog } from '@/features/teachers/components/edit-teacher-dialog';
import { cn } from '@/lib/utils';
import {
  useTeachers,
  useDeleteTeacher,
  useUpdateTeacherStatus,
} from '@/features/teachers/hooks/use-teachers';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api-client';
import { useSchool } from '@/features/syllabus/hooks/use-school';

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

const CARD_THEMES = [
  {
    border: 'hover:border-blue-200',
    accentBg: 'bg-blue-50/70',
    accentText: 'text-blue-600',
    iconColor: 'text-blue-500',
  },
  {
    border: 'hover:border-purple-200',
    accentBg: 'bg-purple-50/70',
    accentText: 'text-purple-600',
    iconColor: 'text-purple-500',
  },
  {
    border: 'hover:border-emerald-200',
    accentBg: 'bg-emerald-50/70',
    accentText: 'text-emerald-600',
    iconColor: 'text-emerald-500',
  },
  {
    border: 'hover:border-amber-200',
    accentBg: 'bg-amber-50/70',
    accentText: 'text-amber-600',
    iconColor: 'text-amber-500',
  },
  {
    border: 'hover:border-rose-200',
    accentBg: 'bg-rose-50/70',
    accentText: 'text-rose-600',
    iconColor: 'text-rose-500',
  },
  {
    border: 'hover:border-cyan-200',
    accentBg: 'bg-cyan-50/70',
    accentText: 'text-cyan-600',
    iconColor: 'text-cyan-500',
  },
];

export function getTeacherColorStyles(id: string): (typeof CARD_THEMES)[0] {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return CARD_THEMES[sum % CARD_THEMES.length]!;
}

export default function AdminTeachersPage() {
  const [search, setSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [selectedTermFilter, setSelectedTermFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; user: { name: string; email: string; phone: string | null } } | null>(null);

  const { school } = useSchool();

  const { data, isLoading } = useTeachers({ search: search || undefined, termFilter: selectedTermFilter, academicSessionId: school?.currentAcademicSessionId });
  const deleteTeacher = useDeleteTeacher();
  const updateStatus = useUpdateTeacherStatus();

  const teachers = data?.items ?? [];

  // Fetch academic years for term filter
  const { data: academicYears } = useQuery({
    queryKey: ['academic-terms'],
    queryFn: async () => {
      const response = await api.getPaginated<any>('/academic-terms');
      return {
        ...response,
        items: response.items.map((year: any) => ({
          ...year,
          terms: typeof year.terms === 'string' ? JSON.parse(year.terms) : year.terms || [],
        })),
      };
    },
  });

  // Extract all terms from academic years
  const allTerms = useMemo(() => {
    if (!academicYears?.items) return [];
    const terms: { id: string; name: string; yearId: string; yearName: string }[] = [];
    academicYears.items.forEach((year: any) => {
      if (year.terms && Array.isArray(year.terms)) {
        year.terms.forEach((term: any, index: number) => {
          terms.push({
            id: `${year.id}-${index}`,
            name: term.name || `Term ${index + 1}`,
            yearId: year.id,
            yearName: year.name,
          });
        });
      }
    });
    return terms;
  }, [academicYears]);

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search teachers..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
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
                className="border-input bg-background focus-visible:ring-ring flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              >
                <option value="all">All Subjects</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={selectedTermFilter}
                onChange={(e) => setSelectedTermFilter(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              >
                <option value="all">All Terms</option>
                {allTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} ({term.yearName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ImportDataButton type="teachers" label="Import Teachers" />
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Bulk import
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add teacher
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
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
            description="Try adjusting your search criteria or add teachers to get started."
            action={
              selectedClassFilter !== 'all' || selectedSubjectFilter !== 'all' || search
                ? undefined
                : { label: 'Add teacher', onClick: () => setDialogOpen(true) }
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTeachers.map((teacher, i) => {
              const status = teacher.status ?? teacher.user.status;
              const theme = getTeacherColorStyles(teacher.id);
              const assignedCount = teacher.teacherClasses.length;

              return (
                <Card
                  key={teacher.id}
                  className={cn(
                    'group animate-in fade-in slide-in-from-bottom-2 h-full border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                    theme.border,
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-gray-900">{teacher.user.name}</h3>
                        <p className="text-muted-foreground text-xs">{teacher.user.email}</p>
                      </div>
                      <button
                        onClick={() => (window.location.href = `/admin/teachers/${teacher.id}`)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Status badge */}
                    <div className="mb-3">{teacherStatusBadge(status)}</div>

                    {/* Stats */}
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <div
                        className={cn(
                          'flex flex-col items-center rounded-xl px-2 py-2.5 transition-colors',
                          theme.accentBg,
                        )}
                      >
                        <BookOpen className={cn('mb-1 h-4 w-4', theme.iconColor)} />
                        <span className={cn('text-base font-bold', theme.accentText)}>
                          {assignedCount}
                        </span>
                        <span className="text-muted-foreground text-[10px]">Subjects</span>
                      </div>
                      <div
                        className={cn(
                          'flex flex-col items-center rounded-xl px-2 py-2.5 transition-colors',
                          theme.accentBg,
                        )}
                      >
                        <CheckCircle2 className={cn('mb-1 h-4 w-4', theme.iconColor)} />
                        <span className={cn('text-base font-bold', theme.accentText)}>
                          {teacher.progressPercentage ?? 0}%
                        </span>
                        <span className="text-muted-foreground text-[10px]">Progress</span>
                      </div>
                    </div>

                    {/* View progress button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-3 w-full text-xs"
                      onClick={() => {
                        window.location.href = `/admin/teachers/${teacher.id}`;
                      }}
                    >
                      <Eye className="mr-1.5 h-3 w-3" />
                      View details
                    </Button>

                    {/* Subject badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {teacher.teacherClasses.length === 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          No subjects assigned
                        </Badge>
                      )}
                      {teacher.teacherClasses.slice(0, 3).map((tc) => (
                        <Badge
                          key={`${tc.classId}-${tc.subjectId || 'all'}`}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {tc.subject?.name || tc.class.name}
                        </Badge>
                      ))}
                      {teacher.teacherClasses.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{teacher.teacherClasses.length - 3} more
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-7 w-7"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-7 w-7"
                        onClick={() => {
                          updateStatus.mutate({
                            id: teacher.id,
                            status: status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                          });
                        }}
                        disabled={updateStatus.isPending}
                      >
                        {status === 'SUSPENDED' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Ban className="h-3.5 w-3.5 text-amber-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"
                        onClick={() => {
                          if (confirm('Permanently delete this teacher?')) {
                            deleteTeacher.mutate(teacher.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateTeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <BulkImportTeachersDialog open={bulkOpen} onOpenChange={setBulkOpen} />
      <EditTeacherDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} teacher={selectedTeacher} />
    </DashboardShell>
  );
}
