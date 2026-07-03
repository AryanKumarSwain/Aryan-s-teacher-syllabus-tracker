import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { schoolController } from '../controllers/school.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { validateBody } from '../middleware/validate.js';
import { paginationSchema } from '../validators/common.validator.js';
import { z } from 'zod';

export const schoolRoutes = Router();

// Route for updating current user's school (SCHOOL_ADMIN only)
const updateSchoolNameSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
});

schoolRoutes.patch(
  '/me',
  authenticate,
  validateBody(updateSchoolNameSchema),
  schoolController.updateMySchool,
);

// SUPER ADMIN routes
schoolRoutes.use(authenticate, authorize(UserRole.SUPER_ADMIN));
schoolRoutes.get('/', validateQuery(paginationSchema), schoolController.list);
schoolRoutes.get('/:id', schoolController.getById);
schoolRoutes.post('/', schoolController.create);
schoolRoutes.patch('/:id', schoolController.update);
schoolRoutes.patch('/:id/status', schoolController.updateStatus);
schoolRoutes.delete('/:id', schoolController.delete);
