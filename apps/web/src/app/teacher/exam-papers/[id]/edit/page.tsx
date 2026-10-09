'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
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

export default function EditExamPaperPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [sections, setSections] = useState<any[]>([]);
  const [fullSections, setFullSections] = useState<any[]>([]); // Store full sections with questions
  const [instructions, setInstructions] = useState('');
  const [step, setStep] = useState(1);
  const [studentCount, setStudentCount] = useState(30);
  const [paperLoaded, setPaperLoaded] = useState(false);
  
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
    classId: '',
    subjectName: '',
    subjectId: '',
    examName: '',
    examDate: '',
    logoUrl: '',
    teacherName: ''
  });

  useEffect(() => {
    if (!params.id) return;
    api.get<any>(`/exam-papers/${params.id}`).then((paper) => {
      setPaperDetails({
        duration: paper.duration || 0,
        totalMarks: paper.totalMarks || 0,
        templateType: paper.templateType || 'SINGLE',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        schoolName: paper.school?.name || '',
        className: paper.class?.name || '',
        classId: paper.classId || paper.class?.id || '',
        subjectName: paper.subject?.name || '',
        subjectId: paper.subjectId || paper.subject?.id || '',
        examName: paper.examName || '',
        examDate: paper.examDate || '',
        logoUrl: paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || ''
      });
      // Store full sections with questions for later steps
      const fullSectionsData = paper.sections || [];
      setFullSections(fullSectionsData);
      // Transform to only label + segments for SectionSegmentForm
      const transformedSections = fullSectionsData.map((section: any) => ({
        label: section.label,
        segments: section.segments || []
      }));
      setSections(transformedSections);
      setInstructions(paper.instructions || '');
      setPaperLoaded(true);
      // Start at step 1 to allow editing paper setup
      setStep(1);
    }).catch(() => {
      setPaperLoaded(true);
    });
  }, [params.id]);

  const handleSetupSuccess = async (id: string, details: any) => {
    setPaperDetails(prev => ({
      ...prev,
      ...details,
      duration: details.duration,
      totalMarks: details.totalMarks,
      templateType: details.templateType
    }));
    setStep(2);
  };

  const handleSegmentsReady = async (nextSections: any[]) => {
    console.log('Sections from SegmentForm:', nextSections);
    console.log('Full sections with questions:', fullSections);
    // Merge updated segments with existing questions from fullSections
    const mergedSections = nextSections.map((newSection: any) => {
      const existingSection = fullSections.find((s: any) => s.label === newSection.label);
      return {
        ...newSection,
        type: existingSection?.type || newSection.type,
        marksEach: Number(existingSection?.marksEach || newSection.marksEach),
        questions: existingSection?.questions || []
      };
    });
    console.log('Merged sections for QuestionEditor:', mergedSections);
    setSections(mergedSections);
    setFullSections(mergedSections);
    await api.patch(`/exam-papers/${params.id}`, {
      sections: mergedSections,
      status: 'DRAFT'
    });
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
    await api.patch(`/exam-papers/${params.id}`, {
      sections: nextSections,
      status: 'DRAFT',
      styleFontFamily: styling.fontFamily,
      styleFontSize: styling.fontSize,
      styleColor: styling.color
    });
    setStep(4);
  };


  const handleInstructionsReady = async (nextInstructions: string) => {
    setInstructions(nextInstructions);
    await api.patch(`/exam-papers/${params.id}`, {
      instructions: nextInstructions,
      status: 'DRAFT'
    });
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
    await api.patch(`/exam-papers/${params.id}`, {
      sections: nextSections,
      status: 'DRAFT',
      styleFontFamily: styling.fontFamily,
      styleFontSize: styling.fontSize,
      styleColor: styling.color
    });
  };

  const handleSubmit = async () => {
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
      const teacherSuffix = paperDetails.teacherName ? `_${paperDetails.teacherName.trim().replace(/\s+/g, '_')}` : '';
      const formData = new FormData();
      formData.append('pdf', blob, `${paperDetails.examName.trim().replace(/\s+/g, '_')}${teacherSuffix}_Paper.pdf`);
      
      await fetch(`/api/exam-papers/${params.id}/pdf`, {
        method: 'POST',
        body: formData
      });
      
      // Submit paper
      await api.patch(`/exam-papers/${params.id}`, { sections, instructions, status: 'SUBMITTED' });
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
        teacherName: paperDetails.teacherName,
        sections: sections
      };
      
      const blob = await generateExamPaperPdf(pdfData);
      const url = window.URL.createObjectURL(blob);
      const teacherSuffix = paperDetails.teacherName ? `_${paperDetails.teacherName.trim().replace(/\s+/g, '_')}` : '';
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paperDetails.examName.trim().replace(/\s+/g, '_')}${teacherSuffix}_Paper.pdf`;
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
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const totalSteps = 5;

  if (!paperLoaded) {
    return (
      <DashboardShell title="Edit Exam Paper">
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Edit Exam Paper">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm gap-4">
          <div>
            <h2 className="text-xl font-semibold">Step {step} of {totalSteps}</h2>
            <p className="text-sm text-gray-500">Edit your exam paper configuration.</p>
          </div>
          <div className="flex items-center gap-3">
            {step >= 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenPreviewModal()}
                className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs flex items-center gap-1.5 font-semibold"
              >
                <Eye className="w-4 h-4 text-indigo-600" />
                Live Paper Preview
              </Button>
            )}
            {step > 1 && (
              <div className="text-sm font-medium text-gray-700 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                Duration: {formatDuration(paperDetails.duration)} | Total Marks: {paperDetails.totalMarks}
              </div>
            )}
          </div>
        </div>
        
        {!paperLoaded ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-200 space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent"></div>
            <p className="text-sm font-medium text-gray-500">Loading exam paper setup...</p>
          </div>
        ) : step === 1 ? (
          <PaperSetupForm 
            key={params.id}
            onSubmitSuccess={handleSetupSuccess} 
            initialData={{
              examName: paperDetails.examName,
              examDate: paperDetails.examDate,
              totalMarks: paperDetails.totalMarks,
              duration: paperDetails.duration,
              templateType: paperDetails.templateType,
              classId: paperDetails.classId,
              subjectId: paperDetails.subjectId,
            }}
            isEdit={true}
            paperId={params.id}
          /> 
        ) : null}
        
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
