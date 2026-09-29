'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Search,
  ChevronRight,
  CreditCard,
  Users,
  BookOpen,
  LayoutGrid,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  CalendarDays,
  Activity,
  School,
  Layers,
  X,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

/* ─── Types ─────────────────────────────────────────────────── */
interface SchoolListItem {
  id: string;
  name: string;
  email: string;
  status: string;
  slug: string;
  _count?: { teachers: number; users: number };
  subscriptions?: { status: string; plan: { name: string } }[];
}

interface SessionStat {
  id: string;
  name: string;
  status: string;
  isArchived: boolean;
  createdAt: string;
  teacherCount: number;
  classCount: number;
  subjectCount: number;
}

interface SubscriptionDetail {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  queuedDays: number;
  queuedPlanName?: string | null;
  createdAt: string;
  plan: { name: string; pricePerSession: number; priceMonthly: number; teacherLimit: number };
}

interface SchoolDetail {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  slug: string;
  createdAt: string;
  subscriptions: SubscriptionDetail[];
  ongoingSubscription?: SubscriptionDetail;
  upcomingSubscription?: SubscriptionDetail;
  academicSessions: SessionStat[];
  _count: { teachers: number; classes: number; subjects: number };
}

/* ─── Helpers ────────────────────────────────────────────────── */
function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusVariant(s: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (s === 'ACTIVE') return 'success';
  if (s === 'TRIAL') return 'warning';
  if (s === 'EXPIRED' || s === 'CANCELLED') return 'destructive';
  return 'secondary';
}

/* ─── MiniStat ───────────────────────────────────────────────── */
function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-3 ${color}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 opacity-70" />
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <span className="text-2xl font-bold leading-none">{value}</span>
    </div>
  );
}

