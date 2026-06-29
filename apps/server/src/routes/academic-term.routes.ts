import { Router } from 'express';
import { academicTermController } from '../controllers/academic-term.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createAcademicTermSchema,
  updateAcademicTermSchema,
  addVacationDaySchema,
} from '../validators/academic-term.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// School Admin only routes
router.post('/', validateBody(createAcademicTermSchema), academicTermController.create);
router.get('/', academicTermController.list);

// Teacher timeline progress endpoint (must be before /:id)
router.get('/teacher-progress', academicTermController.getTeacherTimelineProgress);

router.get('/:id', academicTermController.getById);
router.put('/:id', validateBody(updateAcademicTermSchema), academicTermController.update);
router.patch('/:id', validateBody(updateAcademicTermSchema), academicTermController.update);
router.delete('/:id', academicTermController.delete);

// Vacation day management
router.post(
  '/:id/vacation-days',
  validateBody(addVacationDaySchema),
  academicTermController.addVacationDay,
);
router.delete('/:id/vacation-days/:vacationId', academicTermController.removeVacationDay);

// Calculation endpoint
router.get('/:id/calculate', academicTermController.calculateAvailableDays);

export default router;
