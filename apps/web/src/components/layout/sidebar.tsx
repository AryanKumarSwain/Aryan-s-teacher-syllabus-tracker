'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Bookmark,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  School,
  Settings,
  Users,
  CreditCard,
  ChevronLeft,
  Calendar,
  CalendarRange,
  TrendingUp,
  Award,
  Lock,
} from 'lucide-react';
import { UserRole } from '@school-syllabus/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/features/subscription/hooks/use-subscription';
import { toast } from 'sonner';

const navByRole: Record<UserRole, { href: string; label: string; icon: React.ElementType }[]> = {
  [UserRole.SUPER_ADMIN]: [
    { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/schools', label: 'Schools', icon: School },
    { href: '/super-admin/plans', label: 'Plans', icon: CreditCard },
    { href: '/super-admin/settings', label: 'Settings', icon: Settings },
  ],
  [UserRole.SCHOOL_ADMIN]: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/academic-timeline', label: 'Academic Timeline', icon: Calendar },
    { href: '/admin/classes', label: 'Classes', icon: GraduationCap },
    { href: '/admin/subjects', label: 'Subjects', icon: Bookmark },
    { href: '/admin/teachers', label: 'Teachers', icon: Users },
    { href: '/admin/syllabus', label: 'Syllabus', icon: BookOpen },
    { href: '/admin/progress', label: 'Progress', icon: TrendingUp },
    { href: '/admin/exam-papers', label: 'Exam Papers', icon: BookOpen },
    { href: '/admin/teacher-training', label: 'Teacher Training', icon: Award },
    { href: '/admin/sessions', label: 'Sessions', icon: CalendarRange },
    { href: '/admin/upgrade', label: 'Upgrade & Plans', icon: CreditCard },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  [UserRole.TEACHER]: [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/classes', label: 'Classes', icon: BookOpen },
    { href: '/teacher/progress', label: 'Progress', icon: TrendingUp },
    { href: '/teacher/academic-timeline', label: 'Academic Timeline', icon: Calendar },
    { href: '/teacher/exam-papers', label: 'Exam Papers', icon: BookOpen },
    { href: '/teacher/teacher-training', label: 'Teacher Training', icon: Award },
    { href: '/teacher/settings', label: 'Settings', icon: Settings },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const router = useRouter();
  const { hasActivePlan, isLoading: subLoading, isFetched: subFetched } = useSubscription();

  const handleLogout = () => {
    clearAuth();
    document.cookie = 'access_token=; path=/; max-age=0';
    router.push('/login');
  };

  if (!user) return null;

  const isSchoolAdmin = user.role === 'SCHOOL_ADMIN';
  const isPlanLocked = isSchoolAdmin && subFetched && !subLoading && !hasActivePlan;

  const navItems = navByRole[user.role] ?? [];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 68 }}
      className="sticky top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white"
    >
      {/* Logo row */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {sidebarOpen && (
          <div className="flex flex-col">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a73e8] to-[#1558b0]">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-[#1a73e8]">SyllabusTracker</span>
            </Link>
            {user.school && (
              <span className="ml-10 max-w-[140px] truncate text-xs text-gray-500">
                {user.school.name}
              </span>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="shrink-0 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')}
          />
        </Button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const isItemLocked = isPlanLocked && item.href !== '/admin/upgrade' && item.href !== '/admin/settings';
          const isUpgradeTab = item.href === '/admin/upgrade';

          const handleClick = (e: React.MouseEvent) => {
            if (isItemLocked) {
              e.preventDefault();
              toast.error(`Please subscribe to a plan to access ${item.label}`);
              router.push('/admin/upgrade');
            }
          };

          return (
            <Link
              key={item.href}
              href={isItemLocked ? '/admin/upgrade' : item.href}
              onClick={handleClick}
              className={cn(
                'group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/30',
                active
                  ? 'bg-[#E8EEFF] text-[#1a73e8]'
                  : isItemLocked
                  ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-500'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={cn('h-4 w-4 shrink-0', isItemLocked && 'opacity-60')} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </div>
              {sidebarOpen && (
                <>
                  {isItemLocked && (
                    <Lock className="h-3.5 w-3.5 text-gray-300 group-hover:text-amber-500 transition-colors" />
                  )}
                  {isUpgradeTab && isPlanLocked && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-xs font-bold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="truncate text-xs text-gray-400">{user.role.replace('_', ' ')}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
