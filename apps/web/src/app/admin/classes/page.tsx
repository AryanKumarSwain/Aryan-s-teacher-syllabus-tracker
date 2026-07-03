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
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
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
    queryKey: syllabusKeys.classes(schoolId),
    queryFn: () => api.getPaginated<ClassItem>('/syllabus/classes', { page: 1, pageSize: 100 }),
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

  const totalSubjects = rawClassesList.reduce((s, c) => s + (c._count?.subjects ?? 0), 0);

  const handleEditClick = (cls: ClassItem) => {
    setEditingClass(cls);
    setName(cls.name);
    setSection(cls.section || '');
    setDescription(cls.description || '');
    setOpen(true);
  };

  const handleCreateClick = () => {
    setEditingClass(null);
    setName('');
    setSection('');
    setDescription('');
    setOpen(true);
  };

  const createClass = useMutation({
    mutationFn: () =>
      api.post<ClassItem>('/syllabus/classes', {
        name,
        section: section || undefined,
        description: description || undefined,
      }),
    onSuccess: async (created) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId), (old) =>
        old ? { ...old, items: [created, ...old.items], total: old.total + 1 } : old,
      );
      await invalidateSyllabusStructure(qc, schoolId);
      toast.success('Class created');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateClass = useMutation({
    mutationFn: (id: string) =>
      api.patch<ClassItem>(`/syllabus/classes/${id}`, {
        name,
        section: section || undefined,
        description: description || undefined,
      }),
    onSuccess: async (updated) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId), (old) =>
        old
          ? {
              ...old,
              items: old.items.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)),
            }
          : old,
      );
      await invalidateSyllabusStructure(qc, schoolId);
      toast.success('Class updated');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => api.delete(`/syllabus/classes/${id}`),
    onSuccess: async (_, deletedId) => {
      qc.setQueryData<PaginatedResponse<ClassItem>>(syllabusKeys.classes(schoolId), (old) =>
        old
          ? {
              ...old,
              items: old.items.filter((c) => c.id !== deletedId),
              total: Math.max(0, old.total - 1),
            }
          : old,
      );
      await invalidateSyllabusStructure(qc, schoolId);
      toast.success('Class deleted');
      setDeleteTarget(null);
      setDeleteConfirmValue('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkCreateClasses = useMutation({
    mutationFn: (classes: BulkClassRow[]) =>
      api.post<BulkCreateResponse>('/syllabus/classes/bulk', { classes }),
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: syllabusKeys.classes(schoolId) });
      await invalidateSyllabusStructure(qc, schoolId);
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
    XUtils.book_append_sheet(wb, ws, 'Classes');
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
  };

  return (
    <DashboardShell title="Classes">
      <div className="space-y-6">
        {/* Summary Stats */}
        {!isLoading && rawClassesList.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-3 duration-300 sm:grid-cols-3">
            {[
              {
                label: 'Total Classes',
                value: rawClassesList.length,
                icon: LayoutGrid,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Total Subjects',
                value: totalSubjects,
                icon: BookOpen,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                label: 'Showing',
                value: filteredClassesList.length,
                icon: Target,
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

        {/* Search + Actions */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <ImportDataButton type="classes" label="Import Classes" />
            <Button onClick={() => setBulkUploadOpen(true)} variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" /> Bulk Upload
            </Button>
            <Button onClick={handleCreateClick} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Class
            </Button>
          </div>
        </div>

        {/* Class Cards */}
        {isLoading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : filteredClassesList.length === 0 && !isFetching ? (
          <EmptyState
            icon={GraduationCap}
            title={search ? 'No classes match your search' : 'No classes yet'}
            description={
              search
                ? 'Try a different search term.'
                : 'Create classes to organize subjects and syllabus.'
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
              const remaining = total - done;

              // Pick color theme based on array index looping
              const theme = CARD_THEMES[i % CARD_THEMES.length];

              return (
                <div
                  key={cls.id}
                  className="animate-in fade-in slide-in-from-bottom-2 group relative duration-300"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Card
                    className={cn(
                      'h-full border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                      theme.border,
                    )}
                  >
                    <CardContent className="p-5">
                      {/* Title row */}
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-gray-800">
                            {cls.name}
                          </h3>
                          {cls.section && (
                            <p className="text-muted-foreground text-sm">Section {cls.section}</p>
                          )}
                        </div>
                        <button
                          onClick={() => router.push(`/admin/classes/${cls.id}`)}
                          className={cn(
                            'text-muted-foreground transition-colors',
                            `hover:${theme.accentText}`,
                          )}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Mini stats */}
                      <div className="mb-4 grid grid-cols-3 gap-2">
                        <div
                          className={cn(
                            'flex flex-col items-center rounded-xl px-2 py-2.5 transition-colors',
                            theme.accentBg,
                          )}
                        >
                          <BookOpen className={cn('mb-1 h-4 w-4', theme.iconColor)} />
                          <span className={cn('text-base font-bold', theme.accentText)}>
                            {subjects}
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
                            {done}
                          </span>
                          <span className="text-muted-foreground text-[10px]">Done</span>
                        </div>
                        <div
                          className={cn(
                            'flex flex-col items-center rounded-xl px-2 py-2.5 transition-colors',
                            theme.accentBg,
                          )}
                        >
                          <Target className={cn('mb-1 h-4 w-4', theme.iconColor)} />
                          <span className={cn('text-base font-bold', theme.accentText)}>
                            {remaining}
                          </span>
                          <span className="text-muted-foreground text-[10px]">Left</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {done} of {total} chapters
                          </span>
                          <span className="font-bold text-gray-700">{pct}%</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-full rounded-full bg-gradient-to-r transition-all duration-700',
                              theme.progressGradient,
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Action buttons — show on hover */}
                      <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground h-7 w-7"
                          onClick={() => router.push(`/admin/classes/${cls.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground h-7 w-7"
                          onClick={() => handleEditClick(cls)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"
                          onClick={() => {
                            setDeleteTarget(cls);
                            setDeleteConfirmValue('');
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
              className="mt-2 w-full active:scale-[0.99]"
              onClick={() =>
                editingClass ? updateClass.mutate(editingClass.id) : createClass.mutate()
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
