'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Eye } from 'lucide-react';

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

const segmentTypes = [
  { value: 'MCQ', label: 'Multiple Choice Questions (MCQ)' },
  { value: 'FILL_BLANKS', label: 'Fill in the Blanks' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'SHORT_ANSWER', label: 'Short Answer Questions' },
  { value: 'LONG_ANSWER', label: 'Long Answer Questions' },
  { value: 'MATCHING', label: 'Match the Following' },
  { value: 'ASSERTION_REASON', label: 'Assertion & Reasoning' },
  { value: 'PASSAGE', label: 'Case Study / Passage Based' },
  { value: 'CUSTOM', label: 'Custom Question Type' },
];

const sectionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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
  }, [sections]);

  const updateSectionCount = (count: number) => {
    const newCount = Math.max(1, Math.min(8, count));
    setSectionCount(newCount);
    
    const newSections: Section[] = [];
    for (let i = 0; i < newCount; i++) {
      const section = sections[i];
      if (section) {
        newSections.push(section);
      } else {
        newSections.push({ label: `Section ${sectionLabels[i]}`, segments: [] });
      }
    }
    setSections(newSections);
  };

  const addSegment = (sectionIndex: number) => {
    const newSections = [...sections];
    if (!newSections[sectionIndex]) return;
    newSections[sectionIndex].segments.push({
      type: 'MCQ',
      label: 'MCQ',
      questionCount: 5,
      marksEach: 1,
      customLabel: '',
    });
    setSections(newSections);
  };

  const updateSegment = (sectionIndex: number, segmentIndex: number, field: string, value: any) => {
    const newSections = [...sections];
    if (!newSections[sectionIndex]) return;
    if (!newSections[sectionIndex].segments[segmentIndex]) return;
    // Convert numeric fields to numbers
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

  const calculateTotal = () => {
    return sections.reduce((total, section) => {
      return total + section.segments.reduce((sectionTotal, segment) => {
        return sectionTotal + (segment.questionCount * segment.marksEach);
      }, 0);
    }, 0);
  };

  const currentTotal = calculateTotal();
  const isTotalMatching = currentTotal === targetTotalMarks;

  const handleSubmit = () => {
    // Convert to the format expected by QuestionEditor and PDF generator
    const formattedSections = sections.map((section, sectionIndex) => {
      // For simplicity, if section has only one segment type, use that as the section type
      // Otherwise, use the first segment's type and marks
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
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Section & Segment Configuration</h3>
          <p className="text-sm text-gray-500">
            Define sections and add question segments (MCQ, Fill-ups, etc.) within each section.
          </p>
        </div>
        {onOpenPreview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const formatted = sections.map(section => ({
                label: section.label,
                type: section.segments[0]?.type || 'CUSTOM',
                marksEach: section.segments[0]?.marksEach || 0,
                questions: [],
                segments: section.segments
              }));
              onOpenPreview(formatted);
            }}
            className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs flex items-center gap-1.5 font-semibold"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            Preview Paper
          </Button>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <Label className="text-sm font-semibold">Number of Sections</Label>
        <div className="flex items-center gap-3 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateSectionCount(sectionCount - 1)}
            disabled={sectionCount <= 1}
          >
            -
          </Button>
          <Input
            type="number"
            min="1"
            max="8"
            value={sectionCount}
            onChange={(e) => updateSectionCount(Number(e.target.value))}
            className="w-20 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateSectionCount(sectionCount + 1)}
            disabled={sectionCount >= 8}
          >
            +
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-gray-700">{section.label}</h4>
              <span className="text-sm text-gray-500">
                {section.segments.reduce((sum, seg) => sum + (seg.questionCount * seg.marksEach), 0)} marks
              </span>
            </div>

            {section.segments.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">
                No segments added. Click "Add Segment" to add question types.
              </p>
            ) : (
              <div className="space-y-3">
                {section.segments.map((segment, segmentIndex) => (
                  <div key={segmentIndex} className="rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
                    {/* Segment Header */}
                    <div className="grid gap-3 md:grid-cols-6 items-end p-3 border-b border-gray-200">
                      <div>
                        <Label className="text-xs">Question Type</Label>
                        <select
                          value={segment.type}
                          onChange={(e) => {
                            const selectedType = segmentTypes.find(t => t.value === e.target.value);
                            updateSegment(sectionIndex, segmentIndex, 'type', e.target.value);
                            updateSegment(sectionIndex, segmentIndex, 'label', selectedType?.label || e.target.value);
                          }}
                          className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                        >
                          {segmentTypes.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      {segment.type === 'CUSTOM' && (
                        <div>
                          <Label className="text-xs">Custom Label</Label>
                          <Input
                            type="text"
                            placeholder="e.g., Very Short Q/A"
                            value={segment.customLabel || ''}
                            onChange={(e) => {
                              updateSegment(sectionIndex, segmentIndex, 'customLabel', e.target.value);
                              updateSegment(sectionIndex, segmentIndex, 'label', e.target.value || 'Custom');
                            }}
                            className="mt-1"
                          />
                        </div>
                      )}
                      {segment.type !== 'MATCHING' && segment.type !== 'PASSAGE' && (
                        <>
                          <div>
                            <Label className="text-xs">Questions</Label>
                            <Input
                              type="number"
                              min="1"
                              value={segment.questionCount}
                              onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'questionCount', Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Marks Each</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={segment.marksEach}
                              onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'marksEach', Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                        </>
                      )}
                      {segment.type === 'MATCHING' && (
                        <>
                          <div>
                            <Label className="text-xs">Number of Pairs</Label>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={segment.questionCount}
                              onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'questionCount', Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Marks Each</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={segment.marksEach}
                              onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'marksEach', Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                        </>
                      )}
                      {segment.type === 'PASSAGE' && (
                        <>
                          <div>
                            <Label className="text-xs">Number of Questions</Label>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={segment.questionCount}
                              onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'questionCount', Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Marks Each</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={segment.marksEach}
                              onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'marksEach', Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                        </>
                      )}
                      <div className="pb-2">
                        <span className="text-xs font-medium text-gray-700 block">
                          {segment.type === 'MATCHING' 
                            ? `Total: ${segment.questionCount * segment.marksEach} (1 question with ${segment.questionCount} pairs)`
                            : segment.type === 'PASSAGE'
                            ? `Total: ${segment.questionCount * segment.marksEach} (1 passage with ${segment.questionCount} questions)`
                            : `Total: ${segment.questionCount * segment.marksEach}`
                          }
                        </span>
                      </div>
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSegment(sectionIndex, segmentIndex)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSegment(sectionIndex)}
              className="w-full"
            >
              + Add Segment
            </Button>
          </div>
        ))}
      </div>

      <div className={`mt-4 p-4 rounded-lg flex items-center justify-between ${isTotalMatching ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
         <span className="font-semibold text-gray-800">Grand Total Calculator</span>
         <span className={`text-lg font-bold ${isTotalMatching ? 'text-green-700' : 'text-red-600'}`}>
           {currentTotal} / {targetTotalMarks} Marks
         </span>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isTotalMatching || sections.every(s => s.segments.length === 0)}
        >
          Continue to Questions
        </Button>
      </div>
      {!isTotalMatching && (
        <p className="text-sm text-red-600">Grand total must match the target total marks to continue.</p>
      )}
      {sections.every(s => s.segments.length === 0) && (
        <p className="text-sm text-red-600">Please add at least one segment to continue.</p>
      )}
    </div>
  );
}
