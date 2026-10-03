import { Router } from 'express';
import { z } from 'zod';
import { academicSessionController } from '../controllers/academic-session.controller.js';
import { authenticate, requireSchoolTenant } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const academicSessionRoutes = Router();

// Middleware to ensure authentication
academicSessionRoutes.use(authenticate);

// List sessions with optional filtering
academicSessionRoutes.get('/', async (req, res, next) => {
  try {
    const query = req.query as any;
    // If no schoolId provided, use the tenant schoolId from auth context
    if (!query.schoolId && req.schoolId) {
      query.schoolId = req.schoolId;
    }
    return academicSessionController.list(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Get sessions by school
academicSessionRoutes.get(
  '/by-school',
  requireSchoolTenant,
  academicSessionController.getBySchool
);

// Get specific session
academicSessionRoutes.get('/:id', academicSessionController.getById);


// Create a new session
academicSessionRoutes.post(
  '/',
  requireSchoolTenant,
  validateBody(
    z.object({
      name: z.string().trim().min(1, 'Session name is required').max(50),
      setAsActive: z.boolean().optional(),
    }),
  ),
  academicSessionController.create,
);

// Switch active session
academicSessionRoutes.post(
  '/switch',
  requireSchoolTenant,
  academicSessionController.switchSession
);

// Archive a session
academicSessionRoutes.patch('/:id/archive', academicSessionController.archive);

// Update a session (e.g. rename)
academicSessionRoutes.patch(
  '/:id',
  requireSchoolTenant,
  validateBody(
    z.object({
      name: z.string().trim().min(1, 'Session name is required').max(50),
    }),
  ),
  academicSessionController.update,
);

// Delete an inactive session
academicSessionRoutes.delete('/:id', requireSchoolTenant, academicSessionController.delete);

// Import endpoints
academicSessionRoutes.post(
  '/import/classes',
  requireSchoolTenant,
  validateBody(z.object({ sourceSessionId: z.string().uuid(), targetSessionId: z.string().uuid() })),
  academicSessionController.importClasses,
);
academicSessionRoutes.post(
  '/import/subjects',
  requireSchoolTenant,
  validateBody(z.object({ sourceSessionId: z.string().uuid(), targetSessionId: z.string().uuid() })),
  academicSessionController.importSubjects,
);
academicSessionRoutes.post(
  '/import/teachers',
  requireSchoolTenant,
  validateBody(z.object({ sourceSessionId: z.string().uuid(), targetSessionId: z.string().uuid() })),
  academicSessionController.importTeachers,
);
academicSessionRoutes.post(
  '/import/syllabus',
  requireSchoolTenant,
  validateBody(z.object({ sourceSessionId: z.string().uuid(), targetSessionId: z.string().uuid() })),
  academicSessionController.importSyllabus,
);
academicSessionRoutes.post(
  '/import/structure',
  requireSchoolTenant,
  validateBody(
    z.object({
      sourceSessionId: z.string().uuid(),
      targetSessionId: z.string().uuid(),
      importClasses: z.boolean().optional(),
      importTeachers: z.boolean().optional(),
    }),
  ),
  academicSessionController.importStructure,
);

export default academicSessionRoutes;
