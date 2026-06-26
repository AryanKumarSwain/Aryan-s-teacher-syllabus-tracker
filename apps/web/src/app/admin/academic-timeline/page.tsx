'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Trash2,
  Calculator,
  Pencil,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

interface VacationDay {
  id?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  actualAvailableDays: number;
  weeklyHolidays: number[];
  status: string;
  vacationDays: VacationDay[];
}

interface TimelineDay {
  date: string;
  isHoliday: boolean;
  isVacation: boolean;
  isPast: boolean;
  isToday: boolean;
  weekNumber: number;
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
): TimelineDay[] {
  const days: TimelineDay[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build vacation set using ISO date strings to avoid timezone issues
  const vacationSet = new Set(
    vacationDays.flatMap((vd) => {
      const dates: string[] = [];
      const s = new Date(vd.startDate);
      const e = new Date(vd.endDate);
      s.setUTCHours(0, 0, 0, 0);
      e.setUTCHours(0, 0, 0, 0);
      for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]!);
      }
      return dates;
    }),
  );

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const isoDate = d.toISOString().split('T')[0]!;
    const dayOfWeek = d.getDay();
    const isHoliday = weeklyHolidays.includes(dayOfWeek);
    const isVacation = vacationSet.has(isoDate);
    const isPast = d < today;
    const isToday = isoDate === today.toISOString().split('T')[0];

    days.push({
      date: isoDate,
      isHoliday,
      isVacation,
      isPast,
      isToday,
      weekNumber: getWeekNumber(d),
    });
  }

  return days;
}

