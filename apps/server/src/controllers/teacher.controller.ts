import type { Request, Response, NextFunction } from 'express';
import { teacherService } from '../services/teacher.service.js';
import { getTenantId } from '../middleware/tenant.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';

export const teacherController = {
  async bulkCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { teachers } = req.body;
      if (!Array.isArray(teachers) || teachers.length === 0) {
        return res.status(400).json({ success: false, error: 'Teachers array is required' });
      }
      if (teachers.length > 100) {
        return res.status(400).json({ success: false, error: 'Maximum 100 teachers per import' });
      }
      const academicSessionId = (req.query.academicSessionId as string) || (req.body.academicSessionId as string);
      const results = await teacherService.bulkCreate(getTenantId(req), academicSessionId, teachers);
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      sendSuccess(res, { results, succeeded, failed }, 201);
    } catch (err) {
      next(err);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      // Get school's current session if not provided
      let academicSessionId = req.query.academicSessionId as string | undefined;
      if (!academicSessionId) {
        const { prisma } = await import('@school-syllabus/database');
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      const params = {
        ...req.query,
        academicSessionId,
      };
      const result = await teacherService.list(schoolId, params as never);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      // Get school's current session if not provided
      let academicSessionId = (req.query.academicSessionId as string) || (req.body.academicSessionId as string);
      if (!academicSessionId) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Academic session ID is required' });
      }
      
      const teacher = await teacherService.getById(schoolId, academicSessionId, String(req.params.id));
      sendSuccess(res, teacher);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[CREATE TEACHER] body:', JSON.stringify(req.body, null, 2));
      const schoolId = getTenantId(req);
      
      // Get school's current session if not provided
      let academicSessionId = req.body.academicSessionId as string | undefined;
      if (!academicSessionId) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Academic session ID is required' });
      }
      
      const result = await teacherService.create(schoolId, academicSessionId, req.body);
      sendSuccess(res, result, 201);
    } catch (err) {
      console.error('[CREATE TEACHER ERROR]', err);
      next(err);
    }
  },

  async addAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      // Get school's current session if not provided
      let academicSessionId = req.body.academicSessionId as string | undefined;
      if (!academicSessionId) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Academic session ID is required' });
      }
      
      const assignment = await teacherService.createAssignment(
        schoolId,
        academicSessionId,
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, assignment, 201);
    } catch (err) {
      next(err);
    }
  },

  async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      await teacherService.deleteAssignment(
        getTenantId(req),
        String(req.params.id),
        String(req.params.assignmentId),
      );
      sendSuccess(res, { message: 'Assignment removed' });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      // Get school's current session if not provided
      let academicSessionId = req.body.academicSessionId as string | undefined;
      if (!academicSessionId) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Academic session ID is required' });
      }
      
      const teacher = await teacherService.update(
        schoolId,
        academicSessionId,
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, teacher);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      // Get school's current session if not provided
      let academicSessionId = (req.query.academicSessionId as string) || (req.body.academicSessionId as string);
      if (!academicSessionId) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Academic session ID is required' });
      }
      
      await teacherService.softDelete(schoolId, academicSessionId, String(req.params.id));
      sendSuccess(res, { message: 'Teacher deleted' });
    } catch (err) {
      next(err);
    }
  },
};
