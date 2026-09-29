'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Trash2,
  Calculator,
  Pencil,
  Filter,
  ChevronDown,
  Palmtree,
  CalendarRange,
  LayoutGrid,
  Landmark,
  Sparkles,
  AlertCircle,
  CheckCircle2,
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
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';

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
  isWeeklyHoliday?: boolean;
  isVacation: boolean;
  isPast: boolean;
  isToday: boolean;
  weekNumber: number;
  termIndex: number | null; // which term this day belongs to (0-based), null = between terms
  holidayName?: string;
  isNationalHoliday?: boolean;
  wasHoliday?: boolean;
  originalHolidayName?: string;
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

// Indian National & Gazetted Festival Holidays
const INDIAN_NATIONAL_AND_FESTIVAL_HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-01-01': "New Year's Day",
  '2025-01-14': 'Makar Sankranti / Pongal',
  '2025-01-26': 'Republic Day',
  '2025-02-26': 'Maha Shivratri',
  '2025-03-14': 'Holi',
  '2025-03-31': 'Eid-ul-Fitr',
  '2025-04-10': 'Mahavir Jayanti',
  '2025-04-14': 'Dr. B.R. Ambedkar Jayanti',
  '2025-04-18': 'Good Friday',
  '2025-05-12': 'Buddha Purnima',
  '2025-06-07': 'Bakrid / Eid-ul-Adha',
  '2025-07-06': 'Muharram',
  '2025-08-15': 'Independence Day',
  '2025-08-16': 'Janmashtami',
  '2025-09-05': 'Milad-un-Nabi',
  '2025-10-02': 'Mahatma Gandhi Jayanti',
  '2025-10-12': 'Dussehra (Vijayadashami)',
  '2025-10-20': 'Diwali (Deepavali)',
  '2025-11-05': 'Guru Nanak Jayanti',
  '2025-12-25': 'Christmas Day',

  // 2026
  '2026-01-01': "New Year's Day",
  '2026-01-14': 'Makar Sankranti / Pongal',
  '2026-01-26': 'Republic Day',
  '2026-02-15': 'Maha Shivratri',
  '2026-03-04': 'Holi',
  '2026-03-20': 'Eid-ul-Fitr',
  '2026-03-31': 'Mahavir Jayanti',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Dr. B.R. Ambedkar Jayanti',
  '2026-05-01': 'Buddha Purnima / May Day',
  '2026-05-27': 'Bakrid / Eid-ul-Adha',
  '2026-06-25': 'Muharram',
  '2026-08-15': 'Independence Day',
  '2026-08-28': 'Raksha Bandhan',
  '2026-09-04': 'Janmashtami',
  '2026-09-25': 'Milad-un-Nabi',
  '2026-10-02': 'Mahatma Gandhi Jayanti',
  '2026-10-20': 'Dussehra (Vijayadashami)',
  '2026-11-08': 'Diwali (Deepavali)',
  '2026-11-24': 'Guru Nanak Jayanti',
  '2026-12-25': 'Christmas Day',

  // 2027
  '2027-01-01': "New Year's Day",
  '2027-01-14': 'Makar Sankranti / Pongal',
  '2027-01-26': 'Republic Day',
  '2027-03-06': 'Maha Shivratri',
  '2027-03-10': 'Eid-ul-Fitr',
  '2027-03-23': 'Holi',
  '2027-03-26': 'Good Friday',
  '2027-04-14': 'Dr. B.R. Ambedkar Jayanti',
  '2027-04-20': 'Mahavir Jayanti',
  '2027-05-16': 'Bakrid / Eid-ul-Adha',
  '2027-05-20': 'Buddha Purnima',
  '2027-06-15': 'Muharram',
  '2027-08-15': 'Independence Day',
  '2027-08-25': 'Janmashtami',
  '2027-09-15': 'Milad-un-Nabi',
  '2027-10-02': 'Mahatma Gandhi Jayanti',
  '2027-10-09': 'Dussehra (Vijayadashami)',
  '2027-10-29': 'Diwali (Deepavali)',
  '2027-11-14': 'Guru Nanak Jayanti',
  '2027-12-25': 'Christmas Day',

  // 2028
  '2028-01-01': "New Year's Day",
  '2028-01-14': 'Makar Sankranti / Pongal',
  '2028-01-26': 'Republic Day',
  '2028-02-24': 'Maha Shivratri',
  '2028-02-28': 'Eid-ul-Fitr',
  '2028-03-11': 'Holi',
  '2028-04-09': 'Mahavir Jayanti',
  '2028-04-14': 'Dr. B.R. Ambedkar Jayanti / Good Friday',
  '2028-05-05': 'Bakrid / Eid-ul-Adha',
  '2028-05-09': 'Buddha Purnima',
  '2028-06-03': 'Muharram',
  '2028-08-14': 'Janmashtami',
  '2028-08-15': 'Independence Day',
  '2028-10-02': 'Mahatma Gandhi Jayanti',
  '2028-10-28': 'Dussehra (Vijayadashami)',
  '2028-11-16': 'Diwali (Deepavali)',
  '2028-12-25': 'Christmas Day',
};