export default function AcademicTimelinePage() {
  const schoolId = useSchoolId();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weeklyHolidays, setWeeklyHolidays] = useState<number[]>([0]);
  const [newVacationDay, setNewVacationDay] = useState<VacationDay>({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [vacationError, setVacationError] = useState('');
  const [pendingVacations, setPendingVacations] = useState<VacationDay[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [dayEditOpen, setDayEditOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TimelineDay | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['academic-terms', schoolId],
    queryFn: () =>
      api.getPaginated<AcademicTerm>('/academic-terms', schoolId ? { schoolId } : undefined),
    enabled: Boolean(schoolId),
  });

  const terms = data?.items ?? [];

  // Auto-select first term when data loads, preserve selection if still valid
  useEffect(() => {
    if (terms.length > 0) {
      const stillValid = terms.find((t) => t.id === selectedTermId);
      if (!stillValid) {
        setSelectedTermId(terms[0].id);
      }
    }
  }, [terms]);

  const selectedTerm = terms.find((t) => t.id === selectedTermId) ?? terms[0];

  const handleCreateClick = () => {
    setEditingTerm(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setWeeklyHolidays([0]);
    setPendingVacations([]);
    setNewVacationDay({ startDate: '', endDate: '', reason: '' });
    setVacationError('');
    setOpen(true);
  };

  const handleEditClick = (term: AcademicTerm) => {
    setEditingTerm(term);
    setName(term.name);
    setStartDate(term.startDate.split('T')[0]);
    setEndDate(term.endDate.split('T')[0]);
    setWeeklyHolidays(JSON.parse(term.weeklyHolidays as unknown as string));
    setNewVacationDay({ startDate: '', endDate: '', reason: '' });
    setVacationError('');
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<AcademicTerm>('/academic-terms', {
        schoolId,
        name,
        startDate,
        endDate,
        weeklyHolidays,
        vacationDays: pendingVacations,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
      toast.success('Academic term created');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<AcademicTerm>(`/academic-terms/${id}`, {
        name,
        startDate,
        endDate,
        weeklyHolidays,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
      toast.success('Academic term updated');
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
    if (editingTerm) updateMutation.mutate(editingTerm.id);
    else createMutation.mutate();
  };

  const toggleWeeklyHoliday = (day: number) => {
    setWeeklyHolidays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

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

    if (editingTerm) {
      // Existing term — save to API immediately
      try {
        await api.post(`/academic-terms/${editingTerm.id}/vacation-days`, newVacationDay);
        await qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
        const cached = qc.getQueryData<{ items: AcademicTerm[] }>(['academic-terms', schoolId]);
        const fresh = cached?.items.find((t) => t.id === editingTerm.id);
        if (fresh) setEditingTerm(fresh);
        setNewVacationDay({ startDate: '', endDate: '', reason: '' });
        toast.success('Vacation added');
      } catch (e: any) {
        toast.error(e.message);
      }
    } else {
      // New term — store locally until create is submitted
      setPendingVacations((prev) => [...prev, { ...newVacationDay }]);
      setNewVacationDay({ startDate: '', endDate: '', reason: '' });
    }
  };

  const removeVacationDay = async (vacationId: string, index?: number) => {
    if (editingTerm) {
      try {
        await api.delete(`/academic-terms/${editingTerm.id}/vacation-days/${vacationId}`);
        await qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
        const cached = qc.getQueryData<{ items: AcademicTerm[] }>(['academic-terms', schoolId]);
        const fresh = cached?.items.find((t) => t.id === editingTerm.id);
        if (fresh) setEditingTerm(fresh);
        toast.success('Vacation removed');
      } catch (e: any) {
        toast.error(e.message);
      }
    } else {
      // Remove from pending list by index
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
      const existingVacation = selectedTerm.vacationDays?.find((vd) => {
        const s = new Date(vd.startDate);
        const e = new Date(vd.endDate);
        const dayDate = new Date(selectedDay.date);
        return dayDate >= s && dayDate <= e;
      });

      if (existingVacation) {
        await api.delete(`/academic-terms/${selectedTerm.id}/vacation-days/${existingVacation.id}`);
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

  const timelineDays = selectedTerm
    ? generateTimelineDays(
        selectedTerm.startDate,
        selectedTerm.endDate,
        JSON.parse(selectedTerm.weeklyHolidays as unknown as string),
        selectedTerm.vacationDays,
      )
    : [];

  const teachingDays = timelineDays.filter((d) => !d.isHoliday && !d.isVacation);
  const completedDays = teachingDays.filter((d) => d.isPast).length;
  const progressPercentage =
    teachingDays.length > 0 ? (completedDays / teachingDays.length) * 100 : 0;

  // Group days by month for a proper calendar grid
  interface MonthGroup {
    monthKey: string;
    year: number;
    month: number;
    // A flat array of 42 slots (6 weeks × 7 days), null = empty padding cell
    cells: (TimelineDay | null)[];
  }
  const monthGroups: MonthGroup[] = [];
  timelineDays.forEach((day) => {
    const date = new Date(day.date + 'T00:00:00Z');
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const monthKey = `${year}-${month}`;
    let mg = monthGroups.find((m) => m.monthKey === monthKey);
    if (!mg) {
      // Find what day of week the 1st of this month falls on
      const firstOfMonth = new Date(Date.UTC(year, month, 1));
      const startOffset = firstOfMonth.getUTCDay(); // 0=Sun
      mg = { monthKey, year, month, cells: Array(startOffset).fill(null) };
      monthGroups.push(mg);
    }
    mg.cells.push(day);
  });

  const liveVacationDays = terms.find((t) => t.id === editingTerm?.id)?.vacationDays ?? [];

  return (
    <DashboardShell title="Academic Timeline Configuration">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Academic Terms</h2>
            <p className="text-muted-foreground text-sm">
              Manage academic terms, holidays, and vacation days to calculate available teaching
              days.
            </p>
          </div>
          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" /> Add academic term
          </Button>
        </div>

        {/* Term selector */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-background flex items-center gap-2 rounded-md border px-3 py-1.5 shadow-sm">
            <Filter className="text-muted-foreground h-4 w-4" />
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-medium focus:outline-none"
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : terms.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No academic terms configured"
            description="Create an academic term to start tracking teaching days and progress."
            action={{ label: 'Add academic term', onClick: handleCreateClick }}
          />
        ) : (
          <>
            {/* Timeline Progress */}
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
                  </div>

                  {/* Day-by-Day Timeline — 3 months per row on desktop */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {monthGroups.map(({ monthKey, year, month, cells }) => {
                      // Chunk cells into rows of 7
                      const rows: (TimelineDay | null)[][] = [];
                      for (let i = 0; i < cells.length; i += 7) {
                        rows.push(cells.slice(i, i + 7));
                      }
                      return (
                        <div key={monthKey} className="animate-in fade-in duration-300">
                          {/* Month header */}
                          <div className="text-foreground mb-2 text-center text-sm font-bold">
                            {monthNames[month]} {year}
                          </div>
                          {/* Day-of-week header */}
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
                          {/* Calendar rows */}
                          <div className="space-y-0.5">
                            {rows.map((row, rowIdx) => (
                              <div key={rowIdx} className="grid grid-cols-7 gap-0.5">
                                {row.map((day, colIdx) => {
                                  if (!day) {
                                    return <div key={`empty-${colIdx}`} className="h-7" />;
                                  }
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
                                      title={`${day.date} — ${day.isHoliday ? 'Holiday' : day.isVacation ? 'Vacation' : 'Teaching Day'}`}
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

            {/* Academic Terms Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {terms.map((term, i) => (
                <div
                  key={term.id}
                  className="animate-in fade-in slide-in-from-bottom-2 group relative rounded-xl duration-200"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Card
                    className={cn(
                      'h-full border transition-all duration-300 hover:shadow-md',
                      selectedTermId === term.id
                        ? 'shadow-md ring-2 ring-blue-500'
                        : 'border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/10',
                    )}
                  >
                    <CardHeader className="pr-32">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="line-clamp-1 text-lg font-bold tracking-tight">
                            {term.name}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {new Date(term.startDate).toLocaleDateString()} —{' '}
                            {new Date(term.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="border-none bg-blue-100 font-semibold text-blue-800 shadow-none dark:bg-blue-900/40 dark:text-blue-300">
                          {term.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 grid grid-cols-3 gap-3">
                        <div className="rounded-lg border bg-white/50 p-3 dark:bg-gray-800/50">
                          <div className="text-muted-foreground text-xs">Total Days</div>
                          <div className="text-xl font-bold text-blue-600">
                            {term.totalWorkingDays}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-white/50 p-3 dark:bg-gray-800/50">
                          <div className="text-muted-foreground text-xs">Available</div>
                          <div className="text-xl font-bold text-green-600">
                            {term.actualAvailableDays}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-white/50 p-3 dark:bg-gray-800/50">
                          <div className="text-muted-foreground text-xs">Vacations</div>
                          <div className="text-xl font-bold text-orange-600">
                            {term.vacationDays?.length ?? 0}
                          </div>
                        </div>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Off days:{' '}
                        {JSON.parse(term.weeklyHolidays as unknown as string)
                          .map((d: number) => dayNames[d])
                          .join(', ')}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action buttons */}
                  <div className="bg-background/80 absolute right-3 top-3 flex items-center gap-0.5 rounded-lg border p-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      title="View timeline"
                      onClick={() => setSelectedTermId(term.id)}
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      title="Edit term"
                      onClick={() => handleEditClick(term)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      title="Delete term"
                      onClick={() => {
                        if (confirm('Delete this academic term?')) {
                          deleteMutation.mutate(term.id);
                        }
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
              {editingTerm ? 'Edit Academic Term' : 'New Academic Term'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Term Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2026-2027 Academic Year"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                        ? 'scale-105 border-red-500 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {
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
                  {liveVacationDays.length === 0 && (
                    <p className="text-muted-foreground py-3 text-center text-xs">
                      No vacation days added yet.
                    </p>
                  )}
                  {(editingTerm ? liveVacationDays : pendingVacations).map((vd, idx) => (
                    <div
                      key={vd.id}
                      className="animate-in fade-in slide-in-from-top-1 flex items-center justify-between rounded-lg border bg-orange-50 p-2 duration-200 dark:bg-orange-900/10"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {new Date(vd.startDate).toLocaleDateString()} —{' '}
                          {new Date(vd.endDate).toLocaleDateString()}
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
            }

            <Button
              className="mt-2 w-full transition-all duration-150 active:scale-95"
              onClick={handleSubmit}
              disabled={
                !name.trim() ||
                !startDate ||
                !endDate ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingTerm ? 'Save Changes' : 'Create Academic Term'}
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
