'use client';

import React from 'react';
import { 
  FileText, 
  Layers, 
  HelpCircle, 
  ScrollText, 
  CheckCircle2, 
  Eye, 
  Clock, 
  Award,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StepItem {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const EXAM_STEPS: StepItem[] = [
  {
    id: 1,
    title: 'Paper Setup',
    shortTitle: 'Setup',
    description: 'Class, Subject, Marks & Layout',
    icon: FileText,
  },
  {
    id: 2,
    title: 'Sections & Marks',
    shortTitle: 'Sections',
    description: 'Section rules & marks distribution',
    icon: Layers,
  },
  {
    id: 3,
    title: 'Question Builder',
    shortTitle: 'Questions',
    description: 'Add questions, choices & formulas',
    icon: HelpCircle,
  },
  {
    id: 4,
    title: 'Instructions',
    shortTitle: 'Instructions',
    description: 'Exam guidelines & general notes',
    icon: ScrollText,
  },
  {
    id: 5,
    title: 'Review & Export',
    shortTitle: 'Export',
    description: 'Live paper preview & download',
    icon: CheckCircle2,
  },
];

function formatDuration(minutes: number): string {
  if (!minutes) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hr`;
  return `${mins} min`;
}

interface ExamStepperProps {
  currentStep: number;
  totalSteps?: number;
  maxStepReached?: number;
  onStepClick?: (step: number) => void;
  onOpenPreview?: () => void;
  paperDetails?: {
    examName?: string;
    subjectName?: string;
    className?: string;
    totalMarks?: number;
    duration?: number;
  };
}

export function ExamStepper({
  currentStep,
  maxStepReached = currentStep,
  onStepClick,
  onOpenPreview,
  paperDetails,
}: ExamStepperProps) {
  const progressPercent = Math.min(100, Math.round(((currentStep - 1) / (EXAM_STEPS.length - 1)) * 100));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all sm:p-6">
      {/* Subtle top gradient accent line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

      {/* Top Header Row: Step description & Quick paper metadata */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              Step {currentStep} of {EXAM_STEPS.length}
            </span>
            {paperDetails?.examName && (
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-500">
                • {paperDetails.examName} {paperDetails.subjectName ? `(${paperDetails.subjectName})` : ''}
              </span>
            )}
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {EXAM_STEPS[currentStep - 1]?.title}
          </h2>
          <p className="text-xs text-slate-500 sm:text-sm mt-0.5">
            {EXAM_STEPS[currentStep - 1]?.description}
          </p>
        </div>

        {/* Paper details badges & Live Preview CTA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {paperDetails && (paperDetails.totalMarks || paperDetails.duration) ? (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs">
              {paperDetails.duration ? (
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  {formatDuration(paperDetails.duration)}
                </span>
              ) : null}
              {paperDetails.duration && paperDetails.totalMarks ? (
                <span className="text-slate-300">|</span>
              ) : null}
              {paperDetails.totalMarks ? (
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Award className="h-3.5 w-3.5 text-amber-500" />
                  {paperDetails.totalMarks} Marks
                </span>
              ) : null}
            </div>
          ) : null}

          {onOpenPreview && currentStep >= 2 && (
            <Button
              type="button"
              onClick={onOpenPreview}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 rounded-xl shadow-xs transition-all hover:shadow"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </Button>
          )}
        </div>
      </div>

      {/* Modern Stepper Process Track */}
      <div className="pt-5">
        {/* Progress Bar Line */}
        <div className="relative mb-6">
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stepper items row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {EXAM_STEPS.map((s) => {
            const isCompleted = s.id < currentStep;
            const isCurrent = s.id === currentStep;
            const isClickable = onStepClick && (s.id <= maxStepReached || isCompleted);
            const StepIcon = s.icon;

            return (
              <button
                key={s.id}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(s.id)}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3 text-left transition-all border",
                  isCurrent
                    ? "bg-blue-50/80 border-blue-200/90 shadow-2xs ring-1 ring-blue-500/20"
                    : isCompleted
                    ? "bg-slate-50/60 border-slate-200/60 hover:bg-slate-100/80 hover:border-slate-300 cursor-pointer"
                    : "bg-white border-transparent opacity-60 cursor-not-allowed"
                )}
              >
                {/* Step Circle Icon */}
                <div
                  className={cn(
                    "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs transition-all shadow-2xs",
                    isCurrent
                      ? "bg-blue-600 text-white shadow-blue-500/20"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>

                {/* Step Label & Subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isCurrent
                          ? "text-blue-600"
                          : isCompleted
                          ? "text-emerald-600"
                          : "text-slate-400"
                      )}
                    >
                      Step {s.id}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] text-emerald-600 font-semibold">• Done</span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "truncate text-xs sm:text-sm font-semibold mt-0.5",
                      isCurrent
                        ? "text-slate-900"
                        : isCompleted
                        ? "text-slate-700"
                        : "text-slate-400"
                    )}
                  >
                    {s.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
