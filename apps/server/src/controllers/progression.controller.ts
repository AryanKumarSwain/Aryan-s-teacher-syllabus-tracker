import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@school-syllabus/database';
import { progressionService } from '../services/progression.service.js';
import { getTenantId } from '../middleware/tenant.js';
import { sendSuccess } from '../utils/api-response.js';

export const progressionController = {
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const academicYearId = req.query.academicYearId as string | undefined;
      const termFilter = req.query.termFilter as string | undefined;
      console.log('[DEBUG] progression.getAnalytics - schoolId:', schoolId, 'academicYearId:', academicYearId, 'termFilter:', termFilter);
      const analytics = await progressionService.getProgressionAnalytics(schoolId, academicYearId, termFilter);
      console.log('[DEBUG] progression.getAnalytics - classProgress count:', analytics.classProgress.length);
      console.log('[DEBUG] progression.getAnalytics - subjectProgress count:', analytics.subjectProgress.length);
      console.log('[DEBUG] progression.getAnalytics - teacherProgress count:', analytics.teacherProgress.length);
      sendSuccess(res, analytics);
    } catch (err) {
      console.log('[DEBUG] progression.getAnalytics error:', err);
      next(err);
    }
  },

  async getTeacherProgression(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      let teacherId = (req as any).user?.teacherId || (req.query.teacherId as string);
      if (req.user?.role === 'TEACHER') {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        const teacher = await prisma.teacher.findFirst({
          where: {
            schoolId,
            userId: req.user.sub,
            ...(school?.currentAcademicSessionId ? { academicSessionId: school.currentAcademicSessionId } : {}),
          },
        });
        if (teacher) {
          teacherId = teacher.id;
        }
      }
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
