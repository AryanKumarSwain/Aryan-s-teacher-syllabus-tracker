'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextField } from './RichTextField';
import { ImageCropModal } from './ImageCropModal';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import katex from 'katex';
import { MathEquationDialog } from './MathEquationDialog';
import { 
  Type, 
  Palette, 
  Plus, 
  Trash2, 
  AlertCircle, 
  ImageIcon, 
  Sparkles,
  HelpCircle,
  BookOpen,
  Eye,
  Sigma
} from 'lucide-react';

function renderOptionMathPreview(text: string): string | null {
  if (!text) return null;
  const hasDollarMath = /\$([^\$]+)\$/.test(text);
  const hasLatexCommands = /\\[a-zA-Z]+/.test(text);
  if (!hasDollarMath && !hasLatexCommands) return null;

  try {
    let result = text;
    if (hasDollarMath) {
      result = result.replace(/\$([^\$]+)\$/g, (_, eq) => {
        try {
          return katex.renderToString(eq, { throwOnError: false, displayMode: false });
        } catch {
          return eq;
        }
      });
    } else if (hasLatexCommands) {
      try {
        result = katex.renderToString(text, { throwOnError: false, displayMode: false });
      } catch {
        return null;
      }
    }
    return result;
  } catch {
    return null;
  }
}

