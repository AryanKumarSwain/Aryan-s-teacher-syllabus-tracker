'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  BookOpen,
  Info,
  Search,
  Settings,
  ArrowRight,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api-client';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { toast } from 'sonner';

interface ProgressionMetrics {
  globalTimeline?: {
    startDate: string;
    endDate: string;
    totalTeachingDays: number;
    elapsedTeachingDays: number;
    remainingTeachingDays: number;
    percentageComplete: number;
  } | null;
  classProgress: ClassProgressItem[];
  subjectProgress: SubjectProgressItem[];
  teacherProgress: TeacherProgressItem[];
}

interface ClassProgressItem {
  classId: string;
  className: string;
  totalTopics: number;
  completedTopics: number;
  percentageComplete: number;
  velocity: 'less' | 'neutral' | 'more';
}

interface SubjectProgressItem {
  subjectId: string;
  subjectName: string;
  classId?: string;
  className?: string;
  totalTopics: number;
  completedTopics: number;
  percentageComplete: number;
  velocity: 'less' | 'neutral' | 'more';
}

interface TeacherProgressItem {
  teacherId: string;
  teacherName: string;
  totalTopics: number;
  completedTopics: number;
  percentageComplete: number;
  velocity: 'less' | 'neutral' | 'more';
}

type GroupBy = 'classes' | 'subjects' | 'teachers';
type VelocityFilter = 'all' | 'less' | 'neutral' | 'more';

