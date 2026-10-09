import type { NextFunction, Request, Response } from 'express';
import { prisma } from '@school-syllabus/database';
import { examPaperService } from '../services/exam-paper.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { getTenantId } from '../middleware/tenant.js';
import { uploadImage } from '../utils/upload.js';

export const examPaperController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const paper = await examPaperService.createPaper({
        schoolId,
        teacherUserId: req.user?.sub ?? '',
        classId: req.body.classId,
        subjectId: req.body.subjectId,
        examName: req.body.examName,
        examDate: req.body.examDate,
        totalMarks: req.body.totalMarks,
        duration: req.body.duration,
        status: req.body.status,
        templateType: req.body.templateType,
        styleFontFamily: req.body.styleFontFamily,
        styleFontSize: req.body.styleFontSize,
        styleColor: req.body.styleColor,
      });
      sendSuccess(res, paper, 201);
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const teacherId = req.user?.role === 'TEACHER' ? await examPaperService.resolveTeacherId(schoolId, req.user.sub) : undefined;
      
      // Get school's current academic session
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      const academicSessionId = school?.currentAcademicSessionId || undefined;
      
      const papers = await examPaperService.listPapers(schoolId, academicSessionId, teacherId);
      sendSuccess(res, papers);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const paper = await examPaperService.getPaper(String(req.params.id), schoolId);
      sendSuccess(res, paper);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const paper = await examPaperService.updatePaper(String(req.params.id), schoolId, req.body);
      sendSuccess(res, paper);
    } catch (error) {
      next(error);
    }
  },

  async uploadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const pdfUrl = await uploadImage(req.file.buffer, 'exam-papers');
      
      const paper = await examPaperService.updatePaper(String(req.params.id), schoolId, { pdfUrl });
      sendSuccess(res, paper);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      await examPaperService.deletePaper(String(req.params.id), schoolId);
      sendSuccess(res, { success: true });
    } catch (error) {
      next(error);
    }
  },

  async saveTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const template = await examPaperService.saveTemplate(schoolId, req.body);
      if (req.body.logoUrl !== undefined) {
        await prisma.school.update({
          where: { id: schoolId },
          data: { logo: req.body.logoUrl || null },
        });
      }
      sendSuccess(res, template);
    } catch (error) {
      next(error);
    }
  },

  async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const template = await examPaperService.getTemplate(schoolId);
      sendSuccess(res, template);
    } catch (error) {
      next(error);
    }
  },

  async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const logoUrl = await uploadImage(req.file.buffer, 'school-logos');
      
      const template = await examPaperService.saveTemplate(schoolId, { logoUrl });
      await prisma.school.update({
        where: { id: schoolId },
        data: { logo: logoUrl },
      });
      sendSuccess(res, template);
    } catch (error) {
      console.error('[uploadLogo error]:', error);
      next(error);
    }
  },

  async removeLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const template = await examPaperService.saveTemplate(schoolId, { logoUrl: null as any });
      await prisma.school.update({
        where: { id: schoolId },
        data: { logo: null },
      });
      sendSuccess(res, { message: 'School logo removed successfully', template });
    } catch (error) {
      console.error('[removeLogo error]:', error);
      next(error);
    }
  },

  async uploadQuestionImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const imageUrl = await uploadImage(req.file.buffer, 'question-images');
      sendSuccess(res, { imageUrl });
    } catch (error) {
      console.error('[uploadQuestionImage error]:', error);
      next(error);
    }
  },

  async getExamNames(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const template = await examPaperService.getTemplate(schoolId);
      let examNames = ['Term 1', 'Term 2'];
      if (template?.footerHtml) {
        try {
          const parsed = JSON.parse(template.footerHtml);
          if (Array.isArray(parsed.examNames) && parsed.examNames.length > 0) {
            examNames = parsed.examNames;
          }
        } catch {
          // not json, keep default
        }
      }
      sendSuccess(res, { examNames });
    } catch (error) {
      next(error);
    }
  },

  async updateExamNames(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const { examNames } = req.body;
      if (!Array.isArray(examNames)) {
        return res.status(400).json({ error: 'examNames must be an array of strings' });
      }
      const cleanNames = examNames.map((n: any) => String(n).trim()).filter(Boolean);
      const finalNames = cleanNames.length > 0 ? cleanNames : ['Term 1', 'Term 2'];

      const existing = await examPaperService.getTemplate(schoolId);
      let existingObj: Record<string, any> = {};
      if (existing?.footerHtml) {
        try {
          existingObj = JSON.parse(existing.footerHtml);
        } catch {
          // ignore non-json
        }
      }
      existingObj.examNames = finalNames;

      await examPaperService.saveTemplate(schoolId, {
        footerHtml: JSON.stringify(existingObj),
      });
      sendSuccess(res, { examNames: finalNames });
    } catch (error) {
      next(error);
    }
  },
};
