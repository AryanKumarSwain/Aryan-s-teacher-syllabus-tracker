'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { PaperSetupForm } from '@/features/exam-papers/components/PaperSetupForm';
import { SectionSegmentForm } from '@/features/exam-papers/components/SectionSegmentForm';
import { QuestionEditor } from '@/features/exam-papers/components/QuestionEditor';
import { InstructionsForm } from '@/features/exam-papers/components/InstructionsForm';
import { ExamPaperLivePreview, ExamPaperPreviewModal } from '@/features/exam-papers/components/ExamPaperLivePreview';
import { api } from '@/services/api-client';
import { generateExamPaperPdf, generateBulkExamPapersZip } from '@/features/exam-papers/utils/pdf-generator';

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

export default function CreateExamPaperPage() {
  const router = useRouter();
  const [paperId, setPaperId] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [instructions, setInstructions] = useState('');
  const [step, setStep] = useState(1);
  const [studentCount, setStudentCount] = useState(30);
  
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const draftPreviewRef = useRef<{
    sections?: any[];
    styleFontFamily?: string;
    styleFontSize?: string;
    styleColor?: string;
    instructions?: string;
  }>({});

  const [previewSnapshot, setPreviewSnapshot] = useState<{
    sections: any[];
    instructions: string;
    paperDetails: any;
  } | null>(null);

  const handleOpenPreviewModal = (explicitSections?: any[], explicitStyling?: any, explicitInstructions?: string) => {
    const currentSections = explicitSections || draftPreviewRef.current.sections || sections;
    const currentInstructions = explicitInstructions !== undefined ? explicitInstructions : (draftPreviewRef.current.instructions ?? instructions);
    const styling = explicitStyling || {
      fontFamily: draftPreviewRef.current.styleFontFamily || paperDetails.styleFontFamily,
      fontSize: draftPreviewRef.current.styleFontSize || paperDetails.styleFontSize,
      color: draftPreviewRef.current.styleColor || paperDetails.styleColor,
    };

    setPreviewSnapshot({
      sections: currentSections,
      instructions: currentInstructions,
      paperDetails: {
        ...paperDetails,
        styleFontFamily: styling.fontFamily,
        styleFontSize: styling.fontSize,
        styleColor: styling.color,
      }
    });
    setPreviewModalOpen(true);
  };
  
  // State to store paper setup details for Step 1, 2 & PDF generation metadata
  const [paperDetails, setPaperDetails] = useState({
    duration: 0,
    totalMarks: 0,
    templateType: 'SINGLE',
    styleFontFamily: 'Times New Roman',
    styleFontSize: '11pt',
    styleColor: '#000000',
    schoolName: '',
    className: '',
    subjectName: '',
    examName: '',
    examDate: '',
    logoUrl: '',
    teacherName: ''
  });

  const handleSetupSuccess = async (id: string, details: { duration: number; totalMarks: number; templateType: string }) => {
    setPaperId(id);
    try {
      const fullPaper = await api.get<any>(`/exam-papers/${id}`);
      setPaperDetails({
        duration: details.duration,
        totalMarks: details.totalMarks,
        templateType: details.templateType,
        styleFontFamily: fullPaper.styleFontFamily || 'Times New Roman',
        styleFontSize: fullPaper.styleFontSize || '11pt',
        styleColor: fullPaper.styleColor || '#000000',
        schoolName: fullPaper.school?.name || '',
        className: fullPaper.class?.name || '',
        subjectName: fullPaper.subject?.name || '',
        examName: fullPaper.examName || '',
        examDate: fullPaper.examDate || '',
        logoUrl: fullPaper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: fullPaper.teacher?.user?.name || ''
      });
    } catch {
      setPaperDetails(prev => ({
        ...prev,
        duration: details.duration,
        totalMarks: details.totalMarks,
        templateType: details.templateType
      }));
    }
    setStep(2);
  };

  const handleSegmentsReady = async (nextSections: any[]) => {
    setSections(nextSections);
    if (paperId) {
      await api.patch(`/exam-papers/${paperId}`, {
        sections: nextSections,
        status: 'DRAFT'
      });
    }
    setStep(3);
  };

  const handleQuestionsReady = async (nextSections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => {
    setSections(nextSections);
    setPaperDetails(prev => ({
      ...prev,
      styleFontFamily: styling.fontFamily,
      styleFontSize: styling.fontSize,
      styleColor: styling.color
    }));
    if (paperId) {
      await api.patch(`/exam-papers/${paperId}`, {
        sections: nextSections,
        status: 'DRAFT',
        styleFontFamily: styling.fontFamily,
        styleFontSize: styling.fontSize,
        styleColor: styling.color
      });
    }
    setStep(4);
  };


  const handleInstructionsReady = async (nextInstructions: string) => {
    setInstructions(nextInstructions);
    if (paperId) {
      await api.patch(`/exam-papers/${paperId}`, {
        instructions: nextInstructions,
        status: 'DRAFT'
      });
    }
    setStep(5);
  };

  const handleSaveDraft = async (nextSections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => {
    setSections(nextSections);
    setPaperDetails(prev => ({
      ...prev,
      styleFontFamily: styling.fontFamily,
      styleFontSize: styling.fontSize,
      styleColor: styling.color
    }));
    if (!paperId) return;
    await api.patch(`/exam-papers/${paperId}`, {
      sections: nextSections,
      status: 'DRAFT',
      styleFontFamily: styling.fontFamily,
      styleFontSize: styling.fontSize,
      styleColor: styling.color
    });
  };

  const handleSubmit = async () => {
    if (!paperId) return;
    try {
      // Generate PDF
      const pdfData = {
        schoolName: paperDetails.schoolName,
        examName: paperDetails.examName,
        className: paperDetails.className,
        subjectName: paperDetails.subjectName,
        examDate: paperDetails.examDate,
        totalMarks: paperDetails.totalMarks,
        duration: paperDetails.duration,
        instructions: instructions,
        templateType: paperDetails.templateType as 'SINGLE' | 'SPLIT',
        styleFontFamily: paperDetails.styleFontFamily,
        styleFontSize: paperDetails.styleFontSize,
        styleColor: paperDetails.styleColor,
        logoUrl: paperDetails.logoUrl,
        teacherName: paperDetails.teacherName, // Teacher name from API
        sections: sections
      };
      
      const blob = await generateExamPaperPdf(pdfData);
      
      // Upload PDF to server
      const formData = new FormData();
      formData.append('pdf', blob, `${paperDetails.examName.replace(/\s+/g, '_')}_Paper.pdf`);
      
      await fetch(`/api/exam-papers/${paperId}/pdf`, {
        method: 'POST',
        body: formData
      });
      
      // Submit paper
      await api.patch(`/exam-papers/${paperId}`, { sections, instructions, status: 'SUBMITTED' });
      router.push('/teacher/exam-papers');
    } catch (error) {
      console.error('Failed to submit paper:', error);
      alert('Failed to submit the paper. Please try again.');
    }
  };

  const handleDownloadSinglePdf = async () => {
    try {
      const pdfData = {
        schoolName: paperDetails.schoolName,
        examName: paperDetails.examName,
        className: paperDetails.className,
        subjectName: paperDetails.subjectName,
        examDate: paperDetails.examDate,
        totalMarks: paperDetails.totalMarks,
        duration: paperDetails.duration,
        instructions: instructions,
        templateType: paperDetails.templateType as 'SINGLE' | 'SPLIT',
        styleFontFamily: paperDetails.styleFontFamily,
        styleFontSize: paperDetails.styleFontSize,
        styleColor: paperDetails.styleColor,
        logoUrl: paperDetails.logoUrl,
        teacherName: paperDetails.teacherName, // Teacher name from API
        sections: sections
      };
      
      const blob = await generateExamPaperPdf(pdfData);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paperDetails.examName.replace(/\s+/g, '_')}_Paper.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    }
  };

  const handleBulkDownload = async () => {
    try {
      const pdfData = {
        schoolName: paperDetails.schoolName,
        examName: paperDetails.examName,
        className: paperDetails.className,
        subjectName: paperDetails.subjectName,
        examDate: paperDetails.examDate,
        totalMarks: paperDetails.totalMarks,
        duration: paperDetails.duration,
        instructions: instructions,
        templateType: paperDetails.templateType as 'SINGLE' | 'SPLIT',
        styleFontFamily: paperDetails.styleFontFamily,
        styleFontSize: paperDetails.styleFontSize,
        styleColor: paperDetails.styleColor,
        logoUrl: paperDetails.logoUrl,
        teacherName: paperDetails.teacherName, // Teacher name from API
        sections: sections
      };

      const zipBlob = await generateBulkExamPapersZip(pdfData, studentCount);
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paperDetails.examName.replace(/\s+/g, '_')}_Bulk_Roll_Sheets.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate bulk ZIP');
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const totalSteps = 5;

  return (
    <DashboardShell title="Create Exam Paper">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm gap-4">
          <div>
            <h2 className="text-xl font-semibold">Step {step} of {totalSteps}</h2>
            <p className="text-sm text-gray-500">Create a draft paper, configure sections, add questions, assign topics, and set instructions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {step >= 2 && (
              <Button
                type="button"
                onClick={() => handleOpenPreviewModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm rounded-xl py-2 px-3.5 transition-all hover:shadow"
              >
                <Eye className="w-4 h-4" />
                <span>Live Paper Preview</span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full font-bold">
                  Step {step}
                </span>
              </Button>
            )}
            {step > 1 && (
              <div className="text-sm font-medium text-gray-700 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                Duration: {formatDuration(paperDetails.duration)} | Total Marks: {paperDetails.totalMarks}
              </div>
            )}
          </div>
        </div>
        
        {step === 1 ? <PaperSetupForm onSubmitSuccess={handleSetupSuccess} /> : null}
        
        {step === 2 ? (
          <SectionSegmentForm 
            targetTotalMarks={paperDetails.totalMarks} 
            onSubmit={handleSegmentsReady} 
            onBack={handleBack} 
            initialSections={sections}
            onSectionsChange={(next) => {
              draftPreviewRef.current.sections = next;
            }}
            onOpenPreview={(currentSections) => handleOpenPreviewModal(currentSections)}
          />
        ) : null}
        
        {step === 3 ? (
          <QuestionEditor 
            sections={sections} 
            onSubmit={handleQuestionsReady} 
            onSaveDraft={handleSaveDraft} 
            onBack={handleBack} 
            initialStyling={{
              fontFamily: paperDetails.styleFontFamily,
              fontSize: paperDetails.styleFontSize,
              color: paperDetails.styleColor
            }}
            onDraftChange={(draft, styling) => {
              draftPreviewRef.current.sections = draft;
              draftPreviewRef.current.styleFontFamily = styling.fontFamily;
              draftPreviewRef.current.styleFontSize = styling.fontSize;
              draftPreviewRef.current.styleColor = styling.color;
            }}
            onOpenPreview={(currentSections, styling) => handleOpenPreviewModal(currentSections, styling)}
          />
        ) : null}

        {step === 4 ? (
          <InstructionsForm 
            onSubmit={handleInstructionsReady} 
            onBack={handleBack} 
            initialValue={instructions}
            sections={sections}
            onInstructionsChange={(next) => {
              draftPreviewRef.current.instructions = next;
            }}
            onOpenPreview={(currentInstructions) => handleOpenPreviewModal(undefined, undefined, currentInstructions)}
          />
        ) : null}
        
        {step === 5 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Review & Generate Exam Sheets</h3>
                <p className="text-sm text-gray-500">Your exam paper has been fully configured. Review the live paper preview and download options below.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenPreviewModal()}
                className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs flex items-center gap-1.5 font-semibold"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                Fullscreen Preview
              </Button>
            </div>

            {/* Embedded Live Paper Preview in Step 5 */}
            <ExamPaperLivePreview 
              paperDetails={paperDetails}
              sections={sections}
              instructions={instructions}
              step={5}
              onDownloadPdf={handleDownloadSinglePdf}
            />

            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-4">
              <h4 className="font-semibold text-sm text-gray-700">Exam Details Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block">Exam Name</span>
                  <span className="font-medium text-gray-800">{paperDetails.examName}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Subject / Grade</span>
                  <span className="font-medium text-gray-800">{paperDetails.subjectName} ({paperDetails.className})</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Total Marks / Duration</span>
                  <span className="font-medium text-gray-800">{paperDetails.totalMarks} Marks / {formatDuration(paperDetails.duration)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Template Type</span>
                  <span className="font-medium text-gray-800">{paperDetails.templateType === 'SPLIT' ? 'Split-Page 2-Column' : 'Single Column'}</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 bg-blue-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-blue-900">Standard Exam Sheet</h4>
                <p className="text-xs text-blue-700/80">Generate a high-quality PDF with student name & blank roll number placeholders.</p>
              </div>
              <Button type="button" onClick={handleDownloadSinglePdf} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
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
                <Button type="button" onClick={handleBulkDownload} className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto">
                  Download ZIP
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleBack}>Back</Button>
              <Button type="button" onClick={handleSubmit}>Submit Paper</Button>
            </div>
          </div>
        ) : null}

        {/* Fullscreen Preview Modal */}
        <ExamPaperPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          paperDetails={previewSnapshot?.paperDetails || paperDetails}
          sections={previewSnapshot?.sections || sections}
          instructions={previewSnapshot?.instructions ?? instructions}
          step={step}
          onDownloadPdf={handleDownloadSinglePdf}
        />
      </div>
    </DashboardShell>
  );
}