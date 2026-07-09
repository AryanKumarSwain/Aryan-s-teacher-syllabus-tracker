'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, Calculator, Pencil, Filter, ChevronDown } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useSchool } from '@/features/syllabus/hooks/use-school';

interface VacationDay {
  id?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

interface Term {
  name: string;
  startDate: string;
  endDate: string;
}

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  actualAvailableDays: number;
  weeklyHolidays: number[];
  status: string;
  vacationDays: VacationDay[];
  terms: Term[];
}

interface TimelineDay {
  date: string;
  isHoliday: boolean;
  isVacation: boolean;
  isPast: boolean;
  isToday: boolean;
  weekNumber: number;
  termIndex: number | null; // which term this day belongs to (0-based), null = between terms
}

interface MonthGroup {
  monthKey: string;
  year: number;
  month: number;
  cells: (TimelineDay | null)[];
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayAbbr = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const TERM_COLORS = [
  {
    bg: 'bg-indigo-500',
    light: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    ring: 'ring-indigo-300',
    day: 'bg-indigo-100 text-indigo-800',
  },
  {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    ring: 'ring-emerald-300',
    day: 'bg-emerald-100 text-emerald-800',
  },
  {
    bg: 'bg-amber-500',
    light: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    ring: 'ring-amber-300',
    day: 'bg-amber-100 text-amber-800',
  },
  {
    bg: 'bg-rose-500',
    light: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    ring: 'ring-rose-300',
    day: 'bg-rose-100 text-rose-800',
  },
];

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function generateTimelineDays(
  startDate: string,
  endDate: string,
  weeklyHolidays: number[],
  vacationDays: VacationDay[],
  terms: Term[],
): TimelineDay[] {
  const days: TimelineDay[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const vacationSet = new Set(
    vacationDays.flatMap((vd) => {
      const dates: string[] = [];
      const s = new Date(vd.startDate);
      s.setUTCHours(0, 0, 0, 0);
      const e = new Date(vd.endDate);
      e.setUTCHours(0, 0, 0, 0);
      for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1))
        dates.push(d.toISOString().split('T')[0]!);
      return dates;
    }),
  );

  // Build term ranges (ensure terms is an array)
  const termRanges = (Array.isArray(terms) ? terms : []).map((t) => ({
    start: new Date(t.startDate + 'T00:00:00Z'),
    end: new Date(t.endDate + 'T00:00:00Z'),
  }));

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const isoDate = d.toISOString().split('T')[0]!;
    const dayOfWeek = d.getDay();
    const isHoliday = weeklyHolidays.includes(dayOfWeek);
    const isVacation = vacationSet.has(isoDate);
    const isPast = d < today;
    const isToday = isoDate === today.toISOString().split('T')[0];
    const dUTC = new Date(isoDate + 'T00:00:00Z');
    const termIndex = termRanges.findIndex((r) => dUTC >= r.start && dUTC <= r.end);

    days.push({
      date: isoDate,
      isHoliday,
      isVacation,
      isPast,
      isToday,
      weekNumber: getWeekNumber(d),
      termIndex: termIndex >= 0 ? termIndex : null,
    });
  }
  return days;
}

