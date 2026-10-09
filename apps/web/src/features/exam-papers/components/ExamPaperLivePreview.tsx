'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import { 
  Eye, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  X, 
  FileText,
  Sparkles,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { generateExamPaperPdf } from '../utils/pdf-generator';

export interface ExamPaperPreviewDetails {
  examName?: string;
  schoolName?: string;
  className?: string;
  subjectName?: string;
  examDate?: string;
  duration?: number;
  totalMarks?: number;
  templateType?: 'SINGLE' | 'SPLIT' | string;
  styleFontFamily?: string;
  styleFontSize?: string;
  styleColor?: string;
  logoUrl?: string;
  teacherName?: string;
  showTeacherName?: boolean;
}

interface ExamPaperLivePreviewProps {
  paperDetails: ExamPaperPreviewDetails;
  sections: any[];
  instructions?: string;
  step?: number;
  onDownloadPdf?: () => void;
  className?: string;
  showCardWrapper?: boolean;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
  if (hours > 0) return `${hours} hr`;
  return `${mins} min`;
}

function renderLatexToHtml(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false });
  } catch {
    return latex;
  }
}

function formatContentWithMath(htmlOrText: string): string {
  if (!htmlOrText) return '';
  // 1. Replace <span data-latex="LATEX">...</span> with KaTeX rendered HTML
  let res = htmlOrText.replace(/<span[^>]*data-latex="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi, (_, latex) => {
    return renderLatexToHtml(latex);
  });
  // 2. Replace inline $...$ with KaTeX rendered HTML
  res = res.replace(/\$([^\$]+)\$/g, (_, latex) => {
    return renderLatexToHtml(latex);
  });
  return res;
}

