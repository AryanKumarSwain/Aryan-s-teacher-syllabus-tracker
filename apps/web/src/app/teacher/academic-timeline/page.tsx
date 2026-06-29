'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Filter } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

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

export default function TeacherAcademicTimelinePage() {
  const user = useAuthStore((s) => s.user);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['academic-terms', user?.schoolId],
    queryFn: () =>
      api.getPaginated<AcademicTerm>(
        '/academic-terms',
        user?.schoolId ? { schoolId: user.schoolId } : undefined,
      ),
    enabled: !!user?.schoolId,
  });

  const terms = data?.items ?? [];

  useEffect(() => {
    if (terms.length > 0) {
      const stillValid = terms.find((t) => t.id === selectedTermId);
      if (!stillValid) {
        setSelectedTermId(terms[0].id);
      }
    }
  }, [terms]);

  const selectedTerm = terms.find((t) => t.id === selectedTermId) ?? terms[0];

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

  interface MonthGroup {
    monthKey: string;
    year: number;
    month: number;
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
      const firstOfMonth = new Date(Date.UTC(year, month, 1));
      const startOffset = firstOfMonth.getUTCDay();
      mg = { monthKey, year, month, cells: Array(startOffset).fill(null) };
      monthGroups.push(mg);
    }
    mg.cells.push(day);
  });

  return (
    <DashboardShell title="Academic Timeline">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Academic Terms</h2>
            <p className="text-muted-foreground text-sm">
              View academic terms, holidays, and teaching days for your school.
            </p>
          </div>
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
            description="Contact your school administrator to set up academic terms."
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

                  {/* Day-by-Day Timeline */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {monthGroups.map(({ monthKey, year, month, cells }) => {
                      const rows: (TimelineDay | null)[][] = [];
                      for (let i = 0; i < cells.length; i += 7) {
                        rows.push(cells.slice(i, i + 7));
                      }
                      return (
                        <div key={monthKey} className="animate-in fade-in duration-300">
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
                                  if (!day) {
                                    return <div key={`empty-${colIdx}`} className="h-7" />;
                                  }
                                  const isTeachingDay = !day.isHoliday && !day.isVacation;
                                  return (
                                    <div
                                      key={day.date}
                                      className={cn(
                                        'flex h-7 items-center justify-center rounded text-[11px] font-medium',
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
                                        day.isHoliday && 'bg-red-100 text-red-600',
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
                  className="animate-in fade-in slide-in-from-bottom-2 rounded-xl duration-200"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Card
                    className={cn(
                      'h-full border transition-all duration-300 hover:shadow-md',
                      selectedTermId === term.id
                        ? 'shadow-md ring-2 ring-blue-500'
                        : 'border-blue-200 bg-blue-50/40',
                    )}
                  >
                    <CardHeader>
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
                        <Badge className="border-none bg-blue-100 font-semibold text-blue-800">
                          {term.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 grid grid-cols-3 gap-3">
                        <div className="rounded-lg border bg-white/50 p-3">
                          <div className="text-muted-foreground text-xs">Total Days</div>
                          <div className="text-xl font-bold text-blue-600">
                            {term.totalWorkingDays}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-white/50 p-3">
                          <div className="text-muted-foreground text-xs">Available</div>
                          <div className="text-xl font-bold text-green-600">
                            {term.actualAvailableDays}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-white/50 p-3">
                          <div className="text-muted-foreground text-xs">Vacations</div>
                          <div className="text-xl font-bold text-orange-600">
                            {term.vacationDays?.length ?? 0}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
