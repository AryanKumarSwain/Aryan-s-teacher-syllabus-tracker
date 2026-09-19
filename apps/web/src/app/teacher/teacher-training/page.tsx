'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  useMyCpd,
  useDeleteTraining,
} from '@/features/teacher-training/hooks/use-teacher-training';
import { CbseGuidelinesModal } from '@/features/teacher-training/components/cbse-guidelines-modal';
import { LogTrainingDialog } from '@/features/teacher-training/components/log-training-dialog';
import { DomainStackedProgressBar } from '@/features/teacher-training/components/domain-stacked-progress-bar';
import { DOMAIN_INFO } from '@/features/teacher-training/constants/cbse-catalog';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Laptop,
  Plus,
  ShieldCheck,
  Building,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function TeacherTrainingPage() {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CBSE' | 'SCHOOL' | 'ACADEMIC'>('ALL');

  const { data: myCpd, isLoading } = useMyCpd();
  const deleteTraining = useDeleteTraining();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this training record?')) {
      await deleteTraining.mutateAsync(id);
    }
  };

  const records = myCpd?.trainingRecords || [];

  const filteredRecords = records.filter((r) => {
    if (categoryFilter === 'CBSE') return r.provider === 'CBSE';
    if (categoryFilter === 'SCHOOL') return r.provider !== 'CBSE';
    if (categoryFilter === 'ACADEMIC') return r.isAcademicActivity;
    return true;
  });

  const handleDownloadSummary = () => {
    if (!myCpd) return;

    const headers = [
      'Training Title',
      'Domain',
      'Provider',
      'Mode',
      'Duration (Hours)',
      'Start Date',
      'End Date',
      'Organized By',
      'Certificate No.',
    ];

    const rows = (myCpd.trainingRecords || []).map((r) => [
      `"${r.title}"`,
      r.domain,
      r.provider,
      r.trainingMode,
      Number(r.hours),
      r.startDate ? new Date(r.startDate).toLocaleDateString() : '',
      r.endDate ? new Date(r.endDate).toLocaleDateString() : '',
      `"${r.organizedBy || ''}"`,
      `"${r.certificateNumber || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `My_CPD_Training_Portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCompliant = myCpd?.complianceStatus === 'COMPLIANT';

  return (
    <DashboardShell title="My CPD Training">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a73e8] to-[#1558b0] text-white shadow-sm">
                <Award className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                My Teacher Training (CPD)
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              CBSE Notification TRG-02/2025 • Mandatory 50 Hours Continuous Professional Development
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGuidelinesOpen(true)}
              className="text-xs flex items-center gap-1.5 border-gray-300"
            >
              <BookOpen className="h-4 w-4 text-[#1a73e8]" />
              CBSE Circular & Guidelines
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSummary}
              disabled={!records.length}
              className="text-xs flex items-center gap-1.5 border-gray-300"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              Download Portfolio
            </Button>

            <Button
              size="sm"
              onClick={() => setLogDialogOpen(true)}
              className="bg-[#1a73e8] hover:bg-[#1558b0] text-white text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Log Completed Training
            </Button>
          </div>
        </div>

        {/* Hero Progress Banner */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-500 via-indigo-600 to-[#1a73e8] p-6 text-white shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  Annual 50-Hour Target
                </span>
                <span className="text-xs text-blue-100">
                  Academic Session 2025-26
                </span>
              </div>
              <h2 className="text-3xl font-black">
                {myCpd?.totalHours || 0} <span className="text-xl font-normal text-blue-100">/ 50 Hours Completed</span>
              </h2>
              <p className="text-xs text-blue-100 leading-relaxed">
                {isCompliant
                  ? '🎉 Congratulations! You have successfully completed your mandatory 50 CPD hours for this academic year.'
                  : `You need ${myCpd?.hoursRemaining || 50} more hours to meet the CBSE Affiliation mandate (Clause 12.2.9).`}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[260px] text-right">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5 text-blue-100">
                <span>Overall Completion</span>
                <span className="text-white text-sm font-bold">{myCpd?.totalProgress || 0}%</span>
              </div>
              <DomainStackedProgressBar
                domain1Hours={myCpd?.domain1Hours || 0}
                domain2Hours={myCpd?.domain2Hours || 0}
                domain3Hours={myCpd?.domain3Hours || 0}
                totalHours={myCpd?.totalHours || 0}
                targetHours={50}
                className="bg-white/25"
              />
              <div className="flex items-center justify-between text-[11px] text-blue-100 mt-2">
                <span>Status:</span>
                <span className="font-bold text-white uppercase">
                  {myCpd?.complianceStatus?.replace('_', ' ') || 'NOT STARTED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quota Distribution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: CBSE Quota (25h) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">CBSE Quota</h3>
                  <p className="text-[11px] text-gray-500">COE & Regional Institutes</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  (myCpd?.cbseHours || 0) >= 25
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }
              >
                {myCpd?.cbseHours || 0} / 25 Hours
              </Badge>
            </div>
            <Progress value={myCpd?.cbseProgress || 0} className="h-2 bg-blue-50" />
            <p className="text-[11px] text-gray-500">
              Must be organized by CBSE COE / Training Institutes on Annexure topics.
            </p>
          </div>

          {/* Card 2: School Quota (25h) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">School / In-house Quota</h3>
                  <p className="text-[11px] text-gray-500">In-house, Sahodaya & Duties</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  (myCpd?.schoolHours || 0) >= 25
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }
              >
                {myCpd?.schoolHours || 0} / 25 Hours
              </Badge>
            </div>
            <Progress value={myCpd?.schoolProgress || 0} className="h-2 bg-emerald-50" />
            <p className="text-[11px] text-gray-500">
              Includes in-house workshops, Sahodaya, and eligible academic duties (up to 11h).
            </p>
          </div>
        </div>

        {/* 3 NPST Domains Cards */}
        <div className="border border-gray-200 rounded-2xl bg-gray-50/50 p-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            3 NPST Standards / Domains Progress
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900">Domain 1: Core Values</span>
                <span className="font-black text-indigo-600">{myCpd?.domain1Hours || 0} / 12h</span>
              </div>
              <Progress value={myCpd?.domain1Progress || 0} className="h-1.5 mt-2" />
              <p className="text-[10px] text-gray-400 mt-1">Ethics, Wellness, Inclusion (Annexure-I)</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900">Domain 2: Practice</span>
                <span className="font-black text-sky-600">{myCpd?.domain2Hours || 0} / 24h</span>
              </div>
              <Progress value={myCpd?.domain2Progress || 0} className="h-1.5 mt-2" />
              <p className="text-[10px] text-gray-400 mt-1">Subject & Pedagogy (Annexure-II)</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900">Domain 3: Growth</span>
                <span className="font-black text-emerald-600">{myCpd?.domain3Hours || 0} / 14h</span>
              </div>
              <Progress value={myCpd?.domain3Progress || 0} className="h-1.5 mt-2" />
              <p className="text-[10px] text-gray-400 mt-1">NCF, NEP & Duties (Annexure-III)</p>
            </div>
          </div>
        </div>

        {/* Training Records History */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#1a73e8]" />
              My Training History ({records.length})
            </h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs">
              {(['ALL', 'CBSE', 'SCHOOL', 'ACADEMIC'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#1a73e8] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'ALL'
                    ? 'All'
                    : cat === 'CBSE'
                    ? 'CBSE (25h)'
                    : cat === 'SCHOOL'
                    ? 'School (25h)'
                    : 'Academic Duties'}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading your CPD records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-gray-200 rounded-xl">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700">No training records found</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Click "Log Completed Training" to record your completed workshops and webinars.
              </p>
              <Button
                size="sm"
                onClick={() => setLogDialogOpen(true)}
                className="mt-3 bg-[#1a73e8] hover:bg-[#1558b0] text-white text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Log First Training
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRecords.map((rec) => {
                const domainMeta = DOMAIN_INFO[rec.domain];
                return (
                  <div
                    key={rec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{rec.title}</span>
                        {rec.annexure && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {rec.annexure.replace('_', ' ')}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${domainMeta?.badgeClass || ''}`}
                        >
                          {domainMeta?.title.split(':')[0] || 'CPD'}
                        </Badge>
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

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-gray-900">{Number(rec.hours)}h</span>
                        <p className="text-[10px] text-emerald-600 font-medium">Verified</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rec.id)}
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Guidelines Modal */}
      <CbseGuidelinesModal
        open={guidelinesOpen}
        onOpenChange={setGuidelinesOpen}
      />

      {/* Log Training Dialog (Teacher Mode) */}
      <LogTrainingDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        isTeacherPortal={true}
      />
    </DashboardShell>
  );
}
