'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Plus,
  Trash2,
  Pencil,
  Eye,
  Upload,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  Target,
  LayoutGrid,
  Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import type { PaginatedResponse } from '@school-syllabus/types';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { syllabusKeys } from '@/features/syllabus/query-keys';
import { invalidateSyllabusStructure } from '@/features/syllabus/invalidate-syllabus';
import { Badge } from '@/components/ui/badge';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { ImportDataButton } from '@/components/admin/import-data-button';

interface ClassItem {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  description?: string | null;
  totalChapters?: number;
  completedChapters?: number;
  progress?: number;
  _count?: { subjects: number };
}

interface BulkClassRow {
  name: string;
  section?: string;
  description?: string;
}

interface BulkCreateResponse {
  created: number;
  items: ClassItem[];
}

interface BulkResult {
  name: string;
  success: boolean;
  error?: string;
}

// 🎨 Dynamic color themes array for class cards
const CARD_THEMES = [
  {
    border: 'hover:border-blue-200',
    accentBg: 'bg-blue-50/70',
    accentText: 'text-blue-600',
    iconColor: 'text-blue-500',
    progressGradient: 'from-blue-500 to-indigo-500',
  },
  {
    border: 'hover:border-purple-200',
    accentBg: 'bg-purple-50/70',
    accentText: 'text-purple-600',
    iconColor: 'text-purple-500',
    progressGradient: 'from-purple-500 to-indigo-600',
  },
  {
    border: 'hover:border-emerald-200',
    accentBg: 'bg-emerald-50/70',
    accentText: 'text-emerald-600',
    iconColor: 'text-emerald-500',
    progressGradient: 'from-emerald-500 to-teal-600',
  },
  {
    border: 'hover:border-amber-200',
    accentBg: 'bg-amber-50/70',
    accentText: 'text-amber-600',
    iconColor: 'text-amber-500',
    progressGradient: 'from-amber-500 to-orange-500',
  },
  {
    border: 'hover:border-rose-200',
    accentBg: 'bg-rose-50/70',
    accentText: 'text-rose-600',
    iconColor: 'text-rose-500',
    progressGradient: 'from-rose-500 to-pink-500',
  },
  {
    border: 'hover:border-cyan-200',
    accentBg: 'bg-cyan-50/70',
    accentText: 'text-cyan-600',
    iconColor: 'text-cyan-500',
    progressGradient: 'from-cyan-500 to-blue-600',
  },
];

