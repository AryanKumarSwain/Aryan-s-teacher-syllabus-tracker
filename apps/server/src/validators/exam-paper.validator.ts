import { z } from 'zod';

export const examQuestionSchema = z.object({
  id: z.string().optional(),
  questionText: z.string().default(''),
  options: z.array(z.object({ text: z.string(), isCorrect: z.boolean().optional() })).optional(),
  imageUrl: z.string().optional(),
  subject: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
});

export const examSectionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(['MCQ', 'FILL_IN_THE_BLANK', 'SHORT_ANSWER', 'DESCRIPTIVE', 'CUSTOM']),
  marksEach: z.number().int().min(0).optional(),
  order: z.number().int().nonnegative().optional(),
  questions: z.array(examQuestionSchema).default([]),
});

export const createExamPaperSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  examName: z.string().min(1),
  examDate: z.string().optional(),
  totalMarks: z.number().int().min(1).optional(),
  duration: z.number().int().min(1).optional(),
  sections: z.array(examSectionSchema).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'REVIEWED']).optional(),
  styleFontFamily: z.string().optional(),
  styleFontSize: z.string().optional(),
  styleColor: z.string().optional(),
  templateType: z.string().optional(),
});

export const updateExamPaperSchema = createExamPaperSchema.partial();

export const uploadImageSchema = z.object({
  file: z.string().min(1),
});

export const examPaperIdParamSchema = z.object({
  id: z.string().min(1),
});

export const templateSchema = z.object({
  headerHtml: z.string().default(''),
  footerHtml: z.string().optional(),
  instructions: z.string().optional(),
  logoUrl: z.string().optional(),
});