/* ─── Plan History Row ───────────────────────────────────────── */
function PlanRow({
  sub,
  isOngoing,
  isUpcoming,
}: {
  sub: SubscriptionDetail;
  isOngoing?: boolean;
  isUpcoming?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 transition-colors hover:bg-gray-50">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isOngoing
            ? 'bg-emerald-100 text-emerald-600'
            : isUpcoming
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-400'
        }`}
      >
        {isOngoing ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : isUpcoming ? (
          <Clock className="h-4 w-4" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm text-gray-800">{sub.plan.name}</span>
          <Badge variant={statusVariant(sub.status)} className="text-[10px] h-4">
            {isOngoing ? 'ONGOING' : isUpcoming ? 'UPCOMING' : sub.status}
          </Badge>
          {sub.queuedDays > 0 && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              +{sub.queuedDays}d queued
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {fmt(sub.startDate)} → {fmt(sub.endDate)}
          </span>
          <span>₹{Number(sub.plan.pricePerSession).toLocaleString()}/session</span>
          <span>{sub.plan.teacherLimit} teacher limit</span>
        </div>
        {sub.queuedPlanName && (
          <p className="mt-1 text-[11px] text-blue-600">Next: {sub.queuedPlanName}</p>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-gray-400">{fmt(sub.createdAt)}</span>
    </div>
  );
}

/* ─── Session Row ────────────────────────────────────────────── */
function SessionRow({ session, isCurrent }: { session: SessionStat; isCurrent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3.5 transition-colors ${
        isCurrent ? 'border-blue-200 bg-blue-50/60' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className={`h-3.5 w-3.5 ${isCurrent ? 'text-blue-500' : 'text-gray-400'}`} />
          <span className="font-semibold text-sm text-gray-800">{session.name}</span>
          {isCurrent && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
              Current
            </span>
          )}
        </div>
        <Badge
          variant={session.status === 'ACTIVE' ? 'success' : 'secondary'}
          className="text-[10px] h-4"
        >
          {session.isArchived ? 'ARCHIVED' : session.status}
        </Badge>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {[
          { label: 'Teachers', value: session.teacherCount },
          { label: 'Classes', value: session.classCount },
          { label: 'Subjects', value: session.subjectCount },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center rounded-lg bg-white/80 border border-gray-100 py-1.5"
          >
            <span className="text-base font-bold text-gray-800">{item.value}</span>
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── School Detail Panel ────────────────────────────────────── */
function SchoolDetailPanel({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<SchoolDetail>({
    queryKey: ['school-detail', schoolId],
    queryFn: () => api.get<SchoolDetail>(`/schools/${schoolId}`),
    enabled: !!schoolId,
  });

  const qc = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/schools/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schools'] });
      qc.invalidateQueries({ queryKey: ['school-detail', schoolId] });
      toast.success('Status updated');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-48 w-full mt-2" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const sessions = data.academicSessions ?? [];
  const subscriptions = data.subscriptions ?? [];
  const currentSessionId = sessions.find(
    (s) => s.status === 'ACTIVE' && !s.isArchived,
  )?.id;


  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-6 py-5 shrink-0">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <School className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white leading-tight truncate">{data.name}</h2>
            </div>
            <p className="text-sm text-white/70 truncate">{data.email}</p>
            {data.phone && <p className="text-xs text-white/60 mt-0.5">{data.phone}</p>}
          </div>
          <div className="flex items-center gap-2 mt-1 shrink-0 ml-3">
            <Badge variant={data.status === 'ACTIVE' ? 'success' : 'warning'} className="text-xs">
              {data.status}
            </Badge>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {data.status !== 'ACTIVE' && (
            <button
              onClick={() => updateStatus.mutate({ id: data.id, status: 'ACTIVE' })}
              className="rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              Activate
            </button>
          )}
          {data.status === 'ACTIVE' && (
            <button
              onClick={() => updateStatus.mutate({ id: data.id, status: 'SUSPENDED' })}
              className="rounded-lg bg-white/10 hover:bg-red-500/40 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              Suspend
            </button>
          )}
          <span className="ml-auto text-[11px] text-white/50">Joined {fmt(data.createdAt)}</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-6">

          {/* Analytics Overview */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-[#1a73e8]" />
              <h3 className="text-sm font-semibold text-gray-700">Analytics Overview</h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <MiniStat icon={Users} label="Teachers" value={data._count.teachers} color="border-blue-100 bg-blue-50 text-blue-800" />
              <MiniStat icon={LayoutGrid} label="Classes" value={data._count.classes} color="border-indigo-100 bg-indigo-50 text-indigo-800" />
              <MiniStat icon={BookOpen} label="Subjects" value={data._count.subjects} color="border-violet-100 bg-violet-50 text-violet-800" />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <MiniStat icon={Layers} label="Sessions" value={sessions.length} color="border-teal-100 bg-teal-50 text-teal-800" />
              <MiniStat icon={TrendingUp} label="Plan History" value={subscriptions.length} color="border-emerald-100 bg-emerald-50 text-emerald-800" />
            </div>
          </section>

          {/* Ongoing Plan */}
          {data.ongoingSubscription && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-700">Ongoing Plan</h3>
              </div>
              <PlanRow sub={data.ongoingSubscription} isOngoing />
            </section>
          )}

          {/* Upcoming Plan */}
          {data.upcomingSubscription && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-700">Upcoming Plan</h3>
              </div>
              <PlanRow sub={data.upcomingSubscription} isUpcoming />
            </section>
          )}

          {/* Plan History */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#1a73e8]" />
                <h3 className="text-sm font-semibold text-gray-700">Plan History</h3>
              </div>
              <span className="text-xs text-gray-400">{subscriptions.length} plans</span>
            </div>
            {subscriptions.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No plan history yet.</p>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <PlanRow
                    key={sub.id}
                    sub={sub}
                    isOngoing={data.ongoingSubscription?.id === sub.id}
                    isUpcoming={data.upcomingSubscription?.id === sub.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Academic Sessions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#1a73e8]" />
                <h3 className="text-sm font-semibold text-gray-700">Academic Sessions</h3>
              </div>
              <span className="text-xs text-gray-400">{sessions.length} sessions</span>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No sessions found.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    isCurrent={session.id === currentSessionId}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function SuperAdminSchoolsPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['schools', search],
    queryFn: () =>
      api.getPaginated<SchoolListItem>('/schools', {
        page: 1,
        pageSize: 50,
        search: search || undefined,
      }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/schools/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schools'] });
      toast.success('Status updated');
    },
  });

  const schools = data?.items ?? [];

  return (
    <DashboardShell title="Schools">
      <div className="flex h-[calc(100vh-140px)] gap-6">
        {/* Left: School List */}
        <div
          className={`flex flex-col gap-4 transition-all duration-300 ${selectedId ? 'w-[400px] shrink-0' : 'flex-1'}`}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search schools..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : schools.length === 0 ? (
            <EmptyState icon={Building2} title="No schools" description="No schools found." />
          ) : (
            <Card className="divide-y overflow-y-auto">
              {schools.map((school) => {
                const isSelected = selectedId === school.id;
                return (
                  <div
                    key={school.id}
                    onClick={() => setSelectedId(isSelected ? null : school.id)}
                    className={`flex cursor-pointer flex-col gap-2 p-4 transition-all hover:bg-blue-50/40 ${
                      isSelected
                        ? 'bg-blue-50 border-l-4 border-l-[#1a73e8]'
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{school.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{school.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {school.status !== 'ACTIVE' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate({ id: school.id, status: 'ACTIVE' });
                            }}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-gray-50 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        {school.status === 'ACTIVE' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate({ id: school.id, status: 'SUSPENDED' });
                            }}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-gray-50 transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        <ChevronRight
                          className={`h-4 w-4 text-gray-400 transition-transform ${
                            isSelected ? 'rotate-90 text-[#1a73e8]' : ''
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant={school.status === 'ACTIVE' ? 'success' : 'warning'}
                        className="text-[10px]"
                      >
                        {school.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {school._count?.teachers ?? 0} teachers
                      </Badge>
                      {school.subscriptions?.[0] && (
                        <Badge variant="secondary" className="text-[10px]">
                          {school.subscriptions[0].plan.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {/* Right: Detail Panel */}
        {selectedId && (
          <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
            <SchoolDetailPanel
              key={selectedId}
              schoolId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
