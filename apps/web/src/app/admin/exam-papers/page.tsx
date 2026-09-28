'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileText, Download, CheckCircle2, Eye, Edit3, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { env } from '@/config/env';

interface AdminPaperItem {
  id: string;
  examName: string;
  status: string;
  teacher: { user: { name: string } };
  class: { name: string };
  subject: { name: string };
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

export default function AdminExamPapersPage() {
  const queryClient = useQueryClient();
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [rollNumber, setRollNumber] = useState('');
  const [studentCount, setStudentCount] = useState(30);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [showTeacherName, setShowTeacherName] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_show_teacher_name_paper');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: template } = useQuery({
    queryKey: ['exam-paper-template'],
    queryFn: () => api.get<{ id?: string; logoUrl?: string | null }>('/exam-papers/template'),
    staleTime: 60000,
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${env.apiUrl}/exam-papers/template/upload-logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
        queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
        toast.success('School logo updated and synced');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      await api.post('/exam-papers/template', {
        headerHtml: '',
        logoUrl: null,
      });
      queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
      toast.success('School logo removed');
    } catch (error) {
      toast.error('Failed to remove logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleToggleShowTeacherName = (checked: boolean) => {
    setShowTeacherName(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_show_teacher_name_paper', String(checked));
    }
  };

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['admin-exam-papers'],
    queryFn: () => api.get<AdminPaperItem[]>('/exam-papers'),
    staleTime: 30000,
  });

  const markReviewedMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/exam-papers/${id}`, { status: 'REVIEWED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
      toast.success('Paper marked as reviewed');
    },
    onError: () => toast.error('Failed to mark paper as reviewed. Please try again.'),
  });

  const handleDownloadSingleStudent = async (paperId: string) => {
    if (!rollNumber.trim()) {
      toast.error('Please enter a roll number');
      return;
    }
    setDownloadingType(`single-${paperId}`);
    try {
      const [paper, { generateExamPaperPdf }] = await Promise.all([
        api.get<AdminPaperItem>(`/exam-papers/${paperId}`),
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
        logoUrl: template?.logoUrl || paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || [],
      };
      
      const blob = await generateExamPaperPdf(pdfData as any, rollNumber);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_${rollNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exam paper PDF downloaded');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadBulk = async (paperId: string) => {
    setDownloadingType(`bulk-${paperId}`);
    try {
      const [paper, { generateBulkExamPapersZip }] = await Promise.all([
        api.get<AdminPaperItem>(`/exam-papers/${paperId}`),
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
        logoUrl: template?.logoUrl || paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || [],
      };

      const zipBlob = await generateBulkExamPapersZip(pdfData as any, studentCount);
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_Bulk_Roll_Sheets.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Bulk exam papers ZIP downloaded');
    } catch (error) {
      console.error('Failed to download bulk ZIP:', error);
      toast.error('Failed to download bulk ZIP. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadBlank = async (paperId: string) => {
    setDownloadingType(`blank-${paperId}`);
    try {
      const [paper, { generateExamPaperPdf }] = await Promise.all([
        api.get<AdminPaperItem>(`/exam-papers/${paperId}`),
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
        logoUrl: template?.logoUrl || paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || [],
      };
      
      const blob = await generateExamPaperPdf(pdfData as any, '');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_Paper.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Blank exam paper PDF downloaded');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const toggleExpand = (paperId: string) => {
    setExpandedPaperId(expandedPaperId === paperId ? null : paperId);
    setRollNumber('');
  };

  return (
    <DashboardShell title="Exam Papers">
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Exam Papers</h2>
              <p className="text-sm text-gray-500">Review, approve, and export exam papers generated by faculty.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs transition-colors select-none">
                <input
                  type="checkbox"
                  checked={showTeacherName}
                  onChange={(e) => handleToggleShowTeacherName(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="text-left">
                  <span className="text-xs font-semibold text-gray-800 block">Teacher Name on Paper</span>
                  <span className="text-[11px] text-gray-500">{showTeacherName ? 'Visible in PDFs' : 'Hidden from PDFs'}</span>
                </div>
              </label>
            </div>
          </div>

          {/* School Logo Section (Synced with Settings & Navbar) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 bg-slate-50/70 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg border border-gray-200 bg-white p-1 flex items-center justify-center shadow-2xs overflow-hidden shrink-0">
                {template?.logoUrl ? (
                  <img
                    src={template.logoUrl}
                    alt="School Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-800">School Header Logo</span>
                  {template?.logoUrl ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                      Not Set
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {template?.logoUrl 
                    ? 'Synced with Settings: Automatically prints on exam paper headers, watermark, and navigation.' 
                    : 'Upload your school PNG/JPG logo to appear on question papers, watermarks, and navigation.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-8 gap-1.5 bg-white hover:bg-gray-50"
              >
                {uploadingLogo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-gray-500" />
                )}
                {template?.logoUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {template?.logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={handleRemoveLogo}
                  className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                  title="Remove Logo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3 opacity-60" />
            <p className="font-medium text-gray-700">No exam papers found.</p>
            <p className="text-xs text-gray-400 mt-1">Exam papers submitted by teachers will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <div key={paper.id} className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden transition-all hover:border-gray-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900 text-base">{paper.examName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-gray-700">{paper.teacher.user.name}</span>
                      <span>•</span>
                      <span>{paper.class.name}</span>
                      <span>•</span>
                      <span>{paper.subject.name}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      paper.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      paper.status === 'REVIEWED' ? 'bg-green-100 text-green-800 border border-green-200' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {paper.status === 'REVIEWED' ? 'Reviewed' : paper.status === 'SUBMITTED' ? 'Submitted' : paper.status}
                    </span>

                    {paper.status === 'SUBMITTED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={markReviewedMutation.isPending}
                        onClick={() => markReviewedMutation.mutate(paper.id)}
                        className="text-xs h-8"
                      >
                        {markReviewedMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />}
                        Mark Reviewed
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

                    <Link href={`/admin/exam-papers/${paper.id}`}>
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                        <Eye className="h-3.5 w-3.5 text-gray-500" /> Review
                      </Button>
                    </Link>

                    <Link href={`/admin/exam-papers/${paper.id}/edit`}>
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                        <Edit3 className="h-3.5 w-3.5 text-gray-500" /> Edit
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {expandedPaperId === paper.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
                      <div>
                        <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">Export & Download Options</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Customize download options for this exam paper</p>
                      </div>
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={showTeacherName}
                          onChange={(e) => handleToggleShowTeacherName(e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-700">
                          Show Teacher Name
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${showTeacherName ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {showTeacherName ? 'Visible' : 'Hidden'}
                        </span>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Single Student PDF */}
                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-blue-900 mb-1">Single Student PDF</h5>
                          <p className="text-xs text-gray-500 mb-3">Generate customized paper with student roll number pre-filled.</p>
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

                      {/* Bulk Download */}
                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-purple-900 mb-1">Bulk ZIP (Whole Class)</h5>
                          <p className="text-xs text-gray-500 mb-3">ZIP containing individual PDFs numbered 1 to N.</p>
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
                            onClick={() => handleDownloadBulk(paper.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-xs h-8 shrink-0"
                          >
                            {downloadingType === `bulk-${paper.id}` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Download ZIP
                          </Button>
                        </div>
                      </div>

                      {/* Blank PDF */}
                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-gray-900 mb-1">Blank PDF (Universal)</h5>
                          <p className="text-xs text-gray-500 mb-3">Download a single PDF with blank roll number field for photocopying.</p>
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