function getNationalHolidayName(isoDate: string): string | undefined {
  if (INDIAN_NATIONAL_AND_FESTIVAL_HOLIDAYS[isoDate]) {
    return INDIAN_NATIONAL_AND_FESTIVAL_HOLIDAYS[isoDate];
  }
  // Generic fallback for any year for fixed national holidays
  const parts = isoDate.split('-');
  const mmdd = `${parts[1]}-${parts[2]}`;
  const fixed: Record<string, string> = {
    '01-01': "New Year's Day",
    '01-26': 'Republic Day',
    '04-14': 'Dr. B.R. Ambedkar Jayanti',
    '08-15': 'Independence Day',
    '10-02': 'Mahatma Gandhi Jayanti',
    '12-25': 'Christmas Day',
  };
  return fixed[mmdd];
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
  terms: Term[],
  includeNationalHolidays: boolean = false,
  excludedHolidays: string[] = [],
): TimelineDay[] {
  const days: TimelineDay[] = [];
  const startStr = startDate.split('T')[0]!;
  const endStr = endDate.split('T')[0]!;
  const [sY, sM, sD] = startStr.split('-').map(Number);
  const [eY, eM, eD] = endStr.split('-').map(Number);
  const start = new Date(Date.UTC(sY!, sM! - 1, sD!));
  const end = new Date(Date.UTC(eY!, eM! - 1, eD!));
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0]!;

  const vacationSet = new Set(
    vacationDays.flatMap((vd) => {
      const dates: string[] = [];
      const sStr = vd.startDate.split('T')[0]!;
      const eStr = vd.endDate.split('T')[0]!;
      const [vsY, vsM, vsD] = sStr.split('-').map(Number);
      const [veY, veM, veD] = eStr.split('-').map(Number);
      const s = new Date(Date.UTC(vsY!, vsM! - 1, vsD!));
      const e = new Date(Date.UTC(veY!, veM! - 1, veD!));
      for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1))
        dates.push(d.toISOString().split('T')[0]!);
      return dates;
    }),
  );

  // Build term ranges (ensure terms is an array)
  const termRanges = (Array.isArray(terms) ? terms : []).map((t) => ({
    start: new Date(t.startDate.split('T')[0]! + 'T00:00:00Z'),
    end: new Date(t.endDate.split('T')[0]! + 'T00:00:00Z'),
  }));

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const isoDate = d.toISOString().split('T')[0]!;
    const isExcluded = excludedHolidays.includes(isoDate);

    const dayOfWeek = d.getUTCDay();
    const rawWeeklyHoliday = weeklyHolidays.includes(dayOfWeek);
    const natHolidayName = includeNationalHolidays ? getNationalHolidayName(isoDate) : undefined;
    const rawNationalHoliday = Boolean(natHolidayName);

    const isWeeklyHoliday = rawWeeklyHoliday && !isExcluded;
    const isNationalHoliday = rawNationalHoliday && !isExcluded;
    const isHoliday = isWeeklyHoliday || isNationalHoliday;
    const isVacation = vacationSet.has(isoDate);
    const isPast = isoDate < todayIso;
    const isToday = isoDate === todayIso;
    const dUTC = new Date(isoDate + 'T00:00:00Z');
    const termIndex = termRanges.findIndex((r) => dUTC >= r.start && dUTC <= r.end);

    days.push({
      date: isoDate,
      isHoliday,
      isWeeklyHoliday,
      isNationalHoliday,
      holidayName: isNationalHoliday ? natHolidayName : undefined,
      isVacation,
      isPast,
      isToday,
      weekNumber: getWeekNumber(d),
      termIndex: termIndex >= 0 ? termIndex : null,
      wasHoliday: isExcluded && (rawNationalHoliday || rawWeeklyHoliday),
      originalHolidayName: isExcluded ? (natHolidayName || (rawWeeklyHoliday ? 'Weekly Off' : undefined)) : undefined,
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
  const { school, isViewMode } = useSchool();
  const { sessions } = useAcademicSessions();
  const activeSession = sessions.find((s) => s.id === school?.currentAcademicSessionId);
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

  // Session date range constraints (Max 1 academic year = 380 days, Min 30 days)
  const sessionDaysDiff = useMemo(() => {
    if (!yearStartDate || !yearEndDate) return null;
    const s = new Date(yearStartDate);
    const e = new Date(yearEndDate);
    return Math.round((e.getTime() - s.getTime()) / 86400000);
  }, [yearStartDate, yearEndDate]);

  const maxAllowedEndDate = useMemo(() => {
    if (!yearStartDate) return undefined;
    const d = new Date(yearStartDate);
    d.setDate(d.getDate() + 380);
    return d.toISOString().split('T')[0];
  }, [yearStartDate]);

  const minAllowedEndDate = useMemo(() => {
    if (!yearStartDate) return undefined;
    const d = new Date(yearStartDate);
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, [yearStartDate]);

  const isDateRangeInvalid = useMemo(() => {
    if (sessionDaysDiff === null) return false;
    return sessionDaysDiff <= 0 || sessionDaysDiff < 30 || sessionDaysDiff > 380;
  }, [sessionDaysDiff]);
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
  const [dayHolidayTitle, setDayHolidayTitle] = useState('');
  const [isDayHolidaySaving, setIsDayHolidaySaving] = useState(false);
  // which terms/sections are collapsed in the calendar
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [calendarViewMode, setCalendarViewMode] = useState<'terms' | 'fullYear'>('terms');
  const [includeNationalHolidays, setIncludeNationalHolidays] = useState<boolean>(false);
  const [excludedHolidays, setExcludedHolidays] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedTermId) return;
    try {
      const saved = localStorage.getItem(`timeline-excluded-holidays-${selectedTermId}`);
      if (saved) {
        setExcludedHolidays(JSON.parse(saved));
      } else {
        setExcludedHolidays([]);
      }
    } catch {
      setExcludedHolidays([]);
    }
  }, [selectedTermId]);

  const updateExcludedHolidays = (newList: string[]) => {
    setExcludedHolidays(newList);
    if (selectedTermId) {
      try {
        localStorage.setItem(`timeline-excluded-holidays-${selectedTermId}`, JSON.stringify(newList));
      } catch (err) {
        console.error(err);
      }
    }
  };

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
    queryKey: ['academic-terms', schoolId, school?.currentAcademicSessionId],
    queryFn: async () => {
      // Query academic terms for current session only
      const params: Record<string, any> = {};
      if (schoolId) params.schoolId = schoolId;
      if (school?.currentAcademicSessionId) {
        params.academicSessionId = school.currentAcademicSessionId;
      }
      const response = await api.getPaginated<any>(
        '/academic-terms',
        Object.keys(params).length > 0 ? params : undefined,
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

  const getAutoFetchedSessionName = () => {
    if (!activeSession?.name) return '';
    return activeSession.name.toLowerCase().includes('academic') ||
      activeSession.name.toLowerCase().includes('year')
      ? activeSession.name
      : `${activeSession.name} Academic Year`;
  };

  useEffect(() => {
    if (!editingYear && !savedState?.yearName && activeSession?.name && !yearName) {
      setYearName(getAutoFetchedSessionName());
    }
  }, [activeSession?.name, editingYear, savedState?.yearName, yearName]);

  const handleCreateClick = () => {
    setEditingYear(null);
    setYearName(getAutoFetchedSessionName());
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
        startDate: (t.startDate ? t.startDate.split('T')[0] : '') || '',
        endDate: (t.endDate ? t.endDate.split('T')[0] : '') || '',
      })),
    );
    setNewVacationDay({ startDate: '', endDate: '', reason: '' });
    setVacationError('');
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (isViewMode) {
        throw new Error('Viewing mode is read-only. Cannot create academic year.');
      }
      if (!yearName || !yearStartDate || !yearEndDate)
        throw new Error('Fill in all required fields');
      if (!schoolId) throw new Error('School ID is required');

      const s = new Date(yearStartDate);
      const e = new Date(yearEndDate);
      const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
      if (diff <= 0) {
        throw new Error('End date must be after start date');
      }
      if (diff < 30) {
        throw new Error('Academic session duration must be at least 30 days');
      }
      if (diff > 380) {
        throw new Error(
          `Academic session duration cannot exceed 380 days (~1 academic year). Currently selected: ${diff} days. For subsequent years, please create a separate academic session.`,
        );
      }

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
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
      toast.success('Academic year created');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => {
      if (isViewMode) {
        throw new Error('Viewing mode is read-only. Cannot edit academic year.');
      }

      const s = new Date(yearStartDate);
      const e = new Date(yearEndDate);
      const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
      if (diff <= 0) {
        throw new Error('End date must be after start date');
      }
      if (diff < 30) {
        throw new Error('Academic session duration must be at least 30 days');
      }
      if (diff > 380) {
        throw new Error(
          `Academic session duration cannot exceed 380 days (~1 academic year). Currently selected: ${diff} days. For subsequent years, please create a separate academic session.`,
        );
      }

      return api.patch<AcademicYear>(`/academic-terms/${id}`, {
        name: yearName,
        startDate: yearStartDate,
        endDate: yearEndDate,
        weeklyHolidays,
        terms,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
      toast.success('Academic year updated');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (isViewMode) {
        throw new Error('Viewing mode is read-only. Cannot delete academic year.');
      }
      return api.delete(`/academic-terms/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
      toast.success('Academic term deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (isViewMode) {
      toast.error('Viewing mode is read-only.');
      return;
    }
    if (isDateRangeInvalid) {
      if (sessionDaysDiff !== null && sessionDaysDiff > 380) {
        toast.error(`Academic session duration cannot exceed 380 days (~1 academic year). Currently selected: ${sessionDaysDiff} days.`);
      } else if (sessionDaysDiff !== null && sessionDaysDiff < 30) {
        toast.error('Academic session duration must be at least 30 days.');
      } else {
        toast.error('Invalid date range. End date must be after start date.');
      }
      return;
    }
    if (editingYear) updateMutation.mutate(editingYear.id);
    else createMutation.mutate();
  };
  const toggleWeeklyHoliday = (day: number) => {
    if (isViewMode) return;
    setWeeklyHolidays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const addVacationDay = async () => {
    if (isViewMode) {
      toast.error('Viewing mode is read-only.');
      return;
    }
    if (!newVacationDay.startDate || !newVacationDay.endDate) {
      setVacationError('Start date and end date are required.');
      return;
    }
    setVacationError('');
    const payload = {
      ...newVacationDay,
      reason: newVacationDay.reason?.trim() || 'Holiday',
    };
    if (editingYear) {
      try {
        await api.post(`/academic-terms/${editingYear.id}/vacation-days`, payload);
        await qc.invalidateQueries({ queryKey: ['academic-terms'] });
        const cached = qc.getQueryData<{ items: AcademicYear[] }>(['academic-terms', schoolId, school?.currentAcademicSessionId]);
        const fresh = cached?.items.find((t) => t.id === editingYear.id);
        if (fresh) setEditingYear(fresh);
        setNewVacationDay({ startDate: '', endDate: '', reason: '' });
        toast.success('Holiday break added');
      } catch (e: any) {
        toast.error(e.message);
      }
    } else {
      setPendingVacations((prev) => [...prev, { ...payload }]);
      setNewVacationDay({ startDate: '', endDate: '', reason: '' });
    }
  };

  const removeVacationDay = async (vacationId: string, index?: number) => {
    if (isViewMode) {
      toast.error('Viewing mode is read-only.');
      return;
    }
    if (editingYear) {
      try {
        await api.delete(`/academic-terms/${editingYear.id}/vacation-days/${vacationId}`);
        await qc.invalidateQueries({ queryKey: ['academic-terms'] });
        const cached = qc.getQueryData<{ items: AcademicYear[] }>(['academic-terms', schoolId, school?.currentAcademicSessionId]);
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
    if (isViewMode) return;
    setSelectedDay(day);
    const existing = selectedTerm?.vacationDays?.find((vd: VacationDay) => {
      const s = vd.startDate.split('T')[0]!;
      const e = vd.endDate.split('T')[0]!;
      return day.date >= s && day.date <= e;
    });
    const currentReason = existing?.reason;
    setDayHolidayTitle(
      currentReason && currentReason !== 'Manual vacation' && currentReason !== 'Holiday'
        ? currentReason
        : '',
    );
    setDayEditOpen(true);
  };

  const handleMarkAsHoliday = async () => {
    if (isViewMode) {
      toast.error('Viewing mode is read-only.');
      return;
    }
    if (!selectedTerm || !selectedDay) return;
    setIsDayHolidaySaving(true);
    try {
      const reasonText = dayHolidayTitle.trim() || 'Holiday';
      await api.post(`/academic-terms/${selectedTerm.id}/vacation-days`, {
        startDate: selectedDay.date,
        endDate: selectedDay.date,
        reason: reasonText,
      });
      if (excludedHolidays.includes(selectedDay.date)) {
        updateExcludedHolidays(excludedHolidays.filter((d) => d !== selectedDay.date));
      }
      toast.success('Day marked as holiday');
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
      setDayEditOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark day as holiday');
    } finally {
      setIsDayHolidaySaving(false);
    }
  };

  const handleUpdateHolidayTitle = async () => {
    if (isViewMode) {
      toast.error('Viewing mode is read-only.');
      return;
    }
    if (!selectedTerm || !selectedDay) return;
    setIsDayHolidaySaving(true);
    try {
      const existing = selectedTerm.vacationDays?.find((vd: VacationDay) => {
        const s = vd.startDate.split('T')[0]!;
        const e = vd.endDate.split('T')[0]!;
        return selectedDay.date >= s && selectedDay.date <= e;
      });
      if (existing) {
        const newReason = dayHolidayTitle.trim() || 'Holiday';
        try {
          await api.patch(`/academic-terms/${selectedTerm.id}/vacation-days/${existing.id}`, {
            reason: newReason,
          });
        } catch {
          // Fallback: delete and re-create
          await api.delete(`/academic-terms/${selectedTerm.id}/vacation-days/${existing.id}`);
          await api.post(`/academic-terms/${selectedTerm.id}/vacation-days`, {
            startDate: existing.startDate.split('T')[0]!,
            endDate: existing.endDate.split('T')[0]!,
            reason: newReason,
          });
        }
        toast.success('Holiday title updated');
        qc.invalidateQueries({ queryKey: ['academic-terms'] });
        setDayEditOpen(false);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update holiday title');
    } finally {
      setIsDayHolidaySaving(false);
    }
  };

  const handleRemoveHoliday = async () => {
    if (isViewMode) {
      toast.error('Viewing mode is read-only.');
      return;
    }
    if (!selectedTerm || !selectedDay) return;
    setIsDayHolidaySaving(true);
    try {
      const existing = selectedTerm.vacationDays?.find((vd: VacationDay) => {
        const s = vd.startDate.split('T')[0]!;
        const e = vd.endDate.split('T')[0]!;
        return selectedDay.date >= s && selectedDay.date <= e;
      });
      if (existing) {
        await api.delete(`/academic-terms/${selectedTerm.id}/vacation-days/${existing.id}`);
      }

      // If it's a national holiday, weekly holiday, or any holiday date, exclude it
      if (!excludedHolidays.includes(selectedDay.date)) {
        updateExcludedHolidays([...excludedHolidays, selectedDay.date]);
      }

      toast.success('Holiday removed');
      qc.invalidateQueries({ queryKey: ['academic-terms'] });
      setDayEditOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove holiday');
    } finally {
      setIsDayHolidaySaving(false);
    }
  };

  const handleRestoreHoliday = () => {
    if (isViewMode) {
      toast.error('Viewing mode is read-only.');
      return;
    }
    if (!selectedDay) return;
    updateExcludedHolidays(excludedHolidays.filter((d) => d !== selectedDay.date));
    toast.success('Holiday restored');
    setDayEditOpen(false);
  };

  const activatedTerms: Term[] = Array.isArray(selectedTerm?.terms) ? (selectedTerm.terms as Term[]) : [];

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
        includeNationalHolidays,
        excludedHolidays,
      )
    : [];

  const teachingDays = timelineDays.filter((d) => !d.isHoliday && !d.isVacation);
  const completedDays = teachingDays.filter((d) => d.isPast).length;
  const progressPercentage =
    teachingDays.length > 0 ? (completedDays / teachingDays.length) * 100 : 0;

  // Month groups for full year view
  const monthGroups: MonthGroup[] = groupDaysByMonth(timelineDays);

  interface TimelineSection {
    id: string;
    type: 'term' | 'vacation';
    name: string;
    startDate: string;
    endDate: string;
    daysCount?: number;
    termIndex?: number;
    termColor?: (typeof TERM_COLORS)[0];
    vacation?: VacationDay;
    monthGroups: MonthGroup[];
  }

  // Build chronological timeline items: Terms + Vacation Breaks
  const timelineSections: TimelineSection[] = [];

  // Add terms
  activatedTerms.forEach((term: Term, tIdx: number) => {
    if (term.startDate && term.endDate) {
      const days = generateTimelineDays(
        term.startDate,
        term.endDate,
        weeklyHolidaysArr,
        selectedTerm?.vacationDays || [],
        activatedTerms,
        includeNationalHolidays,
        excludedHolidays,
      );
      timelineSections.push({
        id: `term-${tIdx}`,
        type: 'term',
        name: term.name || `Term ${tIdx + 1}`,
        startDate: term.startDate.split('T')[0]!,
        endDate: term.endDate.split('T')[0]!,
        termIndex: tIdx,
        termColor: TERM_COLORS[tIdx % TERM_COLORS.length]!,
        monthGroups: groupDaysByMonth(days),
      });
    }
  });

  // Add vacations that fall outside/between terms so they are visible in the timeline
  (selectedTerm?.vacationDays || []).forEach((vd: VacationDay, vIdx: number) => {
    if (vd.startDate && vd.endDate) {
      const vStart = vd.startDate.split('T')[0]!;
      const vEnd = vd.endDate.split('T')[0]!;

      // Check if completely contained inside a single term
      const insideTerm = activatedTerms.some((t) => {
        const tStart = t.startDate?.split('T')[0];
        const tEnd = t.endDate?.split('T')[0];
        return tStart && tEnd && vStart >= tStart && vEnd <= tEnd;
      });

      // If outside or between terms, create a dedicated vacation break timeline section
      if (!insideTerm) {
        const days = generateTimelineDays(
          vStart,
          vEnd,
          weeklyHolidaysArr,
          selectedTerm?.vacationDays || [],
          activatedTerms,
          includeNationalHolidays,
          excludedHolidays,
        );
        timelineSections.push({
          id: `vacation-${vd.id || vIdx}`,
          type: 'vacation',
          name: vd.reason || `Vacation Break ${vIdx + 1}`,
          startDate: vStart,
          endDate: vEnd,
          daysCount: days.length,
          vacation: vd,
          monthGroups: groupDaysByMonth(days),
        });
      }
    }
  });

  // If no terms or vacations are configured yet, create a default full-session section so days are always shown!
  if (
    timelineSections.length === 0 &&
    selectedTerm?.startDate &&
    selectedTerm?.endDate &&
    monthGroups.length > 0
  ) {
    timelineSections.push({
      id: 'full-session-term',
      type: 'term',
      name: `${selectedTerm.name || 'Academic Session'} — Full Timeline`,
      startDate: selectedTerm.startDate.split('T')[0]!,
      endDate: selectedTerm.endDate.split('T')[0]!,
      termIndex: 0,
      termColor: TERM_COLORS[0]!,
      monthGroups: monthGroups,
    });
  }

  // Sort sections chronologically
  timelineSections.sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Auto-collapse / expand sections
  useEffect(() => {
    if (timelineSections.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString().split('T')[0] ?? '';

      const initialCollapsed: Record<string, boolean> = {};
      let hasActiveSection = false;

      timelineSections.forEach((sec) => {
        const isTodayInSec = todayISO >= sec.startDate && todayISO <= sec.endDate;
        initialCollapsed[sec.id] = !isTodayInSec;
        if (isTodayInSec) hasActiveSection = true;
      });

      // Always keep vacation break or full session sections expanded so user sees days immediately
      timelineSections.forEach((sec, idx) => {
        if (sec.type === 'vacation' || sec.id === 'full-session-term') {
          initialCollapsed[sec.id] = false;
        } else if (!hasActiveSection && idx === 0) {
          initialCollapsed[sec.id] = false;
        }
      });

      setCollapsedSections(initialCollapsed);
    }
  }, [selectedTermId, activatedTerms.length, selectedTerm?.vacationDays?.length, includeNationalHolidays, excludedHolidays.length]);

  // Reusable day cell renderer
  const renderDayCell = (
    day: TimelineDay | null,
    colIdx: number,
    termColorDayClass?: string,
  ) => {
    if (!day) return <div key={`empty-${colIdx}`} className="h-7" />;
    const isTeachingDay = !day.isHoliday && !day.isVacation;
    const vacationReason = day.isVacation
      ? selectedTerm?.vacationDays?.find((v: VacationDay) => {
          const s = v.startDate.split('T')[0]!;
          const e = v.endDate.split('T')[0]!;
          return day.date >= s && day.date <= e;
        })?.reason
      : undefined;

    return (
      <div
        key={day.date}
        onClick={() => !isViewMode && handleDayClick(day)}
        className={cn(
          'flex h-7 items-center justify-center rounded text-[11px] font-medium transition-all duration-100',
          !isViewMode
            ? 'cursor-pointer hover:scale-110 hover:shadow-sm active:scale-95'
            : 'cursor-default',
          // Completed teaching day
          isTeachingDay && day.isPast && !day.isToday && 'bg-green-500 text-white',
          // Today
          day.isToday && 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-1',
          // Upcoming teaching day
          isTeachingDay &&
            !day.isPast &&
            !day.isToday &&
            (termColorDayClass ||
              (day.termIndex !== null && day.termIndex !== undefined
                ? TERM_COLORS[day.termIndex % TERM_COLORS.length]?.day
                : 'bg-blue-100 text-blue-700')),
          // Vacation day
          day.isVacation &&
            'bg-orange-100 text-orange-900 border border-orange-300 font-semibold shadow-2xs dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-700',
          // Holiday (National/Festival) - YELLOW
          !day.isVacation &&
            day.isNationalHoliday &&
            'cursor-pointer bg-yellow-200 text-yellow-950 border border-yellow-400 font-bold shadow-2xs hover:scale-105 transition-transform dark:bg-yellow-950/70 dark:text-yellow-200 dark:border-yellow-600',
          // Weekly Holiday - RED (only when not a national holiday and not vacation)
          !day.isVacation &&
            !day.isNationalHoliday &&
            day.isWeeklyHoliday &&
            'cursor-pointer bg-red-100 text-red-700 border border-red-200 font-medium dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
        )}
        title={`${day.date}${
          day.isVacation
            ? ` — Holiday${vacationReason && vacationReason !== 'Manual vacation' && vacationReason !== 'Holiday' ? `: ${vacationReason}` : ''}`
            : day.holidayName
            ? ` — Holiday: ${day.holidayName}${day.isWeeklyHoliday ? ' (Weekly Off)' : ''}`
            : day.wasHoliday
            ? ` — Teaching Day (Holiday removed: ${day.originalHolidayName})`
            : day.isWeeklyHoliday
            ? ' — Weekly Holiday'
            : day.isToday
            ? ' — Today'
            : isTeachingDay
            ? ' — Teaching Day'
            : ''
        }`}
      >
        {new Date(day.date + 'T00:00:00Z').getUTCDate()}
      </div>
    );
  };

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
          {isViewMode ? (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 py-1.5 px-3 font-medium">
              Read-Only View Mode
            </Badge>
          ) : !timelineExists ? (
            <Button onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" /> Create Timeline
            </Button>
          ) : null}
        </div>


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
            description={
              isViewMode
                ? "No academic timeline exists for this historical session."
                : "Create an academic timeline to start tracking teaching days and progress. You can do this once per academic session."
            }
            action={!isViewMode ? { label: 'Create Timeline', onClick: handleCreateClick } : undefined}
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
                      { color: 'bg-red-100 border border-red-300', label: 'Weekly Holiday' },
                      { color: 'bg-yellow-200 border border-yellow-400', label: 'Holiday (Festival/Nat.)' },
                      { color: 'bg-orange-100 border border-orange-300', label: 'Holiday' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={cn('h-3 w-3 rounded', color)} />
                        <span>{label}</span>
                      </div>
                    ))}
                    {activatedTerms.map((t: Term, i: number) => {
                      const tc = TERM_COLORS[i % TERM_COLORS.length]!;
                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={cn('h-3 w-3 rounded-full', tc.bg)} />
                          <span>{t.name}</span>
                        </div>
                      );
                    })}
                  </div>


                  {/* Calendar Header with View Switcher & National Holidays Toggle */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {calendarViewMode === 'terms'
                            ? 'Timeline by Terms & Vacation Breaks'
                            : 'Full Year Calendar (All 12 Months)'}
                        </p>
                        {includeNationalHolidays && (
                          <span className="text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5 animate-in fade-in duration-150">
                            <Sparkles className="h-3 w-3" />
                            National & Festival Holidays included
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Add National Holiday Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setIncludeNationalHolidays((prev) => !prev)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 shadow-2xs',
                            includeNationalHolidays
                              ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30',
                          )}
                          title={
                            includeNationalHolidays
                              ? 'Disable National & Festival Holidays'
                              : 'Enable National & Festival Holidays'
                          }
                        >
                          <Landmark
                            className={cn(
                              'h-3.5 w-3.5',
                              includeNationalHolidays
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-muted-foreground',
                            )}
                          />
                          <span>Add National Holidays</span>
                          {/* Toggle Switch */}
                          <span
                            className={cn(
                              'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                              includeNationalHolidays ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-700',
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out mt-0.5',
                                includeNationalHolidays ? 'translate-x-3.5' : 'translate-x-0.5',
                              )}
                            />
                          </span>
                        </button>

                        {/* View Switcher */}
                        <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setCalendarViewMode('terms')}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all duration-150',
                              calendarViewMode === 'terms'
                                ? 'bg-white text-foreground shadow-2xs dark:bg-gray-800'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <CalendarRange className="h-3.5 w-3.5" />
                            <span>By Terms & Breaks</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarViewMode('fullYear')}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all duration-150',
                              calendarViewMode === 'fullYear'
                                ? 'bg-white text-foreground shadow-2xs dark:bg-gray-800'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>Full Year View</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {calendarViewMode === 'terms' ? (
                      timelineSections.length > 0 ? (
                        timelineSections.map((sec) => {
                          const isCollapsed = collapsedSections[sec.id] ?? false;

                          if (sec.type === 'vacation') {
                            return (
                              <div
                                key={sec.id}
                                className="mb-3 overflow-hidden rounded-xl border border-amber-200/90 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
                              >
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-100/40 dark:hover:bg-amber-900/20"
                                  onClick={() =>
                                    setCollapsedSections((p) => ({
                                      ...p,
                                      [sec.id]: !isCollapsed,
                                    }))
                                  }
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                    <Palmtree className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                        {sec.name}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="border-amber-300 bg-amber-100 text-amber-800 text-[10px] font-semibold dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                      >
                                        {sec.daysCount} Vacation Days
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-amber-700/80 dark:text-amber-300/70">
                                      {fmt(sec.startDate)} → {fmt(sec.endDate)}
                                    </span>
                                  </div>
                                  <ChevronDown
                                    className={cn(
                                      'h-4 w-4 text-amber-700 transition-transform duration-200 dark:text-amber-300',
                                      !isCollapsed && 'rotate-180',
                                    )}
                                  />
                                </button>
                                {!isCollapsed && (
                                  <div className="border-t border-amber-200/60 bg-white/60 px-4 py-4 dark:border-amber-900/40 dark:bg-gray-900/40">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                      {sec.monthGroups.map(
                                        ({
                                          monthKey,
                                          year,
                                          month,
                                          cells,
                                        }: MonthGroup) => {
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
                                                    {row.map((day, colIdx) =>
                                                      renderDayCell(day, colIdx),
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Term
                          const tc = sec.termColor!;
                          return (
                            <div
                              key={sec.id}
                              className={cn(
                                'mb-3 overflow-hidden rounded-xl border',
                                tc.border,
                                tc.light,
                              )}
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                onClick={() =>
                                  setCollapsedSections((p) => ({
                                    ...p,
                                    [sec.id]: !isCollapsed,
                                  }))
                                }
                              >
                                <div
                                  className={cn(
                                    'h-3 w-3 flex-shrink-0 rounded-full',
                                    tc.bg,
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <span className={cn('text-sm font-bold', tc.text)}>
                                    {sec.name}
                                  </span>
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    {sec.startDate ? fmt(sec.startDate) : '—'} →{' '}
                                    {sec.endDate ? fmt(sec.endDate) : '—'}
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
                                  {sec.id === 'full-session-term' && (
                                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl bg-blue-50/90 px-4 py-3 text-xs text-blue-900 border border-blue-200">
                                      <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                                        <span>
                                          Showing all <strong>{teachingDays.length} Teaching Days</strong> across <strong>{monthGroups.length} Months</strong>. Terms or vacation breaks are not configured yet — you can divide this into Term 1, Term 2, or add Vacation breaks anytime!
                                        </span>
                                      </div>
                                      {!isViewMode && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs border-blue-300 bg-white text-blue-700 hover:bg-blue-50 shrink-0 shadow-2xs font-semibold"
                                          onClick={() => handleEditClick(selectedTerm)}
                                        >
                                          <Pencil className="h-3 w-3 mr-1" /> Configure Terms & Breaks
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                  {sec.monthGroups.length === 0 ? (
                                    <p className="text-muted-foreground py-3 text-center text-xs">
                                      Set a start and end date for this term to see its calendar.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                      {sec.monthGroups.map(
                                        ({
                                          monthKey,
                                          year,
                                          month,
                                          cells,
                                        }: MonthGroup) => {
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
                                                    {row.map((day, colIdx) =>
                                                      renderDayCell(
                                                        day,
                                                        colIdx,
                                                        tc.day,
                                                      ),
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : monthGroups.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between rounded-xl bg-blue-50/90 px-4 py-3 text-xs text-blue-900 border border-blue-200">
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                              <span>Showing complete session calendar with all <strong>{teachingDays.length} Teaching Days</strong>.</span>
                            </span>
                            {!isViewMode && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-blue-300 bg-white text-blue-700 hover:bg-blue-50 shrink-0"
                                onClick={() => handleEditClick(selectedTerm)}
                              >
                                <Pencil className="h-3 w-3 mr-1" /> Configure Terms & Breaks
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {monthGroups.map(({ monthKey, year, month, cells }) => {
                              const rows: (TimelineDay | null)[][] = [];
                              for (let i = 0; i < cells.length; i += 7)
                                rows.push(cells.slice(i, i + 7));
                              return (
                                <div
                                  key={monthKey}
                                  className="rounded-xl border bg-card p-3 shadow-2xs"
                                >
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
                                        {row.map((day, colIdx) =>
                                          renderDayCell(day, colIdx),
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-4 text-center text-xs">
                          No dates configured yet for this academic year. Please set a start and end date.
                        </p>
                      )
                    ) : (
                      /* Full Year View */
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {monthGroups.map(({ monthKey, year, month, cells }) => {
                          const rows: (TimelineDay | null)[][] = [];
                          for (let i = 0; i < cells.length; i += 7)
                            rows.push(cells.slice(i, i + 7));
                          return (
                            <div
                              key={monthKey}
                              className="rounded-xl border bg-card p-3 shadow-2xs"
                            >
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
                                    {row.map((day, colIdx) =>
                                      renderDayCell(day, colIdx),
                                    )}
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
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-t pt-4">
                    {[
                      {
                        value: teachingDays.length,
                        label: 'Teaching Days',
                        color: 'text-blue-600',
                      },
                      { value: completedDays, label: 'Completed', color: 'text-green-600' },
                      {
                        value: timelineDays.filter((d) => d.isWeeklyHoliday && !d.isNationalHoliday).length,
                        label: 'Weekly Off',
                        color: 'text-red-600',
                      },
                      {
                        value: timelineDays.filter((d) => d.isNationalHoliday).length,
                        label: 'Festival / Holidays',
                        color: 'text-yellow-600',
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

                      {/* Vacation Days */}
                      {year.vacationDays && year.vacationDays.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          <div className="text-muted-foreground text-xs font-semibold flex items-center gap-1">
                            <Palmtree className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            <span>Vacations ({year.vacationDays.length})</span>
                          </div>
                          {year.vacationDays.map((vd: VacationDay, vIdx: number) => (
                            <div
                              key={vIdx}
                              className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
                            >
                              <span className="font-semibold truncate">{vd.reason || 'Vacation'}</span>
                              <span className="text-muted-foreground ml-auto text-[11px] shrink-0">
                                {fmt(vd.startDate)} → {fmt(vd.endDate)}
                              </span>
                            </div>
                          ))}
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
                    {!isViewMode && (
                      <>
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
                      </>
                    )}
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
          className="max-h-[92vh] w-[95vw] sm:max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col p-4 sm:p-6 overflow-hidden"
        >
          <DialogHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg md:text-xl font-bold">
                  {editingYear ? 'Edit Academic Year' : 'New Academic Year'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure session dates, terms, weekly off-days, and vacation periods.
                </p>
              </div>
              {activeSession?.name && (
                <button
                  type="button"
                  onClick={() => setYearName(getAutoFetchedSessionName())}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 transition-colors font-medium"
                  title="Auto-fill with current active session name"
                >
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  Auto-fill: {activeSession.name}
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Scrollable Content: 1 col on mobile, 2 cols on PC (16:9 wide layout) */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {/* Left Column: Basic Details & Terms */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Year Name</Label>
                    {activeSession?.name && (
                      <button
                        type="button"
                        onClick={() => setYearName(getAutoFetchedSessionName())}
                        className="sm:hidden text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        title="Auto-fill with current active session name"
                      >
                        Auto-fill: {activeSession.name}
                      </button>
                    )}
                  </div>
                  <Input
                    value={yearName}
                    onChange={(e) => setYearName(e.target.value)}
                    placeholder="e.g. 2026-2027 Academic Year"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Start Date</Label>
                    <Input
                      type="date"
                      value={yearStartDate}
                      onChange={(e) => setYearStartDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">End Date</Label>
                    <Input
                      type="date"
                      value={yearEndDate}
                      min={minAllowedEndDate}
                      max={maxAllowedEndDate}
                      onChange={(e) => setYearEndDate(e.target.value)}
                      className={cn(
                        'h-9 text-sm',
                        isDateRangeInvalid && sessionDaysDiff !== null && sessionDaysDiff > 380 && 'border-red-500 text-red-700 focus-visible:ring-red-400',
                      )}
                    />
                  </div>
                </div>

                {/* Session Date Range Alert / Guidance */}
                {yearStartDate && yearEndDate && sessionDaysDiff !== null && (
                  <div className="mt-1">
                    {sessionDaysDiff <= 0 ? (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> End date must be after start date.
                      </p>
                    ) : sessionDaysDiff < 30 ? (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Academic session duration must be at least 30 days (Currently: {sessionDaysDiff} days).
                      </p>
                    ) : sessionDaysDiff > 380 ? (
                      <div className="rounded-xl border border-red-200 bg-red-50/90 p-2.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                        <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                          <span>Academic Session Date Range Limit Exceeded ({sessionDaysDiff} days)</span>
                        </div>
                        <p className="mt-1 text-[11px] text-red-700/90 dark:text-red-300 leading-relaxed">
                          An academic session calendar can span at most <strong>380 days (~1 academic year)</strong>. You have selected {sessionDaysDiff} days (approx. {(sessionDaysDiff / 365).toFixed(1)} years). For subsequent academic years, please create a separate academic session.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Valid 1-Year Academic Session: {sessionDaysDiff} days
                      </p>
                    )}
                  </div>
                )}

                {/* Weekly Holidays */}
                <div className="space-y-1.5 rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold">Weekly Holidays</Label>
                    <span className="text-[11px] text-muted-foreground">
                      {weeklyHolidays.length} day{weeklyHolidays.length === 1 ? '' : 's'}/week
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dayNames.map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleWeeklyHoliday(index)}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-150',
                          weeklyHolidays.includes(index)
                            ? 'scale-105 border-red-500 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terms Section */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CalendarRange className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <Label className="text-xs font-semibold">Terms & Semesters</Label>
                      {terms.length > 0 && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium">
                          {terms.length}
                        </Badge>
                      )}
                    </div>
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

                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {terms.map((term, index) => {
                      const tc = TERM_COLORS[index % TERM_COLORS.length]!;
                      return (
                        <div
                          key={index}
                          className={cn('space-y-2 rounded-xl border p-3', tc.light, tc.border)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn('h-2.5 w-2.5 rounded-full', tc.bg)} />
                              <Label className={cn('text-xs font-bold', tc.text)}>
                                {term.name || `Term ${index + 1}`}
                              </Label>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6"
                              onClick={() => setTerms(terms.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Term Name</Label>
                            <Input
                              value={term.name}
                              onChange={(e) => {
                                const n = [...terms];
                                if (n[index]) n[index].name = e.target.value;
                                setTerms(n);
                              }}
                              placeholder={`Term ${index + 1}`}
                              className="h-8 text-xs bg-white dark:bg-gray-950"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Start Date</Label>
                              <Input
                                type="date"
                                value={term.startDate}
                                onChange={(e) => {
                                  const n = [...terms];
                                  if (n[index]) n[index].startDate = e.target.value;
                                  setTerms(n);
                                }}
                                className="h-8 text-xs bg-white dark:bg-gray-950"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">End Date</Label>
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
                                className="h-8 text-xs bg-white dark:bg-gray-950"
                              />
                            </div>
                          </div>
                          {term.startDate && term.endDate && (
                            <p className={cn('text-[11px] font-medium', tc.text)}>
                              {fmt(term.startDate)} → {fmt(term.endDate)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {terms.length === 0 && (
                      <div className="rounded-xl border border-dashed p-4 text-center">
                        <p className="text-muted-foreground text-xs">
                          No terms added yet. Click &quot;Add Term&quot; to divide this session into terms.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Vacation Days & Overview Summary */}
              <div className="space-y-4">
                {/* Vacation Days Container Box */}
                <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Palmtree className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <Label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        Vacation Days & Breaks
                      </Label>
                    </div>
                    {(editingYear ? liveVacationDays : pendingVacations).length > 0 && (
                      <Badge variant="secondary" className="h-5 px-2 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                        {(editingYear ? liveVacationDays : pendingVacations).length} scheduled
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Start Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={newVacationDay.startDate}
                        onChange={(e) => {
                          setNewVacationDay({ ...newVacationDay, startDate: e.target.value });
                          setVacationError('');
                        }}
                        className="h-8 text-xs bg-white dark:bg-gray-950"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        End Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={newVacationDay.endDate}
                        onChange={(e) => {
                          setNewVacationDay({ ...newVacationDay, endDate: e.target.value });
                          setVacationError('');
                        }}
                        className="h-8 text-xs bg-white dark:bg-gray-950"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Reason / Festival <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. Diwali Break / Summer Vacation"
                        value={newVacationDay.reason}
                        onChange={(e) => {
                          setNewVacationDay({ ...newVacationDay, reason: e.target.value });
                          setVacationError('');
                        }}
                        className={cn(
                          'h-8 text-xs flex-1 bg-white dark:bg-gray-950',
                          vacationError && 'border-red-400',
                        )}
                      />
                      <Button
                        type="button"
                        onClick={addVacationDay}
                        size="sm"
                        className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white transition-transform duration-150 active:scale-95"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                    {vacationError && (
                      <p className="animate-in fade-in text-[11px] text-red-500 duration-150">
                        {vacationError}
                      </p>
                    )}
                  </div>

                  {/* Added Vacations List */}
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {(editingYear ? liveVacationDays : pendingVacations).length === 0 && (
                      <p className="text-muted-foreground py-3 text-center text-xs">
                        No vacation breaks added yet. Specify dates and reason above.
                      </p>
                    )}
                    {(editingYear ? liveVacationDays : pendingVacations).map(
                      (vd: VacationDay, idx: number) => (
                        <div
                          key={vd.id || idx}
                          className="animate-in fade-in slide-in-from-top-1 flex items-center justify-between rounded-lg border border-amber-200/60 bg-white p-2 text-xs duration-200 dark:border-amber-900/40 dark:bg-gray-950"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {fmt(vd.startDate)} — {fmt(vd.endDate)}
                            </span>
                            {vd.reason && (
                              <span className="text-muted-foreground text-[11px]">
                                {vd.reason}
                              </span>
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
                      ),
                    )}
                  </div>
                </div>

                {/* Live Overview & Stats Preview Card */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-900/30">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                    Session Preview & Summary
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-lg bg-white p-2 border text-center dark:bg-gray-950 dark:border-gray-800">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Duration</p>
                      <p
                        className={cn(
                          'text-sm font-bold',
                          sessionDaysDiff !== null && (sessionDaysDiff > 380 || sessionDaysDiff <= 0)
                            ? 'text-red-600 dark:text-red-400'
                            : sessionDaysDiff !== null && sessionDaysDiff < 30
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-900 dark:text-gray-100',
                        )}
                      >
                        {sessionDaysDiff !== null && sessionDaysDiff > 0 ? `${sessionDaysDiff}d` : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2 border text-center dark:bg-gray-950 dark:border-gray-800">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Terms</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {terms.length}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2 border text-center dark:bg-gray-950 dark:border-gray-800">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Vacations</p>
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {(editingYear ? liveVacationDays : pendingVacations).length}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2 border text-center dark:bg-gray-950 dark:border-gray-800">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Weekly Off</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">
                        {weeklyHolidays.length}/wk
                      </p>
                    </div>
                  </div>
                  {yearStartDate && yearEndDate && (
                    <p className="text-[11px] text-muted-foreground text-center mt-2.5">
                      Span: <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(yearStartDate)}</span> to <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(yearEndDate)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Footer */}
          <DialogFooter className="pt-3 border-t mt-1 flex-shrink-0 flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className={cn(
                'text-xs px-5 transition-all duration-150 active:scale-95',
                isDateRangeInvalid && 'opacity-60 cursor-not-allowed',
              )}
              onClick={handleSubmit}
              disabled={
                !yearName.trim() ||
                !yearStartDate ||
                !yearEndDate ||
                isDateRangeInvalid ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingYear ? 'Save Changes' : 'Create Academic Year'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day Edit Dialog */}
      <Dialog open={dayEditOpen} onOpenChange={setDayEditOpen}>
        <DialogContent className="sm:max-w-md">
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
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Current Status</Label>
              <div className="flex flex-wrap items-center gap-2">
                {selectedDay?.isNationalHoliday && (
                  <span className="rounded-md border border-yellow-400 bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-950 dark:border-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-200">
                    Holiday: {selectedDay.holidayName}
                  </span>
                )}
                {selectedDay?.isWeeklyHoliday && !selectedDay?.isNationalHoliday && (
                  <span className="rounded-md border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                    Weekly Holiday
                  </span>
                )}
                {selectedDay?.isWeeklyHoliday && selectedDay?.isNationalHoliday && (
                  <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    Also Weekly Off
                  </span>
                )}
                {selectedDay?.isVacation && (
                  <span className="rounded-md border border-orange-300 bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-300">
                    {(() => {
                      const matched = selectedTerm?.vacationDays?.find((v: VacationDay) => {
                        const s = v.startDate.split('T')[0]!;
                        const e = v.endDate.split('T')[0]!;
                        return selectedDay.date >= s && selectedDay.date <= e;
                      });
                      const r = matched?.reason;
                      return r && r !== 'Manual vacation' && r !== 'Holiday' ? `Holiday: ${r}` : 'Holiday';
                    })()}
                  </span>
                )}
                {!selectedDay?.isHoliday && !selectedDay?.isVacation && (
                  <span className="rounded-md border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                    Teaching Day
                  </span>
                )}
                {selectedDay?.wasHoliday && (
                  <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    Holiday Removed
                  </span>
                )}
              </div>
            </div>

            {/* National / Festival Holiday Details Card */}
            {selectedDay?.isNationalHoliday && selectedDay?.holidayName && (
              <div className="rounded-xl border border-yellow-400 bg-yellow-50 p-3.5 dark:border-yellow-800 dark:bg-yellow-950/30">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-yellow-700 dark:text-yellow-400 shrink-0" />
                  <span className="text-sm font-bold text-yellow-950 dark:text-yellow-200">
                    {selectedDay.holidayName}
                  </span>
                </div>
                <p className="text-xs text-yellow-900/80 dark:text-yellow-300/80 mt-1">
                  Observed as an official Gazetted / National Festival Holiday.
                  {selectedDay.isWeeklyHoliday && ' (This day also falls on a recurring weekly off day)'}
                </p>
              </div>
            )}

            {/* Weekly Holiday Note (only when purely a weekly off) */}
            {selectedDay?.isWeeklyHoliday && !selectedDay?.isNationalHoliday && (
              <p className="text-muted-foreground text-sm">
                This is a recurring weekly holiday. You can remove the holiday for this specific date to mark it as a working teaching day.
              </p>
            )}

            {/* Excluded Holiday Note */}
            {selectedDay?.wasHoliday && selectedDay?.originalHolidayName && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                Originally <span className="font-semibold">{selectedDay.originalHolidayName}</span>, but currently removed from holidays and set as a working Teaching Day.
              </div>
            )}

            {/* ACTIONS */}
            <div className="space-y-3 pt-1">
              {/* If it was an excluded holiday, allow restoring it */}
              {selectedDay?.wasHoliday && (
                <Button
                  onClick={handleRestoreHoliday}
                  variant="outline"
                  className="w-full text-xs font-medium border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200"
                  disabled={isViewMode}
                >
                  Restore Holiday ({selectedDay.originalHolidayName})
                </Button>
              )}

              {/* If it's currently any type of holiday: Custom Holiday, National Holiday, or Weekly Holiday */}
              {(selectedDay?.isHoliday || selectedDay?.isVacation) ? (
                <div className="space-y-3">
                  {/* If custom holiday, allow updating title */}
                  {selectedDay?.isVacation && (
                    <div className="space-y-1.5">
                      <Label htmlFor="day-holiday-title" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Holiday Title / Name <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="day-holiday-title"
                        placeholder="e.g. Sports Day, Annual Day, Local Festival..."
                        value={dayHolidayTitle}
                        onChange={(e) => setDayHolidayTitle(e.target.value)}
                        className="h-9 text-xs"
                        disabled={isViewMode || isDayHolidaySaving}
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    {selectedDay?.isVacation && (
                      <Button
                        onClick={handleUpdateHolidayTitle}
                        variant="default"
                        className="w-full sm:flex-1 text-xs transition-all duration-150 active:scale-95"
                        disabled={isViewMode || isDayHolidaySaving}
                      >
                        {isDayHolidaySaving ? 'Saving...' : 'Update Title'}
                      </Button>
                    )}
                    <Button
                      onClick={handleRemoveHoliday}
                      variant="destructive"
                      className="w-full sm:flex-1 text-xs transition-all duration-150 active:scale-95"
                      disabled={isViewMode || isDayHolidaySaving}
                    >
                      {isDayHolidaySaving ? 'Removing...' : 'Remove Holiday'}
                    </Button>
                  </div>
                </div>
              ) : (
                /* It is currently a Teaching Day: allow marking as holiday */
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="day-holiday-title" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Holiday Title / Name <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="day-holiday-title"
                      placeholder="e.g. Sports Day, Annual Day, Local Festival..."
                      value={dayHolidayTitle}
                      onChange={(e) => setDayHolidayTitle(e.target.value)}
                      className="h-9 text-xs"
                      disabled={isViewMode || isDayHolidaySaving}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Optional title for this holiday. Leave blank to mark as a general holiday.
                    </p>
                  </div>

                  <Button
                    onClick={handleMarkAsHoliday}
                    variant="default"
                    className="w-full text-xs font-medium transition-all duration-150 active:scale-95"
                    disabled={isViewMode || isDayHolidaySaving}
                  >
                    {isDayHolidaySaving ? 'Marking...' : 'Mark as Holiday'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayEditOpen(false)} disabled={isDayHolidaySaving}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
