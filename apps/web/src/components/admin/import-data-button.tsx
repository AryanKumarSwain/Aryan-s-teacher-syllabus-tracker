'use client';

import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSourceSession, setSelectedSourceSession] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const currentSession = school?.currentAcademicSessionId;
  const previousSessions = sessions.filter((s) => s.id !== currentSession && !s.isArchived);
  const config = importTypeConfig[type];

  const handleImport = async () => {
    if (!selectedSourceSession || !currentSession) {
      toast.error('Please select a source session');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = {
        classes: '/academic-sessions/import/classes',
        subjects: '/academic-sessions/import/subjects',
        teachers: '/academic-sessions/import/teachers',
        syllabus: '/academic-sessions/import/syllabus',
      }[type];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSessionId: selectedSourceSession,
          targetSessionId: currentSession,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await response.json();
      toast.success(result.data?.message || `${type} imported successfully`);
      setIsOpen(false);
      setSelectedSourceSession('');
    } catch (error: any) {
      toast.error(error.message || `Failed to import ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

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
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isLoading || !selectedSourceSession}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
