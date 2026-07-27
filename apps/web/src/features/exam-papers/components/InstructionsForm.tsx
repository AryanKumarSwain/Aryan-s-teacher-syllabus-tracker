'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/services/api-client';

interface InstructionsFormProps {
  onSubmit: (instructions: string) => void;
  onBack?: () => void;
  initialValue?: string;
  sections?: any[];
}

export function InstructionsForm({ onSubmit, onBack, initialValue = '', sections = [] }: InstructionsFormProps) {
  const [instructions, setInstructions] = useState(initialValue);

  useEffect(() => {
    if (!initialValue && sections.length > 0) {
      // Generate dynamic default instructions based on sections
      const sectionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const sectionNames = sections.slice(0, 8).map((_, i) => sectionLabels[i]).join(', ');
      
      // Count total questions
      const totalQuestions = sections.reduce((sum, section) => {
        return sum + (section.questions?.length || 0);
      }, 0);

      const defaultInstructions = `1) Read all questions carefully before answering.\n2) The question paper consists of ${totalQuestions} questions divided into ${sections.length} ${sections.length === 1 ? 'Section' : 'Sections'}: ${sectionNames}.\n3) All questions are compulsory.`;
      
      setInstructions(defaultInstructions);
    }
  }, [initialValue, sections]);

  const handleSubmit = () => {
    onSubmit(instructions);
  };

  const sectionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="font-semibold text-gray-800">Exam Instructions & Section Separation</h3>
        <p className="text-sm text-gray-500">Add instructions and review section separation for the exam paper.</p>
      </div>

      {sections.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">Section Separation</h4>
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                  <span>Sec {sectionLabels[index] || index + 1}:</span>
                  <span>{section.label}</span>
                </div>
                {section.segments && section.segments.length > 0 ? (
                  <div className="ml-6 space-y-1">
                    {section.segments.map((segment: any, segIndex: number) => (
                      <div key={segIndex} className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="text-gray-500">•</span>
                        <span>{segment.label}</span>
                        <span className="text-gray-500">({segment.questionCount} questions × {segment.marksEach} marks = {segment.questionCount * segment.marksEach} marks)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ml-6 text-sm text-gray-500 italic">No segments configured</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Instructions</Label>
        <Textarea
          value={instructions}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)}
          placeholder="Enter instructions for the exam paper (e.g., 'All questions are compulsory. Write your answers clearly.')"
          rows={6}
          className="mt-2"
        />
      </div>
      <div className="flex gap-3">
        {onBack && <Button type="button" variant="outline" onClick={onBack}>Back</Button>}
        <Button type="button" onClick={handleSubmit}>Save & Finish</Button>
      </div>
    </div>
  );
}