export function ExamPaperLivePreviewSheet({
  paperDetails,
  sections,
  instructions = '',
  step = 5,
  overrideTemplate
}: {
  paperDetails: ExamPaperPreviewDetails;
  sections: any[];
  instructions?: string;
  step?: number;
  overrideTemplate?: 'SINGLE' | 'SPLIT';
}) {
  const templateType = overrideTemplate || paperDetails.templateType || 'SINGLE';
  const fontFamily = paperDetails.styleFontFamily || 'Times New Roman';
  const fontSize = paperDetails.styleFontSize || '11pt';
  const color = paperDetails.styleColor || '#000000';

  const dateStr = paperDetails.examDate 
    ? new Date(paperDetails.examDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
    : '';

  // Determine if sections currently have questions typed (Step 3, 4, 5) or need placeholder slots (Step 2)
  const hasTypedQuestions = sections.some(s => s.questions && s.questions.length > 0 && s.questions.some((q: any) => q.questionText?.trim()));

  return (
    <div 
      className="relative mx-auto bg-white text-slate-900 shadow-2xl transition-all duration-200 border border-slate-200/80 rounded-sm"
      style={{
        width: '100%',
        maxWidth: '210mm',
        minHeight: '297mm',
        padding: '16mm 18mm',
        fontFamily: fontFamily,
        fontSize: fontSize,
        color: color,
        boxSizing: 'border-box'
      }}
    >
      {/* Optional Watermark */}
      {paperDetails.logoUrl && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <img 
            src={paperDetails.logoUrl} 
            alt="Watermark" 
            className="w-72 h-72 object-contain opacity-[0.04] grayscale" 
          />
        </div>
      )}

      {/* Header Container - matches exact PDF header */}
      <div className="relative z-10 border border-slate-400 rounded-sm p-3.5 mb-3 bg-white text-center">
        {paperDetails.logoUrl && (
          <img 
            src={paperDetails.logoUrl} 
            alt="School Logo" 
            className="w-12 h-12 object-contain mx-auto mb-1" 
          />
        )}
        <h1 className="text-lg font-bold uppercase tracking-wide leading-tight text-slate-900">
          {paperDetails.schoolName || 'SCHOOL ACADEMIC PORTAL'}
        </h1>
        <h2 className="text-sm font-bold uppercase text-slate-800 mt-0.5">
          {paperDetails.examName || 'EXAMINATION QUESTION PAPER'}
        </h2>
        <div className="text-xs text-slate-700 mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-normal">
          <span>{(paperDetails.className || 'N/A').trim().replace(/^class:\s*/i, '')}</span>
          <span>|</span>
          <span>Subject: {paperDetails.subjectName || 'N/A'}</span>
          {dateStr && (
            <>
              <span>|</span>
              <span>Date: {dateStr}</span>
            </>
          )}
          {paperDetails.showTeacherName !== false && paperDetails.teacherName && (
            <>
              <span>|</span>
              <span>Teacher: {paperDetails.teacherName}</span>
            </>
          )}
        </div>
        <div className="text-xs text-slate-700 mt-1 flex items-center justify-center gap-4 font-normal">
          <span>Duration: {formatDuration(paperDetails.duration || 0)}</span>
          <span>|</span>
          <span>Total Marks: {paperDetails.totalMarks || 0} Marks</span>
        </div>
      </div>

      {/* Student Details Row - matches exact PDF */}
      <div className="relative z-10 border border-slate-400 rounded-sm px-3 py-2 text-xs font-bold mb-3.5 flex justify-between items-center bg-white">
        <span className="flex-1">Student Name: <span className="inline-block w-48 sm:w-64 border-b border-slate-800 ml-1"></span></span>
        <span>Roll Number: <span className="inline-block w-24 sm:w-32 border-b border-slate-800 ml-1"></span></span>
      </div>

      {/* General Instructions */}
      {(instructions || step === 4 || step === 5) && (
        <div className="relative z-10 mb-3.5 pb-2 border-b border-slate-200">
          <h4 className="text-xs font-bold mb-1 text-slate-900">General Instructions:</h4>
          <div className="text-xs leading-relaxed text-slate-800 space-y-0.5">
            {instructions ? (
              instructions.split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))
            ) : (
              <p className="italic text-slate-400">General instructions will appear here (Step 4).</p>
            )}
          </div>
        </div>
      )}

      {/* Sections and Questions */}
      <div 
        className={templateType === 'SPLIT' ? 'relative z-10 columns-2 gap-8' : 'relative z-10 space-y-4'}
        style={templateType === 'SPLIT' ? { columnRule: '1px solid #cbd5e1' } : undefined}
      >
        {sections.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            Configure sections in Step 2 to preview paper structure.
          </div>
        ) : (
          sections.map((section, sIdx) => {
            const hasQuestions = section.questions && section.questions.length > 0;
            const segments = section.segments || [];

            return (
              <div 
                key={sIdx} 
                className={`mb-5 ${templateType === 'SPLIT' ? 'pb-3' : ''}`}
              >
                {/* Section Header */}
                <div className="text-center my-3">
                  <span className="font-bold text-sm tracking-wide text-slate-900 inline-block">
                    {section.label}
                  </span>
                </div>

                {/* Segments with typed questions */}
                {hasTypedQuestions && hasQuestions ? (
                  <div className="space-y-3.5">
                    {segments.length > 0 ? (
                      segments.map((segment: any, segIdx: number) => {
                        const segmentQuestions = section.questions.filter((q: any) => q.segmentType === segment.type);
                        if (segmentQuestions.length === 0) return null;

                        return (
                          <div key={segIdx} className={cn(segIdx > 0 ? "pt-3.5" : "")}>
                            <div className="text-xs font-bold text-slate-800 mb-2 pl-0.5">
                              {segment.label} ({segmentQuestions.length} {segmentQuestions.length === 1 ? 'question' : 'questions'} × {segment.marksEach} {segment.marksEach === 1 ? 'mark' : 'marks'} = {segmentQuestions.length * segment.marksEach} marks)
                            </div>

                            {/* Assertion Reasoning Instructions Key */}
                            {segment.type === 'ASSERTION_REASONING' && (
                              <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2.5 mb-2 space-y-1 text-slate-600">
                                <p className="font-bold text-slate-800">Direction: For each question, select the correct option:</p>
                                <p>(A) Both (A) and (R) are true and (R) is correct explanation of (A).</p>
                                <p>(B) Both (A) and (R) are true but (R) is not correct explanation.</p>
                                <p>(C) (A) is true, but (R) is false.</p>
                                <p>(D) (A) is false, but (R) is true.</p>
                              </div>
                            )}

                            {/* Questions */}
                            <div className="space-y-2">
                              {segmentQuestions.map((question: any, qIdx: number) => (
                                <PreviewQuestionItem 
                                  key={question.id || qIdx}
                                  question={question}
                                  questionNumber={qIdx + 1}
                                  isMCQ={segment.type === 'MCQ' || question.segmentType === 'MCQ'}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      section.questions.map((question: any, qIdx: number) => (
                        <PreviewQuestionItem 
                          key={question.id || qIdx}
                          question={question}
                          questionNumber={qIdx + 1}
                          isMCQ={section.type === 'MCQ' || question.segmentType === 'MCQ'}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  /* Placeholder structure for Step 2 (when questions are not yet filled) */
                  <div className="space-y-3">
                    {segments.length > 0 ? (
                      segments.map((segment: any, segIdx: number) => (
                        <div key={segIdx} className="space-y-2 border border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/40">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>{segment.label}</span>
                            <span className="text-[11px] font-normal text-slate-500">
                              {segment.questionCount} questions × {segment.marksEach} marks = {segment.questionCount * segment.marksEach} marks
                            </span>
                          </div>

                          {/* Placeholder Question Slots */}
                          <div className="space-y-2 pt-1">
                            {Array.from({ length: Math.min(segment.questionCount, 4) }).map((_, slotIdx) => (
                              <div key={slotIdx} className="text-xs text-slate-600 bg-white/80 border border-slate-200/60 rounded px-2.5 py-1.5 flex items-start gap-2">
                                <span className="font-bold shrink-0">Q{slotIdx + 1}.</span>
                                <div className="flex-1">
                                  <span className="text-slate-400 italic">[{segment.label} Question {slotIdx + 1} - To be entered in Step 3]</span>
                                  {segment.type === 'MCQ' && (
                                    <div className="grid grid-cols-2 gap-2 mt-1.5 text-[11px] text-slate-400">
                                      <span>a) Option A</span>
                                      <span>c) Option C</span>
                                      <span>b) Option B</span>
                                      <span>d) Option D</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {segment.questionCount > 4 && (
                              <p className="text-[10px] text-slate-400 text-center italic">
                                + {segment.questionCount - 4} more question slots
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 italic text-center py-2">
                        No segments added yet in this section.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-12 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
        <span>Page 1</span>
        <span>Syllabus Tracker Exam Generator</span>
      </div>
    </div>
  );
}

function PreviewQuestionItem({
  question,
  questionNumber,
  isMCQ
}: {
  question: any;
  questionNumber: number;
  isMCQ: boolean;
}) {
  const formattedText = useMemo(() => {
    return formatContentWithMath(question.questionText || '');
  }, [question.questionText]);

  const formattedPassage = useMemo(() => {
    return formatContentWithMath(question.passageText || '');
  }, [question.passageText]);

  const formattedAssertion = useMemo(() => {
    return formatContentWithMath(question.assertion || '');
  }, [question.assertion]);

  const formattedReason = useMemo(() => {
    return formatContentWithMath(question.reason || '');
  }, [question.reason]);

  return (
    <div className="text-xs leading-relaxed space-y-1.5 break-inside-avoid">
      {/* Passage Type */}
      {question.segmentType === 'PASSAGE' && (
        <div className="space-y-2">
          <div className="flex items-start gap-1.5">
            <span className="font-bold shrink-0">Q{questionNumber}.</span>
            <div className="italic text-slate-700 bg-slate-50/80 p-2.5 rounded border border-slate-200" dangerouslySetInnerHTML={{ __html: formattedPassage }} />
          </div>
          <p className="text-[11px] font-bold text-slate-600 pl-5">Answer the following questions based on the above passage:</p>
          {question.subQuestions && question.subQuestions.map((sq: any, sIdx: number) => {
            const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
            const sqHtml = formatContentWithMath(sq.text || '');
            return (
              <div key={sIdx} className="pl-6 flex items-start gap-1.5">
                <span className="font-bold">{letters[sIdx]})</span>
                <div dangerouslySetInnerHTML={{ __html: sqHtml }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Assertion Reasoning Type */}
      {question.segmentType === 'ASSERTION_REASONING' && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-1.5">
            <span className="font-bold shrink-0">Q{questionNumber}.</span>
            <div className="space-y-1 flex-1">
              <div>
                <span className="font-bold">Assertion (A): </span>
                <span dangerouslySetInnerHTML={{ __html: formattedAssertion }} />
              </div>
              <div>
                <span className="font-bold">Reason (R): </span>
                <span dangerouslySetInnerHTML={{ __html: formattedReason }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matching Type */}
      {question.segmentType === 'MATCHING' && (
        <div className="space-y-2">
          <div className="flex items-start gap-1.5">
            <span className="font-bold shrink-0">Q{questionNumber}.</span>
            <span>{question.questionText?.trim() || 'Match the following items in Column A with Column B:'}</span>
          </div>
          {question.matchingPairs && question.matchingPairs.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pl-6 pt-1">
              <div>
                <span className="font-bold block pb-1 border-b border-slate-200">Column A</span>
                <div className="space-y-1 pt-1">
                  {question.matchingPairs.map((pair: any, pIdx: number) => (
                    <div key={pIdx} className="flex gap-2">
                      <span className="font-semibold">{String.fromCharCode(65 + pIdx)}.</span>
                      <span>{pair.left || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-bold block pb-1 border-b border-slate-200">Column B</span>
                <div className="space-y-1 pt-1">
                  {question.matchingPairs.map((pair: any, pIdx: number) => (
                    <div key={pIdx} className="flex gap-2">
                      <span className="font-semibold">{pIdx + 1}.</span>
                      <span>{pair.right || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standard Question / MCQ */}
      {question.segmentType !== 'PASSAGE' && question.segmentType !== 'ASSERTION_REASONING' && question.segmentType !== 'MATCHING' && (
        <div className="flex items-start gap-1.5">
          <span className="font-bold shrink-0">Q{questionNumber}.</span>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div 
                  className="leading-normal overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: formattedText || `<span class="text-slate-300 italic">[Empty Question]</span>` }} 
                />

                {/* Topic & Hint badges */}
                {(question.subject || question.hint) && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 italic pt-0.5">
                    {question.subject && <span>[Topic: {question.subject}]</span>}
                    {question.hint && <span>[Hint: {question.hint}]</span>}
                  </div>
                )}

                {/* MCQ Options - rendered immediately below question text without gap */}
                {isMCQ && question.options && question.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-1 text-[11px]">
                    {question.options.map((opt: any, oIdx: number) => {
                      const optText = typeof opt === 'string' ? opt : (opt.text || '');
                      const formattedOpt = formatContentWithMath(optText);
                      return (
                        <div key={oIdx} className="flex items-start gap-1">
                          <span className="font-semibold shrink-0">{String.fromCharCode(97 + oIdx)})</span>
                          <span dangerouslySetInnerHTML={{ __html: formattedOpt }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {question.imageUrl && (
                <img 
                  src={question.imageUrl} 
                  alt="Question Diagram" 
                  className="w-28 max-h-24 object-contain rounded border border-slate-200 bg-white p-1 shrink-0 ml-2" 
                />
              )}
            </div>

            {/* Alternatives (OR choice) */}
            {question.alternatives && question.alternatives.length > 0 && question.alternatives.map((alt: any, aIdx: number) => {
              const altFormatted = formatContentWithMath(alt.questionText || '');
              return (
                <div key={aIdx} className="pt-2 space-y-1 border-t border-slate-100">
                  <span className="font-bold block text-center text-slate-600 text-[11px]">OR</span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="leading-normal overflow-x-auto" dangerouslySetInnerHTML={{ __html: altFormatted }} />

                      {alt.options && alt.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-1 text-[11px]">
                          {alt.options.map((o: any, oIdx: number) => (
                            <div key={oIdx} className="flex items-start gap-1">
                              <span className="font-semibold">{String.fromCharCode(97 + oIdx)})</span>
                              <span dangerouslySetInnerHTML={{ __html: formatContentWithMath(typeof o === 'string' ? o : o.text || '') }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {alt.imageUrl && (
                      <img 
                        src={alt.imageUrl} 
                        alt="Alternative diagram" 
                        className="w-28 max-h-24 object-contain rounded border border-slate-200 bg-white p-1 shrink-0 ml-2" 
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function useGeneratedPdfBlob(
  paperDetails: ExamPaperPreviewDetails,
  sections: any[],
  instructions?: string
) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentBlobRef = useRef<string | null>(null);

  const generate = useCallback(async () => {
    // If no sections or questions, don't attempt to generate PDF
    if (!sections || sections.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const pdfData = {
        schoolName: paperDetails.schoolName || '',
        examName: paperDetails.examName || '',
        className: paperDetails.className || '',
        subjectName: paperDetails.subjectName || '',
        examDate: paperDetails.examDate || '',
        totalMarks: paperDetails.totalMarks || 0,
        duration: paperDetails.duration || 0,
        instructions: instructions || '',
        templateType: (paperDetails.templateType as 'SINGLE' | 'SPLIT') || 'SINGLE',
        styleFontFamily: paperDetails.styleFontFamily || 'Times New Roman',
        styleFontSize: paperDetails.styleFontSize || '11pt',
        styleColor: paperDetails.styleColor || '#000000',
        logoUrl: paperDetails.logoUrl,
        teacherName: paperDetails.teacherName,
        showTeacherName: paperDetails.showTeacherName,
        sections: sections,
      };

      const blob = await generateExamPaperPdf(pdfData as any);
      const url = URL.createObjectURL(blob);
      if (currentBlobRef.current) {
        URL.revokeObjectURL(currentBlobRef.current);
      }
      currentBlobRef.current = url;
      setPdfUrl(url);
    } catch (err: any) {
      console.warn('PDF preview generation error:', err);
      setError(err?.message || 'Could not generate PDF');
    } finally {
      setLoading(false);
    }
  }, [
    paperDetails.schoolName,
    paperDetails.examName,
    paperDetails.className,
    paperDetails.subjectName,
    paperDetails.examDate,
    paperDetails.totalMarks,
    paperDetails.duration,
    paperDetails.templateType,
    paperDetails.styleFontFamily,
    paperDetails.styleFontSize,
    paperDetails.styleColor,
    paperDetails.logoUrl,
    paperDetails.teacherName,
    paperDetails.showTeacherName,
    instructions,
    sections,
  ]);

  useEffect(() => {
    generate();
    return () => {
      if (currentBlobRef.current) {
        URL.revokeObjectURL(currentBlobRef.current);
      }
    };
  }, [generate]);

  return { pdfUrl, loading, error, regenerate: generate };
}

export function ExamPaperPreviewModal({
  isOpen,
  onClose,
  paperDetails,
  sections,
  instructions,
  step = 5,
  onDownloadPdf
}: {
  isOpen: boolean;
  onClose: () => void;
  paperDetails: ExamPaperPreviewDetails;
  sections: any[];
  instructions?: string;
  step?: number;
  onDownloadPdf?: () => void;
}) {
  const { pdfUrl, loading, regenerate } = useGeneratedPdfBlob(paperDetails, sections, instructions);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl h-[94vh] p-0 flex flex-col gap-0 bg-slate-900 border-slate-800 text-white overflow-hidden rounded-2xl [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Live Exam Paper Printable PDF Preview</DialogTitle>
        <DialogDescription className="sr-only">Exact printable PDF document preview matching the exported file</DialogDescription>

        {/* Modal Toolbar */}
        <div className="px-6 py-3 bg-slate-800/90 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">Printable PDF Preview</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  100% Print Match
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {paperDetails.examName || 'Exam Paper'} • {paperDetails.subjectName || ''} • Exactly what will print
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={regenerate}
              disabled={loading}
              className="text-xs text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-1.5"
              title="Refresh PDF"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Refresh
            </Button>

            {onDownloadPdf && (
              <Button
                type="button"
                size="sm"
                onClick={onDownloadPdf}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Viewport with Real PDF */}
        <div className="flex-1 w-full h-full bg-slate-950 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10 text-white">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              <span className="text-xs font-medium text-slate-300">Generating printable PDF document...</span>
            </div>
          )}
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
              className="w-full h-full border-0"
              title="Fullscreen Printable Exam Paper PDF"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Failed to load PDF preview
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExamPaperLivePreview({
  paperDetails,
  sections,
  instructions,
  step = 5,
  onDownloadPdf,
  className = '',
  showCardWrapper = true
}: ExamPaperLivePreviewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'PDF' | 'SHEET'>('PDF');
  const { pdfUrl, loading, error, regenerate } = useGeneratedPdfBlob(paperDetails, sections, instructions);

  return (
    <div className={`space-y-3 ${className}`}>
      {showCardWrapper ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  Paper Preview
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                    {viewMode === 'PDF' ? 'Exact Printable PDF' : 'A4 Sheet View'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  {viewMode === 'PDF' 
                    ? '100% exact multi-page rendering matching the printed PDF output.' 
                    : 'Interactive draft sheet view.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle between Exact PDF and Draft Sheet */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('PDF')}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-colors",
                    viewMode === 'PDF' ? "bg-white text-indigo-700 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Print PDF View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('SHEET')}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-colors",
                    viewMode === 'SHEET' ? "bg-white text-indigo-700 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Sheet View
                </button>
              </div>

              {viewMode === 'PDF' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regenerate}
                  disabled={loading}
                  className="text-xs text-slate-600 hover:text-slate-900 h-8 px-2"
                  title="Refresh PDF"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(true)}
                className="text-xs flex items-center gap-1.5 border-slate-300 hover:bg-slate-50 font-medium"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                Fullscreen
              </Button>

              {onDownloadPdf && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onDownloadPdf}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
              )}
            </div>
          </div>

          {/* View Content */}
          {viewMode === 'PDF' ? (
            <div className="w-full h-[680px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center relative shadow-inner">
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-medium text-slate-600">Generating live printable PDF preview...</span>
                </div>
              )}
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                  className="w-full h-full border-0"
                  title="Exam Paper PDF Preview"
                />
              ) : error ? (
                <div className="text-center p-6 text-slate-500 text-xs">
                  Could not generate PDF preview. <Button variant="link" size="sm" onClick={regenerate}>Retry</Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-auto bg-slate-100/70 p-4 rounded-xl border border-slate-200/80 flex justify-center">
              <div className="scale-[0.85] sm:scale-95 origin-top transition-transform">
                <ExamPaperLivePreviewSheet 
                  paperDetails={paperDetails}
                  sections={sections}
                  instructions={instructions}
                  step={step}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-[680px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium text-slate-600">Generating live printable PDF preview...</span>
            </div>
          )}
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
              className="w-full h-full border-0"
              title="Exam Paper PDF Preview"
            />
          ) : (
            <ExamPaperLivePreviewSheet 
              paperDetails={paperDetails}
              sections={sections}
              instructions={instructions}
              step={step}
            />
          )}
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      <ExamPaperPreviewModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        paperDetails={paperDetails}
        sections={sections}
        instructions={instructions}
        step={step}
        onDownloadPdf={onDownloadPdf}
      />
    </div>
  );
}