// Groups a flat list of TimelineDay entries into per-month calendar grids.
// Only months that actually contain a day from `days` will appear, and each
// month's leading cells (before the 1st) are padded with null placeholders.
function groupDaysByMonth(days: TimelineDay[]): MonthGroup[] {
  const monthGroups: MonthGroup[] = [];
  days.forEach((day) => {
    const date = new Date(day.date + 'T00:00:00Z');
    const year = date.getUTCFullYear(),
      month = date.getUTCMonth();
    const monthKey = `${year}-${month}`;
    let mg = monthGroups.find((m) => m.monthKey === monthKey);
    if (!mg) {
      const firstOfMonth = new Date(Date.UTC(year, month, 1));
      const startOffset = firstOfMonth.getUTCDay();
      mg = { monthKey, year, month, cells: Array(startOffset).fill(null) };
      monthGroups.push(mg);
    }
    mg.cells.push(day);
  });
  return monthGroups;
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AcademicTimelinePage() {
  const schoolId = useSchoolId();
  const { school } = useSchool();
  const qc = useQueryClient();
  const STORAGE_KEY = `academic-timeline-form-${schoolId || 'default'}`;

  const loadFormState = () => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  };
  const savedState = loadFormState();

  const [open, setOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [yearName, setYearName] = useState(savedState?.yearName || '');
  const [yearStartDate, setYearStartDate] = useState(savedState?.yearStartDate || '');
  const [yearEndDate, setYearEndDate] = useState(savedState?.yearEndDate || '');
  const [terms, setTerms] = useState<Term[]>(savedState?.terms || []);
  const [weeklyHolidays, setWeeklyHolidays] = useState<number[]>(savedState?.weeklyHolidays || [0]);
  const [newVacationDay, setNewVacationDay] = useState<VacationDay>({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [vacationError, setVacationError] = useState('');
  const [pendingVacations, setPendingVacations] = useState<VacationDay[]>(
    savedState?.pendingVacations || [],
  );
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [dayEditOpen, setDayEditOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TimelineDay | null>(null);
  // which terms/sections are collapsed in the calendar legend
  const [collapsedTerms, setCollapsedTerms] = useState<Record<number, boolean>>({});

  // Persist selectedTermId to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selected-academic-year');
    if (saved) setSelectedTermId(saved);
  }, []);

  useEffect(() => {
    if (selectedTermId) {
      localStorage.setItem('selected-academic-year', selectedTermId);
    }
  }, [selectedTermId]);

  useEffect(() => {
    if (open) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          yearName,
          yearStartDate,
          yearEndDate,
          terms,
          weeklyHolidays,
          pendingVacations,
        }),
      );
    }
  }, [
    yearName,
    yearStartDate,
    yearEndDate,
    terms,
    weeklyHolidays,
    pendingVacations,
    open,
    STORAGE_KEY,
  ]);

  useEffect(() => {
    if (!open && !editingYear) localStorage.removeItem(STORAGE_KEY);
  }, [open, editingYear, STORAGE_KEY]);

  const { data, isLoading } = useQuery({
    queryKey: ['academic-terms', schoolId],
    queryFn: async () => {
      // Query academic terms for current session only
      const response = await api.getPaginated<any>(
        '/academic-terms',
        schoolId ? { schoolId } : undefined,
      );
      const items = response.items.map((year: any) => ({
        ...year,
        terms: typeof year.terms === 'string' ? JSON.parse(year.terms) : year.terms || [],
        weeklyHolidays:
          typeof year.weeklyHolidays === 'string'
            ? JSON.parse(year.weeklyHolidays)
            : year.weeklyHolidays || [],
      }));
      return { ...response, items };
    },
    enabled: Boolean(schoolId),
  });

  const academicYears = data?.items ?? [];
  const timelineExists = academicYears.length > 0;

  // Ensure selectedTermId is valid (exists in academicYears)
  useEffect(() => {
    if (academicYears.length > 0) {
      if (!selectedTermId || !academicYears.find((t) => t.id === selectedTermId)) {
        // If no ID is set or saved ID doesn't exist, select the first available year
        setSelectedTermId(academicYears[0]?.id || '');
      }
    }
  }, [academicYears, selectedTermId]);

  const selectedTerm = academicYears.find((t) => t.id === selectedTermId);

  const handleCreateClick = () => {
    setEditingYear(null);
    setYearName('');
    setYearStartDate('');
    setYearEndDate('');
    setWeeklyHolidays([0]);
    setTerms([]);
    setPendingVacations([]);
    setNewVacationDay({ startDate: '', endDate: '', reason: '' });
    setVacationError('');
    setOpen(true);
  };

  const handleEditClick = (year: AcademicYear) => {
    setEditingYear(year);
    setYearName(year.name);
    setYearStartDate(year.startDate.split('T')[0] || '');
    setYearEndDate(year.endDate.split('T')[0] || '');
    setWeeklyHolidays(
      typeof year.weeklyHolidays === 'string'
        ? JSON.parse(year.weeklyHolidays as unknown as string)
        : year.weeklyHolidays || [],
    );
    // FIX 2: parse term dates so they show correctly in inputs
    setTerms(
      (year.terms || []).map((t: Term) => ({
        name: t.name,
        startDate: t.startDate ? t.startDate.split('T')[0] : '',
        endDate: t.endDate ? t.endDate.split('T')[0] : '',
      })),
    );
    setNewVacationDay({ startDate: '', endDate: '', reason: '' });
    setVacationError('');
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!yearName || !yearStartDate || !yearEndDate)
        throw new Error('Fill in all required fields');
      if (!schoolId) throw new Error('School ID is required');
      const formattedTerms = terms.map((t, i) => ({
        name: t.name || `Term ${i + 1}`,
        startDate: t.startDate || yearStartDate,
        endDate: t.endDate || yearEndDate,
      }));
      const validVacations = pendingVacations.filter(
        (vd) => vd.startDate && vd.endDate && vd.reason,
      );
      
      if (!school?.currentAcademicSessionId) {
        throw new Error('No active academic session found. Please create or select a session first.');
      }
      
      return api.post<AcademicYear>('/academic-terms', {
        schoolId,
        academicSessionId: school.currentAcademicSessionId,
        name: yearName,
        startDate: yearStartDate,
        endDate: yearEndDate,
        weeklyHolidays: weeklyHolidays || [0],
        vacationDays: validVacations,
        terms: formattedTerms,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
      toast.success('Academic year created');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<AcademicYear>(`/academic-terms/${id}`, {
        name: yearName,
        startDate: yearStartDate,
        endDate: yearEndDate,
        weeklyHolidays,
        terms,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
      toast.success('Academic year updated');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academic-terms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
      toast.success('Academic term deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (editingYear) updateMutation.mutate(editingYear.id);
    else createMutation.mutate();
  };
  const toggleWeeklyHoliday = (day: number) =>
    setWeeklyHolidays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const addVacationDay = async () => {
    if (!newVacationDay.startDate || !newVacationDay.endDate) {
      setVacationError('Start date and end date are required.');
      return;
    }
    if (!newVacationDay.reason?.trim()) {
      setVacationError('Reason is required.');
      return;
    }
    setVacationError('');
    if (editingYear) {
      try {
        await api.post(`/academic-terms/${editingYear.id}/vacation-days`, newVacationDay);
        await qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
        const cached = qc.getQueryData<{ items: AcademicYear[] }>(['academic-terms', schoolId]);
        const fresh = cached?.items.find((t) => t.id === editingYear.id);
        if (fresh) setEditingYear(fresh);
        setNewVacationDay({ startDate: '', endDate: '', reason: '' });
        toast.success('Vacation added');
      } catch (e: any) {
        toast.error(e.message);
      }
    } else {
      setPendingVacations((prev) => [...prev, { ...newVacationDay }]);
      setNewVacationDay({ startDate: '', endDate: '', reason: '' });
    }
  };

  const removeVacationDay = async (vacationId: string, index?: number) => {
    if (editingYear) {
      try {
        await api.delete(`/academic-terms/${editingYear.id}/vacation-days/${vacationId}`);
        await qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
        const cached = qc.getQueryData<{ items: AcademicYear[] }>(['academic-terms', schoolId]);
        const fresh = cached?.items.find((t) => t.id === editingYear.id);
        if (fresh) setEditingYear(fresh);
        toast.success('Vacation removed');
      } catch (e: any) {
        toast.error(e.message);
      }
    } else {
      setPendingVacations((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleDayClick = (day: TimelineDay) => {
    setSelectedDay(day);
    setDayEditOpen(true);
  };

  const toggleDayAsVacation = async () => {
    if (!selectedTerm || !selectedDay) return;
    try {
      const existing = selectedTerm.vacationDays?.find((vd) => {
        const s = new Date(vd.startDate),
          e = new Date(vd.endDate),
          dd = new Date(selectedDay.date);
        return dd >= s && dd <= e;
      });
      if (existing) {
        await api.delete(`/academic-terms/${selectedTerm.id}/vacation-days/${existing.id}`);
        toast.success('Day removed from vacation');
      } else {
        await api.post(`/academic-terms/${selectedTerm.id}/vacation-days`, {
          startDate: selectedDay.date,
          endDate: selectedDay.date,
          reason: 'Manual vacation',
        });
        toast.success('Day marked as vacation');
      }
      qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
      setDayEditOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const activatedTerms = Array.isArray(selectedTerm?.terms) ? selectedTerm.terms : [];

  // Auto-collapse terms based on today's date - expand only the term containing current date
  useEffect(() => {
    if (activatedTerms.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString().split('T')[0];

      const initialCollapsed: Record<number, boolean> = {};
      let hasActiveTerm = false;

      activatedTerms.forEach((term, idx) => {
        const isTodayInTerm =
          todayISO >= term.startDate.split('T')[0]! && todayISO <= term.endDate.split('T')[0]!;
        initialCollapsed[idx] = !isTodayInTerm; // Collapse if today is not in this term
        if (isTodayInTerm) hasActiveTerm = true;
      });

      // If today is not in any term, expand the first term
      if (!hasActiveTerm && activatedTerms.length > 0) {
        initialCollapsed[0] = false;
      }

      setCollapsedTerms(initialCollapsed);
    }
  }, [activatedTerms]);

  const weeklyHolidaysArr: number[] = selectedTerm
    ? typeof selectedTerm.weeklyHolidays === 'string'
      ? JSON.parse(selectedTerm.weeklyHolidays as unknown as string)
      : selectedTerm.weeklyHolidays || []
    : [];

  const timelineDays = selectedTerm
    ? generateTimelineDays(
        selectedTerm.startDate,
        selectedTerm.endDate,
        weeklyHolidaysArr,
        selectedTerm.vacationDays,
        activatedTerms,
      )
    : [];

  const teachingDays = timelineDays.filter((d) => !d.isHoliday && !d.isVacation);
  const completedDays = teachingDays.filter((d) => d.isPast).length;
  const progressPercentage =
    teachingDays.length > 0 ? (completedDays / teachingDays.length) * 100 : 0;

  // Month groups (fallback view when no terms are configured)
  const monthGroups: MonthGroup[] = groupDaysByMonth(timelineDays);

  // Per-term day/month groups so each term's calendar only shows its own date range
  const termCalendars = activatedTerms.map((term) => {
    const days =
      term.startDate && term.endDate
        ? generateTimelineDays(
            term.startDate,
            term.endDate,
            weeklyHolidaysArr,
            selectedTerm?.vacationDays || [],
            activatedTerms,
          )
        : [];
    return { term, monthGroups: groupDaysByMonth(days) };
  });

  const liveVacationDays = academicYears.find((t) => t.id === editingYear?.id)?.vacationDays ?? [];

  return (
    <DashboardShell title="Academic Timeline Configuration">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Academic Timeline</h2>
            <p className="text-muted-foreground text-sm">
              Manage the academic timeline, holidays, and vacation days to calculate available
              teaching days.
            </p>
          </div>
          {!timelineExists && (
            <Button onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" /> Create Timeline
            </Button>
          )}
          {timelineExists && (
            <div className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>To start a new year, please go to the dashboard and create a new session.</span>
            </div>
          )}
        </div>

        {/* Term selector - only show if timeline exists */}
        {timelineExists && (
          <div className="flex flex-wrap gap-3">
            <div className="bg-background flex items-center gap-2 rounded-md border px-3 py-1.5 shadow-sm">
              <Filter className="text-muted-foreground h-4 w-4" />
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="cursor-pointer bg-transparent text-sm font-medium focus:outline-none"
              >
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : academicYears.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No academic timeline configured"
            description="Create an academic timeline to start tracking teaching days and progress. You can do this once per academic session."
            action={{ label: 'Create Timeline', onClick: handleCreateClick }}
          />
        ) : (
          <>
            {selectedTerm && (
              <Card className="animate-in fade-in slide-in-from-top-2 border-2 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">
                      {selectedTerm.name} — Timeline
                    </CardTitle>
                    <Badge className="border-none bg-blue-100 text-blue-800">
                      {selectedTerm.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Progress bar */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Teaching Days Progress</span>
                      <span className="font-semibold">
                        {completedDays} / {teachingDays.length} days (
                        {Math.round(progressPercentage)}%)
                      </span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-green-500 transition-all duration-700"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
                    {[
                      { color: 'bg-green-500', label: 'Completed' },
                      { color: 'bg-blue-500 ring-2 ring-blue-300', label: 'Today' },
                      { color: 'bg-blue-100 border border-blue-200', label: 'Upcoming' },
                      { color: 'bg-red-100 border border-red-200', label: 'Holiday' },
                      { color: 'bg-orange-100 border border-orange-200', label: 'Vacation' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={cn('h-3 w-3 rounded', color)} />
                        <span>{label}</span>
                      </div>
                    ))}
                    {activatedTerms.map((t, i) => {
                      const tc = TERM_COLORS[i % TERM_COLORS.length]!;
                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={cn('h-3 w-3 rounded-full', tc.bg)} />
                          <span>{t.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar grouped by Terms */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Calendar by Term
                    </p>
                    {termCalendars.length > 0 ? (
                      termCalendars.map(({ term, monthGroups: termMonthGroups }, tIdx) => {
                        const tc = TERM_COLORS[tIdx % TERM_COLORS.length]!;
                        const isCollapsed = collapsedTerms[tIdx];

                        return (
                          <div
                            key={tIdx}
                            className={cn(
                              'mb-3 overflow-hidden rounded-xl border',
                              tc.border,
                              tc.light,
                            )}
                          >
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              onClick={() => setCollapsedTerms((p) => ({ ...p, [tIdx]: !p[tIdx] }))}
                            >
                              <div className={cn('h-3 w-3 flex-shrink-0 rounded-full', tc.bg)} />
                              <div className="min-w-0 flex-1">
                                <span className={cn('text-sm font-bold', tc.text)}>
                                  {term.name}
                                </span>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {term.startDate ? fmt(term.startDate) : '—'} →{' '}
                                  {term.endDate ? fmt(term.endDate) : '—'}
                                </span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform duration-200',
                                  tc.text,
                                  !isCollapsed && 'rotate-180',
                                )}
                              />
                            </button>
                            {!isCollapsed && (
                              <div className="border-t px-4 py-4">
                                {termMonthGroups.length === 0 ? (
                                  <p className="text-muted-foreground py-3 text-center text-xs">
                                    Set a start and end date for this term to see its calendar.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {termMonthGroups.map(({ monthKey, year, month, cells }) => {
                                      const rows: (TimelineDay | null)[][] = [];
                                      for (let i = 0; i < cells.length; i += 7)
                                        rows.push(cells.slice(i, i + 7));
                                      return (
                                        <div key={monthKey}>
                                          <div className="text-foreground mb-2 text-center text-sm font-bold">
                                            {monthNames[month]} {year}
                                          </div>
                                          <div className="mb-1 grid grid-cols-7 gap-0.5">
                                            {dayAbbr.map((d) => (
                                              <div
                                                key={d}
                                                className="text-muted-foreground text-center text-[10px] font-semibold"
                                              >
                                                {d}
                                              </div>
                                            ))}
                                          </div>
                                          <div className="space-y-0.5">
                                            {rows.map((row, rowIdx) => (
                                              <div
                                                key={rowIdx}
                                                className="grid grid-cols-7 gap-0.5"
                                              >
                                                {row.map((day, colIdx) => {
                                                  if (!day)
                                                    return (
                                                      <div
                                                        key={`empty-${colIdx}`}
                                                        className="h-7"
                                                      />
                                                    );
                                                  const isTeachingDay =
                                                    !day.isHoliday && !day.isVacation;
                                                  return (
                                                    <div
                                                      key={day.date}
                                                      onClick={() => handleDayClick(day)}
                                                      className={cn(
                                                        'flex h-7 cursor-pointer items-center justify-center rounded text-[11px] font-medium transition-all duration-100 hover:scale-110 hover:shadow-sm active:scale-95',
                                                        isTeachingDay &&
                                                          day.isPast &&
                                                          !day.isToday &&
                                                          'bg-green-500 text-white',
                                                        day.isToday &&
                                                          'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-1',
                                                        isTeachingDay &&
                                                          !day.isPast &&
                                                          !day.isToday &&
                                                          tc.day,
                                                        day.isHoliday &&
                                                          'cursor-default bg-red-100 text-red-600 hover:scale-100',
                                                        day.isVacation &&
                                                          'bg-orange-100 text-orange-700',
                                                      )}
                                                      title={`${day.date}`}
                                                    >
                                                      {new Date(
                                                        day.date + 'T00:00:00Z',
                                                      ).getUTCDate()}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {monthGroups.map(({ monthKey, year, month, cells }) => {
                          const rows: (TimelineDay | null)[][] = [];
                          for (let i = 0; i < cells.length; i += 7)
                            rows.push(cells.slice(i, i + 7));
                          return (
                            <div key={monthKey}>
                              <div className="text-foreground mb-2 text-center text-sm font-bold">
                                {monthNames[month]} {year}
                              </div>
                              <div className="mb-1 grid grid-cols-7 gap-0.5">
                                {dayAbbr.map((d) => (
                                  <div
                                    key={d}
                                    className="text-muted-foreground text-center text-[10px] font-semibold"
                                  >
                                    {d}
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-0.5">
                                {rows.map((row, rowIdx) => (
                                  <div key={rowIdx} className="grid grid-cols-7 gap-0.5">
                                    {row.map((day, colIdx) => {
                                      if (!day)
                                        return <div key={`empty-${colIdx}`} className="h-7" />;
                                      const isTeachingDay = !day.isHoliday && !day.isVacation;
                                      return (
                                        <div
                                          key={day.date}
                                          onClick={() => handleDayClick(day)}
                                          className={cn(
                                            'flex h-7 cursor-pointer items-center justify-center rounded text-[11px] font-medium transition-all duration-100 hover:scale-110 hover:shadow-sm active:scale-95',
                                            isTeachingDay &&
                                              day.isPast &&
                                              !day.isToday &&
                                              'bg-green-500 text-white',
                                            day.isToday &&
                                              'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-1',
                                            isTeachingDay &&
                                              !day.isPast &&
                                              !day.isToday &&
                                              'bg-blue-100 text-blue-700',
                                            day.isHoliday &&
                                              'cursor-default bg-red-100 text-red-600 hover:scale-100',
                                            day.isVacation && 'bg-orange-100 text-orange-700',
                                          )}
                                          title={`${day.date}`}
                                        >
                                          {new Date(day.date + 'T00:00:00Z').getUTCDate()}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 border-t pt-4">
                    {[
                      {
                        value: teachingDays.length,
                        label: 'Teaching Days',
                        color: 'text-blue-600',
                      },
                      { value: completedDays, label: 'Completed', color: 'text-green-600' },
                      {
                        value: timelineDays.filter((d) => d.isHoliday).length,
                        label: 'Holidays',
                        color: 'text-red-600',
                      },
                      {
                        value: timelineDays.filter((d) => d.isVacation).length,
                        label: 'Vacation Days',
                        color: 'text-orange-600',
                      },
                    ].map(({ value, label, color }) => (
                      <div key={label} className="text-center">
                        <div className={cn('text-2xl font-bold', color)}>{value}</div>
                        <div className="text-muted-foreground text-xs">{label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Academic Years Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {academicYears.map((year, i) => (
                <div
                  key={year.id}
                  className="animate-in fade-in slide-in-from-bottom-2 group relative rounded-xl duration-200"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Card
                    className={cn(
                      'h-full border transition-all duration-300 hover:shadow-md',
                      selectedTermId === year.id
                        ? 'shadow-md ring-2 ring-blue-500'
                        : 'border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/10',
                    )}
                  >
                    <CardHeader className="pr-32">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="line-clamp-1 text-lg font-bold tracking-tight">
                            {year.name}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {new Date(year.startDate).toLocaleDateString()} —{' '}
                            {new Date(year.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="border-none bg-blue-100 font-semibold text-blue-800 shadow-none dark:bg-blue-900/40 dark:text-blue-300">
                          {year.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 grid grid-cols-3 gap-3">
                        <div className="rounded-lg border bg-white/50 p-3 dark:bg-gray-800/50">
                          <div className="text-muted-foreground text-xs">Total Days</div>
                          <div className="text-xl font-bold text-blue-600">
                            {year.totalWorkingDays}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-white/50 p-3 dark:bg-gray-800/50">
                          <div className="text-muted-foreground text-xs">Available</div>
                          <div className="text-xl font-bold text-green-600">
                            {year.actualAvailableDays}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-white/50 p-3 dark:bg-gray-800/50">
                          <div className="text-muted-foreground text-xs">Vacations</div>
                          <div className="text-xl font-bold text-orange-600">
                            {year.vacationDays?.length ?? 0}
                          </div>
                        </div>
                      </div>
                      <div className="text-muted-foreground mb-3 text-xs">
                        Off days:{' '}
                        {(typeof year.weeklyHolidays === 'string'
                          ? JSON.parse(year.weeklyHolidays as unknown as string)
                          : year.weeklyHolidays || []
                        )
                          .map((d: number) => dayNames[d])
                          .join(', ')}
                      </div>

                      {/* Terms */}
                      {year.terms && Array.isArray(year.terms) && year.terms.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-muted-foreground text-xs font-semibold">Terms</div>
                          {(year.terms as Term[]).map((term: Term, tIdx: number) => {
                            const tc = TERM_COLORS[tIdx % TERM_COLORS.length]!;
                            return (
                              <div
                                key={tIdx}
                                className={cn(
                                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                                  tc.light,
                                  tc.border,
                                )}
                              >
                                <div
                                  className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', tc.bg)}
                                />
                                <span className={cn('text-xs font-semibold', tc.text)}>
                                  {term.name}
                                </span>
                                <span className="text-muted-foreground ml-auto text-xs">
                                  {term.startDate ? fmt(term.startDate) : '—'} →{' '}
                                  {term.endDate ? fmt(term.endDate) : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="bg-background/80 absolute right-3 top-3 flex items-center gap-0.5 rounded-lg border p-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <Button
                      variant={selectedTermId === year.id ? 'default' : 'ghost'}
                      size="icon"
                      className={cn(
                        'h-8 w-8',
                        selectedTermId === year.id
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      title={selectedTermId === year.id ? 'Active year' : 'Set as active year'}
                      onClick={() => setSelectedTermId(year.id)}
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      title="Edit year"
                      onClick={() => handleEditClick(year)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      title="Delete year"
                      onClick={() => {
                        if (confirm('Delete this academic year?')) deleteMutation.mutate(year.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingYear ? 'Edit Academic Year' : 'New Academic Year'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Year Name</Label>
              <Input
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
                placeholder="e.g. 2026-2027 Academic Year"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={yearStartDate}
                  onChange={(e) => setYearStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={yearEndDate}
                  onChange={(e) => setYearEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Weekly Holidays</Label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleWeeklyHoliday(index)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150',
                      weeklyHolidays.includes(index)
                        ? 'scale-105 border-red-500 bg-red-100 text-red-700'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Terms</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const newTermIndex = terms.length + 1;
                    const prevEnd =
                      terms.length > 0 ? terms[terms.length - 1]?.endDate : yearStartDate;
                    const nextDay = prevEnd
                      ? new Date(new Date(prevEnd).getTime() + 86400000)
                          .toISOString()
                          .split('T')[0]!
                      : yearStartDate;
                    setTerms([
                      ...terms,
                      { name: `Term ${newTermIndex}`, startDate: nextDay, endDate: '' },
                    ]);
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Term
                </Button>
              </div>
              {terms.map((term, index) => {
                const tc = TERM_COLORS[index % TERM_COLORS.length]!;
                return (
                  <div
                    key={index}
                    className={cn('space-y-2 rounded-xl border p-3', tc.light, tc.border)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-3 w-3 rounded-full', tc.bg)} />
                        <Label className={cn('text-xs font-bold', tc.text)}>
                          {term.name || `Term ${index + 1}`}
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"
                        onClick={() => setTerms(terms.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Term Name</Label>
                      <Input
                        value={term.name}
                        onChange={(e) => {
                          const n = [...terms];
                          if (n[index]) n[index].name = e.target.value;
                          setTerms(n);
                        }}
                        placeholder={`Term ${index + 1}`}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Start Date</Label>
                        <Input
                          type="date"
                          value={term.startDate}
                          onChange={(e) => {
                            const n = [...terms];
                            if (n[index]) n[index].startDate = e.target.value;
                            setTerms(n);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Date</Label>
                        <Input
                          type="date"
                          value={term.endDate}
                          onChange={(e) => {
                            const n = [...terms];
                            if (n[index]) {
                              n[index].endDate = e.target.value;
                              if (index < n.length - 1) {
                                const next = n[index + 1];
                                if (next)
                                  next.startDate = new Date(
                                    new Date(e.target.value).getTime() + 86400000,
                                  )
                                    .toISOString()
                                    .split('T')[0]!;
                              }
                            }
                            setTerms(n);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    {/* Show date range summary */}
                    {term.startDate && term.endDate && (
                      <p className={cn('text-xs', tc.text)}>
                        {fmt(term.startDate)} → {fmt(term.endDate)}
                      </p>
                    )}
                  </div>
                );
              })}
              {terms.length === 0 && (
                <p className="text-muted-foreground py-3 text-center text-xs">
                  No terms added yet. Click "Add Term" to create terms.
                </p>
              )}
            </div>

            {/* Vacation Days */}
            <div className="animate-in fade-in slide-in-from-top-1 space-y-3 border-t pt-3 duration-200">
              <Label className="text-xs font-semibold">Vacation Days</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={newVacationDay.startDate}
                    onChange={(e) => {
                      setNewVacationDay({ ...newVacationDay, startDate: e.target.value });
                      setVacationError('');
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={newVacationDay.endDate}
                    onChange={(e) => {
                      setNewVacationDay({ ...newVacationDay, endDate: e.target.value });
                      setVacationError('');
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Reason <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Diwali Break"
                    value={newVacationDay.reason}
                    onChange={(e) => {
                      setNewVacationDay({ ...newVacationDay, reason: e.target.value });
                      setVacationError('');
                    }}
                    className={cn('flex-1', vacationError && 'border-red-400')}
                  />
                  <Button
                    type="button"
                    onClick={addVacationDay}
                    size="icon"
                    className="transition-transform duration-150 active:scale-90"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {vacationError && (
                  <p className="animate-in fade-in text-xs text-red-500 duration-150">
                    {vacationError}
                  </p>
                )}
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {(editingYear ? liveVacationDays : pendingVacations).length === 0 && (
                  <p className="text-muted-foreground py-3 text-center text-xs">
                    No vacation days added yet.
                  </p>
                )}
                {(editingYear ? liveVacationDays : pendingVacations).map((vd, idx) => (
                  <div
                    key={vd.id || idx}
                    className="animate-in fade-in slide-in-from-top-1 flex items-center justify-between rounded-lg border bg-orange-50 p-2 duration-200 dark:bg-orange-900/10"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {fmt(vd.startDate)} — {fmt(vd.endDate)}
                      </span>
                      {vd.reason && (
                        <span className="text-muted-foreground text-xs">{vd.reason}</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-6 w-6 transition-transform duration-150 hover:scale-110"
                      onClick={() => removeVacationDay(vd.id ?? '', idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="mt-2 w-full transition-all duration-150 active:scale-95"
              onClick={handleSubmit}
              disabled={
                !yearName.trim() ||
                !yearStartDate ||
                !yearEndDate ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingYear ? 'Save Changes' : 'Create Academic Year'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Edit Dialog */}
      <Dialog open={dayEditOpen} onOpenChange={setDayEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Day</DialogTitle>
            <DialogDescription>
              {selectedDay &&
                new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
              {selectedDay?.termIndex !== null &&
                selectedDay?.termIndex !== undefined &&
                activatedTerms[selectedDay.termIndex] && (
                  <span className="ml-2 text-xs font-semibold">
                    ({activatedTerms[selectedDay.termIndex]?.name})
                  </span>
                )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="flex items-center gap-2">
                {selectedDay?.isHoliday && (
                  <span className="rounded-md bg-red-100 px-2 py-1 text-sm font-medium text-red-700">
                    Weekly Holiday
                  </span>
                )}
                {selectedDay?.isVacation && (
                  <span className="rounded-md bg-orange-100 px-2 py-1 text-sm font-medium text-orange-700">
                    Vacation
                  </span>
                )}
                {!selectedDay?.isHoliday && !selectedDay?.isVacation && (
                  <span className="rounded-md bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700">
                    Teaching Day
                  </span>
                )}
              </div>
            </div>
            {!selectedDay?.isHoliday && (
              <Button
                onClick={toggleDayAsVacation}
                variant={selectedDay?.isVacation ? 'destructive' : 'default'}
                className="w-full transition-all duration-150 active:scale-95"
              >
                {selectedDay?.isVacation ? 'Remove from Vacation' : 'Mark as Vacation'}
              </Button>
            )}
            {selectedDay?.isHoliday && (
              <p className="text-muted-foreground text-sm">
                This is a weekly holiday. Edit the academic term to change it.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayEditOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
