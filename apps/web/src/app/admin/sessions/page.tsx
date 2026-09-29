'use client';

import { useState, useMemo } from 'react';
import {
  CalendarRange,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Users,
  Search,
  Loader2,
  Info,
  Eye,
  Undo2,
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
import { useAcademicSessions, AcademicSession } from '@/features/syllabus/hooks/use-academic-sessions';
import { ImportDataButton } from '@/components/admin/import-data-button';
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
    deleteSession,
    switchSession,
  } = useAcademicSessions();

  // Subscription & Plan Limits
  const { data: subData } = useQuery({
    queryKey: ['admin', 'current-subscription'],
    queryFn: () => api.get<any>('/subscriptions/current'),
  });

  const sessionLimit = subData?.limits?.sessions?.max ?? 1;
  const isLimitReached = !isLoading && sessions.length >= sessionLimit;

  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [setAsActive, setSetAsActive] = useState(true);

  // Delete confirmation state
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<AcademicSession | null>(null);

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

    try {
      await createSession.mutateAsync({
        name: trimmed,
        setAsActive,
      });

      toast.success(`Academic Session "${trimmed}" created successfully!`);
      setCreateDialogOpen(false);
      setNewSessionName('');
      resetViewSession();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create academic session');
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteConfirmSession) return;
    try {
      await deleteSession.mutateAsync(deleteConfirmSession.id);
      if (viewSessionId === deleteConfirmSession.id) {
        resetViewSession();
      }
      toast.success(`Session "${deleteConfirmSession.name}" deleted`);
      setDeleteConfirmSession(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete session');
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
      <div className="space-y-6">
        {/* Top Header & Context Description */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Academic Sessions</h1>
                <p className="text-sm text-gray-500">
                  Manage institutional academic batches. Teachers always see the active session, while you can view past sessions anytime in read-only mode.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span
              className={cn(
                'h-9 inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold px-3.5 rounded-lg border shrink-0 shadow-2xs',
                isLimitReached
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full shrink-0', isLimitReached ? 'bg-red-500 animate-pulse' : 'bg-blue-500')} />
              <span>{sessions.length} / {sessionLimit} Sessions Allowed</span>
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
                'shadow-md',
                isLimitReached
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700',
              )}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Session
            </Button>
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

        {/* Highlight & Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Active Session Card */}
          <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 gap-1.5 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Active for School
                </Badge>
                <span className="text-xs text-muted-foreground">Current Live Batch</span>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mt-2">
                {activeSession?.name || 'No Active Session'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 space-y-2">
              <p>All classes, subjects, syllabus topics, and teacher logs are live under this session for teachers.</p>
              <div className="flex items-center gap-4 pt-1 font-medium text-gray-700">
                <span>{activeSession?._count.classes ?? 0} Classes</span>
                <span>•</span>
                <span>{activeSession?._count.subjects ?? 0} Subjects</span>
                <span>•</span>
                <span>{activeSession?._count.teachers ?? 0} Teachers</span>
              </div>
            </CardContent>
          </Card>

          {/* If in View Mode, show Currently Viewed Session Card */}
          {isViewMode && currentViewSession && (
            <Card className="border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 shadow-md ring-2 ring-amber-400/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-900 gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Eye className="h-3 w-3 text-amber-700" />
                    Now Previewing (Read-Only)
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExitViewMode}
                    className="h-6 px-2 text-[11px] text-amber-900 hover:bg-amber-100 font-semibold"
                  >
                    Exit View
                  </Button>
                </div>
                <CardTitle className="text-2xl font-bold text-amber-950 mt-2">
                  {currentViewSession.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-amber-900/90 space-y-2">
                <p>You are viewing this archived session. All screens reflect this session's data in read-only mode.</p>
                <div className="flex items-center gap-4 pt-1 font-medium text-amber-950">
                  <span>{currentViewSession._count.classes ?? 0} Classes</span>
                  <span>•</span>
                  <span>{currentViewSession._count.subjects ?? 0} Subjects</span>
                  <span>•</span>
                  <span>{currentViewSession._count.teachers ?? 0} Teachers</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fresh Start Guarantee Card */}
          <Card className="border-purple-200/80 bg-gradient-to-br from-purple-50/60 via-white to-pink-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-1.5 text-purple-700 font-semibold text-sm">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Fresh Start Architecture
              </div>
              <CardTitle className="text-lg font-bold text-gray-900">
                100% Isolated Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 space-y-1.5">
              <p>
                Creating a new session starts a clean-slate app with <strong>0 classes, 0 subjects, and 0 progress</strong>.
              </p>
              <p className="text-gray-500">
                Previous session history is never deleted and can be viewed or referenced at any moment.
              </p>
            </CardContent>
          </Card>

          {/* Session Catalog Stats Card */}
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Session Catalog
                </span>
                <CalendarRange className="h-4 w-4 text-gray-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {sessions.length} Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 space-y-1">
              <p>
                {sessions.filter((s) => !s.isArchived).length} active • {sessions.filter((s) => s.isArchived).length} archived
              </p>
              <p className="text-gray-500">
                Browse any past session in View Mode safely without disturbing active teachers.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filtering Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="session-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search academic sessions..."
              className="pl-9 bg-white"
            />
          </div>

          <div className="text-xs text-gray-500">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </div>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
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
                <Card
                  key={session.id}
                  className={cn(
                    'relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md bg-white',
                    isSchoolActive
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                      : isCurrentlyViewed
                        ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  {/* Top bar accent for active or viewed session */}
                  {isSchoolActive ? (
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
                  ) : isCurrentlyViewed ? (
                    <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                  ) : null}

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl font-bold text-gray-900">
                            {session.name}
                          </CardTitle>
                          {isSchoolActive && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-xs gap-1 font-semibold">
                              <CheckCircle2 className="h-3 w-3" /> School Active
                            </Badge>
                          )}
                          {isCurrentlyViewed && !isSchoolActive && (
                            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-xs gap-1 font-semibold">
                              <Eye className="h-3 w-3 text-amber-600" /> Viewing
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs mt-1">
                          Created {new Date(session.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-semibold tracking-wide',
                          isSchoolActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-gray-100 text-gray-500 border-gray-200',
                        )}
                      >
                        {isSchoolActive ? 'ACTIVE' : 'ARCHIVED'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pb-4">
                    {/* Session Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50/80 p-3 border border-gray-100 text-xs">
                      <div className="flex items-center gap-2 text-gray-700">
                        <GraduationCap className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-semibold text-gray-900">{session._count.classes}</div>
                          <div className="text-[11px] text-gray-500">Classes</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        <Users className="h-4 w-4 text-emerald-500" />
                        <div>
                          <div className="font-semibold text-gray-900">{session._count.teachers ?? 0}</div>
                          <div className="text-[11px] text-gray-500">Teachers</div>
                        </div>
                      </div>
                    </div>

                    {/* Fresh session note if empty */}
                    {session._count.classes === 0 && session._count.subjects === 0 && (
                      <div className="flex items-center gap-1.5 rounded bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 border border-amber-200/60">
                        <Info className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                        <span>Fresh session with 0 existing records. Ready for setup.</span>
                      </div>
                    )}
                  </CardContent>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-3">
                    {isSchoolActive ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        School Active Session
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isCurrentlyViewed ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-800">
                              <Eye className="h-3.5 w-3.5 text-amber-600" />
                              Viewing
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleExitViewMode}
                              className="h-8 text-xs px-2.5 border-amber-300 text-amber-800 bg-white hover:bg-amber-100 hover:text-amber-950 font-medium"
                            >
                              Exit View
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewSession(session.id, session.name)}
                            className="bg-white hover:bg-blue-50 hover:text-blue-700 border-gray-300 text-xs gap-1.5 font-medium h-8"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                            View Session
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => setActivateConfirmSession(session)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-medium h-8 shadow-sm"
                          title="Set as School Active Session"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Make Active
                        </Button>
                      </div>
                    )}

                    {!isSchoolActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmSession(session)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 ml-auto"
                        title="Delete Session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
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

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={!!deleteConfirmSession}
        onOpenChange={(open) => !open && setDeleteConfirmSession(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold">Delete Academic Session</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              This action cannot be undone. Are you sure you want to permanently delete this session?
            </DialogDescription>
          </DialogHeader>

          {deleteConfirmSession && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3.5 space-y-2 text-xs text-red-900">
              <p className="font-semibold">
                Deleting &ldquo;{deleteConfirmSession.name}&rdquo; will remove:
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>{deleteConfirmSession._count.classes} Classes and divisions</li>
                <li>{deleteConfirmSession._count.subjects} Subjects</li>
                <li>{deleteConfirmSession._count.chapters} Chapters and topics</li>
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmSession(null)}
              disabled={deleteSession.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSession}
              disabled={deleteSession.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSession.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Permanently'
              )}
            </Button>
          </DialogFooter>
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
    </DashboardShell>
  );
}
