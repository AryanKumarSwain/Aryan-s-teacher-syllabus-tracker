import type { Request, Response, NextFunction } from 'express';
import { academicTermService } from '../services/academic-term.service.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';

export const academicTermController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await academicTermService.list(req.query as never);
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
      const term = await academicTermService.update(String(req.params.id), req.body);
      sendSuccess(res, term);
    } catch (err) {
      console.error('[AcademicTermController.update] Error:', err);
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await academicTermService.softDelete(String(req.params.id));
      sendSuccess(res, { message: 'Academic term deleted' });
    } catch (err) {
      next(err);
    }
  },

  async addVacationDay(req: Request, res: Response, next: NextFunction) {
    try {
      const vacationDay = await academicTermService.addVacationDay(String(req.params.id), req.body);
      sendSuccess(res, vacationDay, 201);
    } catch (err) {
      next(err);
    }
  },

  async removeVacationDay(req: Request, res: Response, next: NextFunction) {
    try {
      await academicTermService.removeVacationDay(
        String(req.params.id),
        String(req.params.vacationId),
      );
      sendSuccess(res, { message: 'Vacation day removed' });
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
      const { teacherId, schoolId } = req.query;
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