interface QuestionEditorProps {
  sections: any[];
  onSubmit: (sections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => void;
  onSaveDraft: (sections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => void;
  onBack?: () => void;
  initialStyling?: { fontFamily: string; fontSize: string; color: string };
  onDraftChange?: (sections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => void;
  onOpenPreview?: (currentSections?: any[], currentStyling?: { fontFamily: string; fontSize: string; color: string }) => void;
}

const FONT_OPTIONS = [
  { label: 'Times New Roman (Standard Exam)', value: 'Times New Roman' },
  { label: 'Arial (Clean Sans)', value: 'Arial' },
  { label: 'Calibri (Modern)', value: 'Calibri' },
  { label: 'Cambria (Formal Serif)', value: 'Cambria' },
  { label: 'Georgia (Classic)', value: 'Georgia' },
  { label: 'Verdana (High Legibility)', value: 'Verdana' },
  { label: 'Century Gothic', value: 'Century Gothic' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
];

const FONT_SIZES = (() => {
  const seen = new Set<string>();
  return [
    { label: '9 pt', value: '9pt' },
    { label: '10 pt', value: '10pt' },
    { label: '11 pt (Standard)', value: '11pt' },
    { label: '12 pt', value: '12pt' },
    { label: '13 pt', value: '13pt' },
    { label: '14 pt', value: '14pt' },
    { label: '16 pt', value: '16pt' },
  ].filter(item => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
})();

const COLOR_PRESETS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Slate Gray', hex: '#334155' },
  { name: 'Navy Blue', hex: '#1e3a8a' },
  { name: 'Dark Teal', hex: '#115e59' },
  { name: 'Burgundy', hex: '#881337' },
];

export function QuestionEditor({ 
  sections, 
  onSubmit, 
  onSaveDraft, 
  onBack, 
  initialStyling,
  onDraftChange,
  onOpenPreview
}: QuestionEditorProps) {
  const [draftSections, setDraftSections] = useState(sections);
  const [globalStyle, setGlobalStyle] = useState({
    fontFamily: initialStyling?.fontFamily || 'Times New Roman',
    fontSize: initialStyling?.fontSize || '11pt',
    color: initialStyling?.color || '#000000'
  });
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<{ src: string; sectionIndex: number; questionIndex: number } | null>(null);
  const [optionMathTarget, setOptionMathTarget] = useState<{
    sectionIndex: number;
    questionIndex: number;
    altIndex?: number;
    optionIndex: number;
  } | null>(null);
  const initializedRef = useRef(false);

  const handleInsertOptionMath = (latex: string) => {
    if (!optionMathTarget) return;
    const { sectionIndex, questionIndex, altIndex, optionIndex } = optionMathTarget;
    const mathSnippet = `$${latex}$`;

    if (altIndex !== undefined) {
      const currentText = draftSections[sectionIndex]?.questions[questionIndex]?.alternatives?.[altIndex]?.options?.[optionIndex]?.text || '';
      const newText = currentText ? `${currentText} ${mathSnippet}` : mathSnippet;
      updateAlternativeOption(sectionIndex, questionIndex, altIndex, optionIndex, newText);
    } else {
      const currentText = draftSections[sectionIndex]?.questions[questionIndex]?.options?.[optionIndex]?.text || '';
      const newText = currentText ? `${currentText} ${mathSnippet}` : mathSnippet;
      updateOption(sectionIndex, questionIndex, optionIndex, newText);
    }
    setOptionMathTarget(null);
  };

  const handleQuickInsertOptionMath = (
    sectionIndex: number,
    questionIndex: number,
    altIndex: number | undefined,
    optionIndex: number,
    snippet: string
  ) => {
    if (altIndex !== undefined) {
      const currentText = draftSections[sectionIndex]?.questions[questionIndex]?.alternatives?.[altIndex]?.options?.[optionIndex]?.text || '';
      const newText = currentText ? `${currentText} ${snippet}` : snippet;
      updateAlternativeOption(sectionIndex, questionIndex, altIndex, optionIndex, newText);
    } else {
      const currentText = draftSections[sectionIndex]?.questions[questionIndex]?.options?.[optionIndex]?.text || '';
      const newText = currentText ? `${currentText} ${snippet}` : snippet;
      updateOption(sectionIndex, questionIndex, optionIndex, newText);
    }
  };

  useEffect(() => {
    onDraftChange?.(draftSections, globalStyle);
  }, [draftSections, globalStyle]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!sections || sections.length === 0) return;
    initializedRef.current = true;
    const initializedSections = sections.map(section => {
      if (section.segments && section.segments.length > 0 && (!section.questions || section.questions.length === 0)) {
        const allQuestions = section.segments.flatMap((segment: any, segIndex: number) => {
          // For MATCHING type, create only 1 question with all pairs
          if (segment.type === 'MATCHING') {
            return [{
              id: `${section.label}-${segIndex}-0`,
              questionText: '',
              options: [],
              imageUrl: '',
              segmentType: segment.type,
              segmentLabel: segment.label,
              order: 0,
              matchingPairs: Array.from({ length: segment.questionCount }, () => ({ left: '', right: '' })),
            }];
          }
          // For PASSAGE type, create only 1 question with passage text and sub-questions
          if (segment.type === 'PASSAGE') {
            return [{
              id: `${section.label}-${segIndex}-0`,
              questionText: '',
              options: [],
              imageUrl: '',
              segmentType: segment.type,
              segmentLabel: segment.label,
              order: 0,
              passageText: '',
              subQuestions: Array.from({ length: segment.questionCount }, () => ({ text: '' })),
            }];
          }
          // For other types, create questionCount questions
          return Array.from({ length: segment.questionCount }, (_, qIndex) => ({
            id: `${section.label}-${segIndex}-${qIndex}`,
            questionText: '',
            options: segment.type === 'MCQ' ? Array.from({ length: 4 }, (_, i) => ({ text: '', isCorrect: i === 0 })) : [],
            imageUrl: '',
            segmentType: segment.type,
            segmentLabel: segment.label,
            order: qIndex,
          }));
        });
        return {
          ...section,
          questions: allQuestions,
        };
      }
      // Ensure existing questions have segmentType for MCQ detection and are sorted by order
      if (section.questions) {
        const questionsWithSegmentType = section.questions.map((q: any) => ({
          ...q,
          segmentType: q.segmentType || section.type,
        }));
        // Sort questions by order field to prevent shuffling
        const sortedQuestions = questionsWithSegmentType.sort((a: any, b: any) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          return orderA - orderB;
        });
        return {
          ...section,
          questions: sortedQuestions,
        };
      }
      return section;
    });
    setDraftSections(initializedSections);
  }, [sections]);

  const updateQuestion = (sectionIndex: number, questionIndex: number, patch: any) => {
    const next = [...draftSections];
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((question: any, index: number) => index === questionIndex ? { ...question, ...patch } : question),
    };
    setDraftSections(next);
  };

