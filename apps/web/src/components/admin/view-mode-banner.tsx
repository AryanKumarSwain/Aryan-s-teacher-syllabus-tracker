'use client';

import { Eye, Undo2, AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { useAdminSessionStore } from '@/store/admin-session-store';
import { useQueryClient } from '@tanstack/react-query';

export function ViewModeBanner() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const { isViewMode, activeSessionId, viewSessionId } = useSchool();
  const { sessions } = useAcademicSessions();
  const { resetViewSession } = useAdminSessionStore();
  const queryClient = useQueryClient();

  if (!isAdminRoute || !isViewMode) {
    return null;
  }

  const currentViewSession = sessions.find((s) => s.id === viewSessionId);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleExitViewMode = () => {
    resetViewSession();
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
    queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    queryClient.invalidateQueries({ queryKey: ['syllabus-tree'] });
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
    queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
    queryClient.invalidateQueries({ queryKey: ['progress'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    toast.success(`Exited View Mode. Returned to active session: ${activeSession?.name || 'Active'}`);
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 backdrop-blur-xs">
            <Eye className="h-4 w-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-white">
                View Mode (Read-Only)
              </span>
              <span className="text-sm font-semibold text-white">
                Viewing: {currentViewSession?.name || 'Session'}
              </span>
            </div>
            <p className="text-[11px] text-white/90">
              You are inspecting archived curriculum data. All modification controls are disabled. Teachers remain live on active session: <strong>{activeSession?.name || 'Active'}</strong>.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleExitViewMode}
          className="h-8 gap-1.5 bg-white text-xs font-semibold text-amber-950 shadow hover:bg-amber-50 hover:text-black shrink-0"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Exit View Mode (Back to {activeSession?.name || 'Active'})
        </Button>
      </div>
    </div>
  );
}
