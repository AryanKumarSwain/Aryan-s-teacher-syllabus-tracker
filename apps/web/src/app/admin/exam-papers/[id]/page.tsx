'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { QuestionEditor } from '@/features/exam-papers/components/QuestionEditor';
import { ExamPaperPreviewModal } from '@/features/exam-papers/components/ExamPaperLivePreview';
import { api } from '@/services/api-client';
import { useParams } from 'next/navigation';
import { generateExamPaperPdf, generateBulkExamPapersZip } from '@/features/exam-papers/utils/pdf-generator';
import { Loader2, CloudUpload, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

function GoogleDriveIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l12.3-21.3H6.6c0 1.5.4 3 1.2 4.35l-1.2 7z" fill="#0066DA" />
      <path d="M43.65 25L31.35 3.7c-1.3.8-2.4 1.9-3.2 3.3L1.2 53.5c-.8 1.4-1.2 2.9-1.2 4.4h25.95L43.65 25z" fill="#00AC47" />
      <path d="M73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.6-2.8 8.1-14c.8-1.4 1.2-2.9 1.2-4.4H61.7l5.25 10.5 6.6 14z" fill="#EA4335" />
      <path d="M43.65 25L56 3.7C54.7 2.9 53.2 2.5 51.7 2.5H35.6c-1.5 0-3 .4-4.3 1.2L43.65 25z" fill="#00832D" />
      <path d="M59.8 55.5H27.5L15.2 76.8c1.3.8 2.8 1.2 4.3 1.2h48.3c1.5 0 3-.4 4.3-1.2L59.8 55.5z" fill="#2684FC" />
      <path d="M73.4 26.5l-12.7-22c-1.3-.8-2.8-1.2-4.3-1.2L43.65 25l18.05 31.2h25.6c0-1.5-.4-3-1.2-4.4l-12.7-25.3z" fill="#FFBA00" />
    </svg>
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} hr ${mins} min`;
  } else if (hours > 0) {
    return `${hours} hr`;
  } else {
    return `${mins} min`;
  }
}

export default function AdminExamPaperReviewPage() {
  const params = useParams<{ id: string }>();
  const [paper, setPaper] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [studentCount, setStudentCount] = useState(30);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const [showTeacherName, setShowTeacherName] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_show_teacher_name_paper');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const handleToggleShowTeacherName = (checked: boolean) => {
    setShowTeacherName(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_show_teacher_name_paper', String(checked));
    }
  };

  useEffect(() => {
    if (!params.id) return;
    api.get<any>(`/exam-papers/${params.id}`).then(setPaper).catch(() => setPaper(null));
  }, [params.id]);

  const handleSave = async (sections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => {
    try {
      await api.patch(`/exam-papers/${params.id}`, { sections, status: 'DRAFT', styleFontFamily: styling.fontFamily, styleFontSize: styling.fontSize, styleColor: styling.color });
      setPaper({ ...paper, sections });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save paper:', error);
    }
  };

  const handleDownloadSinglePdf = async () => {
    try {
      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: paper.templateType as 'SINGLE' | 'SPLIT',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || []
      };
      
      const blob = await generateExamPaperPdf(pdfData);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const teacherSuffix = paper.teacher?.user?.name ? `_${paper.teacher.user.name.trim().replace(/\s+/g, '_')}` : '';
      link.download = `${paper.examName.trim().replace(/\s+/g, '_')}${teacherSuffix}_Paper.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handleBulkDownload = async () => {
    try {
      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: paper.templateType as 'SINGLE' | 'SPLIT',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || []
      };

      const zipBlob = await generateBulkExamPapersZip(pdfData, studentCount);
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_Bulk_Roll_Sheets.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download bulk ZIP:', error);
      alert('Failed to download bulk ZIP. Please try again.');
    }
  };

  const handleUploadToDrive = async () => {
    try {
      setUploadingDrive(true);
      const statusRes = await api.get<{ connected: boolean }>('/google-drive/status');
      if (!statusRes?.connected) {
        toast.error('Google Drive is not connected yet. Please connect Google Drive on the Exam Papers list page first.');
        setUploadingDrive(false);
        return;
      }

      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: paper.templateType as 'SINGLE' | 'SPLIT',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || [],
      };

      const teacherSuffix = paper.teacher?.user?.name ? `_${paper.teacher.user.name.trim().replace(/\s+/g, '_')}` : '';
      const safeExamName = `${paper.examName.trim().replace(/\s+/g, '_')}${teacherSuffix}_Paper.pdf`;

      const blob = await generateExamPaperPdf(pdfData as any, '');

      const formData = new FormData();
      formData.append('pdf', blob, safeExamName);
      formData.append('fileName', safeExamName);

      const result = await api.postFormData<any>(`/google-drive/upload-paper/${paper.id}`, formData);

      setPaper({
        ...paper,
        googleDriveFileId: result.fileId,
        googleDriveWebViewLink: result.webViewLink,
      });

      toast.success(
        `Uploaded to Google Drive! Path: ${result.folderPath || `Exam Papers / ${paper.examName} / ${paper.class?.name} / ${paper.subject?.name}`}`,
        {
          action: result.webViewLink
            ? {
                label: 'Open in Drive',
                onClick: () => window.open(result.webViewLink, '_blank'),
              }
            : undefined,
          duration: 7000,
        }
      );
    } catch (error: any) {
      console.error('Failed to upload paper to Google Drive:', error);
      toast.error(error?.message || 'Failed to upload paper to Google Drive.');
    } finally {
      setUploadingDrive(false);
    }
  };

  const handleMarkReviewed = async () => {
    try {
      await api.patch(`/exam-papers/${paper.id}`, { status: 'REVIEWED' });
      setPaper({ ...paper, status: 'REVIEWED' });
    } catch (error) {
      console.error('Failed to mark paper as reviewed:', error);
      alert('Failed to mark the paper as reviewed. Please try again.');
    }
  };

  if (!paper) return null;

  if (isEditing) {
    return (
      <DashboardShell title="Edit Exam Paper">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
          <QuestionEditor 
            sections={paper.sections} 
            onSubmit={handleSave} 
            onSaveDraft={handleSave} 
            initialStyling={{
              fontFamily: paper.styleFontFamily || 'Times New Roman',
              fontSize: paper.styleFontSize || '11pt',
              color: paper.styleColor || '#000000'
            }}
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Review Exam Paper">
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Review & Generate Exam Sheets</h3>
            <p className="text-sm text-gray-500">Your exam paper has been fully configured. Review the download options below before submitting.</p>
          </div>

          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-4">
            <h4 className="font-semibold text-sm text-gray-700">Exam Details Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Exam Name</span>
                <span className="font-medium text-gray-800">{paper.examName}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Subject / Grade</span>
                <span className="font-medium text-gray-800">{paper.subject?.name} ({paper.class?.name})</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Teacher</span>
                <span className="font-medium text-gray-800">{paper.teacher?.user?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Total Marks / Duration</span>
                <span className="font-medium text-gray-800">{paper.totalMarks} Marks / {formatDuration(paper.duration)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Template Type</span>
                <span className="font-medium text-gray-800">{paper.templateType === 'SPLIT' ? 'Split-Page 2-Column' : 'Single Column'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div>
              <h4 className="font-semibold text-sm text-gray-800">Exam Paper Export Preferences</h4>
              <p className="text-xs text-gray-500">Configure what details are included in the generated question paper.</p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors select-none">
              <input
                type="checkbox"
                checked={showTeacherName}
                onChange={(e) => handleToggleShowTeacherName(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-gray-700">
                Show Teacher Name on Paper
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${showTeacherName ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {showTeacherName ? 'Visible' : 'Hidden'}
              </span>
            </label>
          </div>

          <div className="border border-gray-200 rounded-xl p-5 bg-blue-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-blue-900">Standard Exam Sheet</h4>
              <p className="text-xs text-blue-700/80">Generate a high-quality PDF with student name & blank roll number placeholders.</p>
            </div>
            <Button onClick={handleDownloadSinglePdf} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
              Download PDF
            </Button>
          </div>

          <div className="border border-gray-200 rounded-xl p-5 bg-purple-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-purple-900">Bulk Download Student Roll Sheets</h4>
              <p className="text-xs text-purple-700/80">Generate individual PDFs for each student with unique Roll Numbers injected into the document header.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
              <label className="text-xs font-semibold text-purple-900 shrink-0">Student Count:</label>
              <input 
                type="number" 
                min="1" 
                max="200" 
                value={studentCount} 
                onChange={(e) => setStudentCount(Number(e.target.value))}
                className="border border-purple-300 rounded px-2 py-1 w-20 bg-white text-sm text-center focus:ring-1 focus:ring-purple-400 focus:outline-none"
              />
              <Button onClick={handleBulkDownload} className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto">
                Download ZIP
              </Button>
            </div>
          </div>

          {/* Google Drive Upload Card */}
          <div className="border border-emerald-200 rounded-xl p-5 bg-emerald-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <GoogleDriveIcon className="h-5 w-5" />
                <h4 className="font-semibold text-sm text-emerald-950">Upload to Google Drive</h4>
                {paper.googleDriveWebViewLink && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Synced</span>
                )}
              </div>
              <p className="text-xs text-emerald-800/80">
                Automatically saves into: <span className="font-semibold">{paper.academicSession?.name ? `Exam Papers - ${paper.academicSession.name} - Generated by Syllabus Tracker` : 'Exam Papers - Generated by Syllabus Tracker'} &gt; {paper.examName} &gt; {paper.class?.name} &gt; {paper.subject?.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                onClick={handleUploadToDrive}
                disabled={uploadingDrive}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto gap-1.5"
              >
                {uploadingDrive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
                {paper.googleDriveWebViewLink ? 'Re-upload to Drive' : 'Upload to Google Drive'}
              </Button>
              {paper.googleDriveWebViewLink && (
                <a
                  href={paper.googleDriveWebViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-medium transition-colors shrink-0 gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Drive
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Paper</Button>
            <Button
              variant="outline"
              onClick={() => setPreviewModalOpen(true)}
              className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Paper
            </Button>
            {paper.status !== 'REVIEWED' && (
              <Button onClick={handleMarkReviewed}>Mark Reviewed</Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <ExamPaperPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        paperDetails={{
          schoolName: paper.school?.name || '',
          examName: paper.examName || '',
          className: paper.class?.name || '',
          subjectName: paper.subject?.name || '',
          examDate: paper.examDate || '',
          totalMarks: paper.totalMarks || 0,
          duration: paper.duration || 0,
          templateType: paper.templateType || 'SINGLE',
          styleFontFamily: paper.styleFontFamily || 'Times New Roman',
          styleFontSize: paper.styleFontSize || '11pt',
          styleColor: paper.styleColor || '#000000',
          logoUrl: paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
          teacherName: paper.teacher?.user?.name || '',
          showTeacherName: showTeacherName,
        }}
        sections={paper.sections || []}
        instructions={paper.instructions || ''}
        step={5}
        onDownloadPdf={handleDownloadSinglePdf}
      />
    </DashboardShell>
  );
}
