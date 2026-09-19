'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  useTeacherCpdDetail,
  useDeleteTraining,
} from '../hooks/use-teacher-training';
import { DOMAIN_INFO } from '../constants/cbse-catalog';
import { DomainStackedProgressBar } from './domain-stacked-progress-bar';
import {
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  Building,
  Laptop,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

interface TeacherCpdDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId?: string | null;
  onAddTrainingClick?: (teacherId: string) => void;
}

export function TeacherCpdDrawer({
  open,
  onOpenChange,
  teacherId,
  onAddTrainingClick,
}: TeacherCpdDrawerProps) {
  const { data: teacher, isLoading } = useTeacherCpdDetail(teacherId || undefined);
  const deleteTraining = useDeleteTraining();

  const handleDelete = async (recordId: string) => {
    if (confirm('Are you sure you want to delete this training record?')) {
      await deleteTraining.mutateAsync(recordId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1a73e8] text-white font-bold text-base shadow-sm">
                {teacher?.name?.charAt(0) || 'T'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-gray-900">
                    {teacher?.name || 'Loading teacher...'}
                  </DialogTitle>
                  {teacher && (
                    <Badge
                      className={
                        teacher.complianceStatus === 'COMPLIANT'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : teacher.complianceStatus === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }
                      variant="outline"
                    >
                      {teacher.complianceStatus.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {teacher?.email} • {teacher?.subjectNames.join(', ') || 'Teacher'}
                </p>
              </div>
            </div>

            {teacher && onAddTrainingClick && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onAddTrainingClick(teacher.teacherId);
                }}
                className="bg-[#1a73e8] hover:bg-[#1558b0] text-white text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Log Training
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading CPD profile...</div>
        ) : teacher ? (
          <div className="space-y-4 pt-1">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900">Total CPD Hours</span>
                  <Award className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-blue-900">{teacher.totalHours}</span>
                  <span className="text-xs text-blue-700">/ 50 Hours</span>
                </div>
                <div className="mt-2.5">
                  <DomainStackedProgressBar
                    domain1Hours={teacher.domain1Hours}
                    domain2Hours={teacher.domain2Hours}
                    domain3Hours={teacher.domain3Hours}
                    totalHours={teacher.totalHours}
                    targetHours={50}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-blue-800 mt-1.5 font-medium">
                  <span>
                    {teacher.hoursRemaining > 0
                      ? `${teacher.hoursRemaining}h remaining`
                      : 'Target Met (50h Completed)'}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-indigo-600 font-bold">{teacher.domain1Hours}h</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sky-600 font-bold">{teacher.domain2Hours}h</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-emerald-600 font-bold">{teacher.domain3Hours}h</span>
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50/40 border border-indigo-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-900">CBSE Quota</span>
                  <Building className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-indigo-900">{teacher.cbseHours}</span>
                  <span className="text-xs text-indigo-700">/ 25 Hours</span>
                </div>
                <Progress value={teacher.cbseProgress} className="h-2 mt-2 bg-indigo-100" />
                <p className="text-[11px] text-indigo-700 mt-1">
                  {teacher.cbseHours >= 25 ? 'CBSE Quota Completed' : `${Math.max(0, 25 - teacher.cbseHours)}h remaining`}
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900">School Quota</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-emerald-900">{teacher.schoolHours}</span>
                  <span className="text-xs text-emerald-700">/ 25 Hours</span>
                </div>
                <Progress value={teacher.schoolProgress} className="h-2 mt-2 bg-emerald-100" />
                <p className="text-[11px] text-emerald-700 mt-1">
                  {teacher.schoolHours >= 25 ? 'School Quota Completed' : `${Math.max(0, 25 - teacher.schoolHours)}h remaining`}
                </p>
              </div>
            </div>

            {/* Domains Breakdown */}
            <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/60">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">
                Domain Progress (NPST Standards)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">Domain 1 (Ethics)</span>
                    <span className="font-bold text-indigo-600">{teacher.domain1Hours}/12h</span>
                  </div>
                  <Progress value={teacher.domain1Progress} className="h-1.5 mt-2" />
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">Domain 2 (Knowledge)</span>
                    <span className="font-bold text-sky-600">{teacher.domain2Hours}/24h</span>
                  </div>
                  <Progress value={teacher.domain2Progress} className="h-1.5 mt-2" />
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">Domain 3 (Growth)</span>
                    <span className="font-bold text-emerald-600">{teacher.domain3Hours}/14h</span>
                  </div>
                  <Progress value={teacher.domain3Progress} className="h-1.5 mt-2" />
                </div>
              </div>
            </div>

            {/* Logged Records Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-[#1a73e8]" />
                  Logged Training Records ({teacher.trainingRecords?.length || 0})
                </h4>
              </div>

              {!teacher.trainingRecords || teacher.trainingRecords.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-200 rounded-xl">
                  <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">No training records logged yet</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Click "Log Training" to record completed workshops, webinars, or duty assignments.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {teacher.trainingRecords.map((rec) => {
                    const domainMeta = DOMAIN_INFO[rec.domain];
                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{rec.title}</span>
                            {rec.annexure && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {rec.annexure.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {rec.provider}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Laptop className="h-3 w-3" />
                              {rec.trainingMode}
                            </span>
                            {rec.startDate && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(rec.startDate).toLocaleDateString()}
                                </span>
                              </>
                            )}
                            {rec.certificateNumber && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-[#1a73e8] font-medium">
                                  <ShieldCheck className="h-3 w-3" />
                                  Cert: {rec.certificateNumber}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-sm font-black text-gray-900">{Number(rec.hours)}h</span>
                            <p className="text-[10px] text-gray-400">
                              {domainMeta?.title.split(':')[0] || 'CPD'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rec.id)}
                            className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
