'use client';

import { ChevronDown, Eye, Undo2, Check } from 'lucide-react';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAdminSessionStore } from '@/store/admin-session-store';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface SessionSelectorProps {
  selectedSessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

export function SessionSelector({ selectedSessionId, onSessionChange }: SessionSelectorProps) {
  const { sessions, isLoading } = useAcademicSessions();
  const { school, isViewMode, activeSessionId } = useSchool();
  const { setViewSessionId, resetViewSession } = useAdminSessionStore();
  const queryClient = useQueryClient();

  const currentSessionId = onSessionChange
    ? selectedSessionId
    : school?.currentAcademicSessionId;

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // All sessions should be available for view mode switching
  const availableSessions = [...sessions].sort((a, b) => {
    if (a.id === activeSessionId) return -1;
    if (b.id === activeSessionId) return 1;
    return b.name.localeCompare(a.name);
  });

  const invalidateAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
    queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    queryClient.invalidateQueries({ queryKey: ['syllabus-tree'] });
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
    queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
    queryClient.invalidateQueries({ queryKey: ['progress'] });
  };

  const handleSelectSession = (sessionId: string) => {
    if (onSessionChange) {
      onSessionChange(sessionId);
      return;
    }

    if (sessionId === activeSessionId) {
      resetViewSession();
      invalidateAdminData();
      toast.success(`Returned to active session: ${activeSession?.name || 'Active'}`);
    } else {
      const selected = sessions.find((s) => s.id === sessionId);
      setViewSessionId(sessionId);
      invalidateAdminData();
      toast.info(`Now viewing ${selected?.name || 'session'} (View Mode). Teachers are unaffected.`);
    }
  };

  const handleExitViewMode = () => {
    resetViewSession();
    invalidateAdminData();
    toast.success(`Returned to active session: ${activeSession?.name || 'Active'}`);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || availableSessions.length === 0}
            className={cn(
              'gap-2 min-w-[200px] h-9 transition-colors shadow-xs',
              isViewMode
                ? 'border-amber-300 bg-amber-50/90 text-amber-900 hover:bg-amber-100 hover:text-amber-950 rounded-xl'
                : 'border-emerald-200/80 bg-white text-[#0b1c30] hover:bg-emerald-50/50 rounded-xl shadow-xs',
            )}
          >
            {isViewMode ? (
              <div className="flex items-center gap-2 text-left truncate flex-1">
                <Eye className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="truncate font-bold text-xs">{currentSession?.name || 'Session'}</span>
                <span className="rounded-md bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-900 shrink-0">
                  View Mode
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-left truncate flex-1">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="truncate font-bold text-xs text-[#0b1c30]">{currentSession?.name || 'Select Session'}</span>
                <span className="rounded-md bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-800 shrink-0">
                  Active
                </span>
              </div>
            )}
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 text-[#434655]" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="center"
          className="w-72 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-xl p-1.5 z-50"
        >
          {isViewMode && (
            <>
              <DropdownMenuItem
                onClick={handleExitViewMode}
                className="cursor-pointer bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 p-2 text-xs font-semibold text-amber-900 dark:text-amber-200 rounded-lg mb-1 flex items-center gap-2"
              >
                <Undo2 className="h-4 w-4 text-amber-600" />
                Exit View Mode (Back to {activeSession?.name})
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-gray-100 dark:border-zinc-800" />
            </>
          )}

          <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Academic Sessions
          </div>

          {availableSessions.length === 0 ? (
            <DropdownMenuItem disabled>
              <span className="text-gray-400 text-xs">No active sessions</span>
            </DropdownMenuItem>
          ) : (
            availableSessions.map((session) => {
              const isSessionActive = session.id === activeSessionId;
              const isSessionSelected = session.id === currentSessionId;

              return (
                <DropdownMenuItem
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={cn(
                    'cursor-pointer rounded-lg p-2 text-xs transition-colors flex items-center justify-between gap-2',
                    isSessionSelected
                      ? 'bg-blue-50/90 text-blue-950 font-medium dark:bg-blue-950/40 dark:text-blue-200'
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300',
                  )}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-900 dark:text-gray-100">{session.name}</span>
                      {isSessionActive && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                          Active for School
                        </span>
                      )}
                      {isSessionSelected && !isSessionActive && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                          Viewing
                        </span>
                      )}
                      {!isSessionActive && !isSessionSelected && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                          Archived
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {session._count.classes} classes · {session._count.teachers ?? 0} teachers · {session._count.subjects} subjects
                    </span>
                  </div>

                  {isSessionSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </DropdownMenuItem>
              );
            })
          )}

          <div className="mt-1.5 border-t border-gray-100 dark:border-zinc-800 px-2 pt-1.5 pb-0.5 text-[10px] text-gray-400 leading-tight">
            💡 Selecting a past session enables <strong>View Mode</strong> without altering teachers&apos; live session.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Exit Button when in View Mode */}
      {isViewMode && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleExitViewMode}
          className="h-9 gap-1.5 px-2.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 hover:text-amber-950 border-amber-300 rounded-lg shadow-xs"
          title={`Exit View Mode and return to active session (${activeSession?.name})`}
        >
          <Undo2 className="h-3.5 w-3.5 text-amber-700" />
          <span className="hidden sm:inline">Exit View</span>
        </Button>
      )}
    </div>
  );
}
