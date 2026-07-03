'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSchool } from '@/features/syllabus/hooks/use-school';

export function SessionSelector() {
  const { sessions, isLoading, createSession, switchSession } = useAcademicSessions();
  const { school } = useSchool();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const noSessions = !isLoading && sessions.length === 0;
  const currentSession = sessions.find((s) => s.id === school?.currentAcademicSessionId);
  const activeSessions = sessions.filter((s) => !s.isArchived);

  useEffect(() => {
    if (noSessions) {
      setIsCreateOpen(true);
    }
  }, [noSessions]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Session name is required');
      return;
    }

    try {
      await createSession.mutateAsync(newSessionName);
      setNewSessionName('');
      setIsCreateOpen(false);
      toast.success(`Session "${newSessionName}" created`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create session');
    }
  };

  const handleSwitchSession = async (sessionId: string) => {
    try {
      await switchSession.mutateAsync(sessionId);
      toast.success('Session switched successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to switch session');
    }
  };

  return (
    <>
      {noSessions ? (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span>Create Session</span>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || activeSessions.length === 0}
              className="gap-2"
            >
              <span className="max-w-[150px] truncate text-left">
                {currentSession?.name || 'Select Session'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Academic Sessions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {activeSessions.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground text-sm">No active sessions</span>
              </DropdownMenuItem>
            ) : (
              activeSessions.map((session) => (
                <DropdownMenuCheckboxItem
                  key={session.id}
                  checked={currentSession?.id === session.id}
                  onCheckedChange={() => handleSwitchSession(session.id)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{session.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {session._count.classes} classes • {session._count.subjects} subjects
                    </span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              <span>New Session</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Academic Session</DialogTitle>
            <DialogDescription>
              Enter a name for the new academic session (e.g., 2026-27, 2027-28)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name</Label>
              <Input
                id="session-name"
                placeholder="e.g., 2026-27"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={createSession.isPending || !newSessionName.trim()}
            >
              {createSession.isPending ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
