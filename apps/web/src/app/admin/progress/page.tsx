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
} from 'lucide-react';
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
  globalTimeline: {
    startDate: string;
    endDate: string;
    totalTeachingDays: number;
    elapsedTeachingDays: number;
    remainingTeachingDays: number;
    percentageComplete: number;
  };
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

  // Use school's currentAcademicSessionId as the default, fallback to localStorage
  useEffect(() => {
    if (school?.currentAcademicSessionId) {
      setSelectedAcademicYearId(school.currentAcademicSessionId);
    } else {
      const saved = localStorage.getItem('selected-academic-year');
      if (saved) setSelectedAcademicYearId(saved);
    }
  }, [school?.currentAcademicSessionId]);

  // Update localStorage when selection changes
  useEffect(() => {
    if (selectedAcademicYearId) {
      localStorage.setItem('selected-academic-year', selectedAcademicYearId);
    }
  }, [selectedAcademicYearId]);

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
    queryKey: ['academic-terms', schoolId],
    queryFn: async () => {
      const response = await api.getPaginated<any>('/academic-terms', schoolId ? { schoolId } : undefined);
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

    const targetProgress = data.globalTimeline.percentageComplete;
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
      const diff = item.percentageComplete - targetProgress;

      // Use configurable tolerance for "on pace"
      if (diff < -onPaceTolerance) {
        calculatedVelocity = 'less'; // Behind
      } else if (diff > onPaceTolerance) {
        calculatedVelocity = 'more'; // Ahead
      } else {
        calculatedVelocity = 'neutral'; // On Pace (within tolerance)
      }

      return { ...item, velocity: calculatedVelocity };
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
              <button
                type="button"
                onClick={() => setShowThresholdSettings(true)}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-gray-400 outline-none hover:bg-gray-100 hover:text-gray-600"
                title="Configure pacing thresholds"
              >
                <Settings className="h-4 w-4" />
              </button>
              {/* Interactive In-line Custom Popover */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setShowInfoPopover(!showInfoPopover)}
                  onBlur={() => setTimeout(() => setShowInfoPopover(false), 200)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 outline-none hover:bg-gray-100 hover:text-gray-600"
                >
                  <Info className="h-4 w-4" />
                </button>

                {showInfoPopover && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl transition-all duration-200">
                    <div className="space-y-2 text-xs font-normal normal-case tracking-normal">
                      <h4 className="text-sm font-bold text-gray-900">How pacing is calculated:</h4>
                      <p className="leading-relaxed text-gray-600">
                        Metrics are evaluated against the current
                        <span className="font-semibold text-blue-600">
                          {' '}
                          Timeline Progress ({data.globalTimeline.percentageComplete.toFixed(1)}%)
                        </span>
                        with a tolerance of ±{onPaceTolerance}%:
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-gray-600">
                        <li>
                          <span className="font-semibold text-red-600">Behind:</span> Item progress
                          is more than {onPaceTolerance}% below the timeline threshold
                        </li>
                        <li>
                          <span className="font-semibold text-amber-600">On Pace:</span> Item
                          progress is within ±{onPaceTolerance}% of the threshold
                        </li>
                        <li>
                          <span className="font-semibold text-emerald-600">Ahead:</span> Item
                          progress is more than {onPaceTolerance}% above the threshold
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
