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
  Mail,
  Loader2,
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
import { ResendCredentialsDialog } from '@/features/teachers/components/resend-credentials-dialog';
import { cn } from '@/lib/utils';
import {
  useTeachers,
  useDeleteTeacher,
  useUpdateTeacherStatus,
  useResendCredentials,
} from '@/features/teachers/hooks/use-teachers';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api-client';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { getTeacherColorStyles } from '@/features/teachers/utils/teacher-styles';

function teacherStatusBadge(status: string) {
  if (status === 'INACTIVE') {
    return (
      <Badge variant="secondary" className="text-gray-400">
        Inactive
      </Badge>
    );
  }
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

export default function AdminTeachersPage() {
  const [search, setSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [selectedTermFilter, setSelectedTermFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; user: { name: string; email: string; phone: string | null } } | null>(null);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [credentialsTeacher, setCredentialsTeacher] = useState<{ id: string; name: string; email: string } | null>(null);

  const { school, isViewMode } = useSchool();
  const { sessions } = useAcademicSessions();
  const currentSession = sessions?.find((s) => s.id === school?.currentAcademicSessionId);

  const { data, isLoading } = useTeachers({ search: search || undefined, termFilter: selectedTermFilter, academicSessionId: school?.currentAcademicSessionId || undefined });
  const deleteTeacher = useDeleteTeacher();
  const updateStatus = useUpdateTeacherStatus();
  const resendCredentials = useResendCredentials();

  const teachers = data?.items ?? [];

  const activeCount = useMemo(() => teachers.filter((t) => (t.status ?? t.user?.status) === 'ACTIVE').length, [teachers]);
  const totalTeacherClasses = useMemo(() => teachers.reduce((acc, t) => acc + (t.teacherClasses?.length ?? 0), 0), [teachers]);
  const avgTeacherProgress = useMemo(() => {
    if (!teachers.length) return 0;
    const sum = teachers.reduce((acc, t) => acc + (t.progressPercentage ?? 0), 0);
    return Math.round(sum / teachers.length);
  }, [teachers]);

  // Fetch academic years for term filter
  const { data: academicYears } = useQuery({
    queryKey: ['academic-terms', school?.currentAcademicSessionId],
    queryFn: async () => {
      const response = await api.getPaginated<any>(
        '/academic-terms',
        school?.currentAcademicSessionId ? { academicSessionId: school.currentAcademicSessionId } : undefined
      );
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
    <DashboardShell title="Faculty & Teachers">
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Banner (Matching Dashboard & Sessions) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    Faculty & Teacher Management
                  </h1>
                  <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live: {currentSession?.name || 'Active Session'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Manage teacher profiles, course allocations, syllabus tracking access, and teaching permissions.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isViewMode ? (
                <>
                  <span
                    className={cn(
                      'h-9 inline-flex items-center gap-1.5 text-xs font-bold px-3 rounded-xl border shadow-2xs',
                      teachers.length >= 50
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    {teachers.length} / 50 Teachers
                  </span>
                  <ImportDataButton type="teachers" label="Import" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkOpen(true)}
                    disabled={teachers.length >= 50}
                    className="h-9 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 shadow-2xs rounded-xl"
                  >
                    <Upload className="h-3.5 w-3.5 text-slate-500" /> Bulk Import
                  </Button>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    disabled={teachers.length >= 50}
                    className="h-9 font-bold text-xs shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 px-3.5 gap-1.5 rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Teacher
                  </Button>
                </>
              ) : (
                <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <Eye className="h-3.5 w-3.5 text-amber-600" /> Read-Only View Mode
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4 Concise KPI Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">Total Faculty</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">Teachers</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">{teachers.length}</span>
              <span className="text-[10px] font-semibold text-slate-400">faculty</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{activeCount} active instructors</p>
          </div>

          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">Active Status</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">Active</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">{activeCount}</span>
              <span className="text-[10px] font-semibold text-emerald-600">verified</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Authorized for logging</p>
          </div>

          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">Class Mappings</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">Coverage</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">{totalTeacherClasses}</span>
              <span className="text-[10px] font-semibold text-slate-400">classes</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Subject-class linkages</p>
          </div>

          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">Avg Progression</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">{avgTeacherProgress}% Avg</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">{avgTeacherProgress}%</span>
              <span className="text-[10px] font-semibold text-amber-600">completion</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Faculty delivery velocity</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs">
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative max-w-sm flex-1">
              <Search className="text-slate-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search teachers by name or email..."
                className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-slate-50/60 focus:bg-white transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-[150px]"
            >
              <option value="all">All Classes</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-[150px]"
            >
              <option value="all">All Subjects</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTermFilter}
              onChange={(e) => setSelectedTermFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-[150px]"
            >
              <option value="all">All Terms</option>
              {allTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} ({term.yearName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Showing <strong className="text-slate-800 font-black">{filteredTeachers.length}</strong> of {teachers.length} Teachers
            </span>
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
              selectedClassFilter !== 'all' || selectedSubjectFilter !== 'all' || search || isViewMode
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
                    'group animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300',
                    theme.border,
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-3.5 sm:p-4 space-y-2.5">
                    {/* Header with Avatar, Name, Email, and Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs',
                            theme.accentBg,
                            theme.accentText,
                          )}
                        >
                          {teacher.user.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase() || 'TC'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            onClick={() => (window.location.href = `/admin/teachers/${teacher.id}`)}
                            className="cursor-pointer font-bold text-slate-900 text-sm truncate hover:text-blue-600 transition-colors"
                          >
                            {teacher.user.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">{teacher.user.email}</p>
                        </div>
                      </div>
                      <div className="shrink-0">{teacherStatusBadge(status)}</div>
                    </div>

                    {/* Compact Metrics Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className={cn(
                          'flex items-center justify-between rounded-xl px-2.5 py-1.5 border border-slate-100',
                          theme.accentBg,
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <BookOpen className={cn('h-3.5 w-3.5', theme.iconColor)} />
                          <span className="text-[11px] font-semibold text-slate-500">Subjects</span>
                        </div>
                        <span className={cn('text-xs font-black', theme.accentText)}>{assignedCount}</span>
                      </div>
                      <div
                        className={cn(
                          'flex items-center justify-between rounded-xl px-2.5 py-1.5 border border-slate-100',
                          theme.accentBg,
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className={cn('h-3.5 w-3.5', theme.iconColor)} />
                          <span className="text-[11px] font-semibold text-slate-500">Progress</span>
                        </div>
                        <span className={cn('text-xs font-black', theme.accentText)}>
                          {teacher.progressPercentage ?? 0}%
                        </span>
                      </div>
                    </div>

                    {/* Subject Tags */}
                    <div className="flex flex-wrap items-center gap-1 min-h-[22px]">
                      {teacher.teacherClasses.length === 0 ? (
                        <span className="text-[10px] font-medium text-slate-400 italic">No subjects assigned</span>
                      ) : (
                        <>
                          {teacher.teacherClasses.slice(0, 2).map((tc) => (
                            <span
                              key={`${tc.classId}-${tc.subjectId || 'all'}`}
                              className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 truncate max-w-[140px]"
                            >
                              {tc.subject?.name || tc.class.name}
                            </span>
                          ))}
                          {teacher.teacherClasses.length > 2 && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                              +{teacher.teacherClasses.length - 2}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Bottom Action Row: View Details link on left, action icons on right */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => (window.location.href = `/admin/teachers/${teacher.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Details</span>
                      </button>

                      {!isViewMode && (
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Resend Credentials"
                            onClick={() => {
                              setCredentialsTeacher({
                                id: teacher.id,
                                name: teacher.user.name,
                                email: teacher.user.email,
                              });
                              setCredentialsDialogOpen(true);
                            }}
                          >
                            <Mail className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            title="Edit Teacher"
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
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title={status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
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
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete Teacher"
                            onClick={() => {
                              if (confirm('Permanently delete this teacher?')) {
                                deleteTeacher.mutate(teacher.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
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
      <ResendCredentialsDialog
        open={credentialsDialogOpen}
        onOpenChange={setCredentialsDialogOpen}
        teacher={credentialsTeacher}
      />
    </DashboardShell>
  );
}
