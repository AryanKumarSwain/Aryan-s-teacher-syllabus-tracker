'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Calendar, Users, BookOpen, Filter } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [groupBy, setGroupBy] = useState<GroupBy>('classes');
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['progression-analytics', schoolId],
    queryFn: () => api.get<ProgressionMetrics>('/progression/analytics'),
    enabled: Boolean(schoolId),
  });

  if (error) {
    toast.error('Failed to load progression data');
  }

  const filteredItems = useMemo(() => {
    if (!data) return [];

    let items: any[] = [];
    switch (groupBy) {
      case 'classes':
        items = data.classProgress;
        break;
      case 'subjects':
        items = data.subjectProgress;
        break;
      case 'teachers':
        items = data.teacherProgress;
        break;
    }

    if (velocityFilter !== 'all') {
      items = items.filter((item) => item.velocity === velocityFilter);
    }

    if (searchQuery) {
      items = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.className?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.teacherName?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return items;
  }, [data, groupBy, velocityFilter, searchQuery]);

  const getVelocityColor = (velocity: string) => {
    switch (velocity) {
      case 'less':
        return 'bg-red-500';
      case 'neutral':
        return 'bg-yellow-500';
      case 'more':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getVelocityLabel = (velocity: string) => {
    switch (velocity) {
      case 'less':
        return 'Less Progressing';
      case 'neutral':
        return 'Neutral';
      case 'more':
        return 'More Progressing';
      default:
        return 'Unknown';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage >= 30 && percentage <= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Syllabus Progress</h1>
            <p className="text-muted-foreground">Track academic progression across your school</p>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Syllabus Progress</h1>
            <p className="text-muted-foreground">Track academic progression across your school</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-red-500">Failed to load progression data</p>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Syllabus Progress</h1>
          <p className="text-muted-foreground">Track academic progression across your school</p>
        </div>

        {/* Global Timeline Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Academic Timeline Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Start Date:</span>
                <span className="font-medium">
                  {new Date(data.globalTimeline.startDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">End Date:</span>
                <span className="font-medium">
                  {new Date(data.globalTimeline.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Teaching Day {data.globalTimeline.elapsedTeachingDays} of{' '}
                  {data.globalTimeline.totalTeachingDays}
                </span>
                <span className="text-primary text-sm font-bold">
                  {data.globalTimeline.percentageComplete.toFixed(1)}% Completed
                </span>
              </div>
              <Progress value={data.globalTimeline.percentageComplete} className="h-4" />
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>{data.globalTimeline.remainingTeachingDays} teaching days remaining</span>
                <span>{data.globalTimeline.elapsedTeachingDays} teaching days elapsed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytical Filtering Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Progress Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Group By Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Group By:</label>
                <div className="flex gap-2">
                  <Button
                    variant={groupBy === 'classes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupBy('classes')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Classes
                  </Button>
                  <Button
                    variant={groupBy === 'subjects' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupBy('subjects')}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Subjects
                  </Button>
                  <Button
                    variant={groupBy === 'teachers' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupBy('teachers')}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Teachers
                  </Button>
                </div>
              </div>

              {/* Velocity Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filter:</label>
                <div className="flex gap-2">
                  <Button
                    variant={velocityFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVelocityFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={velocityFilter === 'less' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVelocityFilter('less')}
                  >
                    <span className="mr-2 h-3 w-3 rounded-full bg-red-500" />
                    Less
                  </Button>
                  <Button
                    variant={velocityFilter === 'neutral' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVelocityFilter('neutral')}
                  >
                    <span className="mr-2 h-3 w-3 rounded-full bg-yellow-500" />
                    Neutral
                  </Button>
                  <Button
                    variant={velocityFilter === 'more' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVelocityFilter('more')}
                  >
                    <span className="mr-2 h-3 w-3 rounded-full bg-green-500" />
                    More
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="min-w-[200px] flex-1">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    {groupBy === 'subjects'
                      ? item.subjectName
                      : groupBy === 'teachers'
                        ? item.teacherName
                        : item.className}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`${getVelocityColor(item.velocity)} border-0 text-white`}
                  >
                    {getVelocityLabel(item.velocity)}
                  </Badge>
                </div>
                {item.className && groupBy === 'subjects' && (
                  <p className="text-muted-foreground text-sm">{item.className}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-bold">{item.percentageComplete.toFixed(1)}%</span>
                  </div>
                  <Progress value={item.percentageComplete} className="h-2" />
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>
                    {item.completedTopics} of {item.totalTopics} topics
                  </span>
                  <span
                    className={
                      item.percentageComplete >= 70
                        ? 'text-green-600'
                        : item.percentageComplete < 30
                          ? 'text-red-600'
                          : 'text-yellow-600'
                    }
                  >
                    {item.percentageComplete >= 70
                      ? 'On Track'
                      : item.percentageComplete < 30
                        ? 'Behind'
                        : 'On Pace'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="text-muted-foreground p-6 text-center">
              No items found matching the current filters
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
