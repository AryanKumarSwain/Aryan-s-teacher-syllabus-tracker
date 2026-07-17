'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { QuestionEditor } from '@/features/exam-papers/components/QuestionEditor';
import { api } from '@/services/api-client';
import { useParams } from 'next/navigation';

export default function AdminExamPaperReviewPage() {
  const params = useParams<{ id: string }>();
  const [paper, setPaper] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [studentCount, setStudentCount] = useState(30);

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
      window.open(`/api/exam-papers/${paper.id}/pdf`, '_blank');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handleBulkDownload = async () => {
    try {
      window.open(`/api/exam-papers/${paper.id}/bulk-zip?count=${studentCount}`, '_blank');
    } catch (error) {
      console.error('Failed to download bulk ZIP:', error);
      alert('Failed to download bulk ZIP. Please try again.');
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
                <span className="text-xs text-gray-400 block">Total Marks / Duration</span>
                <span className="font-medium text-gray-800">{paper.totalMarks} Marks / {paper.duration} mins</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Template Type</span>
                <span className="font-medium text-gray-800">{paper.templateType === 'SPLIT' ? 'Split-Page 2-Column' : 'Single Column'}</span>
              </div>
            </div>
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

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Paper</Button>
            {paper.status !== 'REVIEWED' && (
              <Button onClick={handleMarkReviewed}>Mark Reviewed</Button>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
