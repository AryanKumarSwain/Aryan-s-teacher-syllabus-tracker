'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/services/api-client';
import { cn, getTermBadgeStyle } from '@/lib/utils';
import { toast } from 'sonner';
import { broadcastProgressUpdate } from '@/lib/realtime-sync';

interface ChapterWorkflowCardProps {
  chapterId: string;
  title: string;
  termName?: string;
  progress: {
    teachingCompleted: boolean;
    qaCompleted: boolean;
    copyChecked: boolean;
    chapterStatus: string;
    completionPercentage: number;
  } | null;
  invalidateQueryKeys?: readonly unknown[][];
}

const steps = [
  { key: 'teachingCompleted' as const, label: 'Teaching Done' },
  { key: 'qaCompleted' as const, label: 'Q&A Done' },
  { key: 'copyChecked' as const, label: 'Copy Checked' },
];

export function ChapterWorkflowCard({ chapterId, title, termName, progress, invalidateQueryKeys = [] }: ChapterWorkflowCardProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Record<string, boolean>) => api.patch(`/progress/chapters/${chapterId}`, data),
    onMutate: async (data) => {
      const previous = invalidateQueryKeys.map((key) => ({ key, data: queryClient.getQueryData(key) }));

      invalidateQueryKeys.forEach((key) => {
        queryClient.setQueryData(key, (oldData: any) => {
          if (!oldData) return oldData;

          const updateChapter = (item: any) => {
            if (item?.id === chapterId) {
              const currentProgress = item.chapterProgress?.[0] ?? {};
              const tc = data.teachingCompleted ?? currentProgress.teachingCompleted ?? false;
              const qc = data.qaCompleted ?? currentProgress.qaCompleted ?? false;
              const cc = data.copyChecked ?? currentProgress.copyChecked ?? false;
              const count = (tc ? 1 : 0) + (qc ? 1 : 0) + (cc ? 1 : 0);
              const chapterStatus = count === 3 ? 'COMPLETED' : count > 0 ? 'IN_PROGRESS' : 'PENDING';
              const completionPercentage = Math.round((count / 3) * 100);
              const completedAt = chapterStatus === 'COMPLETED' ? new Date().toISOString() : null;

              return {
                ...item,
                chapterProgress: [
                  {
                    ...currentProgress,
                    teachingCompleted: tc,
                    qaCompleted: qc,
                    copyChecked: cc,
                    chapterStatus,
                    completionPercentage,
                    completedAt,
                  },
                ],
              };
            }
            if (Array.isArray(item.subjects)) {
              const updatedSubjects = item.subjects.map((subject: any) => ({
                ...subject,
                chapters: subject.chapters?.map(updateChapter),
              }));

              const allChapters = updatedSubjects.flatMap((s: any) => s.chapters || []);
              const completedChapters = allChapters.filter(
                (c: any) => c.chapterProgress?.[0]?.chapterStatus === 'COMPLETED',
              ).length;
              const overallProgress =
                allChapters.length > 0 ? Math.round((completedChapters / allChapters.length) * 100) : 0;

              return {
                ...item,
                subjects: updatedSubjects,
                completedChapters,
                overallProgress,
              };
            }
            return item;
          };

          if (Array.isArray(oldData)) {
            return oldData.map(updateChapter);
          }

          return updateChapter(oldData);
        });
      });

      return { previous };
    },
    onSuccess: () => {
      invalidateQueryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-timeline-progress'] });
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['school-stats'] });
      broadcastProgressUpdate({ chapterId });
      toast.success('Progress updated');
    },
    onError: (_, __, context) => {
      context?.previous.forEach((item: any) => {
        queryClient.setQueryData(item.key, item.data);
      });
      toast.error('Failed to update progress');
    },
  });

  const flags = {
    teachingCompleted: progress?.teachingCompleted ?? false,
    qaCompleted: progress?.qaCompleted ?? false,
    copyChecked: progress?.copyChecked ?? false,
  };

  const isCompleted = progress?.chapterStatus === 'COMPLETED';

  const toggleStep = (key: keyof typeof flags) => {
    mutation.mutate({ [key]: !flags[key] });
  };

  return (
    <Card className={cn(isCompleted && 'border-emerald-500/30 bg-emerald-500/5')}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">{title}</CardTitle>
            {termName && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                  getTermBadgeStyle(termName),
                )}
              >
                {termName}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={isCompleted ? 'success' : progress?.chapterStatus === 'IN_PROGRESS' ? 'warning' : 'destructive'}>
              {isCompleted ? 'Completed' : progress?.chapterStatus ?? 'Pending'}
            </Badge>
          </div>
        </div>
        {isCompleted && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <Badge variant="success">✓ Chapter Completed</Badge>
          </motion.div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress?.completionPercentage ?? 0} />
        <div className="space-y-2">
          {steps.map((step) => {
            const done = flags[step.key];
            return (
              <Button
                key={step.key}
                variant="outline"
                className={cn(
                  'w-full justify-between',
                  done && 'border-emerald-500/50 bg-emerald-500/10',
                )}
                onClick={() => toggleStep(step.key)}
                disabled={mutation.isPending}
              >
                <span>{step.label}</span>
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : done ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
