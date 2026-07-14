'use client';

import { LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/services/api-client';
import { SessionSelector } from '@/components/admin/session-selector';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';

export function Navbar({ title }: { title: string }) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isTeacherRoute = pathname?.startsWith('/teacher');
  const { school } = useSchool();
  const { data: sessions } = useAcademicSessions();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  // Find current session name for teacher routes
  const currentSession = sessions?.find(s => s.id === school?.currentAcademicSessionId);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Left — workspace + page title */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-medium text-gray-400">Workspace</p>
          <h1 className="text-base font-semibold tracking-tight text-gray-800 sm:text-lg">
            {title}
          </h1>
        </div>
      </div>

      {/* Middle — session selector for admin routes, batch name for teacher routes */}
      <div className="flex flex-1 items-center justify-center">
        {isAdminRoute && <SessionSelector />}
        {isTeacherRoute && currentSession && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Batch:</span>
            <span className="text-sm font-semibold text-gray-900">{currentSession.name}</span>
          </div>
        )}
      </div>

      {/* Right — logout only */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="Logout"
        className="text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
