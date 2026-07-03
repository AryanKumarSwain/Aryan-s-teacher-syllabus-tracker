import type { Request, Response, NextFunction } from 'express';
import { progressionService } from '../services/progression.service.js';
import { getTenantId } from '../middleware/tenant.js';
import { sendSuccess } from '../utils/api-response.js';

export const progressionController = {
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const academicYearId = req.query.academicYearId as string | undefined;
      const analytics = await progressionService.getProgressionAnalytics(schoolId, academicYearId);
      sendSuccess(res, analytics);
    } catch (err) {
      next(err);
    }
  },

  async getTeacherProgression(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const teacherId = (req as any).user?.teacherId || (req.query.teacherId as string);
      if (!teacherId) {
        throw new Error('Teacher ID is required');
      }
      const progression = await progressionService.getTeacherProgression(teacherId, schoolId);
      sendSuccess(res, progression);
    } catch (err) {
      next(err);
    }
  },
};
