'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Loader2, 
  FileText, 
  Download, 
  Edit3, 
  Trash2, 
  Send, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  FileDown, 
  Users, 
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RotateCcw,
  X
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExamPaperItem {
  id: string;
  examName: string;
  status: string;
  createdAt: string;
  teacher?: { user: { name: string } };
  class?: { name: string };
  subject?: { name: string };
  school?: { 
    name: string;
    examPaperTemplates?: Array<{ logoUrl?: string }>;
  };
  totalMarks?: number;
  duration?: number;
  examDate?: string;
  instructions?: string;
  styleFontFamily?: string;
  styleFontSize?: string;
  styleColor?: string;
  templateType?: string;
  pdfUrl?: string;
  sections?: unknown[];
}

function Section({
  title,
  icon: Icon,
  iconBg = 'bg-purple-50',
  iconColor = 'text-purple-600',
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

export default function TeacherExamPapersPage() {
  const queryClient = useQueryClient();
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [rollNumber, setRollNumber] = useState('');
  const [studentCount, setStudentCount] = useState(30);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'REVIEWED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['teacher-exam-papers'],
    queryFn: () => api.get<ExamPaperItem[]>('/exam-papers'),
    staleTime: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/exam-papers/${id}`, { status: 'SUBMITTED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-exam-papers'] });
      toast.success('Paper submitted for review');
    },
    onError: () => toast.error('Failed to submit the paper. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/exam-papers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-exam-papers'] });
      toast.success('Exam paper deleted');
    },
    onError: () => toast.error('Failed to delete paper. Please try again.'),
  });

  const handleDownloadSingleStudent = async (paperId: string) => {
    if (!rollNumber.trim()) {
      toast.error('Please enter a roll number');
      return;
    }
    setDownloadingType(`single-${paperId}`);
    try {
      const [paper, { generateExamPaperPdf }] = await Promise.all([
        api.get<ExamPaperItem>(`/exam-papers/${paperId}`),
        import('@/features/exam-papers/utils/pdf-generator'),
      ]);
      
      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: (paper.templateType as 'SINGLE' | 'SPLIT') || 'SINGLE',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        sections: paper.sections || [],
      };
      
      const blob = await generateExamPaperPdf(pdfData as any, rollNumber);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_${rollNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadBlank = async (paperId: string) => {
    setDownloadingType(`blank-${paperId}`);
    try {
      const [paper, { generateExamPaperPdf }] = await Promise.all([
        api.get<ExamPaperItem>(`/exam-papers/${paperId}`),
        import('@/features/exam-papers/utils/pdf-generator'),
      ]);
      
      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: (paper.templateType as 'SINGLE' | 'SPLIT') || 'SINGLE',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        sections: paper.sections || [],
      };
      
      const blob = await generateExamPaperPdf(pdfData as any, '');
      const url = window.URL.createObjectURL(blob);
      const teacherSuffix = paper.teacher?.user?.name ? `_${paper.teacher.user.name.trim().replace(/\s+/g, '_')}` : '';
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.trim().replace(/\s+/g, '_')}${teacherSuffix}_Paper.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Blank PDF downloaded');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleBulkDownload = async (paperId: string) => {
    setDownloadingType(`bulk-${paperId}`);
    try {
      const [paper, { generateBulkExamPapersZip }] = await Promise.all([
        api.get<ExamPaperItem>(`/exam-papers/${paperId}`),
        import('@/features/exam-papers/utils/pdf-generator'),
      ]);
      
      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: (paper.templateType as 'SINGLE' | 'SPLIT') || 'SINGLE',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        sections: paper.sections || [],
      };

      const zipBlob = await generateBulkExamPapersZip(pdfData as any, studentCount);
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_Bulk_Roll_Sheets.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Bulk ZIP downloaded');
    } catch (error) {
      console.error('Failed to download ZIP:', error);
      toast.error('Failed to download ZIP. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const toggleExpand = (paperId: string) => {
    setExpandedPaperId(expandedPaperId === paperId ? null : paperId);
    setRollNumber('');
  };

  const totalPapers = papers.length;
  const draftPapers = papers.filter((p) => p.status === 'DRAFT').length;
  const submittedPapers = papers.filter((p) => p.status === 'SUBMITTED').length;
  const reviewedPapers = papers.filter((p) => p.status === 'REVIEWED').length;

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    papers.forEach((p) => {
      if (p.class?.name) set.add(p.class.name);
    });
    return Array.from(set).sort();
  }, [papers]);

  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    papers.forEach((p) => {
      if (p.subject?.name) set.add(p.subject.name);
    });
    return Array.from(set).sort();
  }, [papers]);

  const filteredPapers = useMemo(() => {
    let list = [...papers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const examMatch = p.examName?.toLowerCase().includes(q);
        const subjectMatch = p.subject?.name?.toLowerCase().includes(q);
        const classMatch = p.class?.name?.toLowerCase().includes(q);
        return Boolean(examMatch || subjectMatch || classMatch);
      });
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (selectedClass !== 'ALL') {
      list = list.filter((p) => p.class?.name === selectedClass);
    }

    if (selectedSubject !== 'ALL') {
      list = list.filter((p) => p.subject?.name === selectedSubject);
    }

    return list;
  }, [papers, searchQuery, statusFilter, selectedClass, selectedSubject]);

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL' || selectedClass !== 'ALL' || selectedSubject !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSelectedClass('ALL');
    setSelectedSubject('ALL');
  };

  return (
    <DashboardShell title="Exam Papers">
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Header Banner (Matching Image 1 exact UI) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    Exam Papers & Question Sets
                  </h1>
                  <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live: Question Studio
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Create, edit, review, and export high-resolution PDFs and student-tailored roll sheets.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="h-9 inline-flex items-center gap-1.5 text-xs font-bold px-3 rounded-xl border border-indigo-200/80 bg-indigo-50 text-indigo-700 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {totalPapers} Papers Generated
              </span>
              <Link href="/teacher/exam-papers/create">
                <Button className="h-9 font-bold text-xs shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 px-3.5 gap-1.5 rounded-xl cursor-pointer active:scale-95 transition-all">
                  <Plus className="h-4 w-4" /> Create Exam Paper
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Concise Overview KPI Metric Cards (Matching Image 1 UI) */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Card 1 - Blue: Total Papers */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Total Papers
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                Catalog
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {totalPapers}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">authored</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              All authored papers
            </p>
          </div>

          {/* Card 2 - Purple/Slate: Drafts */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Drafts
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                In Edit
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {draftPapers}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">drafts</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              In edit progress
            </p>
          </div>

          {/* Card 3 - Amber: Submitted */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Submitted
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                Under Review
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {submittedPapers}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">pending</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Under school review
            </p>
          </div>

          {/* Card 4 - Emerald: Reviewed */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Reviewed / Live
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                Ready
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {reviewedPapers}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600">approved</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Ready for examination
            </p>
          </div>
        </div>

        {/* Exam Papers Section Card */}
        <Section
          title="Exam Paper Catalog"
          icon={Layers}
          iconGradient="from-purple-600 to-indigo-600"
          extra={
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs font-bold overflow-x-auto no-scrollbar w-full sm:w-auto">
              {(['ALL', 'DRAFT', 'SUBMITTED', 'REVIEWED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all shrink-0 text-xs',
                    statusFilter === s
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          }
        >
          {/* Search, Class & Subject Filter Bar */}
          <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              {/* Search Input */}
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exam, subject, class..."
                  className="h-8 pl-8 pr-7 text-xs rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Class Filter Dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">Class:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs hover:border-slate-300"
                >
                  <option value="ALL">All Classes</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter Dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">Subject:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs hover:border-slate-300"
                >
                  <option value="ALL">All Subjects</option>
                  {uniqueSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters button */}
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="h-8 px-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>

            <div className="text-[11px] font-semibold text-slate-400 self-end sm:self-center shrink-0">
              Showing <span className="font-bold text-slate-700">{filteredPapers.length}</span> of {papers.length}
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
              <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-base">No exam papers match your filters</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "No papers match the selected class, subject, search, or status filter. Try clearing filters."
                  : "Click 'Create Exam Paper' to start authoring your first draft."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-3.5 text-xs h-8 rounded-lg gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPapers.map((paper) => {
                const isExpanded = expandedPaperId === paper.id;
                return (
                  <div
                    key={paper.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base text-slate-900">
                            {paper.examName}
                          </h4>
                          {paper.subject?.name && (
                            <Badge variant="outline" className="border-blue-100 bg-blue-50 text-[11px] font-semibold text-blue-700">
                              {paper.subject.name}
                            </Badge>
                          )}
                          {paper.class?.name && (
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                              {paper.class.name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap">
                          <span>Created {new Date(paper.createdAt).toLocaleDateString()}</span>
                          {paper.totalMarks ? (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-semibold">{paper.totalMarks} Marks</span>
                            </>
                          ) : null}
                          {paper.duration ? (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-semibold">{paper.duration} mins</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {/* Right Action Controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-bold border shadow-2xs',
                            paper.status === 'REVIEWED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : paper.status === 'SUBMITTED'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          )}
                        >
                          {paper.status === 'REVIEWED'
                            ? 'Reviewed'
                            : paper.status === 'SUBMITTED'
                            ? 'Submitted'
                            : 'Draft'}
                        </span>

                        {paper.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            disabled={submitMutation.isPending}
                            onClick={() => submitMutation.mutate(paper.id)}
                            className="text-xs h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-bold shadow-2xs"
                          >
                            {submitMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            Submit
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(paper.id)}
                          className="text-xs h-8 gap-1.5 rounded-xl border-slate-200 font-semibold hover:bg-slate-50"
                        >
                          <Download className="h-3.5 w-3.5 text-blue-600" />
                          <span>Export Sheets</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>

                        <Link href={`/teacher/exam-papers/${paper.id}/edit`}>
                          <Button variant="outline" size="sm" className="text-xs h-8 gap-1 rounded-xl border-slate-200 font-semibold hover:bg-slate-50">
                            <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Edit
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this exam paper?')) {
                              deleteMutation.mutate(paper.id);
                            }
                          }}
                          className="text-xs h-8 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Export Tray */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            PDF Generation & Export Suite
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Blank Paper */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
                            <div>
                              <h6 className="font-bold text-sm text-slate-900">Blank Master PDF</h6>
                              <p className="text-xs text-slate-500 mt-0.5">Master exam copy with empty student roll slot.</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={downloadingType === `blank-${paper.id}`}
                              onClick={() => handleDownloadBlank(paper.id)}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Download Blank
                            </Button>
                          </div>

                          {/* Single Student with Roll Number */}
                          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
                            <div>
                              <h6 className="font-bold text-sm text-blue-900">Personalized Student PDF</h6>
                              <p className="text-xs text-slate-500 mt-0.5">Inject specific Roll No into the paper header.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Roll No"
                                value={rollNumber}
                                onChange={(e) => setRollNumber(e.target.value)}
                                className="h-8 text-xs bg-white border-blue-200"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={downloadingType === `single-${paper.id}`}
                                onClick={() => handleDownloadSingleStudent(paper.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0"
                              >
                                Download
                              </Button>
                            </div>
                          </div>

                          {/* Bulk Roll Sheets ZIP */}
                          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
                            <div>
                              <h6 className="font-bold text-sm text-purple-900">Bulk Roll Number Sheets</h6>
                              <p className="text-xs text-slate-500 mt-0.5">Individual sheets (01 to N) packed in a ZIP.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="200"
                                value={studentCount}
                                onChange={(e) => setStudentCount(Number(e.target.value))}
                                className="h-8 w-20 text-xs bg-white border-purple-200 text-center font-bold"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={downloadingType === `bulk-${paper.id}`}
                                onClick={() => handleBulkDownload(paper.id)}
                                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex-1"
                              >
                                Download ZIP
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </DashboardShell>
  );
}
