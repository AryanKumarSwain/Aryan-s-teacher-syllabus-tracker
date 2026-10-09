'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Eye, 
  Layers, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  FileText,
  AlignLeft,
  Shuffle,
  ToggleLeft,
  BookOpen,
  Sparkles,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchingPair {
  left: string;
  right: string;
}

interface Segment {
  type: string;
  label: string;
  questionCount: number;
  marksEach: number;
  customLabel?: string;
  matchingPairs?: MatchingPair[];
}

interface Section {
  label: string;
  segments: Segment[];
}

interface SectionSegmentFormProps {
  onSubmit: (sections: any[]) => void;
  onBack: () => void;
  targetTotalMarks: number;
  initialSections?: any[];
  onSectionsChange?: (sections: any[]) => void;
  onOpenPreview?: (currentSections?: any[]) => void;
}

const SEGMENT_TYPES = [
  { value: 'MCQ', label: 'Multiple Choice (MCQ)', icon: HelpCircle, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'FILL_BLANKS', label: 'Fill in the Blanks', icon: AlignLeft, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { value: 'TRUE_FALSE', label: 'True / False', icon: ToggleLeft, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'SHORT_ANSWER', label: 'Short Answer Questions', icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { value: 'LONG_ANSWER', label: 'Long Answer Questions', icon: FileText, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'MATCHING', label: 'Match the Following', icon: Shuffle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'ASSERTION_REASON', label: 'Assertion & Reasoning', icon: Scale, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { value: 'PASSAGE', label: 'Case Study / Passage Based', icon: BookOpen, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'CUSTOM', label: 'Custom Question Type', icon: Sparkles, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function SectionSegmentForm({ 
  onSubmit, 
  onBack, 
  targetTotalMarks, 
  initialSections,
  onSectionsChange,
  onOpenPreview
}: SectionSegmentFormProps) {
  const [sectionCount, setSectionCount] = useState(1);
  const [sections, setSections] = useState<Section[]>([
    { label: 'Section A', segments: [] }
  ]);
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    if (initialSections && initialSections.length > 0 && !initialLoadedRef.current) {
      setSections(initialSections);
      setSectionCount(initialSections.length);
      initialLoadedRef.current = true;
    }
  }, [initialSections]);

  useEffect(() => {
    if (onSectionsChange) {
      const formatted = sections.map(section => ({
        label: section.label,
        type: section.segments[0]?.type || 'CUSTOM',
        marksEach: section.segments[0]?.marksEach || 0,
        questions: [],
        segments: section.segments
      }));
      onSectionsChange(formatted);
    }
  }, [sections, onSectionsChange]);

  const updateSectionCount = (count: number) => {
    const newCount = Math.max(1, Math.min(8, count));
    setSectionCount(newCount);
    
    const newSections: Section[] = [];
    for (let i = 0; i < newCount; i++) {
      const existing = sections[i];
      if (existing) {
        newSections.push(existing);
      } else {
        newSections.push({ label: `Section ${SECTION_LETTERS[i]}`, segments: [] });
      }
    }
    setSections(newSections);
  };

  const addSegment = (sectionIndex: number, typeValue: string = 'MCQ') => {
    const newSections = [...sections];
    if (!newSections[sectionIndex]) return;
    const typeDef = SEGMENT_TYPES.find(t => t.value === typeValue);
    
    // Default sensible defaults by type
    const defaultCount = typeValue === 'LONG_ANSWER' ? 3 : typeValue === 'MATCHING' ? 4 : 5;
    const defaultMarks = typeValue === 'LONG_ANSWER' ? 5 : typeValue === 'SHORT_ANSWER' ? 2 : 1;

    newSections[sectionIndex].segments.push({
      type: typeValue,
      label: typeDef?.label || 'MCQ',
      questionCount: defaultCount,
      marksEach: defaultMarks,
      customLabel: '',
    });
    setSections(newSections);
  };

  const updateSegment = (sectionIndex: number, segmentIndex: number, field: string, value: any) => {
    const newSections = [...sections];
    if (!newSections[sectionIndex]?.segments[segmentIndex]) return;
    const processedValue = (field === 'questionCount' || field === 'marksEach') ? Number(value) : value;
    newSections[sectionIndex].segments[segmentIndex] = {
      ...newSections[sectionIndex].segments[segmentIndex],
      [field]: processedValue,
    };
    setSections(newSections);
  };

  const removeSegment = (sectionIndex: number, segmentIndex: number) => {
    const newSections = [...sections];
    if (!newSections[sectionIndex]) return;
    newSections[sectionIndex].segments = newSections[sectionIndex].segments.filter(
      (_, i) => i !== segmentIndex
    );
    setSections(newSections);
  };

  const updateSectionLabel = (sectionIndex: number, label: string) => {
    const newSections = [...sections];
    if (!newSections[sectionIndex]) return;
    newSections[sectionIndex].label = label;
    setSections(newSections);
  };

  const calculateTotal = () => {
    return sections.reduce((total, section) => {
      return total + section.segments.reduce((sectionTotal, segment) => {
        return sectionTotal + (segment.questionCount * segment.marksEach);
      }, 0);
    }, 0);
  };

  const currentTotal = calculateTotal();
  const marksDifference = targetTotalMarks - currentTotal;
  const isTotalMatching = currentTotal === targetTotalMarks;
  const totalQuestions = sections.reduce((acc, sec) => 
    acc + sec.segments.reduce((sAcc, seg) => sAcc + seg.questionCount, 0), 0
  );

  const handleSubmit = () => {
    const formattedSections = sections.map((section) => {
      const firstSegment = section.segments[0];
      const hasUniformType = firstSegment ? section.segments.every(seg => seg.type === firstSegment.type) : false;
      const hasUniformMarks = firstSegment ? section.segments.every(seg => seg.marksEach === firstSegment.marksEach) : false;
      
      return {
        label: section.label,
        type: hasUniformType && firstSegment ? firstSegment.type : 'CUSTOM',
        marksEach: hasUniformMarks && firstSegment ? firstSegment.marksEach : 0,
        questions: [],
        segments: section.segments,
      };
    });
    onSubmit(formattedSections);
  };

  return (
    <div className="space-y-6">
      {/* 1. Marks Allocation Command Dashboard */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all shadow-sm",
        isTotalMatching 
          ? "border-emerald-200 bg-emerald-50/40" 
          : marksDifference > 0 
          ? "border-amber-200 bg-amber-50/40" 
          : "border-rose-200 bg-rose-50/40"
      )}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl shadow-xs font-bold",
              isTotalMatching 
                ? "bg-emerald-600 text-white" 
                : marksDifference > 0 
                ? "bg-amber-500 text-white" 
                : "bg-rose-600 text-white"
            )}>
              {isTotalMatching ? (
                <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Marks Distribution Tracker</h3>
                <span className={cn(
                  "text-xs font-bold px-2.5 py-0.5 rounded-full border",
                  isTotalMatching
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : marksDifference > 0
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                )}>
                  {isTotalMatching 
                    ? "Balanced & Ready" 
                    : marksDifference > 0 
                    ? `Remaining: ${marksDifference} Marks` 
                    : `Exceeded by: ${Math.abs(marksDifference)} Marks`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTotalMatching 
                  ? "Section totals perfectly equal the target exam marks." 
                  : marksDifference > 0 
                  ? `Allocate ${marksDifference} more marks across your sections to match target.` 
                  : `Reduce ${Math.abs(marksDifference)} marks from sections to match target.`}
              </p>
            </div>
          </div>

          {/* Marks Scorecard Badges */}
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Allocated</span>
              <span className={cn(
                "text-lg font-black",
                isTotalMatching ? "text-emerald-600" : "text-slate-800"
              )}>
                {currentTotal}
              </span>
            </div>
            <span className="text-slate-400 font-bold text-lg">/</span>
            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target</span>
              <span className="text-lg font-black text-slate-800">{targetTotalMarks}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-center shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Qs</span>
              <span className="text-lg font-black text-indigo-600">{totalQuestions}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-200/40">
          <div className="h-2 w-full rounded-full bg-slate-200/60 overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                isTotalMatching 
                  ? "bg-emerald-500" 
                  : marksDifference > 0 
                  ? "bg-amber-500" 
                  : "bg-rose-500"
              )}
              style={{ width: `${Math.min(100, Math.round((currentTotal / (targetTotalMarks || 1)) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Section Structure Configurator */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/50">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Section Divisions</h3>
              <p className="text-xs text-slate-500">Divide the paper into structured sections (e.g. Section A, Section B)</p>
            </div>
          </div>

          {/* Quick Section Pills Selector */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-0.5">Count:</span>
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => updateSectionCount(num)}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-xs font-bold transition-all border",
                  sectionCount === num
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
              >
                {num} {num === 1 ? 'Sec' : 'Secs'}
              </button>
            ))}
          </div>
        </div>

        {/* Section Cards List */}
        <div className="mt-6 space-y-6">
          {sections.map((section, sectionIndex) => {
            const sectionTotalMarks = section.segments.reduce((sum, seg) => sum + (seg.questionCount * seg.marksEach), 0);
            const sectionQuestions = section.segments.reduce((sum, seg) => sum + seg.questionCount, 0);

            return (
              <div 
                key={sectionIndex} 
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/40 p-4 sm:p-5 shadow-2xs space-y-4"
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-2xs">
                      {SECTION_LETTERS[sectionIndex] || sectionIndex + 1}
                    </span>
                    <Input
                      value={section.label}
                      onChange={(e) => updateSectionLabel(sectionIndex, e.target.value)}
                      placeholder={`Section ${SECTION_LETTERS[sectionIndex]}`}
                      className="font-bold text-sm bg-white border-slate-200 rounded-lg max-w-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
                      {sectionQuestions} Qs • {sectionTotalMarks} Marks
                    </span>
                  </div>
                </div>

                {/* Segments in Section */}
                {section.segments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
                    <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No question segments added to this section</p>
                    <p className="text-xs text-slate-400 mt-0.5">Use the quick buttons below to add question types.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {section.segments.map((segment, segmentIndex) => {
                      const currentTypeDef = SEGMENT_TYPES.find(t => t.value === segment.type);
                      const SegmentIcon = currentTypeDef?.icon || FileText;

                      return (
                        <div 
                          key={segmentIndex} 
                          className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-slate-300"
                        >
                          <div className="grid gap-3">
                            {/* Row 1: Question type - full width */}
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Question Type
                              </Label>
                              <select
                                value={segment.type}
                                onChange={(e) => {
                                  const selectedType = SEGMENT_TYPES.find(t => t.value === e.target.value);
                                  updateSegment(sectionIndex, segmentIndex, 'type', e.target.value);
                                  updateSegment(sectionIndex, segmentIndex, 'label', selectedType?.label || e.target.value);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {SEGMENT_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                              {segment.type === 'CUSTOM' && (
                                <Input
                                  type="text"
                                  placeholder="e.g. Very Short Answer"
                                  value={segment.customLabel || ''}
                                  onChange={(e) => {
                                    updateSegment(sectionIndex, segmentIndex, 'customLabel', e.target.value);
                                    updateSegment(sectionIndex, segmentIndex, 'label', e.target.value || 'Custom');
                                  }}
                                  className="mt-2 text-xs h-7"
                                />
                              )}
                            </div>

                            {/* Row 2: Questions | Marks | Subtotal | Delete — 4-col grid */}
                            <div className="grid grid-cols-4 gap-2 items-end">
                              {/* Questions */}
                              <div>
                                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Qs
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={segment.questionCount}
                                  onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'questionCount', Number(e.target.value))}
                                  className="h-8 text-xs font-bold text-center"
                                />
                              </div>

                              {/* Marks Each */}
                              <div>
                                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Marks
                                </Label>
                                <Input
                                  type="number"
                                  min="0.5"
                                  step="0.5"
                                  max="50"
                                  value={segment.marksEach}
                                  onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'marksEach', Number(e.target.value))}
                                  className="h-8 text-xs font-bold text-center"
                                />
                              </div>

                              {/* Subtotal */}
                              <div>
                                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                  Total
                                </Label>
                                <div className="flex items-center h-8 rounded-lg bg-slate-50 border border-slate-200 px-2 text-xs font-semibold text-slate-700">
                                  <span className="font-bold text-blue-600 truncate">{segment.questionCount * segment.marksEach}M</span>
                                </div>
                              </div>

                              {/* Delete */}
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  title="Remove segment"
                                  onClick={() => removeSegment(sectionIndex, segmentIndex)}
                                  className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Add Question Type Presets */}
                <div className="pt-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider w-full sm:w-auto mb-1 sm:mb-0">+ Add Type:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { label: 'MCQ (1M)', type: 'MCQ' },
                        { label: 'Short Ans (2M)', type: 'SHORT_ANSWER' },
                        { label: 'Long Ans (5M)', type: 'LONG_ANSWER' },
                        { label: 'Fill Blanks (1M)', type: 'FILL_BLANKS' },
                        { label: 'True/False (1M)', type: 'TRUE_FALSE' },
                        { label: 'Matching (4M)', type: 'MATCHING' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => addSegment(sectionIndex, preset.type)}
                          className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-all shadow-2xs"
                        >
                          + {preset.label}
                        </button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSegment(sectionIndex)}
                        className="h-7 text-xs border-dashed"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Custom
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="rounded-xl flex items-center gap-1.5 font-semibold text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Setup</span>
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {!isTotalMatching && (
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 text-center">
              Total must equal {targetTotalMarks} Marks
            </span>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isTotalMatching || sections.every(s => s.segments.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow"
          >
            <span>Continue to Questions</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
