'use client';

import { LogOut, Building2, Menu } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { api } from '@/services/api-client';
import { SessionSelector } from '@/components/admin/session-selector';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';

export function Navbar({ title }: { title?: string }) {
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

  // Fallback title resolution so "Workspace" and title ALWAYS display across all tabs
  const getFallbackTitle = (path: string): string => {
    if (!path) return 'Dashboard';
    // Teacher portal routes
    if (path === '/teacher') return 'Teacher Dashboard';
    if (path === '/teacher/classes') return 'Classes & Syllabus';
    if (path.startsWith('/teacher/classes/')) return 'Class Syllabus';
    if (path.startsWith('/teacher/progress')) return 'Curriculum Velocity';
    if (path.startsWith('/teacher/academic-timeline')) return 'Academic Timeline';
    if (path.startsWith('/teacher/exam-papers/create')) return 'Create Exam Paper';
    if (path.includes('/teacher/exam-papers/') && path.includes('/edit')) return 'Edit Exam Paper';
    if (path.startsWith('/teacher/exam-papers')) return 'Exam Papers';
    if (path.startsWith('/teacher/teacher-training')) return 'My CPD Training';
    if (path.startsWith('/teacher/settings')) return 'Settings';

    // Admin portal routes
    if (path === '/admin') return 'Admin Dashboard';
    if (path.startsWith('/admin/sessions')) return 'Academic Sessions';
    if (path.startsWith('/admin/academic-timeline')) return 'Academic Timeline';
    if (path.startsWith('/admin/classes')) return 'Classes & Sections';
    if (path.startsWith('/admin/subjects')) return 'Subjects';
    if (path.startsWith('/admin/teachers')) return 'Teachers Directory';
    if (path.startsWith('/admin/syllabus')) return 'Syllabus Management';
    if (path.startsWith('/admin/progress')) return 'Academic Progress';
    if (path.startsWith('/admin/exam-papers/template')) return 'Exam Paper Template';
    if (path.startsWith('/admin/exam-papers')) return 'Exam Papers';
    if (path.startsWith('/admin/teacher-training')) return 'Teacher Training';
    if (path.startsWith('/admin/upgrade')) return 'Upgrade & Plans';
    if (path.startsWith('/admin/settings')) return 'Settings';

    // Super Admin routes
    if (path === '/super-admin') return 'Super Admin Dashboard';
    if (path.startsWith('/super-admin/schools')) return 'Schools';
    if (path.startsWith('/super-admin/plans')) return 'Subscription Plans';
    if (path.startsWith('/super-admin/settings')) return 'Platform Settings';

    return 'Workspace';
  };

  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const displayTitle = title || getFallbackTitle(pathname || '');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#c4c5d7]/40 bg-white/95 backdrop-blur-md px-3 sm:px-6">
      {/* Left — mobile menu button + school brand (logo + name) + workspace title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(true)}
          title="Open navigation menu"
          className="md:hidden shrink-0 text-slate-700 hover:bg-slate-100 rounded-xl h-9 w-9 -ml-1 sm:ml-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {(schoolName || schoolLogo) && (
          <div className="flex items-center gap-2 sm:gap-2.5 pr-2 sm:pr-4 border-r border-[#c4c5d7]/40 shrink-0">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName || 'School Logo'}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain border border-[#c4c5d7]/40 bg-white p-0.5 shadow-2xs shrink-0"
              />
            ) : (
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-800 font-black text-xs sm:text-sm shrink-0 shadow-2xs">
                {schoolName ? schoolName.charAt(0).toUpperCase() : <Building2 className="h-4 w-4 text-emerald-700" />}
              </div>
            )}
            <div className="hidden md:block leading-tight">
              <span className="block text-xs font-bold text-[#0b1c30] truncate max-w-[180px] lg:max-w-[240px]">
                {schoolName || 'School Portal'}
              </span>
              <span className="block text-[10px] text-emerald-700 font-semibold tracking-wide">
                {isAdminRoute ? 'Admin Workspace' : isTeacherRoute ? 'Teacher Portal' : 'Academic Portal'}
              </span>
            </div>
          </div>
        )}

        {displayTitle && (
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#434655]">Workspace</p>
            <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-[#0b1c30] truncate max-w-[140px] sm:max-w-none">
              {displayTitle}
            </h1>
          </div>
        )}
      </div>

      {/* Middle — session selector for admin routes, batch name for teacher routes (PC/Tablet view) */}
      <div className="hidden md:flex flex-1 items-center justify-center px-2">
        {isAdminRoute && <SessionSelector />}
        {isTeacherRoute && currentSession && (
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-[#0b1c30]">{currentSession.name}</span>
            <span className="rounded-full bg-emerald-100/90 px-1.5 py-0.5 text-[9px] font-black text-emerald-800 uppercase tracking-wide">
              Active
            </span>
          </div>
        )}
      </div>

      {/* Right — compact session pill on mobile + logout */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {isTeacherRoute && currentSession && (
          <div className="flex md:hidden items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2 py-0.5 shadow-2xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold text-[#0b1c30]">{currentSession.name}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Logout"
          className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 h-9 w-9"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
