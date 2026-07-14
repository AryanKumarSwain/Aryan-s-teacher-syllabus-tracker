import { z } from 'zod';

export const createClassSchema = z.object({
  academicSessionId: z.string().uuid('Invalid academic session ID'),
  name: z.string().min(1, 'Class name is required'),
  grade: z.string().optional(),
  section: z.string().optional(),
  description: z.string().optional(),
  subjects: z.array(z.string().min(1)).optional(),
});

export const updateClassSchema = z
  .object({
    name: z.string().min(1).optional(),
    grade: z.string().optional(),
    section: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const createSubjectSchema = z.object({
  academicSessionId: z.string().uuid('Invalid academic session ID'),
  classId: z.string().uuid().optional(),
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});
export const updateSubjectSchema = z
  .object({
    name: z.string().min(1, 'Subject name is required').optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    classId: z.string().uuid('Invalid class ID format').optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const createChapterSchema = z.object({
  academicSessionId: z.string().uuid('Invalid academic session ID'),
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  title: z.string().min(1, 'Chapter title is required'),
  description: z.string().optional(),
  notes: z.string().optional(),
  estimatedTeachingDays: z.number().int().min(0).optional(),
  chapterNo: z.number().int().optional(),
  termName: z.string().optional(),
});

export const updateChapterSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    chapterNo: z.number().int().optional(),
    termName: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const createTopicSchema = z.object({
  chapterId: z.string().uuid(),
  title: z.string().min(1, 'Topic title is required'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const updateTopicSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const bulkCreateClassesSchema = z.object({
  academicSessionId: z.string().uuid('Invalid academic session ID'),
  classes: z
    .array(
      z.object({
        name: z.string().min(1, 'Class name is required'),
        grade: z.string().optional(),
        section: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .min(1, 'At least one class is required'),
});

export const bulkCreateSubjectsSchema = z.object({
  academicSessionId: z.string().uuid('Invalid academic session ID'),
  subjects: z
    .array(
      z.object({
        name: z.string().min(1, 'Subject name is required'),
        code: z.string().optional(),
        description: z.string().optional(),
        classId: z.string().uuid('Invalid class ID format').optional(),
        color: z.string().optional(),
      }),
    )
    .min(1, 'At least one subject is required'),
});
