'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  DollarSign,
  School,
  Users,
  TrendingUp,
  CreditCard,
  Tag,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { api } from '@/services/api-client';
import type { SuperAdminDashboardStats } from '@school-syllabus/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsData {
  revenue: {
    total: number;
    currency: string;
    successfulCount: number;
    totalCount: number;
  };
  subscriptions: {
    active: number;
    totalSchools: number;
  };
  planBreakdown: {
    id: string;
    name: string;
    pricePerSession: number;
    priceMonthly: number;
    activeSchools: number;
    totalPayments: number;
  }[];
  coupons: {
    id: string;
    code: string;
    timesUsed: number;
    discountPercent: number | null;
    discountAmount: number | null;
    isActive: boolean;
  }[];
  recentTransactions: {
    id: string;
    schoolName: string;
    schoolEmail: string;
    planName: string;
    amount: number;
    discount: number;
    couponCode?: string | null;
    status: string;
    billingCycle: string;
    queuedDays?: number;
    createdAt: string;
  }[];
}

interface PlatformStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  cardBg?: string;
  borderColor?: string;
  iconColor?: string;
  sub?: string;
  colSpan?: string;
}

function PlatformStatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor = 'text-white',
  sub,
  colSpan = '',
}: PlatformStatCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white ${colSpan}
        p-4 sm:p-5 shadow-xs
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-slate-500 font-medium">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-xs`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin', 'stats'],
    queryFn: () => api.get<SuperAdminDashboardStats>('/dashboard/stats'),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['super-admin', 'analytics'],
    queryFn: () => api.get<AnalyticsData>('/subscriptions/analytics'),
  });

  const isLoading = statsLoading || analyticsLoading;

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 border border-indigo-200">
                <ShieldCheck className="h-3 w-3" /> SuperAdmin Overview
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Platform Analytics & Revenue
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Live operational metrics, school subscriptions, payments, and system health across the tenant platform.
            </p>
          </div>
        </div>

        {/* Core KPI Metrics */}
        <Section title="Financial & Platform Metrics" icon={TrendingUp}>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <PlatformStatCard
                title="Total Platform Revenue"
                value={`₹${(analytics?.revenue.total ?? 0).toLocaleString()}`}
                icon={DollarSign}
                iconBg="bg-emerald-500 text-white"
                sub={`${analytics?.revenue.successfulCount ?? 0} successful payments processed`}
              />
              <PlatformStatCard
                title="Active Subscriptions"
                value={analytics?.subscriptions.active ?? 0}
                icon={CreditCard}
                iconBg="bg-blue-500 text-white"
                sub={`Across ${stats?.totalSchools ?? 0} registered schools`}
              />
              <PlatformStatCard
                title="Total Schools"
                value={stats?.totalSchools ?? 0}
                icon={School}
                iconBg="bg-indigo-500 text-white"
                sub={`${stats?.activeSchools ?? 0} active • ${stats?.expiredSchools ?? 0} expired`}
              />
              <PlatformStatCard
                title="Total Teachers"
                value={stats?.totalTeachers ?? 0}
                icon={Users}
                iconBg="bg-teal-500 text-white"
                sub="Active faculty accounts across all schools"
              />
            </div>
          )}
        </Section>

        {/* Plan Breakdown & Coupon Performance Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Plan Breakdown */}
          <Section title="Subscription Plan Distribution" icon={CreditCard}>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : analytics?.planBreakdown && analytics.planBreakdown.length > 0 ? (
              <div className="space-y-3">
                {analytics.planBreakdown.map((p) => {
                  const percent =
                    analytics.subscriptions.active > 0
                      ? Math.round((p.activeSchools / analytics.subscriptions.active) * 100)
                      : 0;

                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 transition-all hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="font-semibold text-gray-800">{p.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                            ₹{p.pricePerSession.toLocaleString()}/session
                          </span>
                          <span className="text-xs font-medium text-gray-500">
                            {p.activeSchools} active ({percent}%)
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-6 text-center">No plan distribution data available.</p>
            )}
          </Section>

          {/* Coupon Performance */}
          <Section title="Top Coupon Codes Performance" icon={Tag}>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : analytics?.coupons && analytics.coupons.length > 0 ? (
              <div className="space-y-2.5">
                {analytics.coupons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-md border border-emerald-200">
                        {c.code}
                      </span>
                      <span className="text-xs text-gray-600">
                        {c.discountPercent ? `${c.discountPercent}% OFF` : `₹${c.discountAmount} Flat OFF`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Used {c.timesUsed} times
                      </Badge>
                      <Badge variant={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-6 text-center">No coupons used yet.</p>
            )}
          </Section>
        </div>

        {/* Recent Payment Transactions Feed */}
        <Section title="Recent Payment Transactions (Razorpay Live Feed)" icon={ShieldCheck}>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : analytics?.recentTransactions && analytics.recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-2">School</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Coupon Applied</th>
                    <th className="pb-3">Queued Duration</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analytics.recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 pl-2">
                        <div className="font-semibold text-gray-800">{tx.schoolName}</div>
                        <div className="text-[11px] text-gray-400">{tx.schoolEmail}</div>
                      </td>
                      <td className="py-3 font-medium text-gray-700">{tx.planName}</td>
                      <td className="py-3 font-bold text-gray-900">
                        ₹{tx.amount.toLocaleString()}
                        {tx.discount > 0 && (
                          <span className="ml-1 text-[10px] text-emerald-600 font-normal">
                            (-₹{tx.discount})
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {tx.couponCode ? (
                          <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                            {tx.couponCode}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {tx.queuedDays && tx.queuedDays > 0 ? (
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            +{tx.queuedDays} days added
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={tx.status === 'SUCCESS' ? 'success' : tx.status === 'PENDING' ? 'warning' : 'destructive'}
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-2 text-gray-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <CreditCard className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p>No payment transactions recorded yet.</p>
            </div>
          )}
        </Section>
      </div>
    </DashboardShell>
  );
}