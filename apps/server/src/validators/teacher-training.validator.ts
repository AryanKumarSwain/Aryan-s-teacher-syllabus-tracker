import { z } from 'zod';

export const createTeacherTrainingSchema = z.object({
  teacherId: z.string().min(1).optional(), // optional when teacher creates for themselves
  teacherIds: z.array(z.string().min(1)).optional(), // used for bulk creation
  title: z.string().min(1, 'Title / topic is required'),
  domain: z.enum(['CORE_VALUES_ETHICS', 'KNOWLEDGE_PRACTICE', 'PROFESSIONAL_GROWTH']),
  annexure: z.enum(['ANNEXURE_I', 'ANNEXURE_II', 'ANNEXURE_III', 'ACADEMIC_ACTIVITY', 'OTHER']).optional(),
  provider: z.enum(['CBSE', 'SCHOOL', 'SAHODAYA', 'OTHER']).default('CBSE'),
  trainingMode: z.enum(['OFFLINE', 'ONLINE', 'BLENDED']).default('OFFLINE'),
  hours: z.number().positive('Hours must be greater than 0').max(100, 'Hours must be realistic'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  organizedBy: z.string().optional(),
  locationOrPlatform: z.string().optional(),
  isAcademicActivity: z.boolean().optional().default(false),
  academicActivityKey: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateUrl: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(['VERIFIED', 'SUBMITTED', 'REJECTED']).optional(),
});

export const updateTeacherTrainingSchema = z.object({
  title: z.string().min(1).optional(),
  domain: z.enum(['CORE_VALUES_ETHICS', 'KNOWLEDGE_PRACTICE', 'PROFESSIONAL_GROWTH']).optional(),
  annexure: z.enum(['ANNEXURE_I', 'ANNEXURE_II', 'ANNEXURE_III', 'ACADEMIC_ACTIVITY', 'OTHER']).optional(),
  provider: z.enum(['CBSE', 'SCHOOL', 'SAHODAYA', 'OTHER']).optional(),
  trainingMode: z.enum(['OFFLINE', 'ONLINE', 'BLENDED']).optional(),
  hours: z.number().positive().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  organizedBy: z.string().optional(),
  locationOrPlatform: z.string().optional(),
  isAcademicActivity: z.boolean().optional(),
  academicActivityKey: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateUrl: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(['VERIFIED', 'SUBMITTED', 'REJECTED']).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['VERIFIED', 'SUBMITTED', 'REJECTED']),
  remarks: z.string().optional(),
});

export const trainingIdParamSchema = z.object({
  id: z.string().min(1),
});

export const teacherIdParamSchema = z.object({
  teacherId: z.string().min(1),
});

export const trainingQuerySchema = z.object({
  academicSessionId: z.string().optional(),
  teacherId: z.string().optional(),
  domain: z.enum(['CORE_VALUES_ETHICS', 'KNOWLEDGE_PRACTICE', 'PROFESSIONAL_GROWTH']).optional(),
  provider: z.enum(['CBSE', 'SCHOOL', 'SAHODAYA', 'OTHER']).optional(),
  status: z.enum(['VERIFIED', 'SUBMITTED', 'REJECTED']).optional(),
  search: z.string().optional(),
});
