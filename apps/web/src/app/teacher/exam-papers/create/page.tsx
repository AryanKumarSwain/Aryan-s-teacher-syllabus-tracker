'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  Download, 
  FileDown, 
  Users, 
  CheckCircle2, 
  Award, 
  Clock, 
  ArrowLeft, 
  FileText,
  Sparkles,
  Printer
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { ExamStepper } from '@/features/exam-papers/components/ExamStepper';
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
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [studentCount, setStudentCount] = useState(30);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  
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
    setMaxStepReached(prev => Math.max(prev, 2));
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
    setMaxStepReached(prev => Math.max(prev, 3));
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
    setMaxStepReached(prev => Math.max(prev, 4));
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
    setMaxStepReached(prev => Math.max(prev, 5));
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
    setIsSubmittingFinal(true);
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
        teacherName: paperDetails.teacherName,
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
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  const handleDownloadSinglePdf = async () => {
    setIsDownloadingPdf(true);
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
        teacherName: paperDetails.teacherName,
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
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleBulkDownload = async () => {
    setIsDownloadingZip(true);
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
        teacherName: paperDetails.teacherName,
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
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const totalQuestions = sections.reduce((sum, sec) => {
    const qCount = sec.questions?.length || 
      sec.segments?.reduce((sSum: number, seg: any) => sSum + (seg.questionCount || 0), 0) || 0;
    return sum + qCount;
  }, 0);

  return (
    <DashboardShell title="Create Exam Paper">
      <div className="space-y-4 max-w-7xl mx-auto pb-12">
        {/* Interactive 5-Step Stepper Header */}
        <ExamStepper
          currentStep={step}
          maxStepReached={maxStepReached}
          onStepClick={(targetStep) => setStep(targetStep)}
          onOpenPreview={() => handleOpenPreviewModal()}
          paperDetails={{
            examName: paperDetails.examName,
            subjectName: paperDetails.subjectName,
            className: paperDetails.className,
            totalMarks: paperDetails.totalMarks,
            duration: paperDetails.duration,
          }}
        />
        
        {/* Step 1: Paper Details & Setup */}
        {step === 1 ? <PaperSetupForm onSubmitSuccess={handleSetupSuccess} /> : null}
        
        {/* Step 2: Sections & Segment Allocation */}
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
        
        {/* Step 3: Question Editor */}
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

        {/* Step 4: Instructions & Guidelines */}
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
        
        {/* Step 5: Review & Export */}
        {step === 5 ? (
          <div className="space-y-6">
            {/* Top Review Header Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Review & Generate Exam Paper</h3>
                    <p className="text-xs text-slate-500">Your exam paper is ready! Review the layout below and export printing sheets.</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPreviewModal()}
                  className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs flex items-center gap-1.5 font-semibold rounded-xl"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  Fullscreen Preview
                </Button>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Exam & Subject</span>
                  <p className="font-bold text-slate-800 text-sm mt-1 truncate">{paperDetails.examName || 'Assessment'}</p>
                  <span className="text-xs text-slate-500 font-medium truncate block">{paperDetails.subjectName} ({paperDetails.className})</span>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Score & Time</span>
                  <p className="font-bold text-slate-800 text-sm mt-1">{paperDetails.totalMarks} Marks</p>
                  <span className="text-xs text-slate-500 font-medium">{formatDuration(paperDetails.duration)} duration</span>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Structure</span>
                  <p className="font-bold text-slate-800 text-sm mt-1">{sections.length} Sections</p>
                  <span className="text-xs text-slate-500 font-medium">{totalQuestions} total questions</span>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Paper Layout</span>
                  <p className="font-bold text-slate-800 text-sm mt-1">
                    {paperDetails.templateType === 'SPLIT' ? 'Split-Page (2-Col)' : 'Single Column'}
                  </p>
                  <span className="text-xs text-slate-500 font-medium font-serif">{paperDetails.styleFontFamily} ({paperDetails.styleFontSize})</span>
                </div>
              </div>
            </div>

            {/* Embedded Live Paper Preview */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Live Document Preview
                </h4>
                <span className="text-xs text-slate-400">WYSIWYG Print Layout</span>
              </div>

              <ExamPaperLivePreview 
                paperDetails={paperDetails}
                sections={sections}
                instructions={instructions}
                step={5}
                onDownloadPdf={handleDownloadSinglePdf}
              />
            </div>

            {/* Export Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Single PDF Card */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/30 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <FileDown className="h-4 w-4" />
                    </div>
                    <h4 className="font-bold text-sm text-blue-900">Standard Question Paper</h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Generates a master PDF copy ready for photocopiers or digital display with student name and roll number blank slots.
                  </p>
                </div>

                <Button 
                  type="button" 
                  onClick={handleDownloadSinglePdf} 
                  disabled={isDownloadingPdf}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full rounded-xl shadow-xs flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Single PDF'}</span>
                </Button>
              </div>

              {/* Bulk Roll Sheets Card */}
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-fuchsia-50/30 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Users className="h-4 w-4" />
                    </div>
                    <h4 className="font-bold text-sm text-purple-900">Bulk Roll Number Sheets</h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Automatically generates individualized PDF sheets pre-filled with Roll No (01 to N) packaged into a single ZIP archive.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-purple-900 shrink-0">Students:</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="200" 
                      value={studentCount} 
                      onChange={(e) => setStudentCount(Number(e.target.value))}
                      className="border border-purple-300 rounded-xl px-2.5 py-1.5 w-20 bg-white text-sm font-bold text-center focus:ring-2 focus:ring-purple-200 outline-none"
                    />
                  </div>

                  <Button 
                    type="button" 
                    onClick={handleBulkDownload} 
                    disabled={isDownloadingZip}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold flex-1 rounded-xl shadow-xs flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isDownloadingZip ? 'Generating ZIP...' : 'Download ZIP'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Finalize Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack}
                className="rounded-xl flex items-center gap-1.5 font-semibold text-slate-600"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Instructions</span>
              </Button>

              <Button 
                type="button" 
                onClick={handleSubmit} 
                disabled={isSubmittingFinal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>{isSubmittingFinal ? 'Publishing Paper...' : 'Submit & Finalize Exam Paper'}</span>
              </Button>
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