'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileText, Download, Edit3, Trash2, Send, Plus } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

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

export default function TeacherExamPapersPage() {
  const queryClient = useQueryClient();
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [rollNumber, setRollNumber] = useState('');
  const [studentCount, setStudentCount] = useState(30);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

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

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-700 border border-purple-200">
                <FileText className="h-3 w-3" /> Question Papers
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {papers.length} Papers
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Exam Papers & Assessments
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Draft, submit for moderation, and export custom PDF test papers with student roll headers.
            </p>
          </div>
          <Link href="/teacher/exam-papers/create">
            <Button className="h-10 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white shadow-sm shadow-purple-500/20 hover:bg-purple-700 hover:scale-[1.02] transition-all gap-1.5">
              <Plus className="h-4 w-4" /> Create Exam Paper
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center text-sm text-slate-500 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mx-auto mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <p className="font-bold text-slate-800 text-base">No exam papers created yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Click &apos;Create Exam Paper&apos; to build and format your first question paper using the paper generator.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <div
                key={paper.id}
                className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-base">
                        {paper.examName}
                      </p>
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
                    <p className="text-xs text-slate-400 font-medium">
                      Created on {new Date(paper.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold border ${
                        paper.status === 'SUBMITTED'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : paper.status === 'REVIEWED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {paper.status === 'REVIEWED'
                        ? 'Reviewed'
                        : paper.status === 'SUBMITTED'
                          ? 'Submitted'
                          : paper.status}
                    </span>

                    {paper.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        disabled={submitMutation.isPending}
                        onClick={() => submitMutation.mutate(paper.id)}
                        className="text-xs h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
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
                      className="text-xs h-8 gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-gray-500" />
                      {expandedPaperId === paper.id ? 'Hide Options' : 'Download Options'}
                    </Button>

                    <Link href={`/teacher/exam-papers/${paper.id}/edit`}>
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                        <Edit3 className="h-3.5 w-3.5 text-gray-500" /> Edit
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
                      className="text-xs h-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                {expandedPaperId === paper.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/80 space-y-4">
                    <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">Export & Download Options</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-blue-900 mb-1">Single Student PDF</h5>
                          <p className="text-xs text-gray-500 mb-3">Customized with student roll number.</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Roll No."
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            disabled={downloadingType === `single-${paper.id}`}
                            onClick={() => handleDownloadSingleStudent(paper.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs h-8 shrink-0"
                          >
                            {downloadingType === `single-${paper.id}` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Download
                          </Button>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-purple-900 mb-1">Bulk Download (ZIP)</h5>
                          <p className="text-xs text-gray-500 mb-3">ZIP containing roll-numbered papers for the class.</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span>Count:</span>
                            <Input
                              type="number"
                              min="1"
                              max="200"
                              value={studentCount}
                              onChange={(e) => setStudentCount(Number(e.target.value))}
                              className="w-16 h-8 text-xs"
                            />
                          </div>
                          <Button
                            size="sm"
                            disabled={downloadingType === `bulk-${paper.id}`}
                            onClick={() => handleBulkDownload(paper.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-xs h-8 shrink-0"
                          >
                            {downloadingType === `bulk-${paper.id}` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Download ZIP
                          </Button>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-gray-900 mb-1">Blank Paper PDF</h5>
                          <p className="text-xs text-gray-500 mb-3">Single PDF for printing and manual roll numbers.</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={downloadingType === `blank-${paper.id}`}
                          onClick={() => handleDownloadBlank(paper.id)}
                          className="text-xs h-8 self-start"
                        >
                          {downloadingType === `blank-${paper.id}` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          <Download className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