  const updateAlternative = (sectionIndex: number, questionIndex: number, alternativeIndex: number, patch: any) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    alternatives[alternativeIndex] = { ...alternatives[alternativeIndex], ...patch };
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const addAlternative = (sectionIndex: number, questionIndex: number) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    const baseQuestion = {
      questionText: '',
      options: question.segmentType === 'MCQ' ? Array.from({ length: 4 }, (_, i) => ({ text: '', isCorrect: i === 0 })) : [],
      imageUrl: '',
      segmentType: question.segmentType,
      segmentLabel: question.segmentLabel,
    };
    alternatives.push(baseQuestion);
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const removeAlternative = (sectionIndex: number, questionIndex: number, alternativeIndex: number) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    alternatives.splice(alternativeIndex, 1);
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const updateOption = (sectionIndex: number, questionIndex: number, optionIndex: number, value: string) => {
    const next = [...draftSections];
    const currentOptions = next[sectionIndex].questions[questionIndex].options || [];
    const updatedOptions = [...currentOptions];
    if (optionIndex < updatedOptions.length) {
      updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], text: value };
    } else {
      updatedOptions.push({ text: value, isCorrect: optionIndex === 0 });
    }
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((question: any, index: number) => index === questionIndex ? { ...question, options: updatedOptions } : question),
    };
    setDraftSections(next);
  };

  const setCorrectOption = (sectionIndex: number, questionIndex: number, optionIndex: number) => {
    const next = [...draftSections];
    const currentOptions = next[sectionIndex].questions[questionIndex].options || [];
    const updatedOptions = currentOptions.map((opt: any, idx: number) => ({
      ...opt,
      isCorrect: idx === optionIndex,
    }));
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((question: any, index: number) => index === questionIndex ? { ...question, options: updatedOptions } : question),
    };
    setDraftSections(next);
  };

  const updateAlternativeOption = (sectionIndex: number, questionIndex: number, alternativeIndex: number, optionIndex: number, value: string) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    const currentOptions = alternatives[alternativeIndex].options || [];
    const updatedOptions = [...currentOptions];
    if (optionIndex < updatedOptions.length) {
      updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], text: value };
    } else {
      updatedOptions.push({ text: value, isCorrect: optionIndex === 0 });
    }
    alternatives[alternativeIndex] = { ...alternatives[alternativeIndex], options: updatedOptions };
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const setAlternativeCorrectOption = (sectionIndex: number, questionIndex: number, alternativeIndex: number, optionIndex: number) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    const currentOptions = alternatives[alternativeIndex].options || [];
    const updatedOptions = currentOptions.map((opt: any, idx: number) => ({
      ...opt,
      isCorrect: idx === optionIndex,
    }));
    alternatives[alternativeIndex] = { ...alternatives[alternativeIndex], options: updatedOptions };
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const updateMatchingPair = (sectionIndex: number, questionIndex: number, pairIndex: number, side: 'left' | 'right', value: string) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const matchingPairs = question.matchingPairs || Array.from({ length: 5 }, () => ({ left: '', right: '' }));
    matchingPairs[pairIndex] = { ...matchingPairs[pairIndex], [side]: value };
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, matchingPairs } : q
      ),
    };
    setDraftSections(next);
  };

  const updateSubQuestion = (sectionIndex: number, questionIndex: number, subQuestionIndex: number, value: string) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const subQuestions = question.subQuestions || [];
    subQuestions[subQuestionIndex] = { ...subQuestions[subQuestionIndex], text: value };
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, subQuestions } : q
      ),
    };
    setDraftSections(next);
  };

  const handleImageUpload = async (sectionIndex: number, questionIndex: number, file: File) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentImage({
          src: reader.result as string,
          sectionIndex,
          questionIndex
        });
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to read image:', error);
      alert('Failed to read image. Please try again.');
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!currentImage) return;
    
    try {
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('image', file);
      
      const uploadResponse = await api.postFormData<{ imageUrl: string }>('/exam-papers/upload-question-image', formData);
      updateQuestion(currentImage.sectionIndex, currentImage.questionIndex, { imageUrl: uploadResponse.imageUrl });
    } catch (error) {
      console.error('Failed to upload cropped image:', error);
      alert('Failed to upload cropped image. Please try again.');
    }
  };

  const handleSaveDraft = () => {
    onSaveDraft(draftSections, globalStyle);
  };

  const validateSections = () => {
    for (let sectionIndex = 0; sectionIndex < draftSections.length; sectionIndex++) {
      const section = draftSections[sectionIndex];
      if (!section.questions) continue;
      
      for (let questionIndex = 0; questionIndex < section.questions.length; questionIndex++) {
        const question = section.questions[questionIndex];
        const alternatives = question.alternatives || [];
        
        // Skip validation for MATCHING questions - they have matching pairs instead of question text
        if (question.segmentType === 'MATCHING') {
          continue;
        }
        
        // Skip validation for PASSAGE questions - they have passage text and sub-questions
        if (question.segmentType === 'PASSAGE') {
          if (!question.passageText || question.passageText.trim() === '') {
            return false;
          }
          const subQuestions = question.subQuestions || [];
          if (subQuestions.length === 0 || subQuestions.some((sq: any) => !sq.text || sq.text.trim() === '')) {
            return false;
          }
          continue;
        }
        
        // Skip validation for ASSERTION_REASONING questions - they have assertion and reason
        if (question.segmentType === 'ASSERTION_REASONING') {
          if (!question.assertion || question.assertion.trim() === '' || !question.reason || question.reason.trim() === '') {
            return false;
          }
          continue;
        }
        
        // Check if at least one alternative (main question or any alternative) has text
        const hasValidAlternative = question.questionText?.trim() !== '' || 
          alternatives.some((alt: any) => alt.questionText?.trim() !== '');
        
        if (!hasValidAlternative) {
          return false;
        }
        
        // Check MCQ options for main question if it has text
        if (question.questionText?.trim() !== '' && question.segmentType === 'MCQ') {
          const options = question.options || [];
          if (options.length < 4 || options.some((opt: any) => !opt.text || opt.text.trim() === '')) {
            return false;
          }
        }
        
        // Check MCQ options for alternatives that have text
        for (const alt of alternatives) {
          if (alt.questionText?.trim() !== '' && alt.segmentType === 'MCQ') {
            const altOptions = alt.options || [];
            if (altOptions.length < 4 || altOptions.some((opt: any) => !opt.text || opt.text.trim() === '')) {
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = () => {
    setHasAttemptedSubmit(true);
    if (!validateSections()) {
      alert('Please fill in all mandatory fields (question text and MCQ options). Image URL is optional.');
      return;
    }
    onSubmit(draftSections, globalStyle);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      {/* Sleek Global Toolbar for Exam Typography & Styling */}
      <div className="rounded-xl border border-slate-200/90 bg-linear-to-r from-slate-50 via-sky-50/20 to-indigo-50/20 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Type className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Exam Typography & Styling</h4>
              <p className="text-xs text-slate-500">Applies globally across all question text, equations, and options</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Font Family Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Font:</span>
              <select 
                value={globalStyle.fontFamily}
                onChange={(e) => setGlobalStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
                className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer"
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Font Size Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Size:</span>
              <select 
                value={globalStyle.fontSize}
                onChange={(e) => setGlobalStyle(prev => ({ ...prev, fontSize: e.target.value }))}
                className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer"
              >
                {FONT_SIZES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Color Selector */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Palette className="h-3.5 w-3.5 text-slate-500" />
              <div className="flex items-center gap-1">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setGlobalStyle(prev => ({ ...prev, color: c.hex }))}
                    className={cn(
                      "h-4 w-4 rounded-full border transition-transform",
                      globalStyle.color.toLowerCase() === c.hex.toLowerCase() 
                        ? 'scale-125 ring-2 ring-blue-500 ring-offset-1 border-white' 
                        : 'border-slate-300 hover:scale-110'
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <input 
                type="color" 
                title="Custom color"
                value={globalStyle.color}
                onChange={(e) => setGlobalStyle(prev => ({ ...prev, color: e.target.value }))}
                className="h-5 w-5 cursor-pointer border-0 p-0 bg-transparent rounded"
              />
            </div>
          </div>
        </div>

        {/* Live Typography Preview Pill & Paper Preview Button */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Live Preview:</span>
            <span 
              className="rounded bg-white/90 px-3 py-1 border border-slate-200/80 shadow-2xs"
              style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
            >
              Sample: If 2x + 5 = 15, then x = ? &nbsp;•&nbsp; (A) 5 &nbsp; (B) 10
            </span>
          </div>

          {onOpenPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenPreview(draftSections, globalStyle)}
              className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 text-xs flex items-center gap-1.5 font-semibold"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              Preview Full Paper
            </Button>
          )}
        </div>
      </div>

      {/* Sections and Questions */}
      <div>
        {draftSections.map((section, sectionIndex) => (
          <div key={`${section.label}-${sectionIndex}`} className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 mb-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">{section.label}</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
                {section.questions.length} questions
              </span>
            </div>

            {section.questions.map((question: any, questionIndex: number) => {
              const alternatives = question.alternatives || [];
              const hasAlternatives = alternatives.length > 0;
              
              return (
                <div 
                  key={question.id || `${sectionIndex}-${questionIndex}`} 
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-colors hover:border-slate-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-bold text-slate-900">
                        Question {question.order !== undefined ? question.order + 1 : questionIndex + 1}
                      </Label>
                      {question.segmentLabel && (
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md font-semibold">
                          {question.segmentLabel}
                        </span>
                      )}
                      {hasAlternatives && (
                        <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-md font-semibold">
                          Internal Choice ({alternatives.length + 1} options)
                        </span>
                      )}
                    </div>
                    {question.segmentType !== 'MATCHING' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addAlternative(sectionIndex, questionIndex)}
                        className="text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50 h-8 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Alternative (OR)
                      </Button>
                    )}
                  </div>

                  {/* Question Content based on Type */}
                  {question.segmentType === 'MATCHING' ? (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold mb-2 block text-slate-700">Column A</Label>
                          <div className="space-y-2">
                            {(question.matchingPairs || []).map((pair: any, pairIndex: number) => (
                              <Input
                                key={`left-${pairIndex}`}
                                placeholder={`Item ${pairIndex + 1}`}
                                value={pair.left || ''}
                                onChange={(e) => updateMatchingPair(sectionIndex, questionIndex, pairIndex, 'left', e.target.value)}
                                style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold mb-2 block text-slate-700">Column B</Label>
                          <div className="space-y-2">
                            {(question.matchingPairs || []).map((pair: any, pairIndex: number) => (
                              <Input
                                key={`right-${pairIndex}`}
                                placeholder={`Match ${pairIndex + 1}`}
                                value={pair.right || ''}
                                onChange={(e) => updateMatchingPair(sectionIndex, questionIndex, pairIndex, 'right', e.target.value)}
                                style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : question.segmentType === 'PASSAGE' ? (
                    <div className="mt-3 space-y-4">
                      <div>
                        <Label className="text-xs font-semibold mb-2 block text-slate-700">Passage Text</Label>
                        <RichTextField 
                          value={question.passageText || ''} 
                          onChange={(value) => updateQuestion(sectionIndex, questionIndex, { passageText: value })} 
                          fontFamily={globalStyle.fontFamily}
                          fontSize={globalStyle.fontSize}
                          color={globalStyle.color}
                          required
                        />
                        {hasAttemptedSubmit && (!question.passageText || question.passageText.trim() === '') && (
                          <p className="text-xs font-medium text-rose-500 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Passage text is required</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-2 block text-slate-700">Questions based on passage</Label>
                        <div className="space-y-2.5">
                          {(question.subQuestions || []).map((subQ: any, subQIndex: number) => (
                            <div key={subQIndex} className="flex items-start gap-2">
                              <span className="text-xs font-bold mt-2 text-slate-500 shrink-0">
                                {subQIndex + 1}.
                              </span>
                              <div className="flex-1">
                                <RichTextField 
                                  value={subQ.text || ''} 
                                  onChange={(value) => updateSubQuestion(sectionIndex, questionIndex, subQIndex, value)} 
                                  fontFamily={globalStyle.fontFamily}
                                  fontSize={globalStyle.fontSize}
                                  color={globalStyle.color}
                                  required
                                />
                                {hasAttemptedSubmit && (!subQ.text || subQ.text.trim() === '') && (
                                  <p className="text-xs font-medium text-rose-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Sub-question {subQIndex + 1} text is required</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : question.segmentType === 'ASSERTION_REASONING' ? (
                    <div className="mt-3 space-y-4">
                      <div>
                        <Label className="text-xs font-semibold mb-2 block text-slate-700">Assertion</Label>
                        <RichTextField 
                          value={question.assertion || ''} 
                          onChange={(value) => updateQuestion(sectionIndex, questionIndex, { assertion: value })} 
                          fontFamily={globalStyle.fontFamily}
                          fontSize={globalStyle.fontSize}
                          color={globalStyle.color}
                          required
                        />
                        {hasAttemptedSubmit && (!question.assertion || question.assertion.trim() === '') && (
                          <p className="text-xs font-medium text-rose-500 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Assertion statement is required</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-2 block text-slate-700">Reason</Label>
                        <RichTextField 
                          value={question.reason || ''} 
                          onChange={(value) => updateQuestion(sectionIndex, questionIndex, { reason: value })} 
                          fontFamily={globalStyle.fontFamily}
                          fontSize={globalStyle.fontSize}
                          color={globalStyle.color}
                          required
                        />
                        {hasAttemptedSubmit && (!question.reason || question.reason.trim() === '') && (
                          <p className="text-xs font-medium text-rose-500 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Reason statement is required</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2">
                        <RichTextField 
                          value={question.questionText || ''} 
                          onChange={(value) => updateQuestion(sectionIndex, questionIndex, { questionText: value })} 
                          fontFamily={globalStyle.fontFamily}
                          fontSize={globalStyle.fontSize}
                          color={globalStyle.color}
                          required
                        />
                        {hasAttemptedSubmit && (!question.questionText || question.questionText.trim() === '') && !hasAlternatives && (
                          <p className="text-xs font-medium text-rose-500 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Question text is required</span>
                          </p>
                        )}
                      </div>

                      {/* Styled MCQ Options with Badges, Math formula features, and Correct Selection */}
                      {question.segmentType === 'MCQ' ? (
                        <div className="mt-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                              <span>Multiple Choice Options:</span>
                              <span className="text-[11px] font-normal text-slate-400">(Supports text & LaTeX math formulas)</span>
                            </span>
                            <span className="text-[11px] text-slate-400">Click a badge (A/B/C/D) to select the correct answer</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {Array.from({ length: 4 }).map((_, optionIndex) => {
                              const option = question.options?.[optionIndex] || { text: '', isCorrect: optionIndex === 0 };
                              const optionLabel = ['A', 'B', 'C', 'D'][optionIndex];
                              const isCorrect = option.isCorrect ?? (optionIndex === 0);
                              const mathPreviewHtml = renderOptionMathPreview(option.text || '');

                              return (
                                <div 
                                  key={optionIndex}
                                  className={cn(
                                    "flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all",
                                    isCorrect 
                                      ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/30" 
                                      : "bg-white border-slate-200 hover:border-slate-300"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setCorrectOption(sectionIndex, questionIndex, optionIndex)}
                                      title={isCorrect ? "Correct answer" : "Click to mark as correct answer"}
                                      className={cn(
                                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all",
                                        isCorrect 
                                          ? "bg-emerald-600 text-white shadow-2xs" 
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      )}
                                    >
                                      {optionLabel}
                                    </button>

                                    <Input 
                                      placeholder={`Option ${optionLabel} text or formula...`} 
                                      value={option.text || ''}
                                      onChange={(e) => updateOption(sectionIndex, questionIndex, optionIndex, e.target.value)} 
                                      style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                                      className="border-0 shadow-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 text-sm flex-1 min-w-0"
                                    />

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOptionMathTarget({ sectionIndex, questionIndex, optionIndex })}
                                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 flex items-center gap-1 border-blue-200 rounded-lg shadow-2xs"
                                        title={`Insert Math formula / LaTeX into Option ${optionLabel}`}
                                      >
                                        <Sigma className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="font-semibold text-[11px]">Math</span>
                                      </Button>

                                      {isCorrect && (
                                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                          Correct
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick math symbol shortcuts + Live Math Formula Preview */}
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100/90 text-[11px]">
                                    <div className="flex items-center gap-1 text-slate-500">
                                      <span className="text-[10px] text-slate-400 font-medium mr-0.5">Quick:</span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, undefined, optionIndex, '$\\frac{a}{b}$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Fraction a/b"
                                      >
                                        a/b
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, undefined, optionIndex, '$\\sqrt{x}$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Square Root √x"
                                      >
                                        √x
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, undefined, optionIndex, '$x^{2}$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Square x²"
                                      >
                                        x²
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, undefined, optionIndex, '$x_{1}$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Subscript x₁"
                                      >
                                        x₁
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, undefined, optionIndex, '$\\pm$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Plus/Minus ±"
                                      >
                                        ±
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, undefined, optionIndex, '$\\pi$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Pi π"
                                      >
                                        π
                                      </button>
                                    </div>

                                    {mathPreviewHtml && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50/70 border border-blue-200/60 rounded text-slate-800 ml-auto overflow-x-auto max-w-full">
                                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider shrink-0">Preview:</span>
                                        <span dangerouslySetInnerHTML={{ __html: mathPreviewHtml }} className="text-xs" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {hasAttemptedSubmit && question.questionText?.trim() !== '' && (question.options || []).some((opt: any) => !opt?.text || opt.text.trim() === '') && (
                            <p className="text-xs font-medium text-rose-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>All 4 MCQ options must be filled</span>
                            </p>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}

                  {question.segmentType !== 'MATCHING' && (
                    <>
                      {/* Image Upload Area */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <Label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                          <span>Question Image (optional)</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(sectionIndex, questionIndex, file);
                              }
                            }}
                            className="flex-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <span className="text-xs text-slate-400 self-center">or</span>
                          <Input 
                            value={question.imageUrl || ''} 
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, { imageUrl: e.target.value })} 
                            placeholder="https://example.com/diagram.png"
                            className="flex-1 text-xs"
                          />
                        </div>
                        {question.imageUrl && (
                          <div className="mt-2.5">
                            <img 
                              src={question.imageUrl} 
                              alt="Question preview" 
                              className="max-w-full h-auto max-h-36 rounded-lg border border-slate-200 shadow-2xs"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Subject and Hint Optional Fields */}
                      <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold text-slate-700 mb-1 block">Subject / Topic (optional)</Label>
                          <Input 
                            value={question.subject || ''} 
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, { subject: e.target.value })} 
                            placeholder="e.g. Linear Equations, Geometry"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-700 mb-1 block">Hint / Marking Scheme (optional)</Label>
                          <Input 
                            value={question.hint || ''} 
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, { hint: e.target.value })} 
                            placeholder="e.g. Step marks for correct formula"
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Alternative Questions (OR choices) */}
                  {alternatives.map((alt: any, altIndex: number) => (
                    <div key={altIndex} className="mt-5 pt-4 border-t-2 border-dashed border-purple-200 bg-purple-50/20 rounded-lg p-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">OR</span>
                          <span className="text-xs font-semibold text-slate-600">Alternative Choice {altIndex + 1}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAlternative(sectionIndex, questionIndex, altIndex)}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                      
                      <div className="mt-2">
                        <RichTextField 
                          value={alt.questionText || ''} 
                          onChange={(value) => updateAlternative(sectionIndex, questionIndex, altIndex, { questionText: value })} 
                          fontFamily={globalStyle.fontFamily}
                          fontSize={globalStyle.fontSize}
                          color={globalStyle.color}
                          required
                        />
                        {hasAttemptedSubmit && (!alt.questionText || alt.questionText.trim() === '') && (
                          <p className="text-xs font-medium text-rose-500 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Alternative question text is required</span>
                          </p>
                        )}
                      </div>

                      {/* Alternative MCQ Options with Math formula features */}
                      {alt.segmentType === 'MCQ' ? (
                        <div className="mt-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                              <span>Alternative Multiple Choice Options:</span>
                              <span className="text-[11px] font-normal text-slate-400">(Supports text & LaTeX math formulas)</span>
                            </span>
                            <span className="text-[11px] text-slate-400">Click a badge to select correct answer</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {Array.from({ length: 4 }).map((_, optionIndex) => {
                              const option = alt.options?.[optionIndex] || { text: '', isCorrect: optionIndex === 0 };
                              const optionLabel = ['A', 'B', 'C', 'D'][optionIndex];
                              const isCorrect = option.isCorrect ?? (optionIndex === 0);
                              const mathPreviewHtml = renderOptionMathPreview(option.text || '');

                              return (
                                <div 
                                  key={optionIndex}
                                  className={cn(
                                    "flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all",
                                    isCorrect 
                                      ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/30" 
                                      : "bg-white border-slate-200 hover:border-slate-300"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setAlternativeCorrectOption(sectionIndex, questionIndex, altIndex, optionIndex)}
                                      title={isCorrect ? "Correct answer" : "Click to mark as correct answer"}
                                      className={cn(
                                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all",
                                        isCorrect 
                                          ? "bg-emerald-600 text-white shadow-2xs" 
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      )}
                                    >
                                      {optionLabel}
                                    </button>

                                    <Input 
                                      placeholder={`Option ${optionLabel} text or formula...`} 
                                      value={option.text || ''}
                                      onChange={(e) => updateAlternativeOption(sectionIndex, questionIndex, altIndex, optionIndex, e.target.value)} 
                                      style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                                      className="border-0 shadow-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 text-sm flex-1 min-w-0"
                                    />

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOptionMathTarget({ sectionIndex, questionIndex, altIndex, optionIndex })}
                                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 flex items-center gap-1 border-blue-200 rounded-lg shadow-2xs"
                                        title={`Insert Math formula / LaTeX into Alternative Option ${optionLabel}`}
                                      >
                                        <Sigma className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="font-semibold text-[11px]">Math</span>
                                      </Button>

                                      {isCorrect && (
                                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                          Correct
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick math symbol shortcuts + Live Math Formula Preview */}
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100/90 text-[11px]">
                                    <div className="flex items-center gap-1 text-slate-500">
                                      <span className="text-[10px] text-slate-400 font-medium mr-0.5">Quick:</span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, altIndex, optionIndex, '$\\frac{a}{b}$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Fraction a/b"
                                      >
                                        a/b
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, altIndex, optionIndex, '$\\sqrt{x}$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Square Root √x"
                                      >
                                        √x
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, altIndex, optionIndex, '$x^{2}$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Square x²"
                                      >
                                        x²
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, altIndex, optionIndex, '$x_{1}$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Subscript x₁"
                                      >
                                        x₁
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, altIndex, optionIndex, '$\\pm$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Plus/Minus ±"
                                      >
                                        ±
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickInsertOptionMath(sectionIndex, questionIndex, altIndex, optionIndex, '$\\pi$')}
                                        className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-mono text-[10px] border border-slate-200 transition-colors"
                                        title="Pi π"
                                      >
                                        π
                                      </button>
                                    </div>

                                    {mathPreviewHtml && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50/70 border border-blue-200/60 rounded text-slate-800 ml-auto overflow-x-auto max-w-full">
                                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider shrink-0">Preview:</span>
                                        <span dangerouslySetInnerHTML={{ __html: mathPreviewHtml }} className="text-xs" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {hasAttemptedSubmit && alt.questionText?.trim() !== '' && (alt.options || []).some((opt: any) => !opt?.text || opt.text.trim() === '') && (
                            <p className="text-xs font-medium text-rose-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>All 4 alternative MCQ options must be filled</span>
                            </p>
                          )}
                        </div>
                      ) : null}

                      {/* Alternative Image */}
                      <div className="mt-3.5">
                        <Label className="text-xs font-semibold text-slate-700 mb-1 block">Image (optional)</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(sectionIndex, questionIndex, file);
                              }
                            }}
                            className="flex-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <span className="text-xs text-slate-400 self-center">or</span>
                          <Input 
                            value={alt.imageUrl || ''} 
                            onChange={(e) => updateAlternative(sectionIndex, questionIndex, altIndex, { imageUrl: e.target.value })} 
                            placeholder="https://example.com/diagram.png"
                            className="flex-1 text-xs"
                          />
                        </div>
                        {alt.imageUrl && (
                          <div className="mt-2">
                            <img 
                              src={alt.imageUrl} 
                              alt="Alternative question preview" 
                              className="max-w-full h-auto max-h-32 rounded border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Alternative Subject & Hint */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold text-slate-700 mb-1 block">Subject / Topic (optional)</Label>
                          <Input 
                            value={alt.subject || ''} 
                            onChange={(e) => updateAlternative(sectionIndex, questionIndex, altIndex, { subject: e.target.value })} 
                            placeholder="e.g. Algebra, Calculus"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-700 mb-1 block">Hint / Marking Scheme (optional)</Label>
                          <Input 
                            value={alt.hint || ''} 
                            onChange={(e) => updateAlternative(sectionIndex, questionIndex, altIndex, { hint: e.target.value })} 
                            placeholder="e.g. Step marks for formula"
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Bottom Step Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <div>
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack} className="text-slate-600">
              ← Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={handleSaveDraft} className="border-slate-300 text-slate-700">
            Save as Draft
          </Button>
          <Button type="button" onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5">
            Proceed to Instructions →
          </Button>
        </div>
      </div>

      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        imageSrc={currentImage?.src || ''}
      />

      <MathEquationDialog
        open={Boolean(optionMathTarget)}
        onOpenChange={(open) => {
          if (!open) setOptionMathTarget(null);
        }}
        onInsert={handleInsertOptionMath}
      />
    </div>
  );
}