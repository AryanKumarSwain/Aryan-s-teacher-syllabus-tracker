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

export function DashboardShell({ title, children }: { title: string; children: React.ReactNode }) {
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
    <div className="relative min-h-screen bg-[#EEF2F8] text-gray-800">
      <div className="relative flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Navbar title={title} />
          <ViewModeBanner />
          
          {shouldRedirectToUpgrade ? (
            <main className="flex flex-1 items-center justify-center p-6">
              <div className="max-w-md text-center rounded-2xl bg-white p-8 shadow-md border border-gray-200">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Active Plan Required</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Please choose and activate a subscription plan to unlock full workspace access and features.
                </p>
                <div className="mt-6">
                  <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 w-full shadow-sm">
                    <Link href="/admin/upgrade">
                      <CreditCard className="h-4 w-4" />
                      View Upgrade Plans
                    </Link>
                  </Button>
                </div>
              </div>
            </main>
          ) : (
            <main className="flex-1 overflow-auto p-4 sm:p-6 bg-transparent">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

