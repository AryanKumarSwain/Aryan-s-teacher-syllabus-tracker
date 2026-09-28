import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@school-syllabus/database';
import { getTenantId } from '../middleware/tenant.js';
import { syllabusService } from '../services/syllabus.service.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';

export const syllabusController = {
  async listClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const activeSessionId = school?.currentAcademicSessionId || undefined;

      let teacherId: string | undefined;
      let academicSessionId: string | undefined;

      if (req.user?.role === 'TEACHER') {
        academicSessionId = activeSessionId;
        const teacher = await prisma.teacher.findFirst({
          where: {
            schoolId,
            userId: req.user.sub,
            ...(activeSessionId ? { academicSessionId: activeSessionId } : {}),
          },
        });
        teacherId = teacher?.id;
      } else {
        academicSessionId = (req.query.academicSessionId as string) || activeSessionId;
      }

      const params = {
        page: Number(req.query.page) || 1,
        pageSize: Number(req.query.pageSize) || 100,
        search: req.query.search as string | undefined,
        academicSessionId,
      };
      const result = await syllabusService.listClasses(schoolId, params, teacherId);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async createClass(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      if (req.body.academicSessionId && req.body.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot create classes in an inactive or historical session' });
      }
      const item = await syllabusService.createClass(schoolId, {
        ...req.body,
        academicSessionId: req.body.academicSessionId || school?.currentAcademicSessionId,
      });
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async getClassDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const activeSessionId = school?.currentAcademicSessionId || undefined;

      let teacherId: string | undefined;
      let academicSessionId: string | undefined;

      if (req.user?.role === 'TEACHER') {
        academicSessionId = activeSessionId;
        const teacher = await prisma.teacher.findFirst({
          where: {
            schoolId,
            userId: req.user.sub,
            ...(activeSessionId ? { academicSessionId: activeSessionId } : {}),
          },
        });
        teacherId = teacher?.id;
      } else {
        academicSessionId = (req.query.academicSessionId as string) || activeSessionId;
      }

      const item = await syllabusService.getClassDetails(
        schoolId,
        String(req.params.id),
        teacherId,
        academicSessionId,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async listAssignedClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const activeSessionId = school?.currentAcademicSessionId || undefined;

      const teacher = await prisma.teacher.findFirst({
        where: {
          schoolId,
          userId: req.user!.sub,
          ...(activeSessionId ? { academicSessionId: activeSessionId } : {}),
        },
      });
      if (!teacher) throw new Error('Teacher profile not found for the active academic session');
      
      const academicSessionId = activeSessionId;
      const params = {
        ...req.query,
        academicSessionId,
      };
      const result = await syllabusService.listAssignedClasses(
        schoolId,
        teacher.id,
        params as never,
      );
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async updateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const sub = await prisma.subject.findUnique({
        where: { id: String(req.params.id) },
        select: { class: { select: { academicSessionId: true } } },
      });
      if (sub?.class?.academicSessionId && sub.class.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify subjects in an inactive or historical session' });
      }
      const item = await syllabusService.updateSubject(
        schoolId,
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async updateChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const ch = await prisma.chapter.findUnique({
        where: { id: String(req.params.id) },
        select: { subject: { select: { class: { select: { academicSessionId: true } } } } },
      });
      if (ch?.subject?.class?.academicSessionId && ch.subject.class.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify chapters in an inactive or historical session' });
      }
      const item = await syllabusService.updateChapter(
        schoolId,
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async updateTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const tp = await prisma.topic.findUnique({
        where: { id: String(req.params.id) },
        select: { chapter: { select: { subject: { select: { class: { select: { academicSessionId: true } } } } } } },
      });
      if (tp?.chapter?.subject?.class?.academicSessionId && tp.chapter.subject.class.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify topics in an inactive or historical session' });
      }
      const item = await syllabusService.updateTopic(
        schoolId,
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async listSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const activeSessionId = school?.currentAcademicSessionId || undefined;

      let teacherId: string | undefined;
      let academicSessionId: string | undefined;

      if (req.user?.role === 'TEACHER') {
        academicSessionId = activeSessionId;
        const teacher = await prisma.teacher.findFirst({
          where: {
            schoolId,
            userId: req.user.sub,
            ...(activeSessionId ? { academicSessionId: activeSessionId } : {}),
          },
        });
        teacherId = teacher?.id;
      } else {
        academicSessionId = (req.query.academicSessionId as string) || activeSessionId;
      }

      const items = await syllabusService.listSubjects(
        schoolId,
        req.query.classId as string | undefined,
        academicSessionId,
        teacherId,
      );
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async getSubjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const activeSessionId = school?.currentAcademicSessionId || undefined;
      const academicSessionId = (req.query.academicSessionId as string) || activeSessionId;

      const item = await syllabusService.getSubjectById(
        schoolId,
        req.params.id as string,
        academicSessionId,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async createSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      if (req.body.classId) {
        const cls = await prisma.class.findUnique({
          where: { id: req.body.classId },
          select: { academicSessionId: true },
        });
        if (cls?.academicSessionId && cls.academicSessionId !== school?.currentAcademicSessionId) {
          return res.status(400).json({ success: false, error: 'Cannot create subjects in an inactive or historical session' });
        }
      }
      const item = await syllabusService.createSubject(schoolId, req.body);
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async listChapters(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const activeSessionId = school?.currentAcademicSessionId || undefined;

      let teacherId: string | undefined;
      let academicSessionId: string | undefined;

      if (req.user?.role === 'TEACHER') {
        academicSessionId = activeSessionId;
        const teacher = await prisma.teacher.findFirst({
          where: {
            schoolId,
            userId: req.user.sub,
            ...(activeSessionId ? { academicSessionId: activeSessionId } : {}),
          },
        });
        teacherId = teacher?.id;
      } else {
        academicSessionId = (req.query.academicSessionId as string) || activeSessionId;
      }

      const items = await syllabusService.listChapters(
        schoolId,
        req.query.subjectId as string | undefined,
        teacherId,
        academicSessionId,
      );
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async createChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      if (req.body.subjectId) {
        const sub = await prisma.subject.findUnique({
          where: { id: req.body.subjectId },
          select: { class: { select: { academicSessionId: true } } },
        });
        if (sub?.class?.academicSessionId && sub.class.academicSessionId !== school?.currentAcademicSessionId) {
          return res.status(400).json({ success: false, error: 'Cannot add chapters in an inactive or historical session' });
        }
      }
      const item = await syllabusService.createChapter(schoolId, req.body);
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async createTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      if (req.body.chapterId) {
        const ch = await prisma.chapter.findUnique({
          where: { id: req.body.chapterId },
          select: { subject: { select: { class: { select: { academicSessionId: true } } } } },
        });
        if (ch?.subject?.class?.academicSessionId && ch.subject.class.academicSessionId !== school?.currentAcademicSessionId) {
          return res.status(400).json({ success: false, error: 'Cannot add topics in an inactive or historical session' });
        }
      }
      const item = await syllabusService.createTopic(schoolId, req.body);
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const activeSessionId = school?.currentAcademicSessionId || undefined;
      
      let academicSessionId = (req.query.academicSessionId as string) || activeSessionId;
      if (req.user?.role === 'TEACHER') {
        academicSessionId = activeSessionId;
      }

      const tree = await syllabusService.getTree(
        schoolId,
        academicSessionId,
      );
      sendSuccess(res, tree);
    } catch (err) {
      next(err);
    }
  },

  async listTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await syllabusService.listTopics(getTenantId(req), String(req.query.chapterId));
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async updateClass(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const existing = await prisma.class.findUnique({
        where: { id: String(req.params.id) },
        select: { academicSessionId: true },
      });
      if (existing?.academicSessionId && existing.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot modify classes in an inactive or historical session' });
      }
      const item = await syllabusService.updateClass(
        schoolId,
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async deleteClass(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const existing = await prisma.class.findUnique({
        where: { id: String(req.params.id) },
        select: { academicSessionId: true },
      });
      if (existing?.academicSessionId && existing.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot delete classes in an inactive or historical session' });
      }
      await syllabusService.deleteClass(schoolId, String(req.params.id));
      sendSuccess(res, { message: 'Class deleted' });
    } catch (err) {
      next(err);
    }
  },

  async reorderChapters(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      await syllabusService.reorderChapters(schoolId, req.body.orderedIds);
      sendSuccess(res, { message: 'Chapters reordered' });
    } catch (err) {
      next(err);
    }
  },

  async deleteChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const ch = await prisma.chapter.findUnique({
        where: { id: String(req.params.id) },
        select: { subject: { select: { class: { select: { academicSessionId: true } } } } },
      });
      if (ch?.subject?.class?.academicSessionId && ch.subject.class.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot delete chapters in an inactive or historical session' });
      }
      await syllabusService.deleteChapter(schoolId, String(req.params.id));
      sendSuccess(res, { message: 'Chapter deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ✅ ADDED
  async deleteSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const sub = await prisma.subject.findUnique({
        where: { id: String(req.params.id) },
        select: { class: { select: { academicSessionId: true } } },
      });
      if (sub?.class?.academicSessionId && sub.class.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot delete subjects in an inactive or historical session' });
      }
      await syllabusService.deleteSubject(schoolId, String(req.params.id));
      sendSuccess(res, { message: 'Subject deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ✅ ADDED
  async deleteTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const tp = await prisma.topic.findUnique({
        where: { id: String(req.params.id) },
        select: { chapter: { select: { subject: { select: { class: { select: { academicSessionId: true } } } } } } },
      });
      if (tp?.chapter?.subject?.class?.academicSessionId && tp.chapter.subject.class.academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot delete topics in an inactive or historical session' });
      }
      await syllabusService.deleteTopic(schoolId, String(req.params.id));
      sendSuccess(res, { message: 'Topic deleted' });
    } catch (err) {
      next(err);
    }
  },

  async bulkCreateClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const { academicSessionId, classes } = req.body;
      if (academicSessionId && academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot bulk create classes in an inactive or historical session' });
      }
      const targetSessionId = academicSessionId || school?.currentAcademicSessionId;
      const result = await syllabusService.bulkCreateClasses(schoolId, targetSessionId, classes);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },

  async bulkCreateSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const { academicSessionId, subjects } = req.body;
      if (academicSessionId && academicSessionId !== school?.currentAcademicSessionId) {
        return res.status(400).json({ success: false, error: 'Cannot bulk create subjects in an inactive or historical session' });
      }
      const targetSessionId = academicSessionId || school?.currentAcademicSessionId;
      const result = await syllabusService.bulkCreateSubjects(schoolId, targetSessionId, subjects);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
};
