'use client';

import { useState, useMemo } from 'react';
import {
  CalendarRange,
  Plus,
  Pencil,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Users,
  Search,
  Loader2,
  Info,
  Eye,
  Undo2,
  Bookmark,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions, AcademicSession, performSessionHardReset } from '@/features/syllabus/hooks/use-academic-sessions';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { PostSessionImportDialog } from '@/components/admin/post-session-import-dialog';
import { useAdminSessionStore } from '@/store/admin-session-store';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api-client';

export default function AdminSessionsPage() {
  const { school, activeSessionId, isViewMode, viewSessionId } = useSchool();
  const { setViewSessionId, resetViewSession } = useAdminSessionStore();
  const queryClient = useQueryClient();

  const {
    sessions,
    isLoading,
    createSession,
    updateSession,
    switchSession,
  } = useAcademicSessions();

  // Subscription & Plan Limits
  const { data: subData } = useQuery({
    queryKey: ['admin', 'current-subscription'],
    queryFn: () => api.get<any>('/subscriptions/current'),
  });

  const sessionLimit = subData?.limits?.sessions?.max ?? 1;
  const isLimitReached = !isLoading && sessions.length >= sessionLimit;

  const limits = subData?.limits || {
    subjects: { used: 0, max: 200 },
    classes: { used: 0, max: 100 },
    teachers: { used: 0, max: 25 },
    sessions: { used: sessions.length, max: sessionLimit },
  };

  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [setAsActive, setSetAsActive] = useState(true);

  // Post-create import wizard state
  const [importWizard, setImportWizard] = useState<{
    open: boolean;
    newSessionId: string;
    newSessionName: string;
    sourceSessionId: string;
    sourceSessionName: string;
    wasSetAsActive: boolean;
  } | null>(null);

  // Edit session state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(null);
  const [editSessionName, setEditSessionName] = useState('');

  // Activate confirmation state
  const [activateConfirmSession, setActivateConfirmSession] = useState<AcademicSession | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const currentViewSession = sessions.find((s) => s.id === (viewSessionId || activeSessionId));

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase().trim()),
    );
  }, [sessions, search]);

  // Suggested upcoming academic sessions
  const yearSuggestions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const suggestions: string[] = [];
    for (let i = -1; i <= 3; i++) {
      const start = currentYear + i;
      const end = (start + 1).toString().slice(-2);
      const val = `${start}-${end}`;
      if (!sessions.some((s) => s.name === val)) {
        suggestions.push(val);
      }
    }
    return suggestions.slice(0, 4);
  }, [sessions]);

  const invalidateAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
    queryClient.invalidateQueries({ queryKey: ['syllabus'] });
    queryClient.invalidateQueries({ queryKey: ['syllabus-tree'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
    queryClient.invalidateQueries({ queryKey: ['progress'] });
  };

  const handleViewSession = (sessionId: string, sessionName: string) => {
    setViewSessionId(sessionId);
    invalidateAdminData();
    toast.info(`Now viewing ${sessionName} (View Mode). Teachers remain on active session.`);
  };

  const handleExitViewMode = () => {
    resetViewSession();
    invalidateAdminData();
    toast.success(`Returned to School Active Session: ${activeSession?.name || 'Active'}`);
  };

  const handleCreateSession = async () => {
    const trimmed = newSessionName.trim();
    if (!trimmed) {
      toast.error('Session name cannot be empty');
      return;
    }

    // Remember the current active session BEFORE creating the new one
    // (it will become the "source" for the import wizard)
    const previousActiveSession = sessions.find((s) => s.id === activeSessionId);

    try {
      const newSession = await createSession.mutateAsync({
        name: trimmed,
        setAsActive,
      });

      toast.success(`Academic Session "${trimmed}" created successfully!`);
      setCreateDialogOpen(false);
      setNewSessionName('');
      resetViewSession();

      // Show import wizard if there was a previous session to import from
      if (previousActiveSession && newSession?.id) {
        setImportWizard({
          open: true,
          newSessionId: newSession.id,
          newSessionName: trimmed,
          sourceSessionId: previousActiveSession.id,
          sourceSessionName: previousActiveSession.name,
          wasSetAsActive: setAsActive,
        });
      } else if (setAsActive) {
        // No previous session to import from, but was set as active
        await performSessionHardReset(queryClient);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create academic session');
    }
  };

  const handleImportWizardClose = async (open: boolean) => {
    if (open) return;
    // Wizard closed (either "Do it later" or "Done") — now trigger the hard reset
    // if the new session was set as active so the UI switches to the new session cleanly.
    const wizard = importWizard;
    setImportWizard(null);
    if (wizard?.wasSetAsActive) {
      await performSessionHardReset(queryClient);
    } else {
      queryClient.invalidateQueries({ queryKey: ['academic-sessions'] });
    }
  };

  const handleOpenEdit = (session: AcademicSession) => {
    setEditingSession(session);
    setEditSessionName(session.name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    const trimmed = editSessionName.trim();
    if (!trimmed) {
      toast.error('Session name cannot be empty');
      return;
    }
    if (trimmed === editingSession.name) {
      setEditDialogOpen(false);
      setEditingSession(null);
      return;
    }

    try {
      await updateSession.mutateAsync({
        id: editingSession.id,
        name: trimmed,
      });
      toast.success(`Academic Session renamed to "${trimmed}" successfully!`);
      setEditDialogOpen(false);
      setEditingSession(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update academic session');
    }
  };

  const handleActivateSession = async () => {
    if (!activateConfirmSession) return;
    try {
      await switchSession.mutateAsync(activateConfirmSession.id);
      resetViewSession();
      toast.success(`Academic session "${activateConfirmSession.name}" is now the School Active Session!`);
      setActivateConfirmSession(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate session');
    }
  };

  return (
    <DashboardShell title="Academic Sessions">
      <div className="space-y-4">
        {/* Executive Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <CalendarRange className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    Academic Sessions
                  </h1>
                  {activeSession && (
                    <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Live: {activeSession.name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Manage institutional academic batches, switch active school cycles, or review past archives.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span
                className={cn(
                  'h-9 inline-flex items-center gap-2 whitespace-nowrap text-xs font-bold px-3 rounded-lg border shrink-0 shadow-2xs',
                  isLimitReached
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-white text-slate-700 border-slate-200',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full shrink-0', isLimitReached ? 'bg-red-500 animate-pulse' : 'bg-emerald-500')} />
                <span>{sessions.length} / {sessionLimit} Sessions</span>
              </span>
              <ImportDataButton type="structure" label="Import Structure" />
              <Button
                id="create-session-button"
                onClick={() => {
                  if (isLimitReached) {
                    toast.error(
                      `Session limit reached (${sessions.length}/${sessionLimit}). Please upgrade your plan to create more academic sessions.`,
                    );
                    return;
                  }
                  setNewSessionName(yearSuggestions[0] || '');
                  setSetAsActive(true);
                  setCreateDialogOpen(true);
                }}
                disabled={isLimitReached}
                className={cn(
                  'h-9 font-bold text-xs shadow-sm transition-all duration-200 px-3.5',
                  isLimitReached
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-200 shadow-none'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20',
                )}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create New Session
              </Button>
            </div>
          </div>
        </div>

        {/* Plan Limit Warning Banner */}
        {isLimitReached && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  Academic Session Limit Reached ({sessions.length} / {sessionLimit})
                  <Badge variant="destructive" className="text-[10px] py-0 px-2 font-semibold">Upgrade Required</Badge>
                </h4>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  Your current subscription plan &quot;{subData?.subscription?.plan?.name || 'Active Plan'}&quot; allows up to <strong>{sessionLimit} academic session(s)</strong>. To create and manage new sessions for upcoming academic years, please upgrade your subscription plan.
                </p>
              </div>
            </div>
            <Link href="/admin/upgrade">
              <Button size="sm" className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shrink-0 text-xs shadow-sm font-semibold">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Upgrade Plan
              </Button>
            </Link>
          </div>
        )}

        {/* If in View Mode, show compact alert banner */}
        {isViewMode && currentViewSession && (
          <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-950 shadow-2xs">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Previewing archive <strong>{currentViewSession.name}</strong> in read-only mode. School active session remains <strong>{activeSession?.name || 'Active'}</strong>.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExitViewMode}
              className="h-7 text-xs font-bold border-amber-300 bg-white hover:bg-amber-100 text-amber-900"
            >
              Exit View Mode
            </Button>
          </div>
        )}

        {/* Concise Session Resource Allowances Strip */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Subjects Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Subjects
              </span>
              <span className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
                limits.subjects.used >= limits.subjects.max ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              )}>
                {limits.subjects.used >= limits.subjects.max ? 'Full' : `${limits.subjects.max - limits.subjects.used} left`}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">{limits.subjects.used}</span>
              <span className="text-xs font-medium text-slate-400">/ {limits.subjects.max} max</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (limits.subjects.used / Math.max(1, limits.subjects.max)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Classes Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Classes
              </span>
              <span className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
                limits.classes.used >= limits.classes.max ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
              )}>
                {limits.classes.used >= limits.classes.max ? 'Full' : `${limits.classes.max - limits.classes.used} left`}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">{limits.classes.used}</span>
              <span className="text-xs font-medium text-slate-400">/ {limits.classes.max} max</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (limits.classes.used / Math.max(1, limits.classes.max)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Teachers Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Teachers
              </span>
              <span className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
                limits.teachers.used >= limits.teachers.max ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'
              )}>
                {limits.teachers.used >= limits.teachers.max ? 'Full' : `${limits.teachers.max - limits.teachers.used} left`}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">{limits.teachers.used}</span>
              <span className="text-xs font-medium text-slate-400">/ {limits.teachers.max} max</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (limits.teachers.used / Math.max(1, limits.teachers.max)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Sessions Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Sessions
              </span>
              <span className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
                (limits.sessions?.used ?? sessions.length) >= (limits.sessions?.max ?? sessionLimit) ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
              )}>
                {(limits.sessions?.used ?? sessions.length) >= (limits.sessions?.max ?? sessionLimit)
                  ? 'Limit'
                  : `${(limits.sessions?.max ?? sessionLimit) - (limits.sessions?.used ?? sessions.length)} left`}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">{limits.sessions?.used ?? sessions.length}</span>
              <span className="text-xs font-medium text-slate-400">/ {limits.sessions?.max ?? sessionLimit} max</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    (((limits.sessions?.used ?? sessions.length)) / Math.max(1, limits.sessions?.max ?? sessionLimit)) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Search & Filtering Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="session-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search academic sessions..."
              className="pl-10 h-10 rounded-xl bg-white border-slate-200 focus-visible:ring-emerald-500 font-medium text-sm"
            />
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="font-bold text-[#0b1c30]">{filteredSessions.length}</span> of {sessions.length} sessions
          </div>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-3xl" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={search ? 'No sessions found' : 'No academic sessions yet'}
            description={
              search
                ? `No sessions match "${search}". Try searching for another year.`
                : 'Create your first academic session to begin organizing classes, syllabus, and teachers.'
            }
            action={
              !search
                ? {
                    label: 'Create Academic Session',
                    onClick: () => {
                      setNewSessionName(yearSuggestions[0] || '2026-27');
                      setCreateDialogOpen(true);
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => {
              const isSchoolActive = session.id === activeSessionId;
              const isCurrentlyViewed = session.id === (viewSessionId || activeSessionId);

              return (
                <div
                  key={session.id}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white',
                    isSchoolActive
                      ? 'border-emerald-400/90 ring-2 ring-emerald-500/20 shadow-xs'
                      : isCurrentlyViewed
                        ? 'border-amber-400/90 ring-2 ring-amber-400/20 shadow-xs'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-2xs',
                  )}
                >
                  {/* Top bar accent for active or viewed session */}
                  {isSchoolActive ? (
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
                  ) : isCurrentlyViewed ? (
                    <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                  ) : (
                    <div className="h-1.5 w-full bg-slate-100 group-hover:bg-slate-200 transition-colors" />
                  )}

                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-black tracking-tight text-[#0b1c30]">
                            {session.name}
                          </h3>
                          {isSchoolActive && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[10px] font-black uppercase px-2 py-0.5 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Live
                            </Badge>
                          )}
                          {isCurrentlyViewed && !isSchoolActive && (
                            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 gap-1">
                              <Eye className="h-3 w-3 text-amber-600" /> Viewing
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 mt-1">
                          Created {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-black uppercase px-2 py-0.5 tracking-wider shrink-0',
                          isSchoolActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200',
                        )}
                      >
                        {isSchoolActive ? 'ACTIVE' : 'ARCHIVED'}
                      </Badge>
                    </div>

                    {/* Session Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50/80 p-3 border border-slate-100 text-xs text-center">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500">Classes</p>
                        <p className="text-base font-black text-[#0b1c30] mt-0.5">{session._count.classes}</p>
                      </div>
                      <div className="border-x border-slate-200/80">
                        <p className="text-[11px] font-semibold text-slate-500">Subjects</p>
                        <p className="text-base font-black text-[#0b1c30] mt-0.5">{session._count.subjects ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500">Teachers</p>
                        <p className="text-base font-black text-[#0b1c30] mt-0.5">{session._count.teachers ?? 0}</p>
                      </div>
                    </div>

                    {/* Fresh session note if empty */}
                    {session._count.classes === 0 && session._count.subjects === 0 && (
                      <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 px-3 py-2 text-[11px] font-semibold text-amber-900 border border-amber-200/60">
                        <Info className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Fresh session with 0 records. Ready for classes setup.</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                    {isSchoolActive ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          School Active Session
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Link href="/admin/academic-timeline">
                            <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 gap-1.5">
                              <Calendar className="h-3.5 w-3.5" /> Timeline
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(session)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                            title="Edit Session"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          {isCurrentlyViewed ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 text-xs font-bold text-amber-800">
                                <Eye className="h-3.5 w-3.5 text-amber-600" />
                                Viewing
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleExitViewMode}
                                className="h-8 text-xs px-2.5 border-amber-300 text-amber-800 bg-white hover:bg-amber-100 font-bold"
                              >
                                Exit View
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewSession(session.id, session.name)}
                              className="bg-white hover:bg-slate-50 border-slate-200 text-xs gap-1.5 font-bold h-8 text-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-600" />
                              View Session
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => setActivateConfirmSession(session)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold h-8 shadow-xs"
                            title="Set as School Active Session"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Make Active
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(session)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 ml-auto rounded-lg"
                          title="Edit Session"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE SESSION DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Plus className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold">Create Academic Session</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500">
              Initialize a clean academic container for your institutional records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="session-name" className="text-xs font-semibold">
                Session Name
              </Label>
              <Input
                id="session-name"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="e.g. 2026-27 or 2027-28"
                className="font-medium"
                autoFocus
              />
              <p className="text-[11px] text-gray-500">
                Standard format is <code>YYYY-YY</code> (e.g. 2026-27).
              </p>
            </div>

            {/* Suggestions Chips */}
            {yearSuggestions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-gray-500">Suggested years:</span>
                <div className="flex flex-wrap gap-1.5">
                  {yearSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewSessionName(sug)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium border transition-colors',
                        newSessionName === sug
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
                      )}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Set as Active Toggle */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setAsActive}
                  onChange={(e) => setSetAsActive(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">
                    Set as active session immediately
                  </span>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Sets this new session as the school&apos;s active session.
                  </p>
                </div>
              </label>

              {setAsActive && (
                <div className="flex items-start gap-2 rounded-lg bg-white/80 p-2.5 text-xs text-blue-900 border border-blue-200/60 mt-2">
                  <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Fresh App Start:</strong> The application starts with 0 classes, 0 subjects, and 0 syllabus data. Previous session data remains fully preserved in the database.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createSession.isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-create-session-button"
              type="button"
              onClick={handleCreateSession}
              disabled={createSession.isPending || !newSessionName.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {createSession.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                'Create Session'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT SESSION DIALOG */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false);
            setEditingSession(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Pencil className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold">Edit Academic Session</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Update the academic session name. Associated timelines and terms will be updated.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEdit();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-session-name" className="text-xs font-semibold">
                Session Name
              </Label>
              <Input
                id="edit-session-name"
                value={editSessionName}
                onChange={(e) => setEditSessionName(e.target.value)}
                placeholder="e.g. 2025-26 or 2026-27"
                className="font-medium"
                autoFocus
              />
              <p className="text-[11px] text-gray-500">
                Standard format is <code>YYYY-YY</code> (e.g. 2026-27).
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingSession(null);
                }}
                disabled={updateSession.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSession.isPending || !editSessionName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateSession.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ACTIVATE CONFIRMATION DIALOG */}
      <Dialog
        open={!!activateConfirmSession}
        onOpenChange={(open) => !open && setActivateConfirmSession(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold">
                Activate Academic Session
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Switch the whole school to this academic session.
            </DialogDescription>
          </DialogHeader>

          {activateConfirmSession && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2 text-xs text-emerald-950">
              <p className="font-semibold text-sm text-emerald-900">
                Make &ldquo;{activateConfirmSession.name}&rdquo; the live active session?
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Setting this session as active will switch the curriculum, timetable, and teacher dashboards across the entire school to <strong>{activateConfirmSession.name}</strong>.
              </p>
              <p className="text-gray-500 text-[11px] pt-1">
                Previous records remain safely archived and accessible in View Mode anytime.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActivateConfirmSession(null)}
              disabled={switchSession.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleActivateSession}
              disabled={switchSession.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {switchSession.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                'Confirm & Set Active'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POST-CREATE IMPORT WIZARD */}
      {importWizard && (
        <PostSessionImportDialog
          open={importWizard.open}
          onOpenChange={handleImportWizardClose}
          newSessionId={importWizard.newSessionId}
          newSessionName={importWizard.newSessionName}
          sourceSessionId={importWizard.sourceSessionId}
          sourceSessionName={importWizard.sourceSessionName}
        />
      )}
    </DashboardShell>
  );
}
