import type { Request, Response, NextFunction } from 'express';
import { academicSessionService } from '../services/academic-session.service.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';

export const academicSessionController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await academicSessionService.list(req.query as never);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await academicSessionService.getById(String(req.params.id));
      sendSuccess(res, session);
    } catch (err) {
      next(err);
    }
  },

  async getBySchool(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId || String(req.query.schoolId);
      if (!schoolId) {
        return res
          .status(400)
          .json({ success: false, error: 'schoolId is required' });
      }
      const sessions = await academicSessionService.getBySchoolId(schoolId);
      sendSuccess(res, sessions);
    } catch (err) {
      next(err);
    }
  },


  async switchSession(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId || String(req.body.schoolId);
      const sessionId = String(req.body.sessionId);
      
      if (!schoolId || !sessionId) {
        return res
          .status(400)
          .json({ success: false, error: 'schoolId and sessionId are required' });
      }
      const school = await academicSessionService.switchSession(schoolId, sessionId);
      sendSuccess(res, school);
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await academicSessionService.archive(String(req.params.id));
      sendSuccess(res, session);
    } catch (err) {
      next(err);
    }
  },

  async importClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const { sourceSessionId, targetSessionId } = req.body;
      if (!sourceSessionId || !targetSessionId) {
        return res
          .status(400)
          .json({ success: false, error: 'sourceSessionId and targetSessionId are required' });
      }
      const result = await academicSessionService.importClasses(sourceSessionId, targetSessionId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async importSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { sourceSessionId, targetSessionId } = req.body;
      if (!sourceSessionId || !targetSessionId) {
        return res
          .status(400)
          .json({ success: false, error: 'sourceSessionId and targetSessionId are required' });
      }
      const result = await academicSessionService.importSubjects(sourceSessionId, targetSessionId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async importTeachers(req: Request, res: Response, next: NextFunction) {
    try {
      const { sourceSessionId, targetSessionId } = req.body;
      if (!sourceSessionId || !targetSessionId) {
        return res
          .status(400)
          .json({ success: false, error: 'sourceSessionId and targetSessionId are required' });
      }
      const result = await academicSessionService.importTeachers(sourceSessionId, targetSessionId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async importSyllabus(req: Request, res: Response, next: NextFunction) {
    try {
      const { sourceSessionId, targetSessionId } = req.body;
      if (!sourceSessionId || !targetSessionId) {
        return res
          .status(400)
          .json({ success: false, error: 'sourceSessionId and targetSessionId are required' });
      }
      const result = await academicSessionService.importSyllabus(sourceSessionId, targetSessionId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
};
