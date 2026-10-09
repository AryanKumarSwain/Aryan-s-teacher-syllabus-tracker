'use client';

import { useState } from 'react';
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
  ChevronUp
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function TeacherExamPapersPage() {
  const queryClient = useQueryClient();
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [rollNumber, setRollNumber] = useState('');
  const [studentCount, setStudentCount] = useState(30);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'REVIEWED'>('ALL');

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

  const filteredPapers = papers.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header - Matching Admin Dashboard Style */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-700 border border-purple-200/80">
                <FileText className="h-3 w-3" /> Question Paper Studio
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {totalPapers} Papers Generated
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0b1c30] sm:text-3xl">
              Exam Papers & Question Sets
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              Create, edit, review, and export high-resolution PDFs and student-tailored roll sheets.
            </p>
          </div>

          <Link href="/teacher/exam-papers/create">
            <Button className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all gap-1.5 hover:shadow">
              <Plus className="h-4 w-4" /> Create Exam Paper
            </Button>
          </Link>
        </div>

        {/* 4 Top KPI Stat Cards - Matching Admin Dashboard */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Papers</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-[#0b1c30] tracking-tight">{totalPapers}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">All authored papers</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Drafts</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-700 tracking-tight">{draftPapers}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">In edit progress</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-xs">
                <Edit3 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Submitted</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">{submittedPapers}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Under school review</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reviewed / Live</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">{reviewedPapers}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Ready for examination</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Exam Papers Section Card */}
        <Section
          title="Exam Paper Catalog"
          icon={Layers}
          iconGradient="from-purple-600 to-indigo-600"
          extra={
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs font-bold">
              {(['ALL', 'DRAFT', 'SUBMITTED', 'REVIEWED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    statusFilter === s
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          }
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
              <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-base">No exam papers found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {statusFilter !== 'ALL'
                  ? `No papers with status '${statusFilter.toLowerCase()}'. Try changing filter tabs.`
                  : "Click 'Create Exam Paper' to start authoring your first draft."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPapers.map((paper) => {
                const isExpanded = expandedPaperId === paper.id;
                return (
                  <div
                    key={paper.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-all duration-200 hover:border-slate-300 hover:shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base text-[#0b1c30]">
                            {paper.examName}
                          </h4>
                          {paper.subject?.name && (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-100">
                              {paper.subject.name}
                            </span>
                          )}
                          {paper.class?.name && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {paper.class.name}
                            </span>
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
