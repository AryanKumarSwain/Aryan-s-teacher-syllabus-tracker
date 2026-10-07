import { Router } from 'express';
import multer from 'multer';
import { UserRole } from '@school-syllabus/types';
import { authenticate, authorize, requireSchoolTenant } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenant.js';
import { googleDriveController } from '../controllers/google-drive.controller.js';

export const googleDriveRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB PDF limit
});

const adminOnly = [
  authenticate,
  authorize(UserRole.SCHOOL_ADMIN),
  requireSchoolTenant,
  tenantGuard(),
] as const;

// Google Drive Status & Auth
googleDriveRoutes.get('/status', ...adminOnly, googleDriveController.getStatus);
googleDriveRoutes.get('/auth-url', ...adminOnly, googleDriveController.getAuthUrl);
googleDriveRoutes.get('/connect', ...adminOnly, googleDriveController.connect);
googleDriveRoutes.post('/disconnect', ...adminOnly, googleDriveController.disconnect);

// OAuth Callback from Google (Public callback endpoint handled by browser redirect)
googleDriveRoutes.get('/callback', googleDriveController.callback);

// Upload Exam Paper to Google Drive
googleDriveRoutes.post(
  '/upload-paper/:id',
  ...adminOnly,
  upload.single('pdf'),
  googleDriveController.uploadPaper,
);
