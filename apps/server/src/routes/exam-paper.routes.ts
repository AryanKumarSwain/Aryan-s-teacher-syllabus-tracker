import { Router } from 'express';
import multer from 'multer';
import { UserRole } from '@school-syllabus/types';
import { authenticate, authorize, requireSchoolTenant } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenant.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { examPaperController } from '../controllers/exam-paper.controller.js';
import { createExamPaperSchema, updateExamPaperSchema, examPaperIdParamSchema, templateSchema } from '../validators/exam-paper.validator.js';

export const examPaperRoutes = Router();

const upload = multer({ storage: multer.memoryStorage() });
const teacherOrAdmin = [authenticate, authorize(UserRole.TEACHER, UserRole.SCHOOL_ADMIN), requireSchoolTenant, tenantGuard()] as const;
const adminOnly = [authenticate, authorize(UserRole.SCHOOL_ADMIN), requireSchoolTenant, tenantGuard()] as const;

examPaperRoutes.get('/', ...teacherOrAdmin, examPaperController.list);
examPaperRoutes.post('/', ...teacherOrAdmin, validateBody(createExamPaperSchema), examPaperController.create);
examPaperRoutes.get('/template', ...teacherOrAdmin, examPaperController.getTemplate);
examPaperRoutes.post('/template', ...adminOnly, validateBody(templateSchema), examPaperController.saveTemplate);
examPaperRoutes.post('/template/upload-logo', ...adminOnly, upload.single('logo'), examPaperController.uploadLogo);
examPaperRoutes.get('/:id', ...teacherOrAdmin, validateParams(examPaperIdParamSchema), examPaperController.getById);
examPaperRoutes.patch('/:id', ...teacherOrAdmin, validateParams(examPaperIdParamSchema), validateBody(updateExamPaperSchema), examPaperController.update);
examPaperRoutes.delete('/:id', ...teacherOrAdmin, validateParams(examPaperIdParamSchema), examPaperController.delete);
examPaperRoutes.get('/:id/pdf', ...teacherOrAdmin, validateParams(examPaperIdParamSchema), examPaperController.pdf);
