'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Filter, 
  Clock, 
  CheckCircle2, 
  Palmtree, 
  AlertCircle, 
  Sparkles, 
  Layers,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function Section({
  title,
  icon: Icon,
  iconBg = 'bg-blue-50',
  iconColor = 'text-blue-600',
  iconGradient,
  extra,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  iconGradient?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/30 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-2.5">
          <div className={cn('rounded-xl p-2', iconGradient ? cn(iconGradient, 'text-white') : iconBg)}>
            <Icon className={cn('h-4 w-4', iconGradient ? 'text-white' : iconColor)} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
        </div>
        {extra && <div className="flex items-center">{extra}</div>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

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
      if (!stillValid && terms[0]) {
        setSelectedTermId(terms[0].id);
      }
    }
  }, [terms, selectedTermId]);

  const selectedTerm = terms.find((t) => t.id === selectedTermId) ?? terms[0];

  const timelineDays = selectedTerm
    ? generateTimelineDays(
        selectedTerm.startDate,
        selectedTerm.endDate,
        typeof selectedTerm.weeklyHolidays === 'string'
          ? JSON.parse(selectedTerm.weeklyHolidays)
          : selectedTerm.weeklyHolidays || [0],
        selectedTerm.vacationDays || [],
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

  const holidaysCount = timelineDays.filter((d) => d.isHoliday).length;
  const vacationsCount = timelineDays.filter((d) => d.isVacation).length;

  return (
    <DashboardShell title="Academic Timeline">
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Welcome & Status Banner (Matching Image 1 exact UI) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    Academic Term Timeline
                  </h1>
                  <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live: {selectedTerm ? selectedTerm.name : 'Academic Calendar'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Official school calendar schedules, teaching days, declared holidays, and vacation breaks.
                </p>
              </div>
            </div>

            {/* Term Selector */}
            {terms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Term:</span>
                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="cursor-pointer bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
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
            {/* 4 Concise Overview KPI Metric Cards (Matching Image 1 UI) */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {/* Card 1 - Blue: Teaching Days */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                    Teaching Days
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                    Schedule
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#0b1c30]">
                    {teachingDays.length}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">days</span>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  Planned teaching sessions
                </p>
              </div>

              {/* Card 2 - Emerald: Completed Days */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                    Instruction Elapsed
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                    {Math.round(progressPercentage)}% Passed
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#0b1c30]">
                    {completedDays}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600">elapsed</span>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  {teachingDays.length - completedDays} teaching days remain
                </p>
              </div>

              {/* Card 3 - Rose: Holidays */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                    Holidays
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                    Sundays
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#0b1c30]">
                    {holidaysCount}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">holidays</span>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  Sundays & declared weekends
                </p>
              </div>

              {/* Card 4 - Amber: Vacations */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                    Vacation Breaks
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                    Recess
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#0b1c30]">
                    {vacationsCount}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">breaks</span>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  Scheduled calendar breaks
                </p>
              </div>
            </div>

            {/* Main Interactive Calendar Section */}
            {selectedTerm && (
              <Section
                title={`${selectedTerm.name} — Teaching Days Timeline`}
                icon={Calendar}
                iconGradient="from-indigo-600 to-blue-600"
                extra={
                  <span className="text-xs font-bold text-slate-500">
                    {new Date(selectedTerm.startDate).toLocaleDateString()} to {new Date(selectedTerm.endDate).toLocaleDateString()}
                  </span>
                }
              >
                <div className="space-y-5">
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">Teaching Term Progress</span>
                      <span className="text-blue-600">
                        {completedDays} / {teachingDays.length} Teaching Days ({Math.round(progressPercentage)}%)
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Calendar Legend Chips */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-b border-slate-100 pb-3 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded bg-emerald-500 shadow-2xs" />
                      <span className="text-slate-600">Completed Day</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded bg-blue-600 ring-2 ring-blue-300" />
                      <span className="text-slate-600">Today</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded bg-blue-100 border border-blue-200" />
                      <span className="text-slate-600">Upcoming Teaching</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded bg-rose-100 border border-rose-200" />
                      <span className="text-slate-600">Holiday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded bg-amber-100 border border-amber-200" />
                      <span className="text-slate-600">Vacation Break</span>
                    </div>
                  </div>

                  {/* Monthly Calendar Grids */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                    {monthGroups.map(({ monthKey, year, month, cells }) => {
                      const rows: (TimelineDay | null)[][] = [];
                      for (let i = 0; i < cells.length; i += 7) {
                        rows.push(cells.slice(i, i + 7));
                      }
                      return (
                        <div key={monthKey} className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 shadow-2xs">
                          <div className="mb-2 text-center text-sm font-bold text-[#0b1c30]">
                            {monthNames[month]} {year}
                          </div>
                          <div className="mb-1 grid grid-cols-7 gap-1">
                            {dayAbbr.map((d) => (
                              <div
                                key={d}
                                className="text-center text-[10px] font-bold text-slate-400"
                              >
                                {d}
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {rows.map((row, rowIdx) => (
                              <div key={rowIdx} className="grid grid-cols-7 gap-1">
                                {row.map((day, colIdx) => {
                                  if (!day) {
                                    return <div key={`empty-${colIdx}`} className="h-7" />;
                                  }
                                  const isTeachingDay = !day.isHoliday && !day.isVacation;
                                  return (
                                    <div
                                      key={day.date}
                                      className={cn(
                                        'flex h-7 items-center justify-center rounded-lg text-[11px] font-bold transition-transform hover:scale-110 shadow-2xs cursor-default',
                                        isTeachingDay &&
                                          day.isPast &&
                                          !day.isToday &&
                                          'bg-emerald-500 text-white',
                                        day.isToday &&
                                          'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1',
                                        isTeachingDay &&
                                          !day.isPast &&
                                          !day.isToday &&
                                          'bg-blue-100 text-blue-800 border border-blue-200',
                                        day.isHoliday && 'bg-rose-100 text-rose-700 border border-rose-200',
                                        day.isVacation && 'bg-amber-100 text-amber-800 border border-amber-200',
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
                </div>
              </Section>
            )}

            {/* Academic Terms Overview Cards */}
            <Section
              title="All Academic Terms Overview"
              icon={Layers}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            >
              <div className="grid gap-4 md:grid-cols-2">
                {terms.map((term) => (
                  <div
                    key={term.id}
                    onClick={() => setSelectedTermId(term.id)}
                    className={cn(
                      'cursor-pointer rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5',
                      selectedTermId === term.id
                        ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-200 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{term.name}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {new Date(term.startDate).toLocaleDateString()} — {new Date(term.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700">
                        {term.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Days</span>
                        <span className="text-sm font-black text-blue-600">{term.totalWorkingDays}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Available</span>
                        <span className="text-sm font-black text-emerald-600">{term.actualAvailableDays}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Vacations</span>
                        <span className="text-sm font-black text-amber-600">{term.vacationDays?.length ?? 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
