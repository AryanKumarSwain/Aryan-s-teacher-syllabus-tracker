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
    data: {
      teachingCompleted?: boolean;
      qaCompleted?: boolean;
      copyChecked?: boolean;
    },
  ) {
    const chapter = await prisma.chapter.findFirst({
      where: withTenant(schoolId, { id: chapterId }),
    });
    if (!chapter) throw new AppError('Chapter not found', 404);

    const existing = await prisma.chapterProgress.findUnique({
      where: {
        schoolId_chapterId_teacherId: { schoolId, chapterId, teacherId },
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

    return prisma.chapterProgress.upsert({
      where: {
        schoolId_chapterId_teacherId: { schoolId, chapterId, teacherId },
      },
      create: {
        schoolId,
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
  },

  async getSchoolDashboardStats(schoolId: string) {
    const [
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalChapters,
      completedChapters,
      totalTopics,
      completedTopics,
    ] = await Promise.all([
      prisma.teacher.count({ where: { schoolId, deletedAt: null } }),
      prisma.class.count({ where: { schoolId, deletedAt: null } }),
      prisma.subject.count({ where: { schoolId, deletedAt: null } }),
      prisma.chapter.count({ where: { schoolId, deletedAt: null } }),
      prisma.chapterProgress.count({
        where: { schoolId, chapterStatus: 'COMPLETED' },
      }),
      prisma.topic.count({ where: { schoolId, deletedAt: null } }),
      prisma.topicProgress.count({ where: { schoolId, status: 'COMPLETED' } }),
    ]);

    const pendingChapters = totalChapters - completedChapters;
    const chapterProgress = computeOverallProgress(completedChapters, totalChapters);
    const topicProgress = computeOverallProgress(completedTopics, totalTopics);

    return {
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalChapters,
      completedChapters,
      pendingChapters: Math.max(0, pendingChapters),
      overallProgress: topicProgress || chapterProgress,
      totalTopics,
      completedTopics,
      pendingTopics: Math.max(0, totalTopics - completedTopics),
      topicProgress,
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

  async getSubjectWiseProgress(schoolId: string) {
    const subjects = await prisma.subject.findMany({
      where: { schoolId, deletedAt: null },
      include: {
        _count: { select: { chapters: true } },
        chapters: {
          where: { deletedAt: null },
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
    status: 'PENDING' | 'COMPLETED',
  ) {
    const topic = await prisma.topic.findFirst({
      where: withTenant(schoolId, { id: topicId }),
    });
    if (!topic) throw new AppError('Topic not found', 404);

    return prisma.topicProgress.upsert({
      where: { schoolId_topicId_teacherId: { schoolId, topicId, teacherId } },
      create: {
        schoolId,
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

  async getTeacherTopicProgress(schoolId: string, teacherId: string) {
    const [totalTopics, completedTopics] = await Promise.all([
      prisma.topic.count({ where: { schoolId, deletedAt: null } }),
      prisma.topicProgress.count({
        where: { schoolId, teacherId, status: 'COMPLETED' },
      }),
    ]);

    return {
      totalTopics,
      completedTopics,
      progress: computeOverallProgress(completedTopics, totalTopics),
    };
  },

  async getTeacherWiseProgress(schoolId: string) {
    console.log('[getTeacherWiseProgress] Starting for schoolId:', schoolId);

    const teachers = await prisma.teacher.findMany({
      where: { schoolId, deletedAt: null },
      include: {
        user: { select: { name: true } },
        teacherClasses: {
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

        // Get all topics from assigned subjects (same as teacher.service.getById)
        const topicsFromSubjects = await prisma.topic.findMany({
          where: {
            schoolId,
            chapter: { subjectId: { in: assignedSubjectIds }, deletedAt: null },
            deletedAt: null,
          },
          select: { id: true },
        });

        const totalTopics = topicsFromSubjects.length;
        console.log(
          `[getTeacherWiseProgress] Teacher ${t.user.name}: Total topics: ${totalTopics}`,
        );

        // Get topic progress for this teacher (same as teacher.service.getById)
        const topicProgress = await prisma.topicProgress.findMany({
          where: {
            schoolId,
            teacherId: t.id,
            topicId: { in: topicsFromSubjects.map((t) => t.id) },
          },
          include: {
            topic: {
              select: {
                chapterId: true,
              },
            },
          },
        });

        const completedTopics = topicProgress.filter((tp) => tp.status === 'COMPLETED').length;
        console.log(
          `[getTeacherWiseProgress] Teacher ${t.user.name}: Completed topics from topicProgress: ${completedTopics}`,
        );

        // Get chapter progress for this teacher (same as teacher.service.getById)
        const chapterProgress = await prisma.chapterProgress.findMany({
          where: {
            schoolId,
            teacherId: t.id,
            chapter: { subjectId: { in: assignedSubjectIds } },
          },
          include: {
            chapter: {
              include: {
                topics: true,
              },
            },
          },
        });

        // Add topics from completed chapters (same as teacher.service.getById)
        let totalCompletedTopics = completedTopics;
        chapterProgress.forEach((cp) => {
          if (cp.chapterStatus === 'COMPLETED') {
            const chapterTopics = cp.chapter.topics;
            const alreadyCountedTopics = topicProgress
              .filter((tp) => tp.topic.chapterId === cp.chapterId)
              .map((tp) => tp.topicId);

            chapterTopics.forEach((topic) => {
              if (
                !alreadyCountedTopics.includes(topic.id) &&
                topicsFromSubjects.some((t) => t.id === topic.id)
              ) {
                totalCompletedTopics++;
              }
            });
          }
        });

        console.log(
          `[getTeacherWiseProgress] Teacher ${t.user.name}: Total completed topics: ${totalCompletedTopics}`,
        );

        const progress =
          totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

        console.log(
          `[getTeacherWiseProgress] Teacher ${t.user.name}: Final progress = ${progress}%`,
        );

        return { name: t.user.name, progress, totalTopics, completedTopics: totalCompletedTopics };
      }),
    );
  },

  async getClassWiseProgress(schoolId: string) {
    const classes = await prisma.class.findMany({
      where: { schoolId, deletedAt: null },
      include: {
        subjects: {
          where: { deletedAt: null },
          include: {
            chapters: {
              where: { deletedAt: null },
              include: { topics: { where: { deletedAt: null } } },
            },
          },
        },
      },
    });

    return classes.map((cls) => {
      const allTopics = cls.subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics));
      return {
        name: cls.name,
        total: allTopics.length,
        progress: 0,
      };
    });
  },
};
