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
  iconBg = 'bg-blue-50',
  iconColor = 'text-blue-600',
  iconGradient,
  extra,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  iconGradient?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/30 px-3.5 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-2.5">
          <div className={cn('rounded-xl p-2', iconGradient ? cn(iconGradient, 'text-white') : iconBg)}>
            <Icon className={cn('h-4 w-4', iconGradient ? 'text-white' : iconColor)} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
        </div>
        {extra && <div className="flex items-center overflow-x-auto no-scrollbar">{extra}</div>}
      </div>
      <div className="p-3.5 sm:p-5">{children}</div>
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
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Welcome & Status Banner (Matching Image 1 exact UI) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    Teacher Professional Development (CPD)
                  </h1>
                  <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live: 50h Annual Mandate
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Track mandatory 50-hour professional development hours across CBSE & In-house institutional modules.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGuidelinesOpen(true)}
                className="h-9 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 shadow-2xs rounded-xl"
              >
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                Guidelines
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSummary}
                disabled={!records.length}
                className="h-9 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 shadow-2xs rounded-xl"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                Portfolio
              </Button>

              <Button
                size="sm"
                onClick={() => setLogDialogOpen(true)}
                className="h-9 font-bold text-xs shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 px-3.5 gap-1.5 rounded-xl cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Log Record
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Concise Overview KPI Metric Cards (Matching Image 1 UI) */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Card 1 - Blue: Effective Total */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Effective Hours
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                {totalProgress}% Done
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {effectiveTotal}h
              </span>
              <span className="text-[10px] font-semibold text-slate-400">/ 50h</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Mandatory annual CPD quota
            </p>
          </div>

          {/* Card 2 - Purple: CBSE Quota */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                CBSE Quota
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                COE / Regional
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {effectiveCbse}h
              </span>
              <span className="text-[10px] font-semibold text-slate-400">/ 25h</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Official CBSE workshops
            </p>
          </div>

          {/* Card 3 - Amber: School Quota */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                School Quota
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                In-House
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {effectiveSchool}h
              </span>
              <span className="text-[10px] font-semibold text-slate-400">/ 25h</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              School internal sessions
            </p>
          </div>

          {/* Card 4 - Emerald: Compliance */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', isCompliant ? 'from-emerald-600 to-teal-600' : 'from-amber-500 to-orange-500')} />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Compliance
              </span>
              <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider', isCompliant ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                {isCompliant ? 'Compliant' : 'Pending'}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={cn('text-xl font-black', isCompliant ? 'text-emerald-700' : 'text-amber-700')}>
                {isCompliant ? 'MET' : `${hoursRemaining}h`}
              </span>
              <span className={cn('text-[10px] font-semibold', isCompliant ? 'text-emerald-600' : 'text-amber-600')}>
                {isCompliant ? 'fulfilled' : 'remaining'}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Board affiliation mandate
            </p>
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
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs font-bold overflow-x-auto no-scrollbar w-full sm:w-auto">
              {(['ALL', 'CBSE', 'SCHOOL', 'ACADEMIC'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all shrink-0 text-xs',
                    categoryFilter === cat
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
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