export default function AdminClassesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const schoolId = useSchoolId();
  const { school, isViewMode } = useSchool();
  const { sessions } = useAcademicSessions();
  const currentSession = sessions?.find((s) => s.id === school?.currentAcademicSessionId);

  const [open, setOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');
  const [bulkPreview, setBulkPreview] = useState<BulkClassRow[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: syllabusKeys.classes(schoolId, school?.currentAcademicSessionId),
    queryFn: () => api.getPaginated<ClassItem>('/syllabus/classes', { 
      page: 1, 
      pageSize: 100,
      ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
    }),
    enabled: Boolean(schoolId),
  });

  const rawClassesList = data?.items ?? [];

  const filteredClassesList = useMemo(() => {
    if (!search.trim()) return rawClassesList;
    const q = search.toLowerCase();
    return rawClassesList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.section?.toLowerCase().includes(q) ||
        c.grade?.toLowerCase().includes(q),
    );
  }, [rawClassesList, search]);

  const totalSubjects = useMemo(() => rawClassesList.reduce((s, c) => s + (c._count?.subjects ?? 0), 0), [rawClassesList]);
  const totalChapters = useMemo(() => rawClassesList.reduce((s, c) => s + (c.totalChapters ?? 0), 0), [rawClassesList]);
  const totalDoneChapters = useMemo(() => rawClassesList.reduce((s, c) => s + (c.completedChapters ?? 0), 0), [rawClassesList]);
  const avgProgress = useMemo(
    () =>
      rawClassesList.length > 0
        ? Math.round(rawClassesList.reduce((s, c) => s + (c.progress ?? 0), 0) / rawClassesList.length)
        : 0,
    [rawClassesList],
  );

  const handleEditClick = (cls: ClassItem) => {
    if (isViewMode) {
      toast.error('Cannot edit class in View Mode');
      return;
    }
    setEditingClass(cls);
    setName(cls.name);
    setSection(cls.section || '');
    setDescription(cls.description || '');
    setOpen(true);
  };

  const handleCreateClick = () => {
    if (isViewMode) {
      toast.error('Cannot create class in View Mode');
      return;
    }
    setEditingClass(null);
    setName('');
    setSection('');
    setDescription('');
    setOpen(true);
  };

  const createClass = useMutation({
    mutationFn: () => {
      if (isViewMode) {
        throw new Error('Cannot create class in View Mode. Switch to active session to make changes.');
      }
      if (!school?.currentAcademicSessionId) {
        throw new Error('No active academic session found. Please create or select a session first.');
      }
      return api.post<ClassItem>('/syllabus/classes', {
        academicSessionId: school.currentAcademicSessionId,
        name,
        section: section || undefined,
        description: description || undefined,
      });
    },
    onSuccess: async (created) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId, school?.currentAcademicSessionId), (old) =>
        old ? { ...old, items: [created, ...old.items], total: old.total + 1 } : old,
      );
      await invalidateSyllabusStructure(qc, schoolId, school?.currentAcademicSessionId);
      toast.success('Class created');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateClass = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; section?: string; description?: string }) => {
      if (isViewMode) {
        throw new Error('Cannot edit class in View Mode. Switch to active session to make changes.');
      }
      return api.patch<ClassItem>(`/syllabus/classes/${id}`, {
        academicSessionId: school?.currentAcademicSessionId,
        ...body,
      });
    },
    onSuccess: async (updated) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId, school?.currentAcademicSessionId), (old) =>
        old
          ? {
              ...old,
              items: old.items.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)),
            }
          : old,
      );
      await invalidateSyllabusStructure(qc, schoolId, school?.currentAcademicSessionId);
      toast.success('Class updated');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => {
      if (isViewMode) {
        throw new Error('Cannot delete class in View Mode. Switch to active session to make changes.');
      }
      return api.delete(`/syllabus/classes/${id}`);
    },
    onSuccess: async (_, deletedId) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId, school?.currentAcademicSessionId), (old) =>
        old
          ? {
              ...old,
              items: old.items.filter((c) => c.id !== deletedId),
              total: Math.max(0, old.total - 1),
            }
          : old,
      );
      await invalidateSyllabusStructure(qc, schoolId, school?.currentAcademicSessionId);
      toast.success('Class deleted');
      setDeleteTarget(null);
      setDeleteConfirmValue('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkCreateClasses = useMutation({
    mutationFn: (classes: BulkClassRow[]) => {
      if (isViewMode) {
        throw new Error('Cannot create classes in View Mode. Switch to active session to make changes.');
      }
      if (!school?.currentAcademicSessionId) {
        throw new Error('No active academic session found. Please create or select a session first.');
      }
      return api.post<BulkCreateResponse>('/syllabus/classes/bulk', {
        academicSessionId: school.currentAcademicSessionId,
        classes,
      });
    },
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: syllabusKeys.classes(schoolId, school?.currentAcademicSessionId) });
      await invalidateSyllabusStructure(qc, schoolId, school?.currentAcademicSessionId);
      toast.success(`${result.created} classes created`);
      setBulkResults(bulkPreview.map((r) => ({ name: r.name, success: true })));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetBulkUpload = () => {
    setBulkPreview([]);
    setBulkResults(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Section', 'Description'],
      ['Class 1', 'Section A', 'Description'],
      ['Class 2', 'Section B', ''],
    ]);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classes');
    XLSX.writeFile(wb, 'classes_template.xlsx');
  };

  const parseExcel = (file: File): Promise<BulkClassRow[]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]!];
          if (!ws) {
            reject(new Error('Sheet not found'));
            return;
          }
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(
            rows
              .map((r) => ({
                name: String(r['Name'] || r['name'] || '').trim(),
                section: String(r['Section'] || r['section'] || '').trim() || undefined,
                description: String(r['Description'] || r['description'] || '').trim() || undefined,
              }))
              .filter((r) => r.name),
          );
        } catch {
          reject(new Error('Failed to parse Excel'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Upload an Excel file');
      return;
    }
    setParsing(true);
    try {
      const rows = await parseExcel(file);
      if (!rows.length) {
        toast.error('No valid rows found');
        return;
      }
      if (rows.length > 100) {
        toast.error('Max 100 classes per import');
        return;
      }
      setBulkPreview(rows);
      setBulkResults(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setParsing(false);
    }
  };  return (
    <DashboardShell title="Classes & Cohorts">
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Welcome & Status Banner (Matching Dashboard and Sessions page) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    Class & Cohort Management
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
                  Organize grade levels, sections, subject mappings, and curriculum pacing progress.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isViewMode ? (
                <>
                  <span
                    className={cn(
                      'h-9 inline-flex items-center gap-1.5 text-xs font-bold px-3 rounded-xl border shadow-2xs',
                      rawClassesList.length >= 100
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    {rawClassesList.length} / 100 Classes
                  </span>
                  <ImportDataButton type="classes" label="Import" />
                  <Button
                    onClick={() => setBulkUploadOpen(true)}
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 shadow-2xs rounded-xl"
                    disabled={rawClassesList.length >= 100}
                  >
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    Bulk Upload
                  </Button>
                  <Button
                    onClick={handleCreateClick}
                    size="sm"
                    className="h-9 font-bold text-xs shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 px-3.5 gap-1.5 rounded-xl cursor-pointer active:scale-95 transition-all"
                    disabled={rawClassesList.length >= 100}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Class
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

        {/* 4 Concise Overview KPI Metric Cards (Matching Dashboard lines 565-660) */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Total Classes Card - Blue */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Total Classes
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                Cohorts
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {rawClassesList.length}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">grades</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Active learning divisions
            </p>
          </div>

          {/* Total Subjects Card - Purple */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Total Subjects
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                Curriculum
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {totalSubjects}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">mapped</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Assigned across all classes
            </p>
          </div>

          {/* Chapters Tracked Card - Amber */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Chapters Tracked
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                {totalDoneChapters}/{totalChapters}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {totalChapters}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">total</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              {totalDoneChapters} chapters completed
            </p>
          </div>

          {/* Syllabus Progress Card - Emerald */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Avg Syllabus Pace
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                {avgProgress}% Passed
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {avgProgress}%
              </span>
              <span className="text-[10px] font-semibold text-emerald-600">completion</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Average across all cohorts
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs">
          <div className="relative w-full max-w-sm">
            <Search className="text-slate-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes by name or section..."
              className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-slate-50/60 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Showing <strong className="text-slate-800 font-black">{filteredClassesList.length}</strong> of {rawClassesList.length} Classes
            </span>
          </div>
        </div>

        {/* Class Cards */}
        {isLoading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filteredClassesList.length === 0 && !isFetching ? (
          <EmptyState
            icon={GraduationCap}
            title={search ? 'No classes match your search' : 'No classes yet'}
            description={
              search
                ? 'Try a different search term or clear your search input.'
                : 'Create classes to organize sections, subjects, and curriculum pacing.'
            }
            action={!search ? { label: 'Add Class', onClick: handleCreateClick } : undefined}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClassesList.map((cls, i) => {
              const pct = Math.round(cls.progress ?? 0);
              const done = cls.completedChapters ?? 0;
              const total = cls.totalChapters ?? 0;
              const subjects = cls._count?.subjects ?? 0;
              const remaining = Math.max(0, total - done);
              const theme = CARD_THEMES[i % CARD_THEMES.length]!;

              return (
                <div
                  key={cls.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
                >
                  {/* Top Accent Gradient Line */}
                  <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', theme.progressGradient)} />

                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black tracking-tight text-[#0b1c30] truncate group-hover:text-emerald-700 transition-colors">
                            {cls.name}
                          </h3>
                          {cls.section && (
                            <span className="rounded-md bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                              Sec {cls.section}
                            </span>
                          )}
                        </div>
                        {cls.description ? (
                          <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                            {cls.description}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {subjects} subjects allocated
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => router.push(`/admin/classes/${cls.id}`)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/70 bg-slate-50 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer"
                        title="View Class Details"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 3 Mini Stats Box */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className={cn('flex flex-col items-center justify-center rounded-xl p-2.5 transition-colors border border-slate-100', theme.accentBg)}>
                        <BookOpen className={cn('h-3.5 w-3.5 mb-1', theme.iconColor)} />
                        <span className={cn('text-sm font-black', theme.accentText)}>{subjects}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Subjects</span>
                      </div>
                      <div className={cn('flex flex-col items-center justify-center rounded-xl p-2.5 transition-colors border border-slate-100', theme.accentBg)}>
                        <CheckCircle2 className={cn('h-3.5 w-3.5 mb-1', theme.iconColor)} />
                        <span className={cn('text-sm font-black', theme.accentText)}>{done}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Done</span>
                      </div>
                      <div className={cn('flex flex-col items-center justify-center rounded-xl p-2.5 transition-colors border border-slate-100', theme.accentBg)}>
                        <Target className={cn('h-3.5 w-3.5 mb-1', theme.iconColor)} />
                        <span className={cn('text-sm font-black', theme.accentText)}>{remaining}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Left</span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold text-[11px]">
                          {done} of {total} chapters
                        </span>
                        <span className="font-black text-[#0b1c30] text-xs">{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', theme.progressGradient)}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => router.push(`/admin/classes/${cls.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Class</span>
                    </button>

                    {!isViewMode && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Edit Class"
                          onClick={() => handleEditClick(cls)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Class"
                          onClick={() => {
                            setDeleteTarget(cls);
                            setDeleteConfirmValue('');
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingClass ? 'Edit Class' : 'New Class'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Name <span className="text-red-500">*</span>
              </Label>
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
                placeholder="Optional description"
              />
            </div>
            <Button
              className="mt-2 w-full active:scale-[0.99] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
              onClick={() =>
                editingClass
                  ? updateClass.mutate({ id: editingClass.id, name, section, description })
                  : createClass.mutate()
              }
              disabled={!name.trim() || createClass.isPending || updateClass.isPending}
            >
              {editingClass ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteConfirmValue('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold">Delete Class</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{deleteTarget?.name}</strong> and all nested subjects
              and chapters. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">
              Type <span className="font-bold underline">{deleteTarget?.name}</span> to confirm:
            </Label>
            <Input
              value={deleteConfirmValue}
              onChange={(e) => setDeleteConfirmValue(e.target.value)}
              placeholder={deleteTarget?.name ?? ''}
              className="focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmValue !== deleteTarget?.name || deleteClass.isPending}
              onClick={() => deleteTarget && deleteClass.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog
        open={bulkUploadOpen}
        onOpenChange={(v) => {
          if (!v) resetBulkUpload();
          setBulkUploadOpen(v);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Classes</DialogTitle>
            <DialogDescription>Download the template, fill it in, then upload.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Step 1 — Download template</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                    Name · Section · Description
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            </div>

            {!bulkResults && (
              <div>
                <p className="mb-2 text-sm font-medium">Step 2 — Upload filled Excel</p>
                {bulkPreview.length === 0 ? (
                  <label
                    className="border-muted-foreground/30 hover:border-primary flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) handleFile(f);
                    }}
                  >
                    <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      {parsing ? 'Parsing…' : 'Click or drag & drop Excel file'}
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </label>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        {bulkPreview.length} class{bulkPreview.length > 1 ? 'es' : ''} ready
                      </p>
                      <Button size="sm" variant="ghost" onClick={resetBulkUpload}>
                        <X className="mr-1 h-3 w-3" /> Clear
                      </Button>
                    </div>
                    <div className="max-h-52 overflow-y-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground sticky top-0 text-xs">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Section</th>
                            <th className="px-3 py-2 text-left">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreview.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="text-muted-foreground px-3 py-2">{i + 1}</td>
                              <td className="px-3 py-2 font-medium">{row.name}</td>
                              <td className="text-muted-foreground px-3 py-2">
                                {row.section || '—'}
                              </td>
                              <td className="text-muted-foreground px-3 py-2">
                                {row.description || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {bulkResults && (
              <div>
                <p className="mb-2 text-sm font-medium">Import Results</p>
                <div className="max-h-60 overflow-y-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground sticky top-0 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2">
                            {r.success ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" /> Imported
                              </span>
                            ) : (
                              <span className="text-destructive flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" /> {r.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={() => {
                    resetBulkUpload();
                    setBulkUploadOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            )}

            {bulkPreview.length > 0 && !bulkResults && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetBulkUpload}
                  disabled={bulkCreateClasses.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={bulkCreateClasses.isPending}
                  onClick={() => bulkCreateClasses.mutate(bulkPreview)}
                >
                  {bulkCreateClasses.isPending
                    ? `Importing ${bulkPreview.length}…`
                    : `Import ${bulkPreview.length} classes`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
