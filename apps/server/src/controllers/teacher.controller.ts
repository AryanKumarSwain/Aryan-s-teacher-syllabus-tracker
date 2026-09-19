import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@school-syllabus/database';
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
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      let academicSessionId: string | undefined =
        (req.query.academicSessionId as string) || (req.body.academicSessionId as string) || undefined;
      if (academicSessionId && academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot import teachers into an inactive or historical session' });
      }
      if (!academicSessionId) {
        academicSessionId = school?.currentAcademicSessionId ?? undefined;
      }
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Active academic session ID is required' });
      }
      const results = await teacherService.bulkCreate(schoolId, academicSessionId, teachers);
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
      console.log('[DEBUG] teacher.list - initial academicSessionId from query:', academicSessionId);
      if (!academicSessionId) {
        const { prisma } = await import('@school-syllabus/database');
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { currentAcademicSessionId: true },
        });
        academicSessionId = school?.currentAcademicSessionId || undefined;
        console.log('[DEBUG] teacher.list - academicSessionId from school:', academicSessionId);
      }
      
      const params = {
        ...req.query,
        academicSessionId,
        termFilter: req.query.termFilter as string | undefined,
      };
      console.log('[DEBUG] teacher.list - calling service with academicSessionId:', academicSessionId);
      const result = await teacherService.list(schoolId, params as never);
      console.log('[DEBUG] teacher.list - result items count:', result.items.length);
      result.items.forEach((t: any) => {
        console.log('[DEBUG] teacher:', t.user?.name, 'progressPercentage:', t.progressPercentage);
      });
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      console.log('[DEBUG] teacher.list error:', err);
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      // Get school's current session if not provided
      let academicSessionId: string | undefined = (req.query.academicSessionId as string) || (req.body.academicSessionId as string);
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
      
      const termFilter = req.query.termFilter as string | undefined;
      const teacher = await teacherService.getById(schoolId, academicSessionId, String(req.params.id), termFilter);
      sendSuccess(res, teacher);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[CREATE TEACHER] body:', JSON.stringify(req.body, null, 2));
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      
      let academicSessionId = req.body.academicSessionId as string | undefined;
      if (academicSessionId && academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot create teachers in an inactive or historical session' });
      }
      if (!academicSessionId) {
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Active academic session ID is required' });
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
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      
      let academicSessionId = req.body.academicSessionId as string | undefined;
      if (academicSessionId && academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot add assignments in an inactive or historical session' });
      }
      if (!academicSessionId) {
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Active academic session ID is required' });
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
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const teacher = await prisma.teacher.findUnique({
        where: { id: String(req.params.id) },
        select: { academicSessionId: true },
      });
      if (teacher?.academicSessionId && teacher.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify assignments in an inactive or historical session' });
      }
      await teacherService.deleteAssignment(
        schoolId,
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
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      
      let academicSessionId = req.body.academicSessionId as string | undefined;
      if (academicSessionId && academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot update teachers in an inactive or historical session' });
      }
      if (!academicSessionId) {
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Active academic session ID is required' });
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
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      
      let academicSessionId: string | undefined = (req.query.academicSessionId as string) || (req.body.academicSessionId as string);
      if (academicSessionId && academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot delete teachers in an inactive or historical session' });
      }
      if (!academicSessionId) {
        academicSessionId = school?.currentAcademicSessionId || undefined;
      }
      
      if (!academicSessionId) {
        return res.status(400).json({ success: false, error: 'Active academic session ID is required' });
      }
      
      await teacherService.softDelete(schoolId, academicSessionId, String(req.params.id));
      sendSuccess(res, { message: 'Teacher deleted' });
    } catch (err) {
      next(err);
    }
  },
};
