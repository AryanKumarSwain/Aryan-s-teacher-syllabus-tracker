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
  async getProgressionAnalytics(schoolId: string): Promise<ProgressionMetrics> {
    // Get active academic term
    const activeTerm = await prisma.academicTerm.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!activeTerm) {
      throw new AppError('No active academic term found', 404);
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
      where: { schoolId, deletedAt: null },
      include: {
        subjects: {
          include: {
            chapters: {
              include: {
                topics: true,
                chapterProgress: true,
              },
            },
          },
        },
      },
    });

    // Get all topic progress for the school
    const topicProgress = await prisma.topicProgress.findMany({
      where: { schoolId },
      include: {
        topic: {
          include: {
            chapter: {
              include: {
                subject: true,
              },
            },
          },
        },
        teacher: true,
      },
    });

    // Calculate class progress
    const classProgress = this.calculateClassProgress(classes, topicProgress);

    // Calculate subject progress
    const subjectProgress = this.calculateSubjectProgress(classes, topicProgress);

    // Calculate teacher progress
    const teacherProgress = await this.calculateTeacherProgress(schoolId, topicProgress);

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

  private calculateClassProgress(classes: any[], topicProgress: any[]): ClassProgressItem[] {
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
      const velocity = this.getVelocity(percentageComplete);

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

  private calculateSubjectProgress(classes: any[], topicProgress: any[]): SubjectProgressItem[] {
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
        const velocity = this.getVelocity(percentageComplete);

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
  ): Promise<TeacherProgressItem[]> {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: {
        user: true,
      },
    });

    // Get all chapter progress for the school
    const chapterProgress = await prisma.chapterProgress.findMany({
      where: { schoolId },
      include: {
        chapter: {
          include: {
            topics: true,
          },
        },
      },
    });

    return teachers.map((teacher: any) => {
      const teacherTopicProgress = topicProgress.filter((tp) => tp.teacherId === teacher.id);
      const teacherChapterProgress = chapterProgress.filter((cp) => cp.teacherId === teacher.id);

      let totalTopics = teacherTopicProgress.length;
      let completedTopics = teacherTopicProgress.filter((tp) => tp.status === 'COMPLETED').length;

      // Add topics from completed chapters
      teacherChapterProgress.forEach((cp: any) => {
        if (cp.chapterStatus === 'COMPLETED') {
          const chapterTopics = cp.chapter.topics;
          const alreadyCountedTopics = teacherTopicProgress
            .filter((tp) => tp.topic.chapterId === cp.chapterId)
            .map((tp) => tp.topicId);

          // Add topics that weren't already counted in topic progress
          chapterTopics.forEach((topic: any) => {
            if (!alreadyCountedTopics.includes(topic.id)) {
              totalTopics++;
              completedTopics++;
            }
          });
        }
      });

      const percentageComplete = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
      const velocity = this.getVelocity(percentageComplete);

      return {
        teacherId: teacher.id,
        teacherName: teacher.user.name,
        totalTopics,
        completedTopics,
        percentageComplete,
        velocity,
      };
    });
  }

  private getVelocity(percentage: number): 'less' | 'neutral' | 'more' {
    if (percentage < 30) return 'less';
    if (percentage >= 30 && percentage <= 70) return 'neutral';
    return 'more';
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
