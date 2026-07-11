import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@school-syllabus/types';
import { getTenantId } from '../middleware/tenant.js';
import { progressService } from '../services/progress.service.js';
import { progressionService } from '../services/progression.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';

export const dashboardController = {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role === UserRole.SUPER_ADMIN) {
        const stats = await progressService.getSuperAdminStats();
        return sendSuccess(res, stats);
      }
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
      
      const stats = await progressService.getSchoolDashboardStats(schoolId, academicSessionId);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  },

  async getTeacherProgressHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const { teacherName } = req.params;

      // Find teacher by name
      const teacher = await prisma.teacher.findFirst({
        where: {
          schoolId,
          user: { name: teacherName as string },
        },
        include: {
          user: true,
          teacherClasses: {
            include: {
              subject: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new AppError('Teacher not found', 404);
      }

      // Get assigned subject IDs
      const assignedSubjectIds = teacher.teacherClasses
        .map((tc: any) => tc.subject?.id)
        .filter((s: string | undefined): s is string => Boolean(s));

      // Get all topics from assigned subjects
      const topicsFromSubjects = await prisma.topic.findMany({
        where: {
          schoolId,
          chapter: { subjectId: { in: assignedSubjectIds }, deletedAt: null },
          deletedAt: null,
        },
        select: { id: true },
      });

      const totalTopics = topicsFromSubjects.length;

      // Get topic progress with completion dates
      const topicProgress = await prisma.topicProgress.findMany({
        where: {
          schoolId,
          teacherId: teacher.id,
          topicId: { in: topicsFromSubjects.map((t: any) => t.id) },
          status: 'COMPLETED',
        },
        include: {
          topic: {
            select: {
              chapterId: true,
            },
          },
        },
        orderBy: { completedAt: 'asc' },
      });

      // Get chapter progress with completion dates
      const chapterProgress = await prisma.chapterProgress.findMany({
        where: {
          schoolId,
          teacherId: teacher.id,
          chapter: { subjectId: { in: assignedSubjectIds } },
          chapterStatus: 'COMPLETED',
        },
        include: {
          chapter: {
            include: {
              topics: true,
            },
          },
        },
        orderBy: { updatedAt: 'asc' },
      });

      // Build progress timeline
      const progressTimeline: { date: Date; completedTopics: number }[] = [];
      let completedCount = 0;
      const processedTopicIds = new Set<string>();

      // Process topic progress
      topicProgress.forEach((tp: any) => {
        if (tp.completedAt && !processedTopicIds.has(tp.topicId)) {
          processedTopicIds.add(tp.topicId);
          completedCount++;
          progressTimeline.push({
            date: tp.completedAt,
            completedTopics: completedCount,
          });
        }
      });

      // Process chapter progress (add topics from completed chapters)
      chapterProgress.forEach((cp: any) => {
        const chapterTopics = cp.chapter.topics;
        chapterTopics.forEach((topic: any) => {
          if (
            topicsFromSubjects.some((t: any) => t.id === topic.id) &&
            !processedTopicIds.has(topic.id)
          ) {
            processedTopicIds.add(topic.id);
            completedCount++;
            progressTimeline.push({
              date: cp.updatedAt,
              completedTopics: completedCount,
            });
          }
        });
      });

      // Sort by date
      progressTimeline.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Convert to percentage
      const historyData = progressTimeline.map((item) => ({
        date: item.date.toISOString(),
        progress: totalTopics > 0 ? Math.round((item.completedTopics / totalTopics) * 100) : 0,
      }));

      sendSuccess(res, { history: historyData, totalTopics });
    } catch (err) {
      next(err);
    }
  },

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
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
      
      const academicYearId = req.query.academicYearId as string | undefined;
      
      // Resolve academic session ID from academic year ID if needed
      let resolvedSessionId = academicSessionId;
      if (academicYearId && !academicSessionId) {
        // Try to find if it's an academic session
        const { prisma } = await import('@school-syllabus/database');
        const session = await prisma.academicSession.findFirst({
          where: { id: academicYearId, schoolId, deletedAt: null },
        });
        if (session) {
          resolvedSessionId = session.id;
        }
      }
      
      const analytics = await progressionService.getProgressionAnalytics(schoolId, academicYearId);

      // Use progressService for teacher progress to match /admin/teachers
      const teacherProgressData = await progressService.getTeacherWiseProgress(schoolId, resolvedSessionId);
      const subjectProgressData = await progressService.getSubjectWiseProgress(schoolId, resolvedSessionId);

      // Transform data to match frontend expectations
      const subjectProgress = analytics.subjectProgress.map((sp) => ({
        name: sp.subjectName,
        progress: sp.percentageComplete,
        classId: sp.classId,
        className: sp.className,
        total: sp.totalTopics,
        completed: sp.completedTopics,
      }));

      const teacherProgress = teacherProgressData.map((tp) => ({
        name: tp.name,
        progress: tp.progress,
        classId: tp.name, // Using name as placeholder
        totalTopics: tp.totalTopics,
        completedTopics: tp.completedTopics,
      }));

      const classProgress = analytics.classProgress.map((cp) => ({
        classId: cp.classId,
        className: cp.className,
        totalTopics: cp.totalTopics,
        completedTopics: cp.completedTopics,
        percentageComplete: cp.percentageComplete,
      }));

      sendSuccess(res, {
        globalTimeline: analytics.globalTimeline,
        subjectProgress,
        teacherProgress,
        classProgress,
      });
    } catch (err) {
      next(err);
    }
  },
};
