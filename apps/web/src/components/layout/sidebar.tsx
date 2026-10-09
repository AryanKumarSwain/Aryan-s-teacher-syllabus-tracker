'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
} from 'lucide-react';
import { UserRole } from '@school-syllabus/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/features/subscription/hooks/use-subscription';
import { toast } from 'sonner';
import { MascotLogo } from '@/components/common/mascot-logo';

const navByRole: Record<UserRole, { href: string; label: string; icon: React.ElementType }[]> = {
  [UserRole.SUPER_ADMIN]: [
    { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/schools', label: 'Schools', icon: School },
    { href: '/super-admin/plans', label: 'Plans', icon: CreditCard },
    { href: '/super-admin/settings', label: 'Settings', icon: Settings },
  ],
  [UserRole.SCHOOL_ADMIN]: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/sessions', label: 'Sessions', icon: CalendarRange },
    { href: '/admin/academic-timeline', label: 'Academic Timeline', icon: Calendar },
    { href: '/admin/classes', label: 'Classes', icon: GraduationCap },
    { href: '/admin/subjects', label: 'Subjects', icon: Bookmark },
    { href: '/admin/teachers', label: 'Teachers', icon: Users },
    { href: '/admin/syllabus', label: 'Syllabus', icon: BookOpen },
    { href: '/admin/progress', label: 'Progress', icon: TrendingUp },
    { href: '/admin/exam-papers', label: 'Exam Papers', icon: BookOpen },
    { href: '/admin/teacher-training', label: 'Teacher Training', icon: Award },
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
  const { sidebarOpen, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUiStore();
  const router = useRouter();
  const { hasActivePlan, isLoading: subLoading, isFetched: subFetched } = useSubscription();

  // Auto-close mobile drawer when pathname changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

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
    <>
      {/* Desktop PC Sidebar — 100% untouched layout on PC screen */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 68 }}
        className="hidden md:flex sticky top-0 z-40 h-screen flex-col border-r border-slate-700/40 bg-gradient-to-b from-[#1e293b] via-[#243447] to-[#1e293b]"
      >
      {/* Logo row */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-3.5">
        {sidebarOpen ? (
          <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
            <MascotLogo size={36} animated />
            <div className="flex flex-col min-w-0 leading-tight">
              <div className="flex items-center gap-0.5">
                <span className="text-sm font-black tracking-tight text-white">
                  Syllabus
                </span>
                <span className="text-sm font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  Tracker
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
              </div>
              <span className="text-[10px] text-emerald-400/90 font-semibold tracking-wide truncate leading-none mt-0.5">
                {user.school?.name || 'Academic Operations'}
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/" className="mx-auto block" title="SyllabusTracker">
            <MascotLogo size={34} animated />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="shrink-0 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')}
          />
        </Button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 p-2.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isDashboardRoute = item.href === '/admin' || item.href === '/super-admin' || item.href === '/teacher';
          const active = isDashboardRoute
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                'group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all duration-150',
                active
                  ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950/20'
                  : isItemLocked
                  ? 'text-white/40 hover:bg-white/5 hover:text-white/60'
                  : 'text-white font-semibold hover:bg-white/12 hover:text-white',
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    active ? 'text-white' : 'text-slate-200 group-hover:text-white',
                    isItemLocked && 'opacity-40',
                  )}
                />
                {sidebarOpen && (
                  <span className="truncate text-white font-semibold tracking-tight">
                    {item.label}
                  </span>
                )}
              </div>
              {sidebarOpen && (
                <>
                  {isItemLocked && (
                    <Lock className="h-3.5 w-3.5 text-white/30 group-hover:text-amber-400 transition-colors" />
                  )}
                  {isUpgradeTab && isPlanLocked && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
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
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black text-white shadow-xs">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{user.name}</p>
                  <p className="truncate text-[10px] font-semibold text-emerald-400">{user.role.replace('_', ' ')}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.aside>

    {/* Mobile Slide-over Drawer (Mobile view only - 0 impact on PC) */}
    <AnimatePresence>
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer body */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-700/40 bg-gradient-to-b from-[#1e293b] via-[#243447] to-[#1e293b] shadow-2xl"
          >
            {/* Mobile Header Row */}
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Link
                href="/"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex items-center gap-2.5 min-w-0 group"
              >
                <MascotLogo size={36} animated />
                <div className="flex flex-col min-w-0 leading-tight">
                  <div className="flex items-center gap-0.5">
                    <span className="text-sm font-black tracking-tight text-white">
                      Syllabus
                    </span>
                    <span className="text-sm font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                      Tracker
                    </span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                  </div>
                  <span className="text-[10px] text-emerald-400/90 font-semibold tracking-wide truncate leading-none mt-0.5">
                    {user.school?.name || 'Academic Operations'}
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(false)}
                className="shrink-0 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg h-9 w-9"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Navigation Links */}
            <nav className="flex-1 space-y-1 p-3 overflow-y-auto no-scrollbar">
              {navItems.map((item) => {
                const isDashboardRoute = item.href === '/admin' || item.href === '/super-admin' || item.href === '/teacher';
                const active = isDashboardRoute
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const isItemLocked = isPlanLocked && item.href !== '/admin/upgrade' && item.href !== '/admin/settings';
                const isUpgradeTab = item.href === '/admin/upgrade';

                const handleClick = (e: React.MouseEvent) => {
                  if (isItemLocked) {
                    e.preventDefault();
                    toast.error(`Please subscribe to a plan to access ${item.label}`);
                    router.push('/admin/upgrade');
                  }
                  setMobileSidebarOpen(false);
                };

                return (
                  <Link
                    key={item.href}
                    href={isItemLocked ? '/admin/upgrade' : item.href}
                    onClick={handleClick}
                    className={cn(
                      'group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs transition-all duration-150',
                      active
                        ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950/20'
                        : isItemLocked
                        ? 'text-white/40 hover:bg-white/5 hover:text-white/60'
                        : 'text-white font-semibold hover:bg-white/12 hover:text-white',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active ? 'text-white' : 'text-slate-200 group-hover:text-white',
                          isItemLocked && 'opacity-40',
                        )}
                      />
                      <span className="truncate text-white font-semibold tracking-tight">
                        {item.label}
                      </span>
                    </div>
                    {isItemLocked && (
                      <Lock className="h-3.5 w-3.5 text-white/30 group-hover:text-amber-400 transition-colors" />
                    )}
                    {isUpgradeTab && isPlanLocked && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Drawer Footer */}
            {user && (
              <div className="border-t border-white/10 p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black text-white shadow-xs">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{user.name}</p>
                      <p className="truncate text-[10px] font-semibold text-emerald-400">{user.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setMobileSidebarOpen(false);
                      handleLogout();
                    }}
                    className="shrink-0 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  </>
  );
}
