'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, ScrollText, ArrowRight, ArrowLeft, RotateCcw, CheckCircle2, Sparkles, AlertCircle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface InstructionsFormProps {
  onSubmit: (instructions: string) => void;
  onBack?: () => void;
  initialValue?: string;
  sections?: any[];
  onInstructionsChange?: (instructions: string) => void;
  onOpenPreview?: (currentInstructions?: string) => void;
}

const COMMON_INSTRUCTION_PRESETS = [
  'All questions are compulsory.',
  'Read the questions carefully before attempting.',
  'The question paper comprises sections as specified.',
  'Use of calculators and electronic gadgets is strictly prohibited.',
  'Draw neat and clearly labelled diagrams wherever necessary.',
  'Write answers in clear, legible handwriting.',
  'Check that the question paper contains all printed pages before writing.',
];

export function InstructionsForm({ 
  onSubmit, 
  onBack, 
  initialValue = '', 
  sections = [],
  onInstructionsChange,
  onOpenPreview
}: InstructionsFormProps) {
  const [instructions, setInstructions] = useState(initialValue);
  const initializedRef = useRef(false);

  useEffect(() => {
    onInstructionsChange?.(instructions);
  }, [instructions, onInstructionsChange]);

  const generateDefaultInstructions = () => {
    const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const sectionNames = sections.slice(0, 8).map((_, i) => sectionLetters[i]).join(', ');
    
    const totalQuestions = sections.reduce((sum, section) => {
      const qCount = section.questions?.length || 
        section.segments?.reduce((sSum: number, seg: any) => sSum + (seg.questionCount || 0), 0) || 0;
      return sum + qCount;
    }, 0);

    return `1) Read all questions carefully before answering.\n2) The question paper consists of ${totalQuestions} questions divided into ${sections.length} ${sections.length === 1 ? 'Section' : 'Sections'}: ${sectionNames || 'A'}.\n3) All questions are compulsory unless stated otherwise.\n4) Draw neat and clean diagrams wherever necessary.\n5) Use of calculators or electronic devices is not permitted.`;
  };

  useEffect(() => {
    if (!initializedRef.current && !initialValue && sections.length > 0) {
      initializedRef.current = true;
      setInstructions(generateDefaultInstructions());
    }
  }, [initialValue, sections]);

  const handleInsertPreset = (presetText: string) => {
    const trimmed = instructions.trim();
    if (!trimmed) {
      setInstructions(`1) ${presetText}`);
      return;
    }
    const lines = trimmed.split('\n');
    const nextIndex = lines.length + 1;
    setInstructions(`${trimmed}\n${nextIndex}) ${presetText}`);
  };

  const handleResetToDefault = () => {
    setInstructions(generateDefaultInstructions());
  };

  const handleSubmit = () => {
    onSubmit(instructions);
  };

  const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/50">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exam Guidelines & Instructions</h3>
              <p className="text-xs text-slate-500">Provide examination rules, timing notes, and instructions to students</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              className="rounded-xl text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <RotateCcw className="h-3 w-3 mr-1 text-slate-400" />
              Reset to Default
            </Button>

            {onOpenPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenPreview(instructions)}
                className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs flex items-center gap-1.5 font-semibold rounded-xl"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                Live Preview
              </Button>
            )}
          </div>
        </div>

        {/* 2. Structured Section Overview Card */}
        {sections.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                Configured Section Scheme
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section, index) => {
                const totalMarks = section.segments 
                  ? section.segments.reduce((sum: number, s: any) => sum + ((s.questionCount || 0) * (s.marksEach || 0)), 0)
                  : (section.marksEach || 0) * (section.questions?.length || 0);
                const qCount = section.segments
                  ? section.segments.reduce((sum: number, s: any) => sum + (s.questionCount || 0), 0)
                  : section.questions?.length || 0;

                return (
                  <div 
                    key={index} 
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Section {sectionLetters[index] || index + 1}
                      </span>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {totalMarks} Marks
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate font-medium">
                      {section.label}
                    </p>
                    <div className="text-[11px] text-slate-400">
                      {qCount} Questions configured
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Quick Insertion Chips */}
        <div className="mt-5 space-y-2">
          <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Quick Add Standard Rules (Click to insert):
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_INSTRUCTION_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertPreset(preset)}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 font-medium transition-all shadow-2xs"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Textarea Editor */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-700">
              Exam Instructions Text
            </Label>
            <span className="text-[11px] text-slate-400">
              {instructions.split('\n').filter(Boolean).length} bullet points
            </span>
          </div>

          <Textarea
            value={instructions}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)}
            placeholder="Type instructions here..."
            rows={7}
            className="rounded-xl border border-slate-200 bg-white font-mono text-xs leading-relaxed focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="text-[11px] text-slate-400">
            Tip: These instructions will be printed right below the school header on the first page of the exam paper.
          </p>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        {onBack ? (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack}
            className="rounded-xl flex items-center gap-1.5 font-semibold text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Question Builder</span>
          </Button>
        ) : <div />}

        <Button 
          type="button" 
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all hover:shadow"
        >
          <span>Save & Proceed to Review</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}