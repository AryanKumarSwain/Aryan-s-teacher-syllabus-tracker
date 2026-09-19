'use client';

import { useState } from 'react';
import {
  Upload,
  Loader2,
  GraduationCap,
  Users,
  CheckCircle2,
  Layers,
  Check,
} from 'lucide-react';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';

export type ImportDataType = 'classes' | 'subjects' | 'teachers' | 'syllabus' | 'structure';

interface ImportDataButtonProps {
  type: ImportDataType;
  label?: string;
  className?: string;
}

const importTypeConfig = {
  structure: {
    title: 'Import Academic Structure',
    description: 'Copy foundation structure (classes and teachers) from a previous academic session to the current session.',
  },
  classes: {
    title: 'Import Classes',
    description: 'Copy classes and sections from a previous academic session to the current session.',
  },
  subjects: {
    title: 'Import Subjects',
    description: 'Copy subjects from a previous academic session to the current session.',
  },
  teachers: {
    title: 'Import Teachers',
    description: 'Copy teacher profiles and class-subject assignments from a previous session to the current session.',
  },
  syllabus: {
    title: 'Import Syllabus',
    description: 'Copy chapters and topics from a previous session to the current session.',
  },
};

export function ImportDataButton({ type, label, className }: ImportDataButtonProps) {
  const { sessions } = useAcademicSessions();
  const { school } = useSchool();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSourceSession, setSelectedSourceSession] = useState<string>('');

  // Options for structure import
  const [importClasses, setImportClasses] = useState(true);
  const [importTeachers, setImportTeachers] = useState(true);

  const currentSession = school?.currentAcademicSessionId;
  const currentSessionObj = sessions.find((s) => s.id === currentSession);
  const previousSessions = sessions.filter((s) => s.id !== currentSession);
  const selectedSessionObj = sessions.find((s) => s.id === selectedSourceSession);
  const config = importTypeConfig[type];

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSourceSession || !currentSession) {
        throw new Error('Please select a source session');
      }

      if (type === 'structure') {
        if (!importClasses && !importTeachers) {
          throw new Error('Please select at least classes or teachers to import');
        }

        return api.post<{ message?: string }>('/academic-sessions/import/structure', {
          sourceSessionId: selectedSourceSession,
          targetSessionId: currentSession,
          importClasses,
          importTeachers,
        });
      }

      const endpoint = {
        classes: '/academic-sessions/import/classes',
        subjects: '/academic-sessions/import/subjects',
        teachers: '/academic-sessions/import/teachers',
        syllabus: '/academic-sessions/import/syllabus',
      }[type];

      return api.post<{ message?: string }>(endpoint, {
        sourceSessionId: selectedSourceSession,
        targetSessionId: currentSession,
      });
    },
    onSuccess: async (result: any) => {
      toast.success(result?.data?.message || result?.message || `${type} imported successfully`);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['academic-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['syllabus'] });
      queryClient.invalidateQueries({ queryKey: ['syllabus-tree'] });
      queryClient.invalidateQueries({ queryKey: ['chapters'] });

      setIsOpen(false);
      setSelectedSourceSession('');
      setImportClasses(true);
      setImportTeachers(true);
    },
    onError: (error: any) => {
      toast.error(error.message || `Failed to import ${type}`);
    },
  });

  if (previousSessions.length === 0) {
    return null;
  }

  const isStructure = type === 'structure';
  const canSubmit =
    !importMutation.isPending &&
    selectedSourceSession &&
    (!isStructure || importClasses || importTeachers);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn('gap-2 border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800', className)}
      >
        <Upload className="h-4 w-4" />
        {label || `Import ${type}`}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:max-w-[480px]">
          <DialogHeader className="gap-1.5 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                {isStructure ? <Layers className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {config.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                  {config.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Current Session Context */}
          <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>
                Target Active Session: <strong className="font-semibold">{currentSessionObj?.name || 'Current'}</strong>
              </span>
            </div>
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
              Receiving
            </span>
          </div>

          <div className="space-y-4 py-2">
            {/* Source Session Select */}
            <div className="space-y-1.5">
              <Label htmlFor="source-session" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Select Source Session
              </Label>
              <Select value={selectedSourceSession} onValueChange={setSelectedSourceSession}>
                <SelectTrigger
                  id="source-session"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-left text-sm text-gray-900 shadow-xs focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
                >
                  <SelectValue placeholder="Select a session to copy from..." />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="max-h-64 w-[var(--radix-select-trigger-width)] rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {previousSessions.map((session) => (
                    <SelectItem
                      key={session.id}
                      value={session.id}
                      className="cursor-pointer rounded-md py-2 px-3 text-xs hover:bg-blue-50 focus:bg-blue-50 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
                    >
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {session.name}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {session._count.classes} classes · {session._count.teachers ?? 0} teachers
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teachers Preview when importing teachers */}
            {type === 'teachers' && selectedSessionObj && (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
                <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Teachers in {selectedSessionObj.name}
                </span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {selectedSessionObj._count.teachers ?? 0} available
                </span>
              </div>
            )}

            {/* Structure Options Selection */}
            {isStructure && (
              <div className="space-y-2.5 pt-1">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Select Data to Import
                </Label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Classes Card */}
                  <div
                    onClick={() => setImportClasses(!importClasses)}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all',
                      importClasses
                        ? 'border-blue-500 bg-blue-50/40 dark:border-blue-500/70 dark:bg-blue-950/20'
                        : 'border-gray-200 bg-white opacity-60 hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                        importClasses
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white dark:border-zinc-600 dark:bg-zinc-800',
                      )}
                    >
                      {importClasses && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          Classes & Sections
                        </span>
                        {selectedSessionObj && (
                          <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                            {selectedSessionObj._count.classes} available
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                        Import all grades, divisions, and section definitions into the active session.
                      </p>
                    </div>
                  </div>

                  {/* Teachers Card */}
                  <div
                    onClick={() => setImportTeachers(!importTeachers)}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all',
                      importTeachers
                        ? 'border-blue-500 bg-blue-50/40 dark:border-blue-500/70 dark:bg-blue-950/20'
                        : 'border-gray-200 bg-white opacity-60 hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                        importTeachers
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white dark:border-zinc-600 dark:bg-zinc-800',
                      )}
                    >
                      {importTeachers && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          Teachers & Assignments
                        </span>
                        {selectedSessionObj && (
                          <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                            {selectedSessionObj._count.teachers ?? 0} available
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                        Import teachers and map their class-subject assignments into the active session.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={importMutation.isPending}
              className="h-9 px-4 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={!canSubmit}
              className="h-9 bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              {importMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {importMutation.isPending
                ? 'Importing...'
                : label || (type === 'structure' ? 'Import Structure' : `Import ${type.charAt(0).toUpperCase() + type.slice(1)}`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
