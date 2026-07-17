'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Segment {
  type: string;
  label: string;
  questionCount: number;
  marksEach: number;
}

interface Section {
  label: string;
  segments: Segment[];
}

interface SectionSegmentFormProps {
  onSubmit: (sections: any[]) => void;
  onBack: () => void;
  targetTotalMarks: number;
}

const segmentTypes = [
  { value: 'MCQ', label: 'MCQ' },
  { value: 'FILL_IN_THE_BLANK', label: 'Fill in the Blanks' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'DESCRIPTIVE', label: 'Descriptive' },
  { value: 'TRUE_FALSE', label: 'True/False' },
  { value: 'MATCHING', label: 'Matching' },
  { value: 'CUSTOM', label: 'Custom' },
];

const sectionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function SectionSegmentForm({ onSubmit, onBack, targetTotalMarks }: SectionSegmentFormProps) {
  const [sectionCount, setSectionCount] = useState(1);
  const [sections, setSections] = useState<Section[]>([
    { label: 'Section A', segments: [] }
  ]);

  const updateSectionCount = (count: number) => {
    const newCount = Math.max(1, Math.min(8, count));
    setSectionCount(newCount);
    
    const newSections: Section[] = [];
    for (let i = 0; i < newCount; i++) {
      if (sections[i]) {
        newSections.push(sections[i]);
      } else {
        newSections.push({ label: `Section ${sectionLabels[i]}`, segments: [] });
      }
    }
    setSections(newSections);
  };

  const addSegment = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].segments.push({
      type: 'MCQ',
      label: 'MCQ',
      questionCount: 5,
      marksEach: 1,
    });
    setSections(newSections);
  };

  const updateSegment = (sectionIndex: number, segmentIndex: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[sectionIndex].segments[segmentIndex] = {
      ...newSections[sectionIndex].segments[segmentIndex],
      [field]: value,
    };
    setSections(newSections);
  };

  const removeSegment = (sectionIndex: number, segmentIndex: number) => {
    const newSections = [...sections];
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
    // Convert to the format expected by QuestionEditor
    const formattedSections = sections.map((section, sectionIndex) => ({
      label: section.label,
      type: 'CUSTOM',
      marksEach: 0,
      questions: [],
      segments: section.segments,
    }));
    onSubmit(formattedSections);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Section & Segment Configuration</h3>
        <p className="text-sm text-gray-500">
          Define sections and add question segments (MCQ, Fill-ups, etc.) within each section.
        </p>
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
                  <div key={segmentIndex} className="grid gap-3 md:grid-cols-5 items-end p-3 rounded-lg bg-gray-50 border border-gray-100">
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
                        min="1"
                        value={segment.marksEach}
                        onChange={(e) => updateSegment(sectionIndex, segmentIndex, 'marksEach', Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div className="pb-2">
                      <span className="text-xs font-medium text-gray-700 block">
                        Total: {segment.questionCount * segment.marksEach}
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
