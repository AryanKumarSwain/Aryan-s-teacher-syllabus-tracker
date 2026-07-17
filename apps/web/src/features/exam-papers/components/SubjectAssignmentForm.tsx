'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SubjectAssignmentFormProps {
  sections: any[];
  onSubmit: (sections: any[]) => void;
  onBack: () => void;
}

export function SubjectAssignmentForm({ sections, onSubmit, onBack }: SubjectAssignmentFormProps) {
  const [draftSections, setDraftSections] = useState(() => JSON.parse(JSON.stringify(sections)));

  const handleSubjectChange = (sectionIndex: number, questionIndex: number, value: string) => {
    const next = [...draftSections];
    next[sectionIndex].questions[questionIndex].subject = value;
    setDraftSections(next);
  };

  const handleSubmit = () => {
    onSubmit(draftSections);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Subject & Topic Assignment</h3>
        <p className="text-sm text-gray-500">
          Assign a subject or specific topic tag to each question to track coverage.
        </p>
      </div>

      <div className="space-y-6">
        {draftSections.map((section: any, sectionIndex: number) => (
          <div key={sectionIndex} className="rounded-xl border border-gray-100 p-4 space-y-4">
            <h4 className="font-semibold text-gray-700 border-b pb-2">{section.label}</h4>
            {section.questions.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No questions in this section.</p>
            ) : (
              section.questions.map((question: any, questionIndex: number) => (
                <div key={questionIndex} className="grid gap-4 md:grid-cols-3 items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="md:col-span-2">
                    <span className="text-xs font-semibold text-gray-400 block mb-1">Question {questionIndex + 1}</span>
                    <div 
                      className="text-sm text-gray-700 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: question.questionText || '<span class="text-gray-400 italic">No question text yet</span>' }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Subject / Topic Tag</Label>
                    <Input
                      value={question.subject || ''}
                      placeholder="e.g. Algebra, Calculus"
                      onChange={(e) => handleSubjectChange(sectionIndex, questionIndex, e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Continue
        </Button>
      </div>
    </div>
  );
}
