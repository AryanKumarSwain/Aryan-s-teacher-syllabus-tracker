'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SectionConfigFormProps {
  targetTotalMarks: number;
  onSubmit: (sections: any[]) => void;
  onBack?: () => void;
}

interface SectionConfigItem {
  label: string;
  type: string;
  marksEach: number;
  questions: any[];
}

const defaultSections: SectionConfigItem[] = [
  { label: 'MCQ', type: 'MCQ', marksEach: 1, questions: [] },
  { label: 'Fill in the Blanks', type: 'FILL_IN_THE_BLANK', marksEach: 1, questions: [] },
  { label: 'Short Answer', type: 'SHORT_ANSWER', marksEach: 2, questions: [] },
  { label: 'Descriptive', type: 'DESCRIPTIVE', marksEach: 5, questions: [] },
];

export function SectionConfigForm({ targetTotalMarks, onSubmit, onBack }: SectionConfigFormProps) {
  const [sections, setSections] = useState<SectionConfigItem[]>(defaultSections);

  const updateSection = (index: number, field: keyof SectionConfigItem, value: any) => {
    const next = [...sections];
    const current = next[index];
    if (current) {
      next[index] = { ...current, [field]: value };
      setSections(next);
    }
  };

  const addSection = () => {
    setSections([...sections, { label: 'Custom Section', type: 'CUSTOM', marksEach: 1, questions: [] }]);
  };

  const currentTotal = sections.reduce((acc, sec) => acc + (sec.questions.length * sec.marksEach), 0);
  const isTotalMatching = currentTotal === Number(targetTotalMarks);

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {sections.map((section, index) => {
        const sectionTotal = section.questions.length * section.marksEach;
        return (
          <div key={`${section.label}-${index}`} className="grid gap-3 rounded-xl border border-gray-100 p-4 md:grid-cols-4 items-end">
            <div>
              <Label>Section Label</Label>
              <Input value={section.label} onChange={(e) => updateSection(index, 'label', e.target.value)} />
            </div>
            <div>
              <Label>Question Count</Label>
              <Input type="number" value={section.questions.length || 0} onChange={(e) => updateSection(index, 'questions', Array.from({ length: Number(e.target.value) }, (_, i) => ({ id: `${index}-${i}`, questionText: '' })))} />
            </div>
            <div>
              <Label>Marks Each</Label>
              <Input type="number" value={section.marksEach} onChange={(e) => updateSection(index, 'marksEach', Number(e.target.value))} />
            </div>
            <div className="pb-2">
              <span className="text-sm font-medium text-gray-700">Section Total: <span className="font-bold">{sectionTotal}</span></span>
            </div>
          </div>
        );
      })}
      
      <div className={`mt-4 p-4 rounded-lg flex items-center justify-between ${isTotalMatching ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
         <span className="font-semibold text-gray-800">Grand Total Calculator</span>
         <span className={`text-lg font-bold ${isTotalMatching ? 'text-green-700' : 'text-red-600'}`}>
           {currentTotal} / {targetTotalMarks} Marks
         </span>
      </div>

      <div className="flex gap-3">
        {onBack && <Button type="button" variant="outline" onClick={onBack}>Back</Button>}
        <Button type="button" variant="outline" onClick={addSection}>+ Add Section</Button>
        <Button 
          type="button" 
          onClick={() => onSubmit(sections)}
          disabled={!isTotalMatching}
        >
          Continue to Questions
        </Button>
      </div>
      {!isTotalMatching && (
        <p className="text-sm text-red-600">Grand total must match the target total marks to continue.</p>
      )}
    </div>
  );
}