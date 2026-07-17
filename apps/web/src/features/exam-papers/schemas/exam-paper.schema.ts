import { z } from 'zod';

export const examQuestionSchema = z.object({
  id: z.string().optional(),
  questionText: z.string().default(''),
  options: z.array(z.object({ text: z.string(), isCorrect: z.boolean().optional() })).optional(),
  imageUrl: z.string().optional(),
  subject: z.string().optional(),
  order: z.number().int().optional(),
});

export const examSectionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(['MCQ', 'FILL_IN_THE_BLANK', 'SHORT_ANSWER', 'DESCRIPTIVE', 'CUSTOM']),
  marksEach: z.number().int().min(0).default(1),
  order: z.number().int().optional(),
  questions: z.array(examQuestionSchema).default([]),
});

export const examPaperSetupSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  examName: z.string().min(1, 'Exam name is required'),
  examDate: z.string().min(1),
  totalMarks: z.coerce.number().int().min(1).optional(),
  duration: z.coerce.number().int().min(1).optional(),
  templateType: z.string().default('SINGLE'),
});

export const examPaperDraftSchema = z.object({
  sections: z.array(examSectionSchema).default([]),
});
