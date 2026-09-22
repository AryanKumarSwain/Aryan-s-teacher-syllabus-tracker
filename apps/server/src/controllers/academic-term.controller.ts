import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@school-syllabus/database';
import { academicTermService } from '../services/academic-term.service.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';
import { getTenantId } from '../middleware/tenant.js';

export const academicTermController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      // Get school's current session if not provided
      let academicSessionId = req.query.academicSessionId as string | undefined;
      if (!academicSessionId) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }

      const params = {
        ...req.query,
        schoolId,
        academicSessionId,
      };
      const result = await academicTermService.list(params as never);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const term = await academicTermService.getById(String(req.params.id));
      sendSuccess(res, term);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[AcademicTermController.create] Request body:', JSON.stringify(req.body));
      const schoolId = req.body.schoolId || getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      if (req.body.academicSessionId && req.body.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot create timeline for an inactive or historical session' });
      }
      const term = await academicTermService.create(req.body);
      sendSuccess(res, term, 201);
    } catch (err) {
      console.error('[AcademicTermController.create] Error:', err);
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[AcademicTermController.update] Request body:', JSON.stringify(req.body));
      console.log('[AcademicTermController.update] Params:', req.params);
      const existing = await prisma.academicTerm.findUnique({
        where: { id: String(req.params.id) },
        select: { academicSessionId: true, schoolId: true },
      });
      const school = await prisma.school.findUnique({
        where: { id: existing?.schoolId || getTenantId(req) },
        select: { currentAcademicSessionId: true },
      });
      if (existing?.academicSessionId && existing.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify timeline for an inactive or historical session' });
      }
      const term = await academicTermService.update(String(req.params.id), req.body);
      sendSuccess(res, term);
    } catch (err) {
      console.error('[AcademicTermController.update] Error:', err);
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.academicTerm.findUnique({
        where: { id: String(req.params.id) },
        select: { academicSessionId: true, schoolId: true },
      });
      const school = await prisma.school.findUnique({
        where: { id: existing?.schoolId || getTenantId(req) },
        select: { currentAcademicSessionId: true },
      });
      if (existing?.academicSessionId && existing.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot delete timeline of an inactive or historical session' });
      }
      await academicTermService.softDelete(String(req.params.id));
      sendSuccess(res, { message: 'Academic term deleted' });
    } catch (err) {
      next(err);
    }
  },

  async addVacationDay(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.academicTerm.findUnique({
        where: { id: String(req.params.id) },
        select: { academicSessionId: true, schoolId: true },
      });
      const school = await prisma.school.findUnique({
        where: { id: existing?.schoolId || getTenantId(req) },
        select: { currentAcademicSessionId: true },
      });
      if (existing?.academicSessionId && existing.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify vacations for an inactive or historical session' });
      }
      const vacationDay = await academicTermService.addVacationDay(String(req.params.id), req.body);
      sendSuccess(res, vacationDay, 201);
    } catch (err) {
      next(err);
    }
  },

  async removeVacationDay(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.academicTerm.findUnique({
        where: { id: String(req.params.id) },
        select: { academicSessionId: true, schoolId: true },
      });
      const school = await prisma.school.findUnique({
        where: { id: existing?.schoolId || getTenantId(req) },
        select: { currentAcademicSessionId: true },
      });
      if (existing?.academicSessionId && existing.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify vacations for an inactive or historical session' });
      }
      await academicTermService.removeVacationDay(
        String(req.params.id),
        String(req.params.vacationId),
      );
      sendSuccess(res, { message: 'Vacation day removed' });
    } catch (err) {
      next(err);
    }
  },

  async updateVacationDay(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.academicTerm.findUnique({
        where: { id: String(req.params.id) },
        select: { academicSessionId: true, schoolId: true },
      });
      const school = await prisma.school.findUnique({
        where: { id: existing?.schoolId || getTenantId(req) },
        select: { currentAcademicSessionId: true },
      });
      if (existing?.academicSessionId && existing.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify vacations for an inactive or historical session' });
      }
      const vacationDay = await academicTermService.updateVacationDay(
        String(req.params.id),
        String(req.params.vacationId),
        req.body,
      );
      sendSuccess(res, vacationDay);
    } catch (err) {
      next(err);
    }
  },

  async calculateAvailableDays(req: Request, res: Response, next: NextFunction) {
    try {
      const calculation = await academicTermService.calculateAvailableDays(String(req.params.id));
      sendSuccess(res, calculation);
    } catch (err) {
      next(err);
    }
  },

  async getTeacherTimelineProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = String(req.query.schoolId || getTenantId(req));
      let teacherId = req.query.teacherId as string | undefined;

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

      if (!teacherId || !schoolId) {
        throw new Error('Teacher ID and School ID are required');
      }
      const progress = await academicTermService.getTeacherTimelineProgress(
        String(teacherId),
        String(schoolId),
      );
      sendSuccess(res, progress);
    } catch (err) {
      next(err);
    }
  },
};
