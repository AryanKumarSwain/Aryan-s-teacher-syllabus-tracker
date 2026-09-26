'use client';

import { useState, useMemo } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useTeacherTrainingList,
  useSchoolCpdStats,
  usePendingTrainingApprovals,
  useApproveTraining,
  useRejectTraining,
  TeacherCpdItem,
} from '@/features/teacher-training/hooks/use-teacher-training';
import { CbseGuidelinesModal } from '@/features/teacher-training/components/cbse-guidelines-modal';
import { LogTrainingDialog } from '@/features/teacher-training/components/log-training-dialog';
import { TeacherCpdDrawer } from '@/features/teacher-training/components/teacher-cpd-drawer';
import { DomainStackedProgressBar } from '@/features/teacher-training/components/domain-stacked-progress-bar';
import { CpdQuotaProgressBar } from '@/features/teacher-training/components/cpd-quota-progress-bar';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  Plus,
  Search,
  Users,
  AlertCircle,
  ExternalLink,
  Bell,
  Check,
  X,
  Building,
  Laptop,
  User,
} from 'lucide-react';

export default function AdminTeacherTrainingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLIANT' | 'IN_PROGRESS' | 'NOT_STARTED'>('ALL');

  // Modals & Drawers state
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedTeacherForLog, setSelectedTeacherForLog] = useState<string | undefined>(undefined);
  const [drawerTeacherId, setDrawerTeacherId] = useState<string | null>(null);

  // Queries
  const { data: teachers = [], isLoading } = useTeacherTrainingList({ search });
  const { data: stats } = useSchoolCpdStats();
  const { data: pendingApprovals = [] } = usePendingTrainingApprovals();
  const approveTraining = useApproveTraining();
  const rejectTraining = useRejectTraining();

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (statusFilter !== 'ALL' && t.complianceStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [teachers, statusFilter]);

  // Open log dialog for specific teacher
  const handleOpenLogForTeacher = (teacherId: string) => {
    setSelectedTeacherForLog(teacherId);
    setLogDialogOpen(true);
  };

  // Open general log dialog
  const handleOpenGeneralLog = () => {
    setSelectedTeacherForLog(undefined);
    setLogDialogOpen(true);
  };

  // Export CSV for CBSE OASIS Audit
  const handleExportCsv = () => {
    if (!teachers.length) return;

    const headers = [
      'Teacher Name',
      'Email',
      'Subjects',
      'Total CPD Hours (Req: 50)',
      'CBSE Hours (Req: 25)',
      'School Hours (Req: 25)',
      'Domain 1: Ethics (Req: 12)',
      'Domain 2: Knowledge (Req: 24)',
      'Domain 3: Growth (Req: 14)',
      'Compliance Status',
      'Hours Remaining',
      'Total Records',
    ];

    const rows = teachers.map((t) => [
      `"${t.name}"`,
      `"${t.email}"`,
      `"${t.subjectNames.join(', ')}"`,
      t.totalHours,
      t.cbseHours,
      t.schoolHours,
      t.domain1Hours,
      t.domain2Hours,
      t.domain3Hours,
      t.complianceStatus,
      t.hoursRemaining,
      t.recordsCount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CBSE_Teacher_CPD_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardShell title="Teacher Training (CPD)">
      <div className="space-y-6 pb-12">
        {/* Header with Title & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a73e8] to-[#1558b0] text-white shadow-sm">
                <Award className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Teacher Training & CPD Tracker
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              CBSE Notification TRG-02/2025 • Mandatory 50 Hours Continuous Professional Development per teacher
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
              CBSE Circular & Annexures
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={teachers.length === 0}
              className="text-xs flex items-center gap-1.5 border-gray-300"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              Export OASIS Report
            </Button>

            <Button
              size="sm"
              onClick={handleOpenGeneralLog}
              className="bg-[#1a73e8] hover:bg-[#1558b0] text-white text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Log Training (Single/Bulk)
            </Button>
          </div>
        </div>

        {/* 4 Summary Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Teachers */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Teachers
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">{stats?.totalTeachers ?? teachers.length}</span>
              <span className="text-xs text-gray-500">active session</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Fetched from active teacher records
            </p>
          </div>

          {/* Card 2: Fully Compliant */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/20 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Fully Compliant (50h+)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-900">
                {stats?.compliantCount ?? teachers.filter((t) => t.complianceStatus === 'COMPLIANT').length}
              </span>
              <span className="text-xs font-bold text-emerald-700">
                ({stats?.schoolComplianceRate ?? 0}%)
              </span>
            </div>
            <Progress
              value={stats?.schoolComplianceRate ?? 0}
              className="h-1.5 mt-2 bg-emerald-100"
            />
          </div>

          {/* Card 3: In Progress / Pending */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/20 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                In Progress
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900">
                {stats?.inProgressCount ?? teachers.filter((t) => t.complianceStatus === 'IN_PROGRESS').length}
              </span>
              <span className="text-xs text-blue-600">
                + {stats?.notStartedCount ?? teachers.filter((t) => t.complianceStatus === 'NOT_STARTED').length} pending
              </span>
            </div>
            <p className="text-[11px] text-blue-700 mt-1">
              Currently accumulating CPD hours
            </p>
          </div>

          {/* Card 4: Total Hours Logged */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-purple-50/20 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">
                Total CPD Hours Logged
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-900">
                {stats?.totalHoursLogged ?? teachers.reduce((s, t) => s + t.totalHours, 0)}h
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-indigo-700 mt-1">
              <span>CBSE: {stats?.totalCbseHours ?? 0}h</span>
              <span>•</span>
              <span>School: {stats?.totalSchoolHours ?? 0}h</span>
            </div>
          </div>
        </div>

        {/* Pending Teacher Training Approvals Section */}
        {pendingApprovals.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-orange-50/30 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    Pending Training Approvals
                    <Badge className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0">
                      {pendingApprovals.length} {pendingApprovals.length === 1 ? 'Request' : 'Requests'}
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Teachers logged these trainings. Once approved, the hours will be credited to their mandatory 50h CPD progress.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {pendingApprovals.map((req: any) => (
                <div
                  key={req.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl border border-amber-200/80 bg-white hover:border-amber-300 shadow-xs transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900">{req.title}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-800 bg-amber-50">
                        {req.hours}h • {req.provider}
                      </Badge>
                      {req.annexure && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-600">
                          {req.annexure.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      <span className="font-semibold text-gray-800">Teacher: {req.teacherName}</span>
                      {req.teacherEmail && <span>({req.teacherEmail})</span>}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Laptop className="h-3 w-3" />
                        {req.trainingMode}
                      </span>
                      {req.organizedBy && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {req.organizedBy}
                          </span>
                        </>
                      )}
                      {req.resourcePerson && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-indigo-600 font-medium">
                            <User className="h-3 w-3" />
                            RP: {req.resourcePerson}
                          </span>
                        </>
                      )}
                      {req.startDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(req.startDate).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      size="sm"
                      onClick={() => approveTraining.mutate(req.id)}
                      disabled={approveTraining.isPending || rejectTraining.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 flex items-center gap-1 shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectTraining.mutate(req.id)}
                      disabled={approveTraining.isPending || rejectTraining.isPending}
                      className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8 px-3 flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search teacher by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Filter:</span>
            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
              <SelectTrigger className="h-9 text-xs w-44 bg-gray-50/50">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Teachers ({teachers.length})</SelectItem>
                <SelectItem value="COMPLIANT" className="text-xs">Compliant (50h+)</SelectItem>
                <SelectItem value="IN_PROGRESS" className="text-xs">In Progress</SelectItem>
                <SelectItem value="NOT_STARTED" className="text-xs">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Teacher Compliance Table */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4">Total CPD Hours (50h Target)</th>
                  <th className="py-3 px-4">Split (CBSE / School)</th>
                  <th className="py-3 px-4">Domain Breakdown</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Loading teacher training records...
                    </td>
                  </tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-700">No teachers found</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Try adjusting your search or check teacher tab to add teachers.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((t) => {
                    const isAllSatisfied =
                      t.complianceStatus === 'COMPLIANT' &&
                      t.cbseHours >= 25 &&
                      t.schoolHours >= 25 &&
                      t.domain1Hours >= 12 &&
                      t.domain2Hours >= 24 &&
                      t.domain3Hours >= 14;
                    const isCompliant = isAllSatisfied;
                    const isInProgress = !isCompliant && (t.totalHours > 0 || t.complianceStatus === 'IN_PROGRESS');

                    return (
                      <tr
                        key={t.teacherId}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        {/* Column 1: Teacher Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a73e8]/10 text-[#1a73e8] font-bold text-xs">
                              {t.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => setDrawerTeacherId(t.teacherId)}
                                className="font-bold text-gray-900 hover:text-[#1a73e8] text-left truncate block"
                              >
                                {t.name}
                              </button>
                              <p className="text-[11px] text-gray-400 truncate">{t.email}</p>
                              {t.subjectNames.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {t.subjectNames.slice(0, 2).map((sub) => (
                                    <span
                                      key={sub}
                                      className="inline-block text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded"
                                    >
                                      {sub}
                                    </span>
                                  ))}
                                  {t.subjectNames.length > 2 && (
                                    <span className="text-[10px] text-gray-400">
                                      +{t.subjectNames.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Total Hours Progress (Strict 25h CBSE + 25h School + Domains D1/D2/D3 Quota) */}
                        <td className="py-3 px-4 min-w-[200px]">
                          {(() => {
                            const effectiveCbse = Math.min(25, t.cbseHours);
                            const effectiveSchool = Math.min(25, t.schoolHours);
                            const effectiveD1 = Math.min(12, t.domain1Hours);
                            const effectiveD2 = Math.min(24, t.domain2Hours);
                            const effectiveD3 = Math.min(14, t.domain3Hours);
                            const effectiveDomainTotal = effectiveD1 + effectiveD2 + effectiveD3;
                            const effectiveProviderTotal = effectiveCbse + effectiveSchool;
                            const effectiveTotal = t.effectiveTotalHours ?? Number(Math.min(effectiveProviderTotal, effectiveDomainTotal).toFixed(1));
                            const remaining = t.hoursRemaining ?? Math.max(0, Number((50 - effectiveTotal).toFixed(1)));
                            const progress = t.totalProgress ?? Math.min(100, Math.round((effectiveTotal / 50) * 100));

                            const isD1Satisfied = t.domain1Hours >= 12;
                            const isD2Satisfied = t.domain2Hours >= 24;
                            const isD3Satisfied = t.domain3Hours >= 14;
                            const isTeacherAllSatisfied = isD1Satisfied && isD2Satisfied && isD3Satisfied && effectiveCbse >= 25 && effectiveSchool >= 25;

                            return (
                              <>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <div className="flex items-baseline gap-1">
                                    <span className="font-black text-gray-900">{effectiveTotal}</span>
                                    <span className="font-normal text-gray-400">/ 50h</span>
                                    {t.totalHours > effectiveTotal && (
                                      <span className="text-[10px] text-gray-400 font-normal">
                                        ({t.totalHours}h logged)
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-gray-600">{progress}%</span>
                                </div>
                                <CpdQuotaProgressBar
                                  cbseHours={t.cbseHours}
                                  schoolHours={t.schoolHours}
                                  targetCbse={25}
                                  targetSchool={25}
                                  effectiveTotalHours={effectiveTotal}
                                />
                                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                                  <span>
                                    {isTeacherAllSatisfied && remaining === 0
                                      ? 'Target Achieved!'
                                      : `${remaining}h remaining`}
                                  </span>
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="text-[#1a73e8]">CBSE: {effectiveCbse}/25h</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-emerald-600">School: {effectiveSchool}/25h</span>
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </td>

                        {/* Column 3: Split Quota */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-500 w-12">CBSE:</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 px-1.5 ${t.cbseHours >= 25 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-600'
                                  }`}
                              >
                                {t.cbseHours} / 25h
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-500 w-12">School:</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 px-1.5 ${t.schoolHours >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-gray-600'
                                  }`}
                              >
                                {t.schoolHours} / 25h
                              </Badge>
                            </div>
                          </div>
                        </td>

                        {/* Column 4: Domain Breakdown */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-gray-500">D1 (Ethics):</span>
                              <span className={`font-semibold ${t.domain1Hours >= 12 ? 'text-gray-800' : 'text-amber-700'}`}>
                                {t.domain1Hours}/12h
                              </span>
                              {t.domain1Hours >= 12 ? (
                                <Check className="h-3 w-3 text-emerald-600 inline" />
                              ) : (
                                <span className="text-[10px] text-amber-600 font-medium">({12 - t.domain1Hours}h left)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-gray-500">D2 (Practice):</span>
                              <span className={`font-semibold ${t.domain2Hours >= 24 ? 'text-gray-800' : 'text-amber-700'}`}>
                                {t.domain2Hours}/24h
                              </span>
                              {t.domain2Hours >= 24 ? (
                                <Check className="h-3 w-3 text-emerald-600 inline" />
                              ) : (
                                <span className="text-[10px] text-amber-600 font-medium">({24 - t.domain2Hours}h left)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-gray-500">D3 (Growth):</span>
                              <span className={`font-semibold ${t.domain3Hours >= 14 ? 'text-gray-800' : 'text-amber-700'}`}>
                                {t.domain3Hours}/14h
                              </span>
                              {t.domain3Hours >= 14 ? (
                                <Check className="h-3 w-3 text-emerald-600 inline" />
                              ) : (
                                <span className="text-[10px] text-amber-600 font-medium">({14 - t.domain3Hours}h left)</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 5: Status */}
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[11px] font-semibold py-0.5 px-2 ${isCompliant
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isInProgress
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            variant="outline"
                          >
                            {isCompliant ? 'COMPLIANT' : isInProgress ? 'IN PROGRESS' : 'NOT STARTED'}
                          </Badge>
                        </td>

                        {/* Column 6: Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDrawerTeacherId(t.teacherId)}
                              className="h-7 text-xs px-2 text-gray-700 hover:text-[#1a73e8]"
                            >
                              View Records ({t.recordsCount})
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenLogForTeacher(t.teacherId)}
                              className="h-7 text-xs px-2 text-[#1a73e8] hover:bg-blue-50"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Log
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Guidelines Modal */}
      <CbseGuidelinesModal
        open={guidelinesOpen}
        onOpenChange={setGuidelinesOpen}
      />

      {/* Log Training Dialog */}
      <LogTrainingDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        teachers={teachers}
        preselectedTeacherId={selectedTeacherForLog}
        isTeacherPortal={false}
      />

      {/* Teacher CPD Details Drawer */}
      <TeacherCpdDrawer
        open={!!drawerTeacherId}
        onOpenChange={(open) => !open && setDrawerTeacherId(null)}
        teacherId={drawerTeacherId}
        onAddTrainingClick={(tId) => handleOpenLogForTeacher(tId)}
      />
    </DashboardShell>
  );
}
