'use client';

import { useState } from 'react';
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
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Generate timeline days for visualization
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

  const vacationSet = new Set(
    vacationDays
      .map((vd) => {
        const dates: string[] = [];
        const start = new Date(vd.startDate);
        const end = new Date(vd.endDate);
        // Normalize to UTC to avoid timezone shift
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(0, 0, 0, 0);
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]!);
        }
        return dates;
      })
      .flat(),
  );

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toDateString();
    const isHoliday = weeklyHolidays.includes(dayOfWeek);
    const isVacation = vacationSet.has(d.toISOString().split('T')[0]!);
    const isPast = d < today;
    const isToday = dateStr === today.toDateString();

    days.push({
      date: d.toISOString().split('T')[0] || '',
      isHoliday,
      isVacation,
      isPast,
      isToday,
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
  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'class' | 'subject'>('all');
  const [dayEditOpen, setDayEditOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TimelineDay | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['academic-terms', schoolId],
    queryFn: () =>
      api.getPaginated<AcademicTerm>('/academic-terms', schoolId ? { schoolId } : undefined),
    enabled: Boolean(schoolId),
  });

  const terms = data?.items ?? [];
  const selectedTerm = terms.find((t) => t.id === selectedTermId) || terms[0];

  const handleCreateClick = () => {
    setEditingTerm(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setWeeklyHolidays([0]);
    setOpen(true);
  };

  const handleEditClick = (term: AcademicTerm) => {
    setEditingTerm(term);
    setName(term.name);
    setStartDate(term.startDate.split('T')[0]);
    setEndDate(term.endDate.split('T')[0]);
    setWeeklyHolidays(JSON.parse(term.weeklyHolidays as unknown as string));
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
    if (editingTerm) {
      updateMutation.mutate(editingTerm.id);
    } else {
      createMutation.mutate();
    }
  };

  const toggleWeeklyHoliday = (day: number) => {
    setWeeklyHolidays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const addVacationDay = async () => {
    if (!editingTerm || !newVacationDay.startDate || !newVacationDay.endDate) return;

    try {
      await api.post(`/academic-terms/${editingTerm.id}/vacation-days`, newVacationDay);
      await qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
      // Now query cache is fresh, get the updated term
      const cached = qc.getQueryData<{ items: AcademicTerm[] }>(['academic-terms', schoolId]);
      const fresh = cached?.items.find((t) => t.id === editingTerm.id);
      if (fresh) setEditingTerm(fresh);
      setNewVacationDay({ startDate: '', endDate: '', reason: '' });
      toast.success('Vacation day added');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeVacationDay = async (vacationId: string) => {
    if (!editingTerm) return;
    try {
      await api.delete(`/academic-terms/${editingTerm.id}/vacation-days/${vacationId}`);
      await qc.invalidateQueries({ queryKey: ['academic-terms', schoolId] });
      const cached = qc.getQueryData<{ items: AcademicTerm[] }>(['academic-terms', schoolId]);
      const fresh = cached?.items.find((t) => t.id === editingTerm.id);
      if (fresh) setEditingTerm(fresh);
      toast.success('Vacation day removed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDayClick = (day: TimelineDay) => {
    setSelectedDay(day);
    setDayEditOpen(true);
  };

  const toggleDayAsVacation = async () => {
    if (!selectedTerm || !selectedDay) return;

    try {
      // Check if this date is already in a vacation range
      const existingVacation = selectedTerm.vacationDays?.find((vd) => {
        const start = new Date(vd.startDate);
        const end = new Date(vd.endDate);
        const dayDate = new Date(selectedDay.date);
        return dayDate >= start && dayDate <= end;
      });

      if (existingVacation) {
        // Remove from existing vacation range
        await api.delete(`/academic-terms/${selectedTerm.id}/vacation-days/${existingVacation.id}`);
        toast.success('Day removed from vacation');
      } else {
        // Add as single day vacation
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

  // Generate timeline for selected term
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

  return (
    <DashboardShell title="Academic Timeline Configuration">
      <div className="space-y-6">
        {/* Header with Add button */}
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-background flex items-center gap-2 rounded-md border px-3 py-1.5 shadow-sm">
            <Filter className="text-muted-foreground h-4 w-4" />
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-medium focus:outline-none"
            >
              <option value="all">All Terms</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-background flex items-center gap-2 rounded-md border px-3 py-1.5 shadow-sm">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="cursor-pointer bg-transparent text-sm font-medium focus:outline-none"
            >
              <option value="all">All Progress</option>
              <option value="teacher">By Teacher</option>
              <option value="class">By Class</option>
              <option value="subject">By Subject</option>
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
            {/* Timeline Progress Visualization */}
            {selectedTerm && (
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">
                      {selectedTerm.name} - Timeline Progress
                    </CardTitle>
                    <Badge className="border-none bg-blue-100 text-blue-800">
                      {selectedTerm.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Teaching Days Progress</span>
                      <span className="font-medium">
                        {completedDays} / {teachingDays.length} days (
                        {Math.round(progressPercentage)}%)
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                  </div>

                  {/* Day-by-Day Timeline */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Day-by-Day Timeline</Label>
                    <div className="space-y-3">
                      {(() => {
                        const monthGroups: { [key: string]: TimelineDay[] } = {};
                        timelineDays.forEach((day) => {
                          const date = new Date(day.date);
                          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                          if (!monthGroups[monthKey]) {
                            monthGroups[monthKey] = [];
                          }
                          monthGroups[monthKey].push(day);
                        });

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

                        return Object.entries(monthGroups).map(([monthKey, days]) => {
                          const [year, month] = monthKey.split('-').map(Number);
                          return (
                            <div key={monthKey} className="space-y-1">
                              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                                <span>
                                  {monthNames[month as number]} {year}
                                </span>
                                <div className="bg-border h-px flex-1" />
                              </div>
                              <div className="flex gap-1 overflow-x-auto pb-2">
                                {days.map((day, idx) => {
                                  const isTeachingDay = !day.isHoliday && !day.isVacation;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => handleDayClick(day)}
                                      className={cn(
                                        'flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border text-xs font-medium transition-opacity hover:opacity-80',
                                        isTeachingDay &&
                                          day.isPast &&
                                          'border-green-600 bg-green-500 text-white',
                                        isTeachingDay &&
                                          day.isToday &&
                                          'border-blue-600 bg-blue-500 text-white ring-2 ring-blue-300',
                                        isTeachingDay &&
                                          !day.isPast &&
                                          !day.isToday &&
                                          'border-blue-200 bg-blue-100 text-blue-700',
                                        day.isHoliday && 'border-red-200 bg-red-100 text-red-700',
                                        day.isVacation &&
                                          'border-orange-200 bg-orange-100 text-orange-700',
                                      )}
                                      title={`${day.date} - ${day.isHoliday ? 'Holiday' : day.isVacation ? 'Vacation' : 'Teaching Day'} (Click to edit)`}
                                    >
                                      {new Date(day.date).getDate()}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="text-muted-foreground flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded bg-green-500" />
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded bg-blue-500 ring-2 ring-blue-300" />
                        <span>Today</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded border border-blue-200 bg-blue-100" />
                        <span>Upcoming</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded border border-red-200 bg-red-100" />
                        <span>Holiday</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded border border-orange-200 bg-orange-100" />
                        <span>Vacation</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 border-t pt-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{teachingDays.length}</div>
                      <div className="text-muted-foreground text-xs">Teaching Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{completedDays}</div>
                      <div className="text-muted-foreground text-xs">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {timelineDays.filter((d) => d.isHoliday).length}
                      </div>
                      <div className="text-muted-foreground text-xs">Weekly Holidays</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {timelineDays.filter((d) => d.isVacation).length}
                      </div>
                      <div className="text-muted-foreground text-xs">Vacation Days</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Academic Terms Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {terms.map((term) => (
                <div
                  key={term.id}
                  className="animate-in fade-in group relative rounded-xl duration-200"
                >
                  <Card
                    className={cn(
                      'h-full border transition-all duration-300 hover:shadow-md',
                      selectedTermId === term.id
                        ? 'ring-2 ring-blue-500'
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
                            {new Date(term.startDate).toLocaleDateString()} -{' '}
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
                          <div className="text-muted-foreground text-xs">Holidays</div>
                          <div className="text-xl font-bold text-purple-600">
                            {JSON.parse(term.weeklyHolidays as unknown as string).length}
                          </div>
                        </div>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Weekly:{' '}
                        {JSON.parse(term.weeklyHolidays as unknown as string)
                          .map((d: number) => dayNames[d])
                          .join(', ')}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action buttons */}
                  <div className="bg-background/80 absolute right-3 top-3 flex items-center gap-0.5 rounded-lg border p-1 opacity-90 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
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
                        if (confirm('Are you sure you want to delete this academic term?')) {
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
                placeholder="e.g. 2024-2025 Academic Year"
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
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                      weeklyHolidays.includes(index)
                        ? 'border-red-500 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {editingTerm && (
              <div className="space-y-3 border-t pt-3">
                <Label className="text-xs font-semibold">Vacation Days</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={newVacationDay.startDate}
                      onChange={(e) =>
                        setNewVacationDay({ ...newVacationDay, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={newVacationDay.endDate}
                      onChange={(e) =>
                        setNewVacationDay({ ...newVacationDay, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Reason (optional)"
                    value={newVacationDay.reason}
                    onChange={(e) =>
                      setNewVacationDay({ ...newVacationDay, reason: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Button
                    onClick={addVacationDay}
                    disabled={!newVacationDay.startDate || !newVacationDay.endDate}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {(terms.find((t) => t.id === editingTerm?.id)?.vacationDays ?? []).map((vd) => (
                    <div
                      key={vd.id}
                      className="flex items-center justify-between rounded-lg border bg-gray-50 p-2 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {new Date(vd.startDate).toLocaleDateString()} -{' '}
                          {new Date(vd.endDate).toLocaleDateString()}
                        </span>
                        {vd.reason && (
                          <span className="text-muted-foreground text-xs">- {vd.reason}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-6 w-6"
                        onClick={() => removeVacationDay(vd.id!)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="mt-2 w-full"
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
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="flex items-center gap-2">
                {selectedDay?.isHoliday && (
                  <span className="font-medium text-red-600">Weekly Holiday</span>
                )}
                {selectedDay?.isVacation && (
                  <span className="font-medium text-orange-600">Vacation</span>
                )}
                {!selectedDay?.isHoliday && !selectedDay?.isVacation && (
                  <span className="font-medium text-blue-600">Teaching Day</span>
                )}
              </div>
            </div>
            {!selectedDay?.isHoliday && (
              <Button
                onClick={toggleDayAsVacation}
                variant={selectedDay?.isVacation ? 'destructive' : 'default'}
                className="w-full"
              >
                {selectedDay?.isVacation ? 'Remove from Vacation' : 'Mark as Vacation'}
              </Button>
            )}
            {selectedDay?.isHoliday && (
              <p className="text-muted-foreground text-sm">
                This is a weekly holiday. To change it, edit the academic term settings.
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
