import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { withTenant } from '../repositories/base.repository.js';
import {
  computeChapterStatus,
  computeCompletionPercentage,
  computeOverallProgress,
} from '../utils/chapter-progress.js';

export const progressService = {
  async updateChapterProgress(
    schoolId: string,
    teacherId: string,
    chapterId: string,
    userId: string,
    academicSessionId: string,
    data: {
      teachingCompleted?: boolean;
      qaCompleted?: boolean;
      copyChecked?: boolean;
    },
  ) {
    const chapter = await prisma.chapter.findFirst({
      where: withTenant(schoolId, { id: chapterId, academicSessionId }),
      include: {
        subject: {
          include: {
            class: true,
          },
        },
      },
    });
    if (!chapter) throw new AppError('Chapter not found', 404);

    const existing = await prisma.chapterProgress.findUnique({
      where: {
        schoolId_chapterId_teacherId_academicSessionId: { schoolId, chapterId, teacherId, academicSessionId },
      },
    });

    const flags = {
      teachingCompleted: data.teachingCompleted ?? existing?.teachingCompleted ?? false,
      qaCompleted: data.qaCompleted ?? existing?.qaCompleted ?? false,
      copyChecked: data.copyChecked ?? existing?.copyChecked ?? false,
    };

    const chapterStatus = computeChapterStatus(flags);
    const completionPercentage = computeCompletionPercentage(flags);
    const completedAt = chapterStatus === 'COMPLETED' ? new Date() : null;

    const updated = await prisma.chapterProgress.upsert({
      where: {
        schoolId_chapterId_teacherId_academicSessionId: { schoolId, chapterId, teacherId, academicSessionId },
      },
      create: {
        schoolId,
        academicSessionId,
        chapterId,
        teacherId,
        ...flags,
        chapterStatus,
        completionPercentage,
        completedAt,
        updatedById: userId,
      },
      update: {
        ...flags,
        chapterStatus,
        completionPercentage,
        completedAt,
        updatedById: userId,
      },
      include: { chapter: true },
    });

    const changes: string[] = [];
    if (data.teachingCompleted !== undefined) {
      changes.push(`Teaching: ${data.teachingCompleted ? 'Completed' : 'Pending'}`);
    }
    if (data.qaCompleted !== undefined) {
      changes.push(`Q&A: ${data.qaCompleted ? 'Completed' : 'Pending'}`);
    }
    if (data.copyChecked !== undefined) {
      changes.push(`Copy Checked: ${data.copyChecked ? 'Completed' : 'Pending'}`);
    }
    if (chapterStatus === 'COMPLETED' && existing?.chapterStatus !== 'COMPLETED') {
      changes.push('Chapter Marked as Completed');
    }

    try {
      await prisma.activityLog.create({
        data: {
          schoolId,
          userId,
          action: 'CHAPTER_PROGRESS_UPDATED',
          entityType: 'CHAPTER',
          entityId: chapterId,
          metadata: {
            teacherId,
            chapterTitle: chapter.title,
            chapterNo: chapter.chapterNo,
            subjectName: chapter.subject?.name ?? null,
            className: chapter.subject?.class?.name ?? null,
            teachingCompleted: flags.teachingCompleted,
            qaCompleted: flags.qaCompleted,
            copyChecked: flags.copyChecked,
            chapterStatus,
            completionPercentage,
            completedAt: completedAt?.toISOString() ?? null,
            changes,
          },
        },
      });
    } catch (logErr) {
      console.error('[progressService.updateChapterProgress] Failed to create activity log', logErr);
    }

    return updated;
  },

  async getSchoolDashboardStats(schoolId: string, academicSessionId?: string) {
    const sessionFilter = academicSessionId ? { academicSessionId } : {};
    const [
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalChapters,
      completedChapters,
    ] = await Promise.all([
      prisma.teacher.count({ where: { schoolId, deletedAt: null, ...sessionFilter } }),
      prisma.class.count({ where: { schoolId, deletedAt: null, ...sessionFilter } }),
      prisma.subject.count({ where: { schoolId, deletedAt: null, ...sessionFilter } }),
      prisma.chapter.count({ where: { schoolId, deletedAt: null, ...sessionFilter } }),
      prisma.chapterProgress.count({
        where: { schoolId, chapterStatus: 'COMPLETED', ...sessionFilter, chapter: { deletedAt: null } },
      }),
    ]);

    const pendingChapters = totalChapters - completedChapters;
    const chapterProgress = computeOverallProgress(completedChapters, totalChapters);

    return {
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalChapters,
      completedChapters,
      pendingChapters: Math.max(0, pendingChapters),
      overallProgress: chapterProgress,
      chapterProgress,
    };
  },

  async getSuperAdminStats() {
    const [totalSchools, activeSchools, expiredSchools, totalTeachers, subscriptions] =
      await Promise.all([
        prisma.school.count({ where: { deletedAt: null } }),
        prisma.school.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
        prisma.subscription.count({ where: { status: 'EXPIRED' } }),
        prisma.teacher.count({ where: { deletedAt: null } }),
        prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          include: { plan: true },
        }),
      ]);

    const monthlyRevenue = subscriptions.reduce(
      (sum, sub) => sum + Number(sub.plan.priceMonthly),
      0,
    );

    return { totalSchools, activeSchools, expiredSchools, monthlyRevenue, totalTeachers };
  },

  async getSubjectWiseProgress(schoolId: string, academicSessionId?: string) {
    const sessionFilter = academicSessionId ? { academicSessionId } : {};
    const subjects = await prisma.subject.findMany({
      where: { schoolId, deletedAt: null, ...sessionFilter },
      include: {
        _count: { select: { chapters: true } },
        chapters: {
          where: { deletedAt: null, ...sessionFilter },
          select: { id: true },
        },
      },
    });

    const progressData = await Promise.all(
      subjects.map(async (subject) => {
        const chapterIds = subject.chapters.map((c) => c.id);
        const completed = await prisma.chapterProgress.count({
          where: {
            schoolId,
            chapterId: { in: chapterIds },
            chapterStatus: 'COMPLETED',
            ...sessionFilter,
          },
        });
        return {
          name: subject.name,
          total: subject._count.chapters,
          completed,
          progress: computeOverallProgress(completed, subject._count.chapters),
        };
      }),
    );

    return progressData;
  },

  async updateTopicProgress(
    schoolId: string,
    teacherId: string,
    topicId: string,
    userId: string,
    academicSessionId: string,
    status: 'PENDING' | 'COMPLETED',
  ) {
    const topic = await prisma.topic.findFirst({
      where: withTenant(schoolId, { id: topicId, academicSessionId }),
    });
    if (!topic) throw new AppError('Topic not found', 404);

    return prisma.topicProgress.upsert({
      where: { schoolId_topicId_teacherId_academicSessionId: { schoolId, topicId, teacherId, academicSessionId } },
      create: {
        schoolId,
        academicSessionId,
        topicId,
        teacherId,
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        updatedById: userId,
      },
      update: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        updatedById: userId,
      },
      include: { topic: true },
    });
  },

  async getTeacherChapterProgress(schoolId: string, teacherId: string, academicSessionId?: string) {
    const sessionFilter = academicSessionId ? { academicSessionId } : {};
    
    // Get teacher's assigned subjects
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        teacherClasses: {
          where: sessionFilter,
          include: {
            subject: true,
          },
        },
      },
    });

    if (!teacher) {
      return {
        totalChapters: 0,
        completedChapters: 0,
        progress: 0,
      };
    }

    const assignedSubjectIds = teacher.teacherClasses
      .map((tc: any) => tc.subject?.id)
      .filter((s: string | undefined): s is string => Boolean(s));

    const [totalChapters, completedChapters] = await Promise.all([
      prisma.chapter.count({
        where: {
          schoolId,
          subjectId: { in: assignedSubjectIds },
          deletedAt: null,
          ...sessionFilter,
        },
      }),
      prisma.chapterProgress.count({
        where: {
          schoolId,
          teacherId,
          chapterStatus: 'COMPLETED',
          ...sessionFilter,
          chapter: { deletedAt: null },
        },
      }),
    ]);

    return {
      totalChapters,
      completedChapters,
      progress: computeOverallProgress(completedChapters, totalChapters),
    };
  },

  async getTeacherWiseProgress(schoolId: string, academicSessionId?: string) {
    console.log('[getTeacherWiseProgress] Starting for schoolId:', schoolId, 'academicSessionId:', academicSessionId);

    const sessionFilter = academicSessionId ? { academicSessionId } : {};
    const teachers = await prisma.teacher.findMany({
      where: { schoolId, deletedAt: null, ...sessionFilter },
      include: {
        user: { select: { name: true } },
        teacherClasses: {
          where: sessionFilter,
          include: {
            subject: true,
          },
        },
      },
    });

    console.log('[getTeacherWiseProgress] Found teachers:', teachers.length);

    return Promise.all(
      teachers.map(async (t) => {
        // Get assigned subject IDs
        const assignedSubjectIds = t.teacherClasses
          .map((tc: any) => tc.subject?.id)
          .filter((s: string | undefined): s is string => Boolean(s));

        console.log(
          `[getTeacherWiseProgress] Teacher ${t.user.name}: Assigned subjects: ${assignedSubjectIds.length}`,
        );

        // Get all chapters from assigned subjects
        const chaptersFromSubjects = await prisma.chapter.findMany({
          where: {
            schoolId,
            subjectId: { in: assignedSubjectIds },
            deletedAt: null,
            ...sessionFilter,
          },
          select: { id: true },
        });

        const totalChapters = chaptersFromSubjects.length;
        console.log(
          `[getTeacherWiseProgress] Teacher ${t.user.name}: Total chapters: ${totalChapters}`,
        );

        // Get chapter progress for this teacher
        const chapterProgress = await prisma.chapterProgress.findMany({
          where: {
            schoolId,
            teacherId: t.id,
            chapter: { subjectId: { in: assignedSubjectIds }, ...sessionFilter, deletedAt: null },
            ...sessionFilter,
          },
        });

        const completedChapters = chapterProgress.filter((cp) => cp.chapterStatus === 'COMPLETED').length;
        console.log(
          `[getTeacherWiseProgress] Teacher ${t.user.name}: Completed chapters: ${completedChapters}`,
        );

        const progress =
          totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

        console.log(
          `[getTeacherWiseProgress] Teacher ${t.user.name}: Final progress = ${progress}%`,
        );

        return { name: t.user.name, progress, totalChapters, completedChapters };
      }),
    );
  },

  async getClassWiseProgress(schoolId: string, academicSessionId?: string) {
    const sessionFilter = academicSessionId ? { academicSessionId } : {};
    const classes = await prisma.class.findMany({
      where: { schoolId, deletedAt: null, ...sessionFilter },
      include: {
        subjects: {
          where: { deletedAt: null, ...sessionFilter },
          include: {
            chapters: {
              where: { deletedAt: null, ...sessionFilter },
            },
          },
        },
      },
    });

    return Promise.all(
      classes.map(async (cls) => {
        const allChapters = cls.subjects.flatMap((s) => s.chapters);
        const totalChapters = allChapters.length;
        
        // Count completed chapters for this class (any teacher)
        const completedChapters = await prisma.chapterProgress.count({
          where: {
            schoolId,
            chapterStatus: 'COMPLETED',
            ...sessionFilter,
            chapter: {
              id: { in: allChapters.map((c) => c.id) },
              deletedAt: null,
            },
          },
        });

        const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

        return {
          name: cls.name,
          total: totalChapters,
          completed: completedChapters,
          progress,
        };
      }),
    );
  },
};
