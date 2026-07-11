import { prisma, type Prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { getPagination, softDeleteFilter, withTenant } from '../repositories/base.repository.js';
import { hashPassword } from '../utils/password.js';
import { authService } from './auth.service.js';
import { resolveTeacherCreate, trySendTeacherCredentials } from './teacher-email.util.js';

export type TeacherMutationResult = {
  teacher: { id: string; schoolId: string; userId: string; status: string };
  emailSent: boolean;
  emailError?: string;
  restored?: boolean;
};

async function applyTeacherAssignments(
  tx: Prisma.TransactionClient,
  schoolId: string,
  academicSessionId: string,
  teacherId: string,
  assignments: { classId: string; subjectId: string }[],
) {
  if (assignments.length === 0) return;

  await tx.teacherClass.createMany({
    data: assignments.map((a) => ({
      schoolId,
      academicSessionId,
      teacherId,
      classId: a.classId,
      subjectId: a.subjectId,
    })),
    skipDuplicates: true,
  });
}

async function buildAssignments(
  schoolId: string,
  data: {
    classIds?: string[];
    assignments?: { classId: string; subjectId: string }[];
  },
): Promise<{ classId: string; subjectId: string }[]> {
  const hasMatrix = Array.isArray(data.assignments) && data.assignments.length > 0;
  const hasLegacy = Array.isArray(data.classIds) && data.classIds.length > 0;

  if (hasMatrix) {
    const assignments = data.assignments!;

    const subjectIds = Array.from(new Set(assignments.map((a) => a.subjectId)));
    const subjects = await prisma.subject.findMany({
      where: withTenant(schoolId, { id: { in: subjectIds }, ...softDeleteFilter() }),
      select: { id: true, classId: true },
    });
    if (subjects.length !== subjectIds.length)
      throw new AppError('One or more subjects not found', 404);

    const subjectById = new Map(subjects.map((s) => [s.id, s]));
    for (const a of assignments) {
      const s = subjectById.get(a.subjectId);
      if (!s) throw new AppError('One or more subjects not found', 404);
      if (s.classId && s.classId !== a.classId)
        throw new AppError('Subject does not belong to selected class', 422);
    }

    const classIds = Array.from(new Set(assignments.map((a) => a.classId)));
    const classes = await prisma.class.findMany({
      where: withTenant(schoolId, { id: { in: classIds }, ...softDeleteFilter() }),
      select: { id: true },
    });
    if (classes.length !== classIds.length)
      throw new AppError('One or more classes not found', 404);

    return assignments;
  }

  if (hasLegacy) {
    const classIds = Array.from(new Set(data.classIds!));

    const classes = await prisma.class.findMany({
      where: withTenant(schoolId, { id: { in: classIds }, ...softDeleteFilter() }),
      select: { id: true },
    });
    if (classes.length !== classIds.length)
      throw new AppError('One or more classes not found', 404);

    const fallbackSubject = await prisma.subject.findFirst({
      where: withTenant(schoolId, { classId: { in: classIds }, ...softDeleteFilter() }),
      select: { id: true },
    });
    if (!fallbackSubject)
      throw new AppError(
        'No subjects are configured for the selected classes. Configure a subject first.',
        422,
      );

    return classIds.map((classId) => ({
      classId,
      subjectId: fallbackSubject.id,
    }));
  }

  return [];
}

export const teacherService = {
  async list(
    schoolId: string,
    params: {
      page: number;
      pageSize: number;
      search?: string;
      classId?: string;
      subjectId?: string;
      academicSessionId?: string;
    },
  ) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);

    // academicSessionId is required for session isolation
    if (!params.academicSessionId) {
      throw new AppError('Academic session ID is required', 400);
    }

    const where = withTenant(schoolId, {
      ...softDeleteFilter(),
      // Show all teachers in the school for this session
      // Teachers without assignments will also be shown
      ...(params.classId && { teacherClasses: { some: { classId: params.classId, academicSessionId: params.academicSessionId } } }),
      ...(params.subjectId && { teacherClasses: { some: { subjectId: params.subjectId, academicSessionId: params.academicSessionId } } }),
      ...(params.search && {
        user: {
          OR: [{ name: { contains: params.search } }, { email: { contains: params.search } }],
        },
      }),
    });

    const [items, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatar: true, status: true },
          },
          teacherClasses: {
            include: {
              class: { select: { id: true, name: true, grade: true, section: true } },
              subject: { select: { id: true, name: true, classId: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count({ where }),
    ]);

    // Calculate progress for each teacher based on topics (not chapters)
    const itemsWithProgress = await Promise.all(
      items.map(async (teacher) => {
        const assignedSubjectIds = teacher.teacherClasses
          .map((tc) => tc.subject?.id)
          .filter((s): s is string => Boolean(s));

        // Get all topics from assigned subjects
        const sessionFilter = params.academicSessionId ? { academicSessionId: params.academicSessionId } : {};
        const topicsFromSubjects = await prisma.topic.findMany({
          where: {
            schoolId,
            ...sessionFilter,
            chapter: { subjectId: { in: assignedSubjectIds }, deletedAt: null, ...sessionFilter },
            deletedAt: null,
          },
          select: { id: true },
        });

        const totalTopics = topicsFromSubjects.length;

        // Get topic progress for this teacher
        const topicProgress = await prisma.topicProgress.findMany({
          where: {
            schoolId,
            ...sessionFilter,
            teacherId: teacher.id,
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

        // Get chapter progress for this teacher
        const chapterProgress = await prisma.chapterProgress.findMany({
          where: {
            schoolId,
            ...sessionFilter,
            teacherId: teacher.id,
            chapter: { subjectId: { in: assignedSubjectIds }, ...sessionFilter },
          },
          include: {
            chapter: {
              include: {
                topics: {
                  where: sessionFilter,
                },
              },
            },
          },
        });

        // Add topics from completed chapters
        chapterProgress.forEach((cp) => {
          if (cp.chapterStatus === 'COMPLETED') {
            const chapterTopics = cp.chapter.topics;
            const alreadyCountedTopics = topicProgress
              .filter((tp) => tp.topic.chapterId === cp.chapterId)
              .map((tp) => tp.topicId);

            chapterTopics.forEach((topic) => {
              if (!alreadyCountedTopics.includes(topic.id)) {
                // Check if this topic is in assigned topics
                if (topicsFromSubjects.some((t) => t.id === topic.id)) {
                  // We need to track this separately since we can't modify completedTopics after calculation
                }
              }
            });
          }
        });

        // Recalculate with chapter progress included
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

        const progressPercentage =
          totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

        return {
          ...teacher,
          progressPercentage,
        };
      }),
    );

    return { items: itemsWithProgress, total, page, pageSize };
  },

  async bulkCreate(
    schoolId: string,
    academicSessionId: string,
    teachers: Array<{ name: string; email: string; phone?: string }>,
  ) {
    const results: {
      success: boolean;
      name: string;
      email: string;
      error?: string;
      emailSent?: boolean;
      warning?: string;
    }[] = [];

    for (const data of teachers) {
      try {
        if (!data.name || !data.email) {
          results.push({
            success: false,
            name: data.name || '',
            email: data.email || '',
            error: 'Name and email are required',
          });
          continue;
        }

        const email = data.email.toLowerCase();

        let resolution;
        try {
          resolution = await resolveTeacherCreate(schoolId, email);
        } catch (err) {
          const message = err instanceof AppError ? err.message : 'Email not available';
          results.push({ success: false, name: data.name, email, error: message });
          continue;
        }

        const tempPassword = authService.generateSecurePassword();
        const passwordHash = await hashPassword(tempPassword);
        const school = await prisma.school.findUnique({ where: { id: schoolId } });

        if (!school) {
          results.push({
            success: false,
            name: data.name,
            email,
            error: 'School not found',
          });
          continue;
        }

        if (resolution.action === 'restore') {
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: resolution.userId },
              data: {
                deletedAt: null,
                name: data.name,
                phone: data.phone,
                passwordHash,
                role: 'TEACHER',
                schoolId,
                status: 'ACTIVE',
              },
            });
            await tx.teacher.update({
              where: { id: resolution.teacherId },
              data: { deletedAt: null, status: 'ACTIVE', academicSessionId },
            });
          });
        } else {
          await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
              data: {
                email,
                passwordHash,
                name: data.name,
                role: 'TEACHER',
                schoolId,
                phone: data.phone,
                status: 'ACTIVE',
              },
            });
            await tx.teacher.create({
              data: { schoolId, academicSessionId, userId: user.id, status: 'ACTIVE' },
            });
          });
        }

        const emailResult = await trySendTeacherCredentials({
          to: email,
          teacherName: data.name,
          schoolName: school.name,
          email,
          tempPassword,
        });

        results.push({
          success: true,
          name: data.name,
          email,
          emailSent: emailResult.emailSent,
          warning: emailResult.emailSent
            ? undefined
            : (emailResult.emailError ?? 'Credentials email could not be sent'),
        });
      } catch (error: any) {
        results.push({
          success: false,
          name: data.name || '',
          email: data.email || '',
          error: error.message || 'Failed',
        });
      }
    }

    return results;
  },
  async create(
    schoolId: string,
    academicSessionId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      classIds?: string[];
      assignments?: { classId: string; subjectId: string }[];
    },
  ) {
    const email = data.email.toLowerCase();
    const resolution = await resolveTeacherCreate(schoolId, email);
    const assignments = await buildAssignments(schoolId, data);

    const tempPassword = authService.generateSecurePassword();
    const passwordHash = await hashPassword(tempPassword);
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new AppError('School not found', 404);

    const restored = resolution.action === 'restore';

    const teacher = await prisma.$transaction(async (tx) => {
      if (restored) {
        await tx.user.update({
          where: { id: resolution.userId },
          data: {
            deletedAt: null,
            name: data.name,
            phone: data.phone,
            passwordHash,
            role: 'TEACHER',
            schoolId,
            status: 'ACTIVE',
          },
        });
        const restoredTeacher = await tx.teacher.update({
          where: { id: resolution.teacherId },
          data: { deletedAt: null, status: 'ACTIVE', academicSessionId },
        });
        await applyTeacherAssignments(tx, schoolId, academicSessionId, restoredTeacher.id, assignments);
        return restoredTeacher;
      }

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: data.name,
          role: 'TEACHER',
          schoolId,
          phone: data.phone,
          status: 'ACTIVE',
        },
      });
      const created = await tx.teacher.create({
        data: { schoolId, academicSessionId, userId: user.id, status: 'ACTIVE' },
      });
      await applyTeacherAssignments(tx, schoolId, academicSessionId, created.id, assignments);
      return created;
    });

    const emailResult = await trySendTeacherCredentials({
      to: email,
      teacherName: data.name,
      schoolName: school.name,
      email,
      tempPassword,
    });

    return {
      teacher,
      emailSent: emailResult.emailSent,
      emailError: emailResult.emailError,
      restored,
    };
  },

  async createAssignment(
    schoolId: string,
    academicSessionId: string,
    teacherId: string,
    data: { classId: string; subjectId: string },
  ) {
    const teacher = await prisma.teacher.findFirst({
      where: withTenant(schoolId, { id: teacherId, academicSessionId, ...softDeleteFilter() }),
    });
    if (!teacher) throw new AppError('Teacher not found', 404);

    const cls = await prisma.class.findFirst({
      where: withTenant(schoolId, { id: data.classId, academicSessionId, ...softDeleteFilter() }),
      select: { id: true },
    });
    if (!cls) throw new AppError('Class not found', 404);

    const subject = await prisma.subject.findFirst({
      where: withTenant(schoolId, { id: data.subjectId, academicSessionId, ...softDeleteFilter() }),
      select: { id: true, classId: true },
    });
    if (!subject) throw new AppError('Subject not found', 404);
    if (subject.classId && subject.classId !== data.classId)
      throw new AppError('Subject does not belong to selected class', 422);

    try {
      return await prisma.teacherClass.create({
        data: { schoolId, academicSessionId, teacherId, classId: data.classId, subjectId: data.subjectId },
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new AppError('Assignment already exists', 409);
      throw e;
    }
  },

  async deleteAssignment(schoolId: string, teacherId: string, assignmentId: string) {
    const assignment = await prisma.teacherClass.findFirst({
      where: withTenant(schoolId, { id: assignmentId, teacherId }),
      select: { id: true, subjectId: true, classId: true },
    });
    if (!assignment) throw new AppError('Assignment not found', 404);

    await prisma.$transaction(async (tx) => {
      const chapters = await tx.chapter.findMany({
        where: {
          schoolId,
          subjectId: assignment.subjectId ?? undefined,
          classId: assignment.classId,
        },
        select: { id: true },
      });
      const chapterIds = chapters.map((c) => c.id);

      if (chapterIds.length > 0) {
        const topics = await tx.topic.findMany({
          where: { schoolId, chapterId: { in: chapterIds } },
          select: { id: true },
        });
        const topicIds = topics.map((t) => t.id);

        if (topicIds.length > 0) {
          await tx.topicProgress.deleteMany({
            where: { teacherId, topicId: { in: topicIds } },
          });
        }

        await tx.chapterProgress.deleteMany({
          where: { teacherId, chapterId: { in: chapterIds } },
        });
      }

      await tx.teacherClass.delete({ where: { id: assignmentId } });
    });
  },

  async getById(schoolId: string, academicSessionId: string, id: string) {
    const teacher = await prisma.teacher.findFirst({
      where: withTenant(schoolId, { id, academicSessionId, ...softDeleteFilter() }),
      include: {
        user: true,
        teacherClasses: {
          include: {
            class: { select: { id: true, name: true, grade: true, section: true } },
            subject: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!teacher) throw new AppError('Teacher not found', 404);

    const assignedSubjectIds = teacher.teacherClasses
      .map((tc) => tc.subject?.id)
      .filter((s): s is string => Boolean(s));

    // Get all topics from assigned subjects
    const sessionFilter = academicSessionId ? { academicSessionId } : {};
    const topicsFromSubjects = await prisma.topic.findMany({
      where: {
        schoolId,
        ...sessionFilter,
        chapter: { subjectId: { in: assignedSubjectIds }, deletedAt: null, ...sessionFilter },
        deletedAt: null,
      },
      select: { id: true },
    });

    const totalTopics = topicsFromSubjects.length;

    // Get topic progress for this teacher
    const topicProgress = await prisma.topicProgress.findMany({
      where: {
        schoolId,
        ...sessionFilter,
        teacherId: id,
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

    // Get chapter progress for this teacher
    const chapterProgress = await prisma.chapterProgress.findMany({
      where: {
        schoolId,
        ...sessionFilter,
        teacherId: id,
        chapter: { subjectId: { in: assignedSubjectIds }, ...sessionFilter },
      },
      include: {
        chapter: {
          include: {
            topics: {
              where: sessionFilter,
            },
          },
        },
      },
    });

    // Add topics from completed chapters
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

    const progressPercentage =
      totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

    return {
      ...teacher,
      chapterProgress, // Include chapter progress for frontend
      totalChapters: totalTopics, // Renamed for frontend compatibility
      completedChapters: totalCompletedTopics, // Renamed for frontend compatibility
      progressPercentage,
    };
  },

  async update(
    schoolId: string,
    academicSessionId: string,
    id: string,
    data: { name?: string; phone?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' },
  ) {
    const teacher = await this.getById(schoolId, academicSessionId, id);

    if (data.status === 'SUSPENDED' || data.status === 'ACTIVE') {
      return this.setSuspended(schoolId, academicSessionId, id, data.status === 'SUSPENDED');
    }

    return prisma.$transaction(async (tx) => {
      if (data.name || data.phone) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
          },
        });
      }

      return tx.teacher.findUnique({
        where: { id: teacher.id },
        include: {
          user: true,
          teacherClasses: {
            include: { class: true, subject: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });
  },

  /** Suspend or re-activate a teacher (distinct from soft delete). */
  async setSuspended(schoolId: string, academicSessionId: string, id: string, suspended: boolean) {
    const teacher = await this.getById(schoolId, academicSessionId, id);
    const status = suspended ? 'SUSPENDED' : 'ACTIVE';

    await prisma.$transaction([
      prisma.user.update({
        where: { id: teacher.userId },
        data: { status, deletedAt: null },
      }),
      prisma.teacher.update({
        where: { id: teacher.id },
        data: { status, deletedAt: null },
      }),
    ]);

    return prisma.teacher.findUnique({
      where: { id: teacher.id },
      include: {
        user: true,
        teacherClasses: {
          include: { class: true, subject: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  async softDelete(schoolId: string, academicSessionId: string, id: string) {
    const teacher = await this.getById(schoolId, academicSessionId, id);
    return prisma.$transaction([
      prisma.teacher.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      }),
      prisma.user.update({
        where: { id: teacher.userId },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      }),
    ]);
  },
};
