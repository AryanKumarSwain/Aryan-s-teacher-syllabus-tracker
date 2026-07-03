import type { Request, Response, NextFunction } from 'express';
import { schoolService } from '../services/school.service.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';
import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';

export const schoolController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await schoolService.list(req.query as never);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const school = await schoolService.getById(String(req.params.id));
      sendSuccess(res, school);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const school = await schoolService.create(req.body);
      sendSuccess(res, school, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const school = await schoolService.update(String(req.params.id), req.body);
      sendSuccess(res, school);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const school = await schoolService.updateStatus(String(req.params.id), req.body.status);
      sendSuccess(res, school);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await schoolService.softDelete(String(req.params.id));
      sendSuccess(res, { message: 'School deleted' });
    } catch (err) {
      next(err);
    }
  },

  async updateMySchool(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { schoolName } = req.body as { schoolName: string };

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { schoolId: true },
      });

      if (!user || !user.schoolId) {
        throw new AppError('User does not have a school', 400);
      }

      const school = await prisma.school.update({
        where: { id: user.schoolId },
        data: { name: schoolName },
        select: { id: true, name: true },
      });

      sendSuccess(res, school);
    } catch (err) {
      next(err);
    }
  },
};
