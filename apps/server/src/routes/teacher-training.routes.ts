import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { authenticate, authorize, requireSchoolTenant } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenant.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { teacherTrainingController } from '../controllers/teacher-training.controller.js';
import {
  createTeacherTrainingSchema,
  updateTeacherTrainingSchema,
  trainingIdParamSchema,
  teacherIdParamSchema,
  trainingQuerySchema,
} from '../validators/teacher-training.validator.js';

export const teacherTrainingRoutes = Router();

const teacherOrAdmin = [
  authenticate,
  authorize(UserRole.TEACHER, UserRole.SCHOOL_ADMIN),
  requireSchoolTenant,
  tenantGuard(),
] as const;

const adminOnly = [
  authenticate,
  authorize(UserRole.SCHOOL_ADMIN),
  requireSchoolTenant,
  tenantGuard(),
] as const;

// Public catalog to teachers and admins
teacherTrainingRoutes.get('/catalog', ...teacherOrAdmin, teacherTrainingController.getCatalog);

// Current teacher's own CPD records
teacherTrainingRoutes.get('/my', ...teacherOrAdmin, teacherTrainingController.getMyCpd);
teacherTrainingRoutes.post(
  '/my',
  ...teacherOrAdmin,
  validateBody(createTeacherTrainingSchema),
  teacherTrainingController.createMyTraining,
);

// Admin overall stats and list
teacherTrainingRoutes.get('/stats', ...adminOnly, teacherTrainingController.getStats);
teacherTrainingRoutes.get('/', ...adminOnly, validateQuery(trainingQuerySchema), teacherTrainingController.list);

// View specific teacher CPD
teacherTrainingRoutes.get(
  '/teacher/:teacherId',
  ...teacherOrAdmin,
  validateParams(teacherIdParamSchema),
  teacherTrainingController.getTeacherCpd,
);

// Admin training record management
teacherTrainingRoutes.post(
  '/',
  ...adminOnly,
  validateBody(createTeacherTrainingSchema),
  teacherTrainingController.create,
);

teacherTrainingRoutes.patch(
  '/:id',
  ...teacherOrAdmin,
  validateParams(trainingIdParamSchema),
  validateBody(updateTeacherTrainingSchema),
  teacherTrainingController.update,
);

teacherTrainingRoutes.delete(
  '/:id',
  ...teacherOrAdmin,
  validateParams(trainingIdParamSchema),
  teacherTrainingController.delete,
);