export default function AdminProgressPage() {
  const schoolId = useSchoolId();
  const { school } = useSchool();
  const [groupBy, setGroupBy] = useState<GroupBy>('classes');
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');

  // Always sync with school's currentAcademicSessionId (handles view mode switching dynamically)
  useEffect(() => {
    if (school?.currentAcademicSessionId) {
      setSelectedAcademicYearId(school.currentAcademicSessionId);
    }
  }, [school?.currentAcademicSessionId]);

  // Configurable velocity thresholds
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [onPaceTolerance, setOnPaceTolerance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('progress-thresholds');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.onPaceTolerance ?? 5;
      }
    }
    return 5;
  });

  const saveThresholdSettings = () => {
    localStorage.setItem('progress-thresholds', JSON.stringify({ onPaceTolerance }));
    setShowThresholdSettings(false);
    toast.success('Threshold settings saved');
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['progression-analytics', schoolId, selectedAcademicYearId, selectedTermFilter],
    queryFn: () =>
      api.get<ProgressionMetrics>(
        '/progression/analytics',
        {
          ...(selectedAcademicYearId && { academicYearId: selectedAcademicYearId }),
          ...(selectedTermFilter && selectedTermFilter !== 'all' && { termFilter: selectedTermFilter }),
        },
      ),
    enabled: Boolean(schoolId),
  });

  const { data: academicYears } = useQuery({
    queryKey: ['academic-terms', schoolId, school?.currentAcademicSessionId],
    queryFn: async () => {
      const response = await api.getPaginated<any>('/academic-terms', {
        ...(schoolId && { schoolId }),
        ...(school?.currentAcademicSessionId && { academicSessionId: school.currentAcademicSessionId }),
      });
      return {
        ...response,
        items: response.items.map((year: any) => ({
          ...year,
          terms: typeof year.terms === 'string' ? JSON.parse(year.terms) : year.terms || [],
        })),
      };
    },
    enabled: Boolean(schoolId),
  });

  // Extract all terms from academic years
  const allTerms = useMemo(() => {
    if (!academicYears?.items) return [];
    const terms: { id: string; name: string; yearId: string; yearName: string }[] = [];
    academicYears.items.forEach((year: any) => {
      if (year.terms && Array.isArray(year.terms)) {
        year.terms.forEach((term: any, index: number) => {
          terms.push({
            id: `${year.id}-${index}`,
            name: term.name || `Term ${index + 1}`,
            yearId: year.id,
            yearName: year.name,
          });
        });
      }
    });
    return terms;
  }, [academicYears]);

  if (error) {
    toast.error('Failed to load progression data');
  }

  // Dynamically recalibrate velocities relative to the global timeline percentage threshold
  const filteredItems = useMemo(() => {
    if (!data) return [];

    const hasTimeline = !!(data.globalTimeline && data.globalTimeline.totalTeachingDays > 0);
    const targetProgress = data.globalTimeline?.percentageComplete ?? 0;
    let rawItems: any[] = [];

    switch (groupBy) {
      case 'classes':
        rawItems = data.classProgress;
        break;
      case 'subjects':
        rawItems = data.subjectProgress;
        break;
      case 'teachers':
        rawItems = data.teacherProgress;
        break;
    }

    // Dynamic map applying configurable timeline status velocity logic
    const calibratedItems = rawItems.map((item) => {
      let calculatedVelocity: 'less' | 'neutral' | 'more' = 'neutral';
      if (hasTimeline) {
        const diff = item.percentageComplete - targetProgress;

        // Use configurable tolerance for "on pace"
        if (diff < -onPaceTolerance) {
          calculatedVelocity = 'less'; // Behind
        } else if (diff > onPaceTolerance) {
          calculatedVelocity = 'more'; // Ahead
        } else {
          calculatedVelocity = 'neutral'; // On Pace (within tolerance)
        }
      }

      return {
        ...item,
        velocity: calculatedVelocity,
      };
    });

    let items = calibratedItems;

    if (velocityFilter !== 'all') {
      items = items.filter((item) => item.velocity === velocityFilter);
    }

    if (searchQuery) {
      items = items.filter(
        (item) =>
          item.className?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.teacherName?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return items;
  }, [data, groupBy, velocityFilter, searchQuery, onPaceTolerance]);

  const getVelocityColor = (velocity: string) => {
    switch (velocity) {
      case 'less':
        return 'bg-red-500 text-white';
      case 'neutral':
        return 'bg-amber-500 text-white';
      case 'more':
        return 'bg-emerald-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getVelocityLabel = (velocity: string) => {
    switch (velocity) {
      case 'less':
        return 'Behind';
      case 'neutral':
        return 'On Pace';
      case 'more':
        return 'Ahead';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <DashboardShell title="Syllabus Progress">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Syllabus Progress</h1>
            <p className="text-muted-foreground">Track academic progression across your school</p>
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell title="Syllabus Progress">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Syllabus Progress</h1>
            <p className="text-muted-foreground">Track academic progression across your school</p>
          </div>
          <EmptyState
            icon={BarChart3}
            title="No progression data available"
            description="There is currently no syllabus progression data to display. Start by adding classes, subjects, and teachers to begin tracking."
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Syllabus Progress">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Syllabus Progress</h1>
              <p className="text-muted-foreground">Track academic progression across your school</p>
            </div>
          </div>
        </div>

        {/* Global Timeline Tracker */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="relative flex items-center gap-2 text-base font-bold">
              <Calendar className="h-5 w-5 text-blue-500" />
              Academic Timeline Progress
              {data?.globalTimeline && data.globalTimeline.totalTeachingDays > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  {/* Pacing Settings Button */}
                  <button
                    type="button"
                    onClick={() => setShowThresholdSettings(true)}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-all duration-150 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 active:scale-95 dark:border-gray-750 dark:bg-gray-800 dark:text-gray-200"
                    title="Configure pacing thresholds"
                  >
                    <Settings className="h-4 w-4 text-gray-500 transition-colors" />
                    <span>Thresholds</span>
                  </button>

                  {/* Interactive Popover Button */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowInfoPopover((prev) => !prev)}
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-2xs transition-all duration-150 active:scale-95',
                        showInfoPopover
                          ? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                          : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
                      )}
                      title="How pacing is calculated"
                    >
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Pacing Guide</span>
                    </button>

                    {showInfoPopover && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowInfoPopover(false)}
                        />
                        <div
                          className="animate-in fade-in slide-in-from-top-2 absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2.5rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-2xl transition-all duration-200 dark:border-gray-800 dark:bg-gray-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-3 text-xs font-normal normal-case tracking-normal">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                  <Info className="h-3.5 w-3.5" />
                                </span>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  Pacing Calculation Guide
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowInfoPopover(false)}
                                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                              Metrics are evaluated against the current{' '}
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                Timeline Progress ({data.globalTimeline.percentageComplete.toFixed(1)}%)
                              </span>{' '}
                              with a tolerance of{' '}
                              <span className="font-semibold text-gray-800 dark:text-gray-200">
                                ±{onPaceTolerance}%
                              </span>:
                            </p>

                            <div className="space-y-2 pt-1">
                              <div className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50/70 p-2.5 dark:border-red-900/40 dark:bg-red-950/30">
                                <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
                                <div className="text-xs">
                                  <span className="font-bold text-red-700 dark:text-red-300">
                                    Behind:{' '}
                                  </span>
                                  <span className="leading-normal text-red-900/80 dark:text-red-200/80">
                                    Item progress is more than {onPaceTolerance}% below the timeline threshold.
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50/70 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/30">
                                <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                                <div className="text-xs">
                                  <span className="font-bold text-amber-700 dark:text-amber-300">
                                    On Pace:{' '}
                                  </span>
                                  <span className="leading-normal text-amber-900/80 dark:text-amber-200/80">
                                    Item progress is within ±{onPaceTolerance}% of the threshold.
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/70 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                                <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                <div className="text-xs">
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                    Ahead:{' '}
                                  </span>
                                  <span className="leading-normal text-emerald-900/80 dark:text-emerald-200/80">
                                    Item progress is more than {onPaceTolerance}% above the threshold.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data?.globalTimeline && data.globalTimeline.totalTeachingDays > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-semibold text-gray-700">
                      {new Date(data.globalTimeline.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-semibold text-gray-700">
                      {new Date(data.globalTimeline.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-gray-700">
                      Teaching Day {data.globalTimeline.elapsedTeachingDays} of{' '}
                      {data.globalTimeline.totalTeachingDays}
                    </span>
                    <span className="font-bold text-blue-600">
                      {data.globalTimeline.percentageComplete.toFixed(1)}% Term Completed
                    </span>
                  </div>
                  <Progress value={data.globalTimeline.percentageComplete} className="h-3" />
                  <div className="text-muted-foreground flex items-center justify-between text-[11px] sm:text-xs">
                    <span>{data.globalTimeline.remainingTeachingDays} teaching days remaining</span>
                    <span>{data.globalTimeline.elapsedTeachingDays} teaching days elapsed</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-5 sm:flex-row">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">No academic timeline configured</p>
                    <p className="text-xs text-gray-500">
                      Configure your session timeline to see teaching days and pacing progress.
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/academic-timeline"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1a73e8] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Configure Timeline
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytical Filtering Section */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Progress Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                {/* Group By Filter */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500">
                    Group Analytics By
                  </label>
                  <div className="flex rounded-lg bg-gray-100 p-1">
                    {(['classes', 'subjects', 'teachers'] as const).map((group) => (
                      <button
                        key={group}
                        onClick={() => setGroupBy(group)}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                          groupBy === group
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {group === 'classes' && <Users className="h-3.5 w-3.5" />}
                        {group === 'subjects' && <BookOpen className="h-3.5 w-3.5" />}
                        {group === 'teachers' && <TrendingUp className="h-3.5 w-3.5" />}
                        {group.charAt(0).toUpperCase() + group.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Velocity Status Filter */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500">
                    Filter Pacing Status
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'less', 'neutral', 'more'] as const).map((v) => (
                      <Button
                        key={v}
                        variant={velocityFilter === v ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVelocityFilter(v)}
                        className="h-8 px-2.5 text-xs font-medium"
                      >
                        {v === 'less' && (
                          <span className="mr-1.5 h-2 w-2 rounded-full bg-red-500" />
                        )}
                        {v === 'neutral' && (
                          <span className="mr-1.5 h-2 w-2 rounded-full bg-amber-500" />
                        )}
                        {v === 'more' && (
                          <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                        {v === 'all' ? 'All Statuses' : getVelocityLabel(v)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Term Filter */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500">
                    Filter by Term
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTermFilter}
                      onChange={(e) => setSelectedTermFilter(e.target.value)}
                      className="h-8 w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">All Terms</option>
                      {allTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name} ({term.yearName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Functional Search Field */}
              <div className="w-full space-y-1.5 lg:max-w-xs">
                <label className="block text-xs font-semibold text-gray-500">Search Entries</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${groupBy}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => (
            <Card key={index} className="transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="line-clamp-1 text-base font-bold text-gray-900">
                    {groupBy === 'subjects'
                      ? item.subjectName
                      : groupBy === 'teachers'
                        ? item.teacherName
                        : item.className}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`${getVelocityColor(item.velocity)} border-0 px-2 py-0.5 text-[11px] font-semibold`}
                  >
                    {getVelocityLabel(item.velocity)}
                  </Badge>
                </div>
                {item.className && groupBy === 'subjects' && (
                  <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                    {item.className}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Completion percentage</span>
                    <span className="font-bold text-gray-900">
                      {item.percentageComplete.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={item.percentageComplete} className="h-2" />
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-xs">
                  <span className="font-medium text-gray-600">
                    {item.completedTopics} / {item.totalTopics} topics complete
                  </span>
                  <span
                    className={`font-semibold ${
                      item.velocity === 'more'
                        ? 'text-emerald-600'
                        : item.velocity === 'less'
                          ? 'text-red-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {getVelocityLabel(item.velocity)} Schedule
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State Exception Layout */}
        {filteredItems.length === 0 && (
          <Card className="border-dashed bg-gray-50/50">
            <CardContent className="p-10 text-center">
              <p className="text-sm font-medium text-gray-500">
                No telemetry metrics found matching your current active filter queries.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Threshold Settings Dialog */}
      <Dialog open={showThresholdSettings} onOpenChange={setShowThresholdSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Pacing Thresholds</DialogTitle>
            <DialogDescription>
              Set the tolerance percentage for determining if progress is "On Pace", "Behind", or
              "Ahead" of schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="onPaceTolerance">On Pace Tolerance (%)</Label>
              <Input
                id="onPaceTolerance"
                type="number"
                min="0"
                max="50"
                step="1"
                value={onPaceTolerance}
                onChange={(e) => setOnPaceTolerance(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-muted-foreground text-xs">
                Items within ±{onPaceTolerance}% of the timeline progress will be marked as "On
                Pace".
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowThresholdSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveThresholdSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
