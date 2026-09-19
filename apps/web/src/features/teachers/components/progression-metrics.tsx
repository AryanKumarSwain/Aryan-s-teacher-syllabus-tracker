'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

interface TeacherProgression {
  globalTimeline?: {
    startDate: string;
    endDate: string;
    totalTeachingDays: number;
    elapsedTeachingDays: number;
    remainingTeachingDays: number;
    percentageComplete: number;
  } | null;
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

export function TeacherProgressionMetrics() {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Timeline */}
        {data.globalTimeline && data.globalTimeline.totalTeachingDays > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground">Academic Timeline</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Teaching Day {data.globalTimeline.elapsedTeachingDays} of{' '}
                  {data.globalTimeline.totalTeachingDays}
                </span>
                <span className="text-primary font-bold">
                  {data.globalTimeline.percentageComplete.toFixed(1)}%
                </span>
              </div>
              <Progress value={data.globalTimeline.percentageComplete} className="h-2" />
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>{data.globalTimeline.remainingTeachingDays} teaching days remaining</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            No academic timeline configured for this session.
          </div>
        )}

        {/* Subject Progress */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground">Subject Progress</span>
          </div>
          <div className="space-y-3">
            {data.subjectProgress.map((subject, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{subject.subjectName}</p>
                    {subject.className && (
                      <p className="text-muted-foreground text-xs">{subject.className}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{subject.percentageComplete.toFixed(1)}%</p>
                    <p className="text-muted-foreground text-xs">
                      {subject.completedTopics}/{subject.totalTopics}
                    </p>
                  </div>
                </div>
                <Progress
                  value={subject.percentageComplete}
                  className={`h-2 ${getProgressColor(subject.percentageComplete)}`}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className={getVelocityColor(subject.velocity)}>
                    {subject.velocity === 'less' && 'Behind schedule'}
                    {subject.velocity === 'neutral' && 'On pace'}
                    {subject.velocity === 'more' && 'Ahead of schedule'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {data.subjectProgress.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">No subjects assigned yet</p>
        )}
      </CardContent>
    </Card>
  );
}
