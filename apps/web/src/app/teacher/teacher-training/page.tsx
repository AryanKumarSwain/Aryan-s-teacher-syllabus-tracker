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
  User,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

function Section({
  title,
  icon: Icon,
  iconGradient = 'from-blue-600 to-indigo-600',
  extra,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconGradient?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-200 hover:shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/30 px-4 py-3 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${iconGradient} text-white shadow-xs`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="text-sm font-black tracking-tight text-[#0b1c30]">{title}</h3>
        </div>
        {extra && <div className="flex items-center">{extra}</div>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

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

  const effectiveCbse = Math.min(25, myCpd?.cbseHours || 0);
  const effectiveSchool = Math.min(25, myCpd?.schoolHours || 0);
  const effectiveD1 = Math.min(12, myCpd?.domain1Hours || 0);
  const effectiveD2 = Math.min(24, myCpd?.domain2Hours || 0);
  const effectiveD3 = Math.min(14, myCpd?.domain3Hours || 0);
  const effectiveDomainTotal = effectiveD1 + effectiveD2 + effectiveD3;
  const effectiveProviderTotal = effectiveCbse + effectiveSchool;

  const effectiveTotal =
    myCpd?.effectiveTotalHours ??
    Math.min(50, Math.min(effectiveProviderTotal, effectiveDomainTotal));
  const rawTotal = myCpd?.totalHours || 0;
  const hoursRemaining = myCpd?.hoursRemaining ?? Math.max(0, 50 - effectiveTotal);
  const totalProgress =
    myCpd?.totalProgress ?? Math.min(100, Math.round((effectiveTotal / 50) * 100));
  const isCompliant = myCpd?.complianceStatus === 'COMPLIANT' && effectiveTotal >= 50;

  return (
    <DashboardShell title="My CPD Training">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header - Matching Admin Dashboard Style */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200/80">
                <Award className="h-3 w-3" /> CBSE CPD Mandate TRG-02/2025
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                50 Hours Annual Target
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0b1c30] sm:text-3xl">
              Teacher Continuous Professional Development
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              Track mandatory 50-hour professional development hours across CBSE & In-house institutional modules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGuidelinesOpen(true)}
              className="text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              CBSE Guidelines
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSummary}
              disabled={!records.length}
              className="text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              Download Portfolio
            </Button>

            <Button
              size="sm"
              onClick={() => setLogDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl gap-1.5 shadow-xs hover:shadow"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Training Record
            </Button>
          </div>
        </div>

        {/* 4 Top KPI Stat Cards - Matching Admin Dashboard */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Effective</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">
                  {effectiveTotal} <span className="text-sm font-bold text-slate-400">/ 50h</span>
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">{totalProgress}% completed</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CBSE Quota</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
                  {effectiveCbse} <span className="text-sm font-bold text-slate-400">/ 25h</span>
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">COE & Regional</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
                <Building className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">School Quota</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-purple-600 tracking-tight">
                  {effectiveSchool} <span className="text-sm font-bold text-slate-400">/ 25h</span>
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">In-house & Duties</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Compliance</p>
                <p className={cn(
                  "mt-1 text-xl sm:text-2xl font-black tracking-tight",
                  isCompliant ? "text-emerald-600" : "text-amber-600"
                )}>
                  {isCompliant ? 'COMPLIANT' : `${hoursRemaining}h Needed`}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Affiliation status</p>
              </div>
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs",
                isCompliant
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                  : "bg-gradient-to-br from-amber-500 to-orange-500"
              )}>
                {isCompliant ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
            </div>
          </div>
        </div>

        {/* 3 NPST Standards Cards Section */}
        <Section
          title="NPST Professional Standards Breakdown (50h Total)"
          icon={Layers}
          iconGradient="from-indigo-600 to-blue-600"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0b1c30]">Domain 1: Core Values</span>
                <span className="font-black text-indigo-600">{effectiveD1} / 12h</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((effectiveD1 / 12) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Ethics, Wellness, Child Protection (Annexure-I)</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0b1c30]">Domain 2: Practice</span>
                <span className="font-black text-sky-600">{effectiveD2} / 24h</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((effectiveD2 / 24) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Curriculum, Pedagogy, Tech Integration (Annexure-II)</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0b1c30]">Domain 3: Growth</span>
                <span className="font-black text-emerald-600">{effectiveD3} / 14h</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((effectiveD3 / 14) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">NCF, NEP 2020, Research & Duties (Annexure-III)</p>
            </div>
          </div>
        </Section>

        {/* Training Records History Section */}
        <Section
          title="CPD Training Portfolio & Activity Records"
          icon={Clock}
          iconGradient="from-blue-600 to-indigo-600"
          extra={
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs font-bold">
              {(['ALL', 'CBSE', 'SCHOOL', 'ACADEMIC'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    categoryFilter === cat
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {cat === 'ALL'
                    ? 'All'
                    : cat === 'CBSE'
                    ? 'CBSE (25h)'
                    : cat === 'SCHOOL'
                    ? 'School (25h)'
                    : 'Duties'}
                </button>
              ))}
            </div>
          }
        >
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading your CPD records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No training records found</p>
              <p className="text-xs text-slate-400 mt-0.5">Click &apos;Log Training Record&apos; to add your completed workshops and certifications.</p>
              <Button
                size="sm"
                onClick={() => setLogDialogOpen(true)}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Log First Training
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const domainMeta = DOMAIN_INFO[rec.domain];
                return (
                  <div
                    key={rec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all gap-3.5"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#0b1c30]">{rec.title}</span>
                        {rec.annexure && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-slate-200 bg-slate-50 text-slate-600">
                            {rec.annexure.replace('_', ' ')}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-2 py-0.5', domainMeta?.badgeClass || '')}
                        >
                          {domainMeta?.title.split(':')[0] || 'CPD'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {rec.provider}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Laptop className="h-3.5 w-3.5 text-slate-400" />
                          {rec.trainingMode}
                        </span>
                        {rec.startDate && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {new Date(rec.startDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                        {rec.resourcePerson && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-700">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              RP: {rec.resourcePerson}
                            </span>
                          </>
                        )}
                        {rec.certificateNumber && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-blue-600 font-semibold">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Cert: {rec.certificateNumber}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-black text-[#0b1c30]">{Number(rec.hours)}h</span>
                        {rec.status === 'SUBMITTED' ? (
                          <p className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-0.5">
                            Pending Approval
                          </p>
                        ) : rec.status === 'REJECTED' ? (
                          <p className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 mt-0.5">
                            Rejected
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">Verified</p>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rec.id)}
                        className="text-xs h-8 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
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
