import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';

export interface ProgressionMetrics {
  globalTimeline: {
    startDate: Date;
    endDate: Date;
    totalTeachingDays: number;
    elapsedTeachingDays: number;
    remainingTeachingDays: number;
    percentageComplete: number;
  };
  classProgress: ClassProgressItem[];
  subjectProgress: SubjectProgressItem[];
  teacherProgress: TeacherProgressItem[];
}

export interface ClassProgressItem {
  classId: string;
  className: string;
  totalTopics: number;
  completedTopics: number;
  percentageComplete: number;
  velocity: 'less' | 'neutral' | 'more';
}

export interface SubjectProgressItem {
  subjectId: string;
  subjectName: string;
  classId?: string;
  className?: string;
  totalTopics: number;
  completedTopics: number;
  percentageComplete: number;
  velocity: 'less' | 'neutral' | 'more';
}

export interface TeacherProgressItem {
  teacherId: string;
  teacherName: string;
  totalTopics: number;
  completedTopics: number;
  percentageComplete: number;
  velocity: 'less' | 'neutral' | 'more';
}

export class ProgressionService {
  async getProgressionAnalytics(
    schoolId: string,
    academicYearId?: string,
  ): Promise<ProgressionMetrics> {
    // Get active academic term, or use the specified academic year/session
    let activeTerm;
    let academicSessionId: string | undefined;

    if (academicYearId) {
      // First, try to find if it's an academic term
      const academicTerm = await prisma.academicTerm.findFirst({
        where: {
          id: academicYearId,
          schoolId,
          deletedAt: null,
        },
      });
      if (academicTerm) {
        activeTerm = academicTerm;
        academicSessionId = academicTerm.academicSessionId;
      } else {
        // If not a term, try to find it as an academic session and get its active term
        const academicSession = await prisma.academicSession.findFirst({
          where: {
            id: academicYearId,
            schoolId,
            deletedAt: null,
          },
        });
        if (academicSession) {
          academicSessionId = academicSession.id;
          activeTerm = await prisma.academicTerm.findFirst({
            where: {
              schoolId,
              academicSessionId: academicSession.id,
              status: 'ACTIVE',
              deletedAt: null,
            },
          });
        }
      }
    }

    // Fallback to ACTIVE status if no specific year provided or not found
    if (!activeTerm) {
      activeTerm = await prisma.academicTerm.findFirst({
        where: {
          schoolId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });
      if (activeTerm) {
        academicSessionId = activeTerm.academicSessionId;
      }
    }

    if (!activeTerm || !academicSessionId) {
      // Return empty analytics if no active term or session found
      return {
        globalTimeline: {
          startDate: new Date(),
          endDate: new Date(),
          totalTeachingDays: 0,
          elapsedTeachingDays: 0,
          remainingTeachingDays: 0,
          percentageComplete: 0,
        },
        classProgress: [],
        subjectProgress: [],
        teacherProgress: [],
      };
    }

    // Fetch vacation days for the active term
    const vacationDays = await prisma.vacationDay.findMany({
      where: { academicTermId: activeTerm.id },
    });

    // Calculate global timeline metrics based on teaching days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(activeTerm.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(activeTerm.endDate);
    endDate.setHours(0, 0, 0, 0);

    const totalTeachingDays = activeTerm.actualAvailableDays || activeTerm.totalWorkingDays || 0;

    // Calculate elapsed teaching days by counting weekdays minus holidays up to today
    const weeklyHolidays = JSON.parse((activeTerm.weeklyHolidays as string) || '[0]');
    let elapsedTeachingDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= today && currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (!weeklyHolidays.includes(dayOfWeek)) {
        // Check if this date falls within any vacation period
        const isVacation = vacationDays.some((vd) => {
          const vacStart = new Date(vd.startDate);
          const vacEnd = new Date(vd.endDate);
          return currentDate >= vacStart && currentDate <= vacEnd;
        });
        if (!isVacation) {
          elapsedTeachingDays++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const remainingTeachingDays = Math.max(0, totalTeachingDays - elapsedTeachingDays);
    const percentageComplete =
      totalTeachingDays > 0 ? (elapsedTeachingDays / totalTeachingDays) * 100 : 0;

    // Get all classes with their topics and progress
    const classes = await prisma.class.findMany({
      where: { schoolId, deletedAt: null, academicSessionId },
      include: {
        subjects: {
          where: { academicSessionId },
          include: {
            chapters: {
              where: { academicSessionId },
              include: {
                topics: {
                  where: { academicSessionId },
                },
                chapterProgress: {
                  where: { schoolId, academicSessionId },
                },
              },
            },
          },
        },
      },
    });

    // Get all topic progress for the school
    const topicProgress = await prisma.topicProgress.findMany({
      where: { schoolId, academicSessionId },
      include: {
        topic: {
          include: {
            chapter: {
              include: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Calculate class progress
    const classProgress = this.calculateClassProgress(classes, topicProgress, percentageComplete);

    // Calculate subject progress
    const subjectProgress = this.calculateSubjectProgress(
      classes,
      topicProgress,
      percentageComplete,
    );

    // Calculate teacher progress
    const teacherProgress = await this.calculateTeacherProgress(
      schoolId,
      topicProgress,
      percentageComplete,
      academicSessionId,
    );

    return {
      globalTimeline: {
        startDate: activeTerm.startDate,
        endDate: activeTerm.endDate,
        totalTeachingDays,
        elapsedTeachingDays,
        remainingTeachingDays,
        percentageComplete,
      },
      classProgress,
      subjectProgress,
      teacherProgress,
    };
  }

  private calculateClassProgress(
    classes: any[],
    topicProgress: any[],
    timelinePercentage: number,
  ): ClassProgressItem[] {
    return classes.map((cls) => {
      let totalTopics = 0;
      let completedTopics = 0;

      cls.subjects.forEach((subject: any) => {
        subject.chapters.forEach((chapter: any) => {
          totalTopics += chapter.topics.length;

          // Check if chapter is marked as completed by any teacher
          const chapterCompleted = chapter.chapterProgress?.some(
            (cp: any) => cp.chapterStatus === 'COMPLETED',
          );

          if (chapterCompleted) {
            // If chapter is completed, count all its topics as completed
            completedTopics += chapter.topics.length;
          } else {
            // Otherwise, check individual topic progress
            chapter.topics.forEach((topic: any) => {
              const progress = topicProgress.find((tp) => tp.topicId === topic.id);
              if (progress && progress.status === 'COMPLETED') {
                completedTopics++;
              }
            });
          }
        });
      });

      const percentageComplete = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
      const velocity = this.getVelocity(percentageComplete, timelinePercentage);

      return {
        classId: cls.id,
        className: cls.name,
        totalTopics,
        completedTopics,
        percentageComplete,
        velocity,
      };
    });
  }

  private calculateSubjectProgress(
    classes: any[],
    topicProgress: any[],
    timelinePercentage: number,
  ): SubjectProgressItem[] {
    const subjectProgress: SubjectProgressItem[] = [];

    classes.forEach((cls) => {
      cls.subjects.forEach((subject: any) => {
        let totalTopics = 0;
        let completedTopics = 0;

        subject.chapters.forEach((chapter: any) => {
          totalTopics += chapter.topics.length;

          // Check if chapter is marked as completed by any teacher
          const chapterCompleted = chapter.chapterProgress?.some(
            (cp: any) => cp.chapterStatus === 'COMPLETED',
          );

          if (chapterCompleted) {
            // If chapter is completed, count all its topics as completed
            completedTopics += chapter.topics.length;
          } else {
            // Otherwise, check individual topic progress
            chapter.topics.forEach((topic: any) => {
              const progress = topicProgress.find((tp) => tp.topicId === topic.id);
              if (progress && progress.status === 'COMPLETED') {
                completedTopics++;
              }
            });
          }
        });

        const percentageComplete = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
        const velocity = this.getVelocity(percentageComplete, timelinePercentage);

        subjectProgress.push({
          subjectId: subject.id,
          subjectName: subject.name,
          classId: cls.id,
          className: cls.name,
          totalTopics,
          completedTopics,
          percentageComplete,
          velocity,
        });
      });
    });

    return subjectProgress;
  }

  private async calculateTeacherProgress(
    schoolId: string,
    topicProgress: any[],
    timelinePercentage: number,
    academicSessionId: string,
  ): Promise<TeacherProgressItem[]> {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: {
        user: true,
        teacherClasses: {
          where: { academicSessionId },
          include: {
            subject: true,
          },
        },
      },
    });

    // Calculate progress for each teacher using the same logic as teacher.service.getById
    return Promise.all(
      teachers.map(async (teacher: any) => {
        const assignedSubjectIds = teacher.teacherClasses
          .map((tc: any) => tc.subject?.id)
          .filter((s: string | undefined): s is string => Boolean(s));

        // Get all topics from assigned subjects (same as teacher.service.getById)
        const topicsFromSubjects = await prisma.topic.findMany({
          where: {
            schoolId,
            academicSessionId,
            chapter: { subjectId: { in: assignedSubjectIds }, deletedAt: null, academicSessionId },
            deletedAt: null,
          },
          select: { id: true },
        });

        const totalTopics = topicsFromSubjects.length;

        // Get topic progress for this teacher (same as teacher.service.getById)
        const teacherTopicProgress = await prisma.topicProgress.findMany({
          where: {
            schoolId,
            academicSessionId,
            teacherId: teacher.id,
            topicId: { in: topicsFromSubjects.map((t) => t.id) },
          },
          include: {
            topic: {
              select: {
                chapterId: true,
                academicSessionId: true,
              },
            },
          },
        });

        const completedTopics = teacherTopicProgress.filter(
          (tp) => tp.status === 'COMPLETED',
        ).length;

        // Get chapter progress for this teacher (same as teacher.service.getById)
        const chapterProgress = await prisma.chapterProgress.findMany({
          where: {
            schoolId,
            academicSessionId,
            teacherId: teacher.id,
            chapter: { subjectId: { in: assignedSubjectIds }, academicSessionId },
          },
          include: {
            chapter: {
              include: {
                topics: {
                  where: { academicSessionId },
                },
              },
            },
          },
        });

        // Add topics from completed chapters (same as teacher.service.getById)
        let totalCompletedTopics = completedTopics;
        chapterProgress.forEach((cp: any) => {
          if (cp.chapterStatus === 'COMPLETED') {
            const chapterTopics = cp.chapter.topics;
            const alreadyCountedTopics = teacherTopicProgress
              .filter((tp) => tp.topic.chapterId === cp.chapterId)
              .map((tp) => tp.topicId);

            chapterTopics.forEach((topic: any) => {
              if (
                !alreadyCountedTopics.includes(topic.id) &&
                topicsFromSubjects.some((t) => t.id === topic.id)
              ) {
                totalCompletedTopics++;
              }
            });
          }
        });

        const percentageComplete =
          totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;
        const velocity = this.getVelocity(percentageComplete, timelinePercentage);

        return {
          teacherId: teacher.id,
          teacherName: teacher.user.name,
          totalTopics,
          completedTopics: totalCompletedTopics,
          percentageComplete,
          velocity,
        };
      }),
    );
  }

  private getVelocity(percentage: number, timelineProgress: number): 'less' | 'neutral' | 'more' {
    const threshold = timelineProgress;
    // Use 5% tolerance for "on pace"
    if (percentage < threshold - 5) return 'less';
    if (percentage > threshold + 5) return 'more';
    return 'neutral';
  }

  async getTeacherProgression(
    teacherId: string,
    schoolId: string,
  ): Promise<{
    globalTimeline: ProgressionMetrics['globalTimeline'];
    subjectProgress: SubjectProgressItem[];
  }> {
    const analytics = await this.getProgressionAnalytics(schoolId);

    // Filter subject progress for this teacher's assigned subjects
    // Use the same logic as syllabusService.listAssignedClasses
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId },
      select: { subjectId: true, classId: true },
    });

    const assignedClassIds = teacherClasses
      .map((tc) => tc.classId)
      .filter((id): id is string => !!id);
    const assignedSubjectIds = teacherClasses
      .map((tc) => tc.subjectId)
      .filter((id): id is string => !!id);

    // Filter: subjects must be in an assigned class AND have a teacherClass assignment
    const filteredSubjectProgress = analytics.subjectProgress.filter(
      (sp) =>
        assignedClassIds.includes(sp.classId ?? '') && assignedSubjectIds.includes(sp.subjectId),
    );

    return {
      globalTimeline: analytics.globalTimeline,
      subjectProgress: filteredSubjectProgress,
    };
  }
}

export const progressionService = new ProgressionService();
