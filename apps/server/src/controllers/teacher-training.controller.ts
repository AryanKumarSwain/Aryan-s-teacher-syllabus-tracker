import type { NextFunction, Request, Response } from 'express';
import { teacherTrainingService } from '../services/teacher-training.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { getTenantId } from '../middleware/tenant.js';

export const teacherTrainingController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const academicSessionId = req.query.academicSessionId as string | undefined;
      const search = req.query.search as string | undefined;

      const teachers = await teacherTrainingService.listTeachersWithCpd(schoolId, academicSessionId, search);
      sendSuccess(res, teachers);
    } catch (error) {
      next(error);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const academicSessionId = req.query.academicSessionId as string | undefined;

      const stats = await teacherTrainingService.getSchoolCpdStats(schoolId, academicSessionId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  },

  async getCatalog(_req: Request, res: Response, next: NextFunction) {
    try {
      const catalog = teacherTrainingService.getCatalog();
      sendSuccess(res, catalog);
    } catch (error) {
      next(error);
    }
  },

  async getMyCpd(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const userId = req.user?.sub ?? '';
      const teacherId = await teacherTrainingService.resolveTeacherId(schoolId, userId);
      const academicSessionId = req.query.academicSessionId as string | undefined;

      const detail = await teacherTrainingService.getTeacherCpdDetail(teacherId, schoolId, academicSessionId);
      sendSuccess(res, detail);
    } catch (error) {
      next(error);
    }
  },

  async createMyTraining(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const userId = req.user?.sub ?? '';
      const teacherId = await teacherTrainingService.resolveTeacherId(schoolId, userId);
      const academicSessionId = req.query.academicSessionId as string | undefined;

      const result = await teacherTrainingService.createTraining(
        schoolId,
        {
          ...req.body,
          teacherId,
          status: 'VERIFIED', // Default verified for ease of use, or teacher logged
        },
        academicSessionId,
      );
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  async getTeacherCpd(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const teacherId = String(req.params.teacherId);
      const academicSessionId = req.query.academicSessionId as string | undefined;

      const detail = await teacherTrainingService.getTeacherCpdDetail(teacherId, schoolId, academicSessionId);
      sendSuccess(res, detail);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const academicSessionId = req.query.academicSessionId as string | undefined;

      const result = await teacherTrainingService.createTraining(schoolId, req.body, academicSessionId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const id = String(req.params.id);

      const record = await teacherTrainingService.updateTraining(id, schoolId, req.body);
      sendSuccess(res, record);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const id = String(req.params.id);

      await teacherTrainingService.deleteTraining(id, schoolId);
      sendSuccess(res, { success: true });
    } catch (error) {
      next(error);
    }
  },
};
