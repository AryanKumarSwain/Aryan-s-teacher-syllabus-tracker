'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextField } from './RichTextField';

interface QuestionEditorProps {
  sections: any[];
  onSubmit: (sections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => void;
  onSaveDraft: (sections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => void;
  onBack?: () => void;
  initialStyling?: { fontFamily: string; fontSize: string; color: string };
}

export function QuestionEditor({ sections, onSubmit, onSaveDraft, onBack, initialStyling }: QuestionEditorProps) {
  const [draftSections, setDraftSections] = useState(sections);
  const [globalStyle, setGlobalStyle] = useState(initialStyling || {
    fontFamily: 'Times New Roman',
    fontSize: '11pt',
    color: '#000000'
  });

  useEffect(() => {
    // Initialize questions from segments if they don't exist
    const initializedSections = sections.map(section => {
      if (section.segments && section.segments.length > 0 && (!section.questions || section.questions.length === 0)) {
        const allQuestions = section.segments.flatMap((segment: any, segIndex: number) => 
          Array.from({ length: segment.questionCount }, (_, qIndex) => ({
            id: `${section.label}-${segIndex}-${qIndex}`,
            questionText: '',
            options: segment.type === 'MCQ' ? Array.from({ length: 4 }, (_, i) => ({ text: '', isCorrect: i === 0 })) : [],
            imageUrl: '',
            segmentType: segment.type,
            segmentLabel: segment.label,
          }))
        );
        return {
          ...section,
          questions: allQuestions,
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

  const handleSaveDraft = () => {
    onSaveDraft(draftSections, globalStyle);
  };
  const handleSubmit = () => {
    onSubmit(draftSections, globalStyle);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Global Toolbar for text styling */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl items-center">
        <span className="text-sm font-semibold text-gray-700">Apply to All Questions:</span>
        <div className="flex gap-2 items-center">
          <Label className="text-xs">Font:</Label>
          <select 
            className="border border-gray-300 rounded p-1 text-sm bg-white"
            value={globalStyle.fontFamily}
            onChange={(e) => setGlobalStyle({...globalStyle, fontFamily: e.target.value})}
          >
            <optgroup label="Theme Fonts">
              <option value="Calibri Light">Calibri Light</option>
              <option value="Calibri">Calibri</option>
            </optgroup>
            <optgroup label="Recently Used">
              <option value="Times New Roman">Times New Roman</option>
              <option value="Cambria">Cambria</option>
            </optgroup>
            <optgroup label="All Fonts">
              <option value="Agency FB">Agency FB</option>
              <option value="Arial">Arial</option>
              <option value="Arial Black">Arial Black</option>
              <option value="Bahnschrift">Bahnschrift</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </optgroup>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs">Size:</Label>
          <select 
            className="border border-gray-300 rounded p-1 text-sm bg-white w-16"
            value={globalStyle.fontSize}
            onChange={(e) => setGlobalStyle({...globalStyle, fontSize: e.target.value})}
          >
            <option value="10pt">10</option>
            <option value="11pt">11</option>
            <option value="12pt">12</option>
            <option value="14pt">14</option>
            <option value="16pt">16</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs">Color:</Label>
          <input 
            type="color" 
            value={globalStyle.color}
            onChange={(e) => setGlobalStyle({...globalStyle, color: e.target.value})}
            className="h-8 w-8 cursor-pointer border-0 p-0 bg-transparent rounded"
          />
        </div>
      </div>

      <div style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}>
        {draftSections.map((section, sectionIndex) => (
          <div key={`${section.label}-${sectionIndex}`} className="space-y-3 rounded-xl border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800" style={{ fontFamily: 'sans-serif' }}>{section.label}</h3>
              <span className="text-sm text-gray-500" style={{ fontFamily: 'sans-serif' }}>{section.questions.length} questions</span>
            </div>
            {section.questions.map((question: any, questionIndex: number) => (
              <div key={`${sectionIndex}-${questionIndex}`} className="rounded-lg border border-gray-100 p-4">
                <Label style={{ fontFamily: 'sans-serif' }}>Question {questionIndex + 1}</Label>
                <div className="mt-2" style={{ color: globalStyle.color }}>
                  <RichTextField 
                    value={question.questionText || ''} 
                    onChange={(value) => updateQuestion(sectionIndex, questionIndex, { questionText: value })} 
                  />
                </div>
                {question.segmentType === 'MCQ' ? (
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 4 }).map((_, optionIndex) => (
                      <Input 
                        key={optionIndex} 
                        placeholder={`Option ${optionIndex + 1}`} 
                        value={question.options?.[optionIndex]?.text || ''}
                        onChange={(e) => updateOption(sectionIndex, questionIndex, optionIndex, e.target.value)} 
                        style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="mt-3">
                  <Label style={{ fontFamily: 'sans-serif' }}>Image URL (optional)</Label>
                  <Input 
                    value={question.imageUrl || ''} 
                    onChange={(e) => updateQuestion(sectionIndex, questionIndex, { imageUrl: e.target.value })} 
                    style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="flex gap-3 mt-6">
        {onBack && <Button type="button" variant="outline" onClick={onBack}>Back</Button>}
        <Button type="button" variant="outline" onClick={handleSaveDraft}>Save as Draft</Button>
        <Button type="button" onClick={handleSubmit}>Submit Paper</Button>
      </div>
    </div>
  );
}