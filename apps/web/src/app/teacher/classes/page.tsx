'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, GraduationCap, CheckCircle2, Target } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';

interface AssignedClass {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  totalChapters: number;
  completedChapters: number;
  progress: number;
  _count: { subjects: number };
}

export default function TeacherClassesPage() {
  const { school } = useAuthStore((s) => ({ school: s.user?.school }));
  const schoolId = school?.id;
  const academicSessionId = school?.currentAcademicSessionId;

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-classes', schoolId, academicSessionId],
    queryFn: () =>
      api.getPaginated<AssignedClass>('/syllabus/classes/assigned', {
        page: 1,
        pageSize: 100,
        ...(academicSessionId && { academicSessionId }),
      }),
    enabled: !!schoolId,
  });

  const classes = data?.items ?? [];

  return (
    <DashboardShell title="My Classes">
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No assigned classes"
            description="Your administrator can assign you classes so you can manage progress from here."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((cls, i) => {
              const remaining = cls.totalChapters - cls.completedChapters;
              const pct = Math.round(cls.progress);
              const barColor =
                pct >= 70
                  ? 'from-emerald-400 to-emerald-600'
                  : pct >= 40
                    ? 'from-blue-400 to-indigo-500'
                    : 'from-amber-400 to-orange-500';

              return (
                <div
                  key={cls.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Link href={`/teacher/classes/${cls.id}`}>
                    <Card className="group h-full cursor-pointer border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="line-clamp-1 text-base font-bold">
                              {cls.name}
                            </CardTitle>
                            {cls.section && (
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                Section {cls.section}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="text-muted-foreground ml-2 mt-0.5 h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Mini stats */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: 'Subjects',
                              value: cls._count.subjects,
                              icon: BookOpen,
                              color: 'text-blue-600',
                              bg: 'bg-blue-50',
                            },
                            {
                              label: 'Done',
                              value: cls.completedChapters,
                              icon: CheckCircle2,
                              color: 'text-emerald-600',
                              bg: 'bg-emerald-50',
                            },
                            {
                              label: 'Left',
                              value: remaining,
                              icon: Target,
                              color: 'text-amber-600',
                              bg: 'bg-amber-50',
                            },
                          ].map(({ label, value, icon: Icon, color, bg }) => (
                            <div key={label} className={cn('rounded-lg p-2 text-center', bg)}>
                              <Icon className={cn('mx-auto mb-0.5 h-3.5 w-3.5', color)} />
                              <div className={cn('text-sm font-bold', color)}>{value}</div>
                              <div className="text-muted-foreground text-[10px]">{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {cls.completedChapters} of {cls.totalChapters} chapters
                            </span>
                            <span className="font-bold text-gray-700">{pct}%</span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={cn(
                                'h-full rounded-full bg-gradient-to-r transition-all duration-700',
                                barColor,
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
