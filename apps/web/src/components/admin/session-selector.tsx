'use client';

import { ChevronDown } from 'lucide-react';
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
import { toast } from 'sonner';
import { useSchool } from '@/features/syllabus/hooks/use-school';

interface SessionSelectorProps {
  selectedSessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

export function SessionSelector({ selectedSessionId, onSessionChange }: SessionSelectorProps) {
  const { sessions, isLoading, switchSession } = useAcademicSessions();
  const { school } = useSchool();

  // If controlled mode (onSessionChange provided), use selectedSessionId
  // Otherwise, use school's current session
  const currentSessionId = onSessionChange ? selectedSessionId : school?.currentAcademicSessionId;
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const activeSessions = sessions.filter((s) => !s.isArchived);

  const handleSwitchSession = async (sessionId: string) => {
    if (onSessionChange) {
      // Controlled mode: just call the callback
      onSessionChange(sessionId);
    } else {
      // Default mode: switch the session globally
      try {
        await switchSession.mutateAsync(sessionId);
        toast.success('Session switched successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to switch session');
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || activeSessions.length === 0}
          className="gap-2 min-w-[200px] bg-white"
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
                  {session._count.classes} classes • {session._count.subjects} subjects • {session._count.teachers} teachers
                </span>
              </div>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
