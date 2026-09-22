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
      termFilter?: string;
    },
  ) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);

    // academicSessionId is required for session isolation
    if (!params.academicSessionId) {
      throw new AppError('Academic session ID is required', 400);
    }

    const where = withTenant(schoolId, {
      ...softDeleteFilter(),
      // Filter teachers by academicSessionId (now required in schema)
      academicSessionId: params.academicSessionId,
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

    // Extract term name from termFilter if provided
    let filteredTermName: string | undefined;
    if (params.termFilter && params.termFilter !== 'all') {
      const lastDash = params.termFilter.lastIndexOf('-');
      const yearId = params.termFilter.substring(0, lastDash);
      const termIndex = params.termFilter.substring(lastDash + 1);
      const termIdx = parseInt(termIndex, 10);

      const academicYear = await prisma.academicTerm.findFirst({
        where: { id: yearId, schoolId, deletedAt: null },
        select: { terms: true },
      });

      if (!academicYear) {
        const academicSession = await prisma.academicSession.findFirst({
          where: { id: yearId, schoolId, isArchived: false },
        });
        if (academicSession) {
          const sessionYear = await prisma.academicTerm.findFirst({
            where: { academicSessionId: academicSession.id, schoolId, deletedAt: null },
            select: { terms: true },
          });
          if (sessionYear?.terms) {
            const terms = typeof sessionYear.terms === 'string' ? JSON.parse(sessionYear.terms) : sessionYear.terms;
            if (terms[termIdx]) filteredTermName = terms[termIdx].name;
          }
        }
      } else if (academicYear.terms) {
        const terms = typeof academicYear.terms === 'string' ? JSON.parse(academicYear.terms) : academicYear.terms;
        if (terms[termIdx]) filteredTermName = terms[termIdx].name;
      }
    }

    // Calculate progress for each teacher based on chapters
    console.log('[DEBUG] teacher.list - calculating progress for', items.length, 'teachers');
    const itemsWithProgress = await Promise.all(
    items.map(async (teacher) => {
      console.log('[DEBUG] teacher.list - processing teacher:', teacher.user?.name, 'id:', teacher.id);
      const assignedSubjectIds = teacher.teacherClasses
        .map((tc) => tc.subject?.id)
        .filter((s): s is string => Boolean(s));
      console.log('[DEBUG] teacher.list - assignedSubjectIds:', assignedSubjectIds);

      // Get all chapters from assigned subjects
      const sessionFilter = params.academicSessionId ? { academicSessionId: params.academicSessionId } : {};
      console.log('[DEBUG] teacher.list - sessionFilter:', sessionFilter, 'filteredTermName:', filteredTermName);
      const chaptersFromSubjects = await prisma.chapter.findMany({
        where: {
          schoolId,
          subjectId: { in: assignedSubjectIds },
          deletedAt: null,
          ...sessionFilter,
          ...(filteredTermName && { termName: filteredTermName }),
        },
        select: { id: true },
      });

      const totalChapters = chaptersFromSubjects.length;
      console.log('[DEBUG] teacher.list - totalChapters:', totalChapters);

      // Get chapter progress for this teacher
      const chapterProgress = await prisma.chapterProgress.findMany({
        where: {
          schoolId,
          ...sessionFilter,
          teacherId: teacher.id,
          chapter: {
            subjectId: { in: assignedSubjectIds },
            ...sessionFilter,
            deletedAt: null,
            ...(filteredTermName && { termName: filteredTermName }),
          },
        },
      });
      console.log('[DEBUG] teacher.list - chapterProgress count:', chapterProgress.length);

      const completedChapters = chapterProgress.filter((cp) => cp.chapterStatus === 'COMPLETED').length;
      console.log('[DEBUG] teacher.list - completedChapters:', completedChapters);

      const progressPercentage =
        totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
      console.log('[DEBUG] teacher.list - final progressPercentage:', progressPercentage, 'for teacher:', teacher.user?.name);

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

  async getById(schoolId: string, academicSessionId: string, id: string, termFilter?: string) {
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

  // Extract term name from termFilter if provided
  let filteredTermName: string | undefined;
  if (termFilter && termFilter !== 'all') {
    const lastDash = termFilter.lastIndexOf('-');
    const yearId = termFilter.substring(0, lastDash);
    const termIndex = termFilter.substring(lastDash + 1);
    const termIdx = parseInt(termIndex, 10);

    const academicYear = await prisma.academicTerm.findFirst({
      where: { id: yearId, schoolId, deletedAt: null },
      select: { terms: true },
    });

    if (!academicYear) {
      const academicSession = await prisma.academicSession.findFirst({
        where: { id: yearId, schoolId, isArchived: false },
      });
      if (academicSession) {
        const sessionYear = await prisma.academicTerm.findFirst({
          where: { academicSessionId: academicSession.id, schoolId, deletedAt: null },
          select: { terms: true },
        });
        if (sessionYear?.terms) {
          const terms = typeof sessionYear.terms === 'string' ? JSON.parse(sessionYear.terms) : sessionYear.terms;
          if (terms[termIdx]) filteredTermName = terms[termIdx].name;
        }
      }
    } else if (academicYear.terms) {
      const terms = typeof academicYear.terms === 'string' ? JSON.parse(academicYear.terms) : academicYear.terms;
      if (terms[termIdx]) filteredTermName = terms[termIdx].name;
    }
  }

  const assignedSubjectIds = teacher.teacherClasses
    .map((tc) => tc.subject?.id)
    .filter((s): s is string => Boolean(s));

  // Get all chapters from assigned subjects
  const sessionFilter = academicSessionId ? { academicSessionId } : {};
  const chaptersFromSubjects = await prisma.chapter.findMany({
    where: {
      schoolId,
      subjectId: { in: assignedSubjectIds },
      deletedAt: null,
      ...sessionFilter,
      ...(filteredTermName && { termName: filteredTermName }),
    },
    select: { id: true },
  });

  const totalChapters = chaptersFromSubjects.length;

  // Get chapter progress for this teacher
  const chapterProgress = await prisma.chapterProgress.findMany({
    where: {
      schoolId,
      ...sessionFilter,
      teacherId: id,
      chapter: { 
        subjectId: { in: assignedSubjectIds }, 
        ...sessionFilter,
        deletedAt: null,
        ...(filteredTermName && { termName: filteredTermName }),
      },
    },
  });

  const completedChapters = chapterProgress.filter((cp) => cp.chapterStatus === 'COMPLETED').length;

  const progressPercentage =
    totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return {
    ...teacher,
    chapterProgress, // Include chapter progress for frontend
    totalChapters,
    completedChapters,
    progressPercentage,
  };
},

  async update(
  schoolId: string,
  academicSessionId: string,
  id: string,
  data: { name?: string; email?: string; phone?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' },
) {
  const teacher = await this.getById(schoolId, academicSessionId, id);

  if (data.status === 'SUSPENDED' || data.status === 'ACTIVE') {
    return this.setSuspended(schoolId, academicSessionId, id, data.status === 'SUSPENDED');
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new AppError('School not found', 404);

  let emailChanged = false;
  let newEmail = teacher.user.email;
  let tempPassword: string | null = null;
  let passwordHash: string | null = null;

  // Check if email is being changed
  if (data.email && data.email.toLowerCase() !== teacher.user.email.toLowerCase()) {
    const newEmailLower = data.email.toLowerCase();

    // Check if new email is already in use
    const existingUser = await prisma.user.findFirst({
      where: {
        email: newEmailLower,
        schoolId,
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    emailChanged = true;
    newEmail = newEmailLower;
    tempPassword = authService.generateSecurePassword();
    passwordHash = await hashPassword(tempPassword);
  }

  return prisma.$transaction(async (tx) => {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (emailChanged && passwordHash) {
      updateData.email = newEmail;
      updateData.passwordHash = passwordHash;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id: teacher.userId },
        data: updateData,
      });
    }

    const updatedTeacher = await tx.teacher.findUnique({
      where: { id: teacher.id },
      include: {
        user: true,
        teacherClasses: {
          include: { class: true, subject: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Send credentials email if email was changed
    if (emailChanged && tempPassword) {
      try {
        await trySendTeacherCredentials({
          to: newEmail,
          teacherName: updatedTeacher!.user.name,
          schoolName: school.name,
          email: newEmail,
          tempPassword,
        });
      } catch (emailError) {
        console.error('Failed to send credentials email:', emailError);
      }
    }

    return updatedTeacher;
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

  async getActivityLogs(schoolId: string, teacherId: string, limit: number = 50) {
    const teacher = await prisma.teacher.findFirst({
      where: withTenant(schoolId, { id: teacherId }),
      include: {
        user: true,
      },
    });
    if (!teacher) throw new AppError('Teacher not found', 404);

    // 1. Fetch from ActivityLog table
    const allActivityLogs = await prisma.activityLog.findMany({
      where: {
        schoolId,
        OR: [
          { userId: teacher.userId },
          { entityType: 'CHAPTER' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const teacherLogs = allActivityLogs.filter(
      (log) => log.userId === teacher.userId || (log.metadata as any)?.teacherId === teacherId,
    );

    // 2. Fetch ChapterProgress entries for this teacher
    const chapterProgressList = await prisma.chapterProgress.findMany({
      where: {
        schoolId,
        teacherId,
        OR: [
          { teachingCompleted: true },
          { qaCompleted: true },
          { copyChecked: true },
          { chapterStatus: 'COMPLETED' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        chapter: {
          include: {
            subject: {
              include: {
                class: true,
              },
            },
          },
        },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    const formattedLogs: Array<{
      id: string;
      action: string;
      description: string;
      chapterTitle: string;
      chapterNo?: number;
      termName?: string;
      subjectName?: string;
      className?: string;
      teachingCompleted: boolean;
      qaCompleted: boolean;
      copyChecked: boolean;
      chapterStatus: string;
      completionPercentage: number;
      changes: string[];
      userName: string;
      createdAt: string;
    }> = [];

    const seenKeys = new Set<string>();

    for (const log of teacherLogs) {
      const meta = (log.metadata as any) || {};
      const changes = Array.isArray(meta.changes) ? meta.changes : [];
      let desc = changes.join(' · ');
      if (!desc) {
        desc = meta.chapterStatus === 'COMPLETED' ? 'Completed Chapter' : 'Updated Chapter Workflow';
      }

      formattedLogs.push({
        id: log.id,
        action: log.action,
        description: desc,
        chapterTitle: meta.chapterTitle || 'Chapter',
        chapterNo: meta.chapterNo,
        termName: meta.termName,
        subjectName: meta.subjectName || undefined,
        className: meta.className || undefined,
        teachingCompleted: Boolean(meta.teachingCompleted),
        qaCompleted: Boolean(meta.qaCompleted),
        copyChecked: Boolean(meta.copyChecked),
        chapterStatus: meta.chapterStatus || 'IN_PROGRESS',
        completionPercentage: meta.completionPercentage ?? 0,
        changes,
        userName: log.user?.name || teacher.user.name,
        createdAt: log.createdAt.toISOString(),
      });

      if (log.entityId) {
        seenKeys.add(`${log.entityId}_${new Date(log.createdAt).toLocaleDateString()}`);
      }
    }

    for (const cp of chapterProgressList) {
      const key = `${cp.chapterId}_${new Date(cp.updatedAt).toLocaleDateString()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const changes: string[] = [];
        if (cp.teachingCompleted) changes.push('Teaching: Completed');
        if (cp.qaCompleted) changes.push('Q&A: Completed');
        if (cp.copyChecked) changes.push('Copy Checked: Completed');
        if (cp.chapterStatus === 'COMPLETED') changes.push('Chapter Marked Completed');

        formattedLogs.push({
          id: `cp-${cp.id}`,
          action: 'CHAPTER_PROGRESS_UPDATED',
          description:
            changes.join(' · ') ||
            (cp.chapterStatus === 'COMPLETED' ? 'Completed Chapter' : 'Updated Progress'),
          chapterTitle: cp.chapter.title,
          chapterNo: cp.chapter.chapterNo ?? undefined,
          termName: cp.chapter.termName ?? undefined,
          subjectName: cp.chapter.subject?.name,
          className: cp.chapter.subject?.class?.name,
          teachingCompleted: cp.teachingCompleted,
          qaCompleted: cp.qaCompleted,
          copyChecked: cp.copyChecked,
          chapterStatus: cp.chapterStatus,
          completionPercentage: cp.completionPercentage,
          changes,
          userName: cp.updatedBy?.name || teacher.user.name,
          createdAt: cp.updatedAt.toISOString(),
        });
      }
    }

    formattedLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return formattedLogs.slice(0, limit);
  },
};
