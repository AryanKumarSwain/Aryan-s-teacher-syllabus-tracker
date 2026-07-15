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
    termFilter?: string,
  ): Promise<ProgressionMetrics> {
    // Get active academic term, or use the specified academic year/session
    let activeTerm;
    let academicSessionId: string | undefined;

    if (academicYearId) {
      // When academicYearId is explicitly provided, it is authoritative
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
        // If not a term, try to find it as an academic session
        const academicSession = await prisma.academicSession.findFirst({
          where: {
            id: academicYearId,
            schoolId,
            
          },
        });
        if (academicSession) {
          academicSessionId = academicSession.id;
          // Try to find an active term for this session, but don't override academicSessionId
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
      // If academicYearId was provided but we couldn't resolve it, return empty state
      // Do NOT fall back to a different session's ACTIVE term
      if (!academicSessionId) {
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
    } else {
      // No academicYearId provided - return empty state
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

    // If we still don't have an academicSessionId, return empty state
    if (!academicSessionId) {
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

    // If termFilter is provided, extract the term name
    let filteredTermName: string | undefined;
    if (termFilter && termFilter !== 'all') {
      try {
        console.log('[getProgressionAnalytics] termFilter provided:', termFilter);
        // Parse termFilter format: ${yearId}-${termIndex}
        const lastDash = termFilter.lastIndexOf('-');
        const yearId = termFilter.substring(0, lastDash);
        const termIndex = termFilter.substring(lastDash + 1);
        const termIdx = parseInt(termIndex, 10);
        
        console.log('[getProgressionAnalytics] Parsed yearId:', yearId, 'termIdx:', termIdx);
        
        // Try to find as academicTerm first
        let academicYear = await prisma.academicTerm.findFirst({
          where: { id: yearId, schoolId, deletedAt: null },
          select: { terms: true },
        });
        
        console.log('[getProgressionAnalytics] academicYear found:', !!academicYear);
        
        // If not found, try as academicSession
        if (!academicYear) {
          console.log('[getProgressionAnalytics] Not found as academicTerm, trying as academicSession');
          const academicSession = await prisma.academicSession.findFirst({
            where: { id: yearId, schoolId},
          });
          console.log('[getProgressionAnalytics] academicSession found:', !!academicSession);
          if (academicSession) {
          // Get the academic term for this session
          academicYear = await prisma.academicTerm.findFirst({
            where: { 
              academicSessionId: academicSession.id, 
              schoolId, 
              deletedAt: null 
            },
            select: { terms: true },
          });
          console.log('[getProgressionAnalytics] academicYear from session found:', !!academicYear);
        }
      }
      
      if (academicYear && academicYear.terms) {
        const terms = typeof academicYear.terms === 'string' 
          ? JSON.parse(academicYear.terms) 
          : academicYear.terms;
        console.log('[getProgressionAnalytics] terms array:', terms);
        if (terms[termIdx]) {
          filteredTermName = terms[termIdx].name;
          console.log('[getProgressionAnalytics] filteredTermName set to:', filteredTermName);
        } else {
          console.log('[getProgressionAnalytics] No term found at index:', termIdx);
        }
      } else {
        console.log('[getProgressionAnalytics] academicYear or terms not found');
      }
      } catch (err) {
        console.log('[getProgressionAnalytics] Error parsing termFilter:', err);
        // Silently ignore termFilter errors
      }
    } else {
      console.log('[getProgressionAnalytics] No termFilter or termFilter is "all"');
    }

    // Fetch vacation days for the active term (if available)
    let vacationDays = [];
    if (activeTerm) {
      vacationDays = await prisma.vacationDay.findMany({
        where: { academicTermId: activeTerm.id },
      });
    }

    // Calculate global timeline metrics based on teaching days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate, endDate, totalTeachingDays;

    if (activeTerm) {
      startDate = new Date(activeTerm.startDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(activeTerm.endDate);
      endDate.setHours(0, 0, 0, 0);
      totalTeachingDays = activeTerm.actualAvailableDays || activeTerm.totalWorkingDays || 0;
    } else {
      // If no active term, use the academic session dates
      const academicSession = await prisma.academicSession.findFirst({
        where: { id: academicSessionId },
        select: { startDate: true, endDate: true },
      });
      if (academicSession) {
        startDate = new Date(academicSession.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(academicSession.endDate);
        endDate.setHours(0, 0, 0, 0);
        // Estimate teaching days (rough calculation)
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalTeachingDays = Math.floor(diffDays * 0.7); // Assume 70% are teaching days
      } else {
        // Fallback to current year
        startDate = new Date(new Date().getFullYear(), 0, 1);
        endDate = new Date(new Date().getFullYear(), 11, 31);
        totalTeachingDays = 200;
      }
    }

    // Calculate elapsed teaching days by counting weekdays minus holidays up to today
    const weeklyHolidays = activeTerm
      ? (typeof activeTerm.weeklyHolidays === 'string' ? JSON.parse(activeTerm.weeklyHolidays) : activeTerm.weeklyHolidays) || [0]
      : [0];
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

    // Get all classes with their chapters and progress
    const classes = await prisma.class.findMany({
      where: { schoolId, deletedAt: null, academicSessionId },
      include: {
        subjects: {
          where: { academicSessionId, deletedAt: null },
          include: {
            chapters: {
              where: { 
                academicSessionId,
                deletedAt: null,
                ...(filteredTermName && { termName: filteredTermName }),
              },
              include: {
                chapterProgress: {
                  where: { schoolId, academicSessionId },
                },
              },
            },
          },
        },
      },
    });

    // Calculate class progress
    const classProgress = this.calculateClassProgress(classes, percentageComplete);

    // Calculate subject progress
    const subjectProgress = this.calculateSubjectProgress(
      classes,
      percentageComplete,
    );

    // Calculate teacher progress
    const teacherProgress = await this.calculateTeacherProgress(
      schoolId,
      percentageComplete,
      academicSessionId,
      filteredTermName,
    );

    return {
      globalTimeline: {
        startDate: startDate,
        endDate: endDate,
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
    timelinePercentage: number,
  ): ClassProgressItem[] {
    return classes.map((cls) => {
      let totalChapters = 0;
      let completedChapters = 0;

      cls.subjects.forEach((subject: any) => {
        subject.chapters.forEach((chapter: any) => {
          totalChapters++;

          // Check if chapter is marked as completed by any teacher
          const chapterCompleted = chapter.chapterProgress?.some(
            (cp: any) => cp.chapterStatus === 'COMPLETED',
          );

          if (chapterCompleted) {
            completedChapters++;
          }
        });
      });

      const percentageComplete = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;
      const velocity = this.getVelocity(percentageComplete, timelinePercentage);

      return {
        classId: cls.id,
        className: cls.name,
        totalTopics: totalChapters,
        completedTopics: completedChapters,
        percentageComplete,
        velocity,
      };
    });
  }

  private calculateSubjectProgress(
    classes: any[],
    timelinePercentage: number,
  ): SubjectProgressItem[] {
    const subjectProgress: SubjectProgressItem[] = [];

    classes.forEach((cls) => {
      cls.subjects.forEach((subject: any) => {
        let totalChapters = 0;
        let completedChapters = 0;

        subject.chapters.forEach((chapter: any) => {
          totalChapters++;

          // Check if chapter is marked as completed by any teacher
          const chapterCompleted = chapter.chapterProgress?.some(
            (cp: any) => cp.chapterStatus === 'COMPLETED',
          );

          if (chapterCompleted) {
            completedChapters++;
          }
        });

        const percentageComplete = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;
        const velocity = this.getVelocity(percentageComplete, timelinePercentage);

        subjectProgress.push({
          subjectId: subject.id,
          subjectName: subject.name,
          classId: cls.id,
          className: cls.name,
          totalTopics: totalChapters,
          completedTopics: completedChapters,
          percentageComplete,
          velocity,
        });
      });
    });

    return subjectProgress;
  }

  private async calculateTeacherProgress(
    schoolId: string,
    timelinePercentage: number,
    academicSessionId: string,
    filteredTermName?: string,
  ): Promise<TeacherProgressItem[]> {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId, academicSessionId },
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

    // Calculate progress for each teacher using chapter counts
    return Promise.all(
      teachers.map(async (teacher: any) => {
        const assignedSubjectIds = teacher.teacherClasses
          .map((tc: any) => tc.subject?.id)
          .filter((s: string | undefined): s is string => Boolean(s));

        // Get all chapters from assigned subjects
        const chaptersFromSubjects = await prisma.chapter.findMany({
          where: {
            schoolId,
            academicSessionId,
            subjectId: { in: assignedSubjectIds },
            deletedAt: null,
            ...(filteredTermName && { termName: filteredTermName }),
          },
          select: { id: true },
        });

        const totalChapters = chaptersFromSubjects.length;

        // Get chapter progress for this teacher
        const chapterProgress = await prisma.chapterProgress.findMany({
          where: {
            schoolId,
            academicSessionId,
            teacherId: teacher.id,
            chapter: {
              subjectId: { in: assignedSubjectIds },
              academicSessionId,
              deletedAt: null,
              ...(filteredTermName && { termName: filteredTermName }),
            },
          },
        });

        const completedChapters = chapterProgress.filter(
          (cp) => cp.chapterStatus === 'COMPLETED',
        ).length;

        const percentageComplete =
          totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
        const velocity = this.getVelocity(percentageComplete, timelinePercentage);

        return {
          teacherId: teacher.id,
          teacherName: teacher.user.name,
          totalTopics: totalChapters,
          completedTopics: completedChapters,
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
