'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, BookOpen, AlertTriangle } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

interface TeacherProgression {
  globalTimeline: {
    startDate: string;
    endDate: string;
    totalTeachingDays: number;
    elapsedTeachingDays: number;
    remainingTeachingDays: number;
    percentageComplete: number;
  };
  subjectProgress: SubjectProgressItem[];
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

export default function TeacherProgressPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-progression', user?.teacherId, user?.schoolId],
    queryFn: () =>
      api.get<TeacherProgression>('/progression/teacher', {
        teacherId: user?.teacherId || undefined,
        schoolId: user?.schoolId || undefined,
      }),
    enabled: !!user?.teacherId && !!user?.schoolId,
  });

  if (error) {
    toast.error('Failed to load progression data');
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage >= 30 && percentage <= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getVelocityColor = (velocity: string) => {
    switch (velocity) {
      case 'less':
        return 'text-red-600';
      case 'neutral':
        return 'text-yellow-600';
      case 'more':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getVelocityLabel = (velocity: string) => {
    switch (velocity) {
      case 'less':
        return 'Behind schedule';
      case 'neutral':
        return 'On pace';
      case 'more':
        return 'Ahead of schedule';
      default:
        return 'Unknown';
    }
  };

  return (
    <DashboardShell title="Your Progress">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Progress Overview</h2>
          <p className="text-muted-foreground text-sm">
            Track your teaching progress across all assigned subjects and classes.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-xl" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        ) : data ? (
          <>
            {/* Academic Timeline Progress Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Academic Timeline Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
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

            {/* Subject Progress Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground">Subject Progress</span>
              </div>

              {data.subjectProgress.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground text-sm">No subjects assigned yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {data.subjectProgress.map((subject, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{subject.subjectName}</CardTitle>
                          {subject.className && (
                            <p className="text-muted-foreground text-xs">{subject.className}</p>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {subject.completedTopics} of {subject.totalTopics} topics
                            </span>
                            <span className="font-bold">
                              {subject.percentageComplete.toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={subject.percentageComplete}
                            className={`h-2 ${getProgressColor(subject.percentageComplete)}`}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <AlertTriangle
                            className={`h-3 w-3 ${getVelocityColor(subject.velocity)}`}
                          />
                          <span className={getVelocityColor(subject.velocity)}>
                            {getVelocityLabel(subject.velocity)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No progress data available.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
