import { prisma, AcademicTermStatus } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { getPagination, softDeleteFilter } from '../repositories/base.repository.js';
import { withTenant } from '../repositories/base.repository.js';

export const academicTermService = {
  async list(params: { page: number; pageSize: number; schoolId?: string; status?: string }) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);
    const where = {
      ...softDeleteFilter(),
      ...(params.schoolId && { schoolId: params.schoolId }),
      ...(params.status && { status: params.status as AcademicTermStatus }),
    };

    const [items, total] = await Promise.all([
      prisma.academicTerm.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          vacationDays: true,
          _count: { select: { vacationDays: true } },
        },
      }),
      prisma.academicTerm.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const term = await prisma.academicTerm.findFirst({
      where: { id, ...softDeleteFilter() },
      include: {
        vacationDays: {
          orderBy: { date: 'asc' },
        },
      },
    });
    if (!term) throw new AppError('Academic term not found', 404);
    return term;
  },

  async create(data: {
    schoolId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    weeklyHolidays?: number[];
    vacationDays?: Array<{ startDate: Date; endDate: Date; reason?: string }>;
  }) {
    const weeklyHolidays = data.weeklyHolidays || [0]; // Default to Sunday

    // Calculate total working days and actual available days
    const { totalWorkingDays, actualAvailableDays } = this.calculateTeachingDays(
      data.startDate,
      data.endDate,
      weeklyHolidays,
      data.vacationDays || [],
    );

    return prisma.$transaction(async (tx) => {
      const term = await tx.academicTerm.create({
        data: {
          schoolId: data.schoolId,
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          totalWorkingDays,
          actualAvailableDays,
          weeklyHolidays: JSON.stringify(weeklyHolidays),
          status: AcademicTermStatus.ACTIVE,
        },
      });

      // Create vacation days if provided
      if (data.vacationDays && data.vacationDays.length > 0) {
        await tx.vacationDay.createMany({
          data: data.vacationDays.map((vd) => ({
            academicTermId: term.id,
            startDate: vd.startDate,
            endDate: vd.endDate,
            reason: vd.reason,
          })),
        });
      }

      return tx.academicTerm.findUnique({
        where: { id: term.id },
        include: { vacationDays: true },
      });
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      startDate?: Date | string;
      endDate?: Date | string;
      weeklyHolidays?: number[];
      status?: AcademicTermStatus;
    },
  ) {
    await this.getById(id);

    const term = await prisma.academicTerm.findUnique({
      where: { id },
      include: { vacationDays: true },
    });

    if (!term) throw new AppError('Academic term not found', 404);

    const weeklyHolidays = data.weeklyHolidays !== undefined ? data.weeklyHolidays : JSON.parse(term.weeklyHolidays as string);
    const startDate = data.startDate ? new Date(data.startDate) : term.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : term.endDate;

    // Recalculate if dates or holidays changed
    if (data.startDate || data.endDate || data.weeklyHolidays !== undefined) {
      const { totalWorkingDays, actualAvailableDays } = this.calculateTeachingDays(
        startDate,
        endDate,
        weeklyHolidays,
        term.vacationDays,
      );

      return prisma.academicTerm.update({
        where: { id },
        data: {
          name: data.name,
          startDate,
          endDate,
          totalWorkingDays,
          actualAvailableDays,
          weeklyHolidays: JSON.stringify(weeklyHolidays),
          status: data.status,
        },
        include: { vacationDays: true },
      });
    }

    return prisma.academicTerm.update({
      where: { id },
      data: {
        name: data.name,
        status: data.status,
      },
      include: { vacationDays: true },
    });
  },

  async softDelete(id: string) {
    await this.getById(id);
    return prisma.academicTerm.update({
      where: { id },
      data: { deletedAt: new Date(), status: AcademicTermStatus.ARCHIVED },
    });
  },

  async addVacationDay(termId: string, data: { startDate: Date | string; endDate: Date | string; reason?: string }) {
    await this.getById(termId);

    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate;

    const vacationDay = await prisma.$transaction(async (tx) => {
      const vd = await tx.vacationDay.create({
        data: {
          academicTermId: termId,
          startDate,
          endDate,
          reason: data.reason,
        },
      });

      // Recalculate available days
      const term = await tx.academicTerm.findUnique({
        where: { id: termId },
        include: { vacationDays: true },
      });

      if (term) {
        const weeklyHolidays = JSON.parse(term.weeklyHolidays as string);
        const { totalWorkingDays, actualAvailableDays } = this.calculateTeachingDays(
          term.startDate,
          term.endDate,
          weeklyHolidays,
          [...term.vacationDays, vd],
        );

        await tx.academicTerm.update({
          where: { id: termId },
          data: { totalWorkingDays, actualAvailableDays },
        });
      }

      return vd;
    });

    return vacationDay;
  },

  async removeVacationDay(termId: string, vacationId: string) {
    await this.getById(termId);

    const vacationDay = await prisma.vacationDay.findFirst({
      where: { id: vacationId, academicTermId: termId },
    });

    if (!vacationDay) {
      throw new AppError('Vacation day not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.vacationDay.delete({ where: { id: vacationId } });

      // Recalculate available days
      const term = await tx.academicTerm.findUnique({
        where: { id: termId },
        include: { vacationDays: true },
      });

      if (term) {
        const weeklyHolidays = JSON.parse(term.weeklyHolidays as string);
        const remainingVacationDays = term.vacationDays || [];
        const { totalWorkingDays, actualAvailableDays } = this.calculateTeachingDays(
          term.startDate,
          term.endDate,
          weeklyHolidays,
          remainingVacationDays,
        );

        await tx.academicTerm.update({
          where: { id: termId },
          data: { totalWorkingDays, actualAvailableDays },
        });
      }
    });

    return { message: 'Vacation day removed' };
  },

  async calculateAvailableDays(termId: string) {
    const term = await this.getById(termId);
    const weeklyHolidays = JSON.parse(term.weeklyHolidays as string);

    const termWithVacation = await prisma.academicTerm.findUnique({
      where: { id: termId },
      include: { vacationDays: true },
    });

    const calculation = this.calculateTeachingDays(
      term.startDate,
      term.endDate,
      weeklyHolidays,
      termWithVacation?.vacationDays || [],
    );

    return {
      termId: term.id,
      termName: term.name,
      startDate: term.startDate,
      endDate: term.endDate,
      weeklyHolidays,
      vacationDays: termWithVacation?.vacationDays || [],
      ...calculation,
    };
  },

  // Helper function to calculate teaching days
  calculateTeachingDays(
    startDate: Date,
    endDate: Date,
    weeklyHolidays: number[],
    vacationDays: Array<{ startDate: Date; endDate: Date } | { date: Date }>,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const vacationSet = new Set<string>();
    vacationDays.forEach((vd) => {
      // Handle both old format (date) and new format (startDate/endDate)
      if ('date' in vd) {
        vacationSet.add(new Date(vd.date).toDateString());
      } else {
        const vdStart = new Date(vd.startDate);
        const vdEnd = new Date(vd.endDate);
        for (let d = new Date(vdStart); d <= vdEnd; d.setDate(d.getDate() + 1)) {
          vacationSet.add(d.toDateString());
        }
      }
    });

    let totalWorkingDays = 0;
    let actualAvailableDays = 0;
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toDateString();

      // Check if it's a weekly holiday
      const isWeeklyHoliday = weeklyHolidays.includes(dayOfWeek);
      const isVacationDay = vacationSet.has(dateString);

      if (!isWeeklyHoliday) {
        totalWorkingDays++;
      }

      if (!isWeeklyHoliday && !isVacationDay) {
        actualAvailableDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { totalWorkingDays, actualAvailableDays };
  },

  async getTeacherTimelineProgress(teacherId: string, schoolId: string) {
    // Get active academic term
    const activeTerm = await prisma.academicTerm.findFirst({
      where: {
        schoolId,
        status: AcademicTermStatus.ACTIVE,
        ...softDeleteFilter(),
      },
      include: { vacationDays: true },
    });

    if (!activeTerm) {
      throw new AppError('No active academic term found', 404);
    }

    // Get teacher's assigned classes and subjects
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId, schoolId },
      include: {
        class: true,
      },
    });

    // Get all subjects and chapters for these classes
    const classIds = teacherClasses.map((tc) => tc.classId);
    const subjects = await prisma.subject.findMany({
      where: {
        classId: { in: classIds },
        schoolId,
        ...softDeleteFilter(),
      },
      select: {
        id: true,
        chapters: {
          where: softDeleteFilter(),
          select: {
            id: true,
            estimatedTeachingDays: true,
            chapterProgress: {
              where: { teacherId },
              select: {
                chapterStatus: true,
                completionPercentage: true,
              },
            },
          },
        },
      },
    });

    // Calculate total estimated days and completed progress
    let totalEstimatedDays = 0;
    let completedChapters = 0;
    let totalChapters = 0;

    for (const subject of subjects) {
      for (const chapter of subject.chapters) {
        totalChapters++;
        if (chapter.estimatedTeachingDays) {
          totalEstimatedDays += chapter.estimatedTeachingDays;
        }

        if (
          chapter.chapterProgress.length > 0 &&
          chapter.chapterProgress[0].chapterStatus === 'COMPLETED'
        ) {
          completedChapters++;
        }
      }
    }

    const completionPercentage =
      totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    // Calculate days elapsed and remaining
    const now = new Date();
    const totalDaysInTerm = Math.ceil(
      (activeTerm.endDate.getTime() - activeTerm.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const daysElapsed = Math.ceil(
      (now.getTime() - activeTerm.startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = Math.max(0, totalDaysInTerm - daysElapsed);

    // Calculate target progress
    const timeElapsedPercentage = Math.max(0, Math.min(100, (daysElapsed / totalDaysInTerm) * 100));
    const targetProgress = Math.round(timeElapsedPercentage);

    // Calculate if teacher is behind schedule
    const isBehindSchedule = completionPercentage < targetProgress - 10; // 10% tolerance
    const progressDifference = completionPercentage - targetProgress;

    return {
      academicTerm: {
        id: activeTerm.id,
        name: activeTerm.name,
        startDate: activeTerm.startDate,
        endDate: activeTerm.endDate,
        totalWorkingDays: activeTerm.totalWorkingDays,
        actualAvailableDays: activeTerm.actualAvailableDays,
      },
      timeline: {
        totalDaysInTerm,
        daysElapsed,
        daysRemaining,
        timeElapsedPercentage,
      },
      progress: {
        totalChapters,
        completedChapters,
        completionPercentage,
        targetProgress,
        progressDifference,
        isBehindSchedule,
      },
      teachingDays: {
        totalEstimatedDays,
        availableDays: activeTerm.actualAvailableDays,
        daysPerChapterRequired:
          totalChapters > 0 ? Math.ceil(totalEstimatedDays / totalChapters) : 0,
      },
    };
  },
};
