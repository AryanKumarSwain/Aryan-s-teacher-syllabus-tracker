'use client';

import { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  BookOpen,
  BookMarked,
  Sparkles,
  ChevronRight,
  Loader2,
  Check,
  Clock,
  AlertCircle,
  ArrowRight,
  CalendarRange,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/services/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

type ImportKey = 'classes' | 'subjects' | 'teachers' | 'syllabus';

type StepStatus = 'idle' | 'pending' | 'done' | 'error';

interface ImportOption {
  key: ImportKey;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  endpoint: string;
}

interface PostSessionImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newSessionId: string;
  newSessionName: string;
  sourceSessionId: string;
  sourceSessionName: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const IMPORT_OPTIONS: ImportOption[] = [
  {
    key: 'classes',
    label: 'Classes & Sections',
    sublabel: 'All grades, divisions and sections',
    icon: <GraduationCap className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    endpoint: '/academic-sessions/import/classes',
  },
  {
    key: 'subjects',
    label: 'Subjects',
    sublabel: 'All subjects mapped to classes',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-500',
    endpoint: '/academic-sessions/import/subjects',
  },
  {
    key: 'teachers',
    label: 'Teachers & Assignments',
    sublabel: 'Teacher profiles with class-subject assignments',
    icon: <Users className="h-5 w-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-500',
    endpoint: '/academic-sessions/import/teachers',
  },
  {
    key: 'syllabus',
    label: 'Syllabus (Chapters & Topics)',
    sublabel: 'Chapter structure — no progress data',
    icon: <BookMarked className="h-5 w-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500',
    endpoint: '/academic-sessions/import/syllabus',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function PostSessionImportDialog({
  open,
  onOpenChange,
  newSessionId,
  newSessionName,
  sourceSessionId,
  sourceSessionName,
}: PostSessionImportDialogProps) {
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<ImportKey>>(
    new Set(['classes', 'subjects', 'teachers', 'syllabus']),
  );
  const [isImporting, setIsImporting] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<ImportKey, StepStatus>>({
    classes: 'idle',
    subjects: 'idle',
    teachers: 'idle',
    syllabus: 'idle',
  });
  const [currentStep, setCurrentStep] = useState<ImportKey | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<ImportKey, string>>>({});

  useEffect(() => {
    if (open) {
      setSelected(new Set(['classes', 'subjects', 'teachers', 'syllabus']));
      setIsImporting(false);
      setStepStatuses({ classes: 'idle', subjects: 'idle', teachers: 'idle', syllabus: 'idle' });
      setCurrentStep(null);
      setIsDone(false);
      setErrors({});
    }
  }, [open]);

  const toggle = (key: ImportKey) => {
    if (isImporting) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.error('Please select at least one item to import.');
      return;
    }
    setIsImporting(true);
    setErrors({});

    const ORDER: ImportKey[] = ['classes', 'subjects', 'teachers', 'syllabus'];
    const toRun = ORDER.filter((k) => selected.has(k));
    const localErrors: Partial<Record<ImportKey, string>> = {};

    for (const key of toRun) {
      const option = IMPORT_OPTIONS.find((o) => o.key === key)!;
      setCurrentStep(key);
      setStepStatuses((prev) => ({ ...prev, [key]: 'pending' }));
      try {
        await api.post(option.endpoint, {
          sourceSessionId,
          targetSessionId: newSessionId,
        });
        setStepStatuses((prev) => ({ ...prev, [key]: 'done' }));
      } catch (err: any) {
        setStepStatuses((prev) => ({ ...prev, [key]: 'error' }));
        localErrors[key] = err?.message || 'Import failed';
        setErrors((prev) => ({ ...prev, [key]: err?.message || 'Import failed' }));
      }
    }

    setCurrentStep(null);
    setIsImporting(false);
    setIsDone(true);

    ['academic-sessions', 'classes', 'subjects', 'teachers', 'teacher-classes', 'syllabus', 'syllabus-tree', 'chapters'].forEach(
      (k) => queryClient.invalidateQueries({ queryKey: [k] }),
    );

    const succeeded = toRun.filter((k) => !localErrors[k]).length;
    if (succeeded === toRun.length) {
      toast.success(`All ${succeeded} data types imported into "${newSessionName}" successfully!`);
    } else {
      toast.warning(`${succeeded}/${toRun.length} imported. Some items had errors.`);
    }
  };

  const handleClose = () => {
    if (isImporting) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-[520px]">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-6 pt-6 pb-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -right-2 top-8 h-16 w-16 rounded-full bg-white/10" />
          <DialogHeader className="relative space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-lg font-bold text-white">
                Set up your new session
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-blue-100">
              Import data from{' '}
              <span className="font-semibold text-white">{sourceSessionName}</span> into{' '}
              <span className="font-semibold text-white">{newSessionName}</span>
              {' '}<span className="text-blue-200 text-xs">(structure only, no progress)</span>
            </DialogDescription>
          </DialogHeader>

          {/* Session arrow */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <CalendarRange className="h-3.5 w-3.5 text-blue-200" />
              {sourceSessionName}
            </div>
            <ArrowRight className="h-4 w-4 text-blue-200" />
            <div className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {newSessionName}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 px-6 pt-5 pb-4">
          {!isDone ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Select what to import
              </p>
              <div className="space-y-2">
                {IMPORT_OPTIONS.map((option) => {
                  const isSelected = selected.has(option.key);
                  const status = stepStatuses[option.key];
                  const isActive = currentStep === option.key;
                  return (
                    <div
                      key={option.key}
                      onClick={() => toggle(option.key)}
                      className={cn(
                        'relative flex items-center gap-3.5 rounded-xl border p-3.5 transition-all duration-150',
                        isImporting ? 'cursor-default' : 'cursor-pointer',
                        isSelected
                          ? `${option.borderColor} bg-white shadow-sm`
                          : 'border-gray-200 bg-gray-50/60 opacity-60 hover:opacity-90',
                        isActive && 'ring-2 ring-offset-1 ring-blue-400',
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                          isSelected ? `${option.bgColor} ${option.color}` : 'bg-gray-100 text-gray-400',
                        )}
                      >
                        {option.icon}
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.sublabel}</div>
                        {errors[option.key] && (
                          <p className="mt-0.5 text-[11px] font-medium text-red-500">{errors[option.key]}</p>
                        )}
                      </div>

                      {/* Status / checkbox */}
                      <div className="shrink-0">
                        {status === 'pending' && (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        )}
                        {status === 'done' && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <Check className="h-3 w-3" /> Done
                          </span>
                        )}
                        {status === 'error' && (
                          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                            <AlertCircle className="h-3 w-3" /> Error
                          </span>
                        )}
                        {status === 'idle' && (
                          <div
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                              isSelected
                                ? `${option.borderColor} bg-white`
                                : 'border-gray-300 bg-white',
                            )}
                          >
                            {isSelected && <Check className={cn('h-3.5 w-3.5 stroke-[3]', option.color)} />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  Imports run in order: Classes → Subjects → Teachers → Syllabus.{' '}
                  <strong>No progress data</strong> (chapter completion, topic logs) is ever copied.
                </span>
              </div>
            </>
          ) : (
            /* Done screen */
            <div className="space-y-2 py-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Import complete
              </p>
              {IMPORT_OPTIONS.filter((o) => selected.has(o.key)).map((option) => {
                const status = stepStatuses[option.key];
                return (
                  <div
                    key={option.key}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3.5 py-3',
                      status === 'done'
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                        : 'border-red-200 bg-red-50/70 text-red-700',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        status === 'done' ? 'bg-emerald-100' : 'bg-red-100',
                      )}
                    >
                      {status === 'done' ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold">{option.label}</span>
                      {errors[option.key] && (
                        <p className="text-[11px] text-red-500 mt-0.5">{errors[option.key]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          {!isDone ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isImporting}
                className="h-9 gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-40"
              >
                <Clock className="h-3.5 w-3.5" />
                Do it later
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={isImporting || selected.size === 0}
                className="h-9 gap-2 bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    Import selected
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleClose}
              className="ml-auto h-9 gap-2 bg-emerald-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Check className="h-3.5 w-3.5" />
              Done — Start using {newSessionName}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
