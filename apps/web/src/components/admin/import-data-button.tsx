'use client';

import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
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

export type ImportDataType = 'classes' | 'subjects' | 'teachers' | 'syllabus';

interface ImportDataButtonProps {
  type: ImportDataType;
  label?: string;
}

const importTypeConfig = {
  classes: {
    title: 'Import Classes',
    description: 'Copy classes from a previous academic session to the current session.',
  },
  subjects: {
    title: 'Import Subjects',
    description: 'Copy subjects from a previous academic session to the current session.',
  },
  teachers: {
    title: 'Import Teacher Assignments',
    description: 'Copy teacher-class assignments from a previous session to the current session.',
  },
  syllabus: {
    title: 'Import Syllabus',
    description: 'Copy chapters and topics from a previous session to the current session.',
  },
};

export function ImportDataButton({ type, label }: ImportDataButtonProps) {
  const { sessions } = useAcademicSessions();
  const { school } = useSchool();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSourceSession, setSelectedSourceSession] = useState<string>('');

  const currentSession = school?.currentAcademicSessionId;
  const previousSessions = sessions.filter((s) => s.id !== currentSession && !s.isArchived);
  const config = importTypeConfig[type];

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSourceSession || !currentSession) {
        throw new Error('Please select a source session');
      }

      const endpoint = {
        classes: '/academic-sessions/import/classes',
        subjects: '/academic-sessions/import/subjects',
        teachers: '/academic-sessions/import/teachers',
        syllabus: '/academic-sessions/import/syllabus',
      }[type];

      return api.post(endpoint, {
        sourceSessionId: selectedSourceSession,
        targetSessionId: currentSession,
      });
    },
    onSuccess: async (result) => {
      toast.success(result.data?.message || `${type} imported successfully`);
      // Invalidate relevant queries based on import type
      if (type === 'classes' || type === 'subjects' || type === 'syllabus') {
        queryClient.invalidateQueries({ queryKey: ['syllabus'] });
        queryClient.invalidateQueries({ queryKey: ['classes'] });
        queryClient.invalidateQueries({ queryKey: ['subjects'] });
        queryClient.invalidateQueries({ queryKey: ['syllabus-tree'] });
        queryClient.invalidateQueries({ queryKey: ['chapters'] });
      }
      if (type === 'teachers') {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      }
      setIsOpen(false);
      setSelectedSourceSession('');
    },
    onError: (error: any) => {
      toast.error(error.message || `Failed to import ${type}`);
    },
  });

  if (previousSessions.length === 0) {
    return null;
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        {label || `Import ${type}`}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-session">Select Source Session</Label>
              <Select value={selectedSourceSession} onValueChange={setSelectedSourceSession}>
                <SelectTrigger id="source-session">
                  <SelectValue placeholder="Choose a session to import from..." />
                </SelectTrigger>
                <SelectContent>
                  {previousSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name} ({session._count.classes} classes, {session._count.subjects}{' '}
                      subjects)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={importMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending || !selectedSourceSession}>
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
