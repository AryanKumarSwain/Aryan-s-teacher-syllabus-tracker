import { Router } from 'express';
import { progressionController } from '../controllers/progression.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get progression analytics (for school admin)
router.get('/analytics', progressionController.getAnalytics);

// Get teacher-specific progression (for teachers)
router.get('/teacher', progressionController.getTeacherProgression);

export default router;
