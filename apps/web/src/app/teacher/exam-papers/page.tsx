'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api-client';
import { generateExamPaperPdf, generateBulkExamPapersZip } from '@/features/exam-papers/utils/pdf-generator';

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
  sections?: any[];
}

export default function TeacherExamPapersPage() {
  const [papers, setPapers] = useState<ExamPaperItem[]>([]);
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [rollNumber, setRollNumber] = useState('');
  const [studentCount, setStudentCount] = useState(30);

  useEffect(() => {
    api.get<ExamPaperItem[]>('/exam-papers').then(setPapers).catch(() => setPapers([]));
  }, []);

  const handleSubmit = async (id: string) => {
    try {
      await api.patch(`/exam-papers/${id}`, { status: 'SUBMITTED' });
      setPapers((prev) => prev.map((p) => p.id === id ? { ...p, status: 'SUBMITTED' } : p));
    } catch (error) {
      console.error('Failed to submit paper:', error);
      alert('Failed to submit the paper. Please try again.');
    }
  };

  const handleDownloadSingleStudent = async (paperId: string) => {
    if (!rollNumber.trim()) {
      alert('Please enter a roll number');
      return;
    }
    try {
      const paper = await api.get<ExamPaperItem>(`/exam-papers/${paperId}`);
      
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
        sections: paper.sections || []
      };
      
      const blob = await generateExamPaperPdf(pdfData, rollNumber);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_${rollNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handleDownloadBlank = async (paperId: string) => {
    try {
      const paper = await api.get<ExamPaperItem>(`/exam-papers/${paperId}`);
      
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
        sections: paper.sections || []
      };
      
      const blob = await generateExamPaperPdf(pdfData, '');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_Paper.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handleBulkDownload = async (paperId: string) => {
    try {
      const paper = await api.get<ExamPaperItem>(`/exam-papers/${paperId}`);
      
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
      console.error('Failed to download ZIP:', error);
      alert('Failed to download ZIP. Please try again.');
    }
  };

  const toggleExpand = (paperId: string) => {
    setExpandedPaperId(expandedPaperId === paperId ? null : paperId);
    setRollNumber('');
  };

  return (
    <DashboardShell title="Exam Papers">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">My papers</h2>
            <p className="text-sm text-gray-500">Draft, submit, and review your exam papers.</p>
          </div>
          <Link href="/teacher/exam-papers/create">
            <Button>Create Paper</Button>
          </Link>
        </div>
        {papers.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No papers yet.</div>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <div key={paper.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{paper.examName} {paper.subject?.name && `- ${paper.subject.name}`} {paper.class?.name && `- ${paper.class.name}`}</p>
                    <p className="text-sm text-gray-500">{new Date(paper.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      paper.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' :
                      paper.status === 'REVIEWED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{paper.status}</span>
                    {paper.status === 'DRAFT' && (
                      <Button onClick={() => handleSubmit(paper.id)}>Submit</Button>
                    )}
                    <Button variant="outline" onClick={() => toggleExpand(paper.id)}>
                      {expandedPaperId === paper.id ? 'Hide Options' : 'Download Options'}
                    </Button>
                    <Link href={`/teacher/exam-papers/${paper.id}/edit`}><Button variant="outline">Edit</Button></Link>
                    <Button variant="outline" onClick={() => api.delete(`/exam-papers/${paper.id}`).then(() => setPapers((prev) => prev.filter((item) => item.id !== paper.id)))}>Delete</Button>
                  </div>
                </div>
                
                {expandedPaperId === paper.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    <h4 className="font-semibold text-sm text-gray-700">Download Options</h4>
                    
                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                      <h5 className="font-medium text-sm text-blue-900 mb-3">Single Student PDF</h5>
                      <div className="flex gap-3 items-center">
                        <Input
                          placeholder="Enter Roll Number"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button onClick={() => handleDownloadSingleStudent(paper.id)} className="bg-blue-600 hover:bg-blue-700">
                          Download
                        </Button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                      <h5 className="font-medium text-sm text-purple-900 mb-3">Bulk Download (Whole Class)</h5>
                      <div className="flex gap-3 items-center">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-purple-900">Student Count:</label>
                          <Input
                            type="number"
                            min="1"
                            max="200"
                            value={studentCount}
                            onChange={(e) => setStudentCount(Number(e.target.value))}
                            className="w-20"
                          />
                        </div>
                        <Button onClick={() => handleBulkDownload(paper.id)} className="bg-purple-600 hover:bg-purple-700">
                          Download ZIP
                        </Button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                      <h5 className="font-medium text-sm text-gray-700 mb-3">Blank Paper (No Roll Number)</h5>
                      <Button onClick={() => handleDownloadBlank(paper.id)} variant="outline">
                        Download PDF
                      </Button>
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
