'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { ViewModeBanner } from '@/components/admin/view-mode-banner';
import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/features/subscription/hooks/use-subscription';
import { Sparkles, ShieldAlert, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function DashboardShell({ title, children }: { title?: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { hasActivePlan, isLoading, isFetched } = useSubscription();

  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';
  const needsProfileCompletion = user && user.role !== 'SUPER_ADMIN' && (!user.schoolId || !user.phone);

  const isAllowedWithoutPlan =
    pathname === '/admin/upgrade' ||
    pathname.startsWith('/admin/upgrade/') ||
    pathname === '/admin/settings' ||
    pathname.startsWith('/admin/settings/');

  const shouldRedirectToUpgrade = !needsProfileCompletion && isSchoolAdmin && isFetched && !isLoading && !hasActivePlan && !isAllowedWithoutPlan;

  useEffect(() => {
    if (needsProfileCompletion) {
      router.replace('/complete-profile');
      return;
    }
    if (shouldRedirectToUpgrade) {
      router.replace('/admin/upgrade');
    }
  }, [needsProfileCompletion, shouldRedirectToUpgrade, router]);

  return (
    <div className="relative min-h-screen bg-[#eef2f7] text-[#0b1c30] selection:bg-[#d3e4fe] selection:text-[#0037b0]">
      {/* Subtle colorful ambient mesh glows to give life & eliminate flat whiteness */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-blue-400/8 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-amber-400/8 blur-3xl" />
      </div>
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0 w-full overflow-x-hidden">
          <Navbar title={title} />
          <ViewModeBanner />
          
          {shouldRedirectToUpgrade ? (
            <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
              <div className="max-w-md text-center rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-[#c4c5d7]/50">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 mb-4 shadow-xs">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-extrabold text-[#0b1c30]">Active Plan Required</h2>
                <p className="mt-2 text-xs sm:text-sm text-[#434655]">
                  Please choose and activate a subscription plan to unlock full workspace access and features.
                </p>
                <div className="mt-6">
                  <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs w-full shadow-md shadow-emerald-600/20 active:scale-95 transition-all">
                    <Link href="/admin/upgrade">
                      <CreditCard className="h-4 w-4" />
                      View Upgrade Plans
                    </Link>
                  </Button>
                </div>
              </div>
            </main>
          ) : (
            <main className="flex-1 overflow-x-hidden p-3 sm:p-6 bg-transparent">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

