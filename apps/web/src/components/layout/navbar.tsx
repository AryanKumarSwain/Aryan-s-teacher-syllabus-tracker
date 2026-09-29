'use client';

import { LogOut, Building2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/services/api-client';
import { SessionSelector } from '@/components/admin/session-selector';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';

export function Navbar({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isTeacherRoute = pathname?.startsWith('/teacher');
  const isSuperAdminRoute = pathname?.startsWith('/super-admin');
  const { school } = useSchool();
  const { sessions } = useAcademicSessions();

  const { data: template } = useQuery({
    queryKey: ['exam-paper-template'],
    queryFn: () => api.get<{ id?: string; logoUrl?: string | null }>('/exam-papers/template'),
    staleTime: 60000,
    enabled: !isSuperAdminRoute,
  });

  const schoolLogo = template?.logoUrl || (school as any)?.logo || (user?.school as any)?.logo || null;
  const schoolName = school?.name || user?.school?.name || '';

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
      {/* Left — school brand (logo + name) + workspace title */}
      <div className="flex items-center gap-3 sm:gap-4">
        {(schoolName || schoolLogo) && (
          <div className="flex items-center gap-2.5 pr-3 sm:pr-4 border-r border-gray-200">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName || 'School Logo'}
                className="h-9 w-9 rounded-lg object-contain border border-gray-200 bg-white p-0.5 shadow-2xs shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0 shadow-2xs">
                {schoolName ? schoolName.charAt(0).toUpperCase() : <Building2 className="h-4 w-4" />}
              </div>
            )}
            <div className="hidden md:block leading-tight">
              <span className="block text-xs font-bold text-gray-900 truncate max-w-[180px] lg:max-w-[240px]">
                {schoolName || 'School Portal'}
              </span>
              <span className="block text-[10px] text-gray-500 font-medium">
                {isAdminRoute ? 'Admin Workspace' : isTeacherRoute ? 'Teacher Portal' : 'Academic Portal'}
              </span>
            </div>
          </div>
        )}

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
