import { prisma, SessionStatus } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { getPagination } from '../repositories/base.repository.js';

export const academicSessionService = {
  async list(params: { page: number; pageSize: number; schoolId?: string; status?: string }) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);
    const schoolId = params.schoolId;

    if (!schoolId) {
      return { items: [], total: 0, page, pageSize };
    }

    const where = {
      schoolId,
      ...(params.status && { status: params.status as SessionStatus }),
    };

    const [items, total] = await Promise.all([
      prisma.academicSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              academicTerms: true,
              classes: true,
              subjects: true,
              chapters: true,
              teachers: true,
            },
          },
        },
      }),
      prisma.academicSession.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const session = await prisma.academicSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            academicTerms: true,
            classes: true,
            subjects: true,
            chapters: true,
            teachers: true,
          },
        },
      },
    });
    if (!session) throw new AppError('Academic session not found', 404);
    return session;
  },

  async getBySchoolId(schoolId: string) {
    const [school, sessions] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      }),
      prisma.academicSession.findMany({
        where: {
          schoolId,
        },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              academicTerms: true,
              classes: true,
              subjects: true,
              chapters: true,
              teachers: true,
            },
          },
        },
      }),
    ]);

    return sessions.map((s) => ({
      ...s,
      status: s.id === school?.currentAcademicSessionId ? SessionStatus.ACTIVE : SessionStatus.ARCHIVED,
      isArchived: s.id !== school?.currentAcademicSessionId,
    }));
  },

  async create(schoolId: string, data: { name: string; setAsActive?: boolean }) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new AppError('Session name is required', 400);
    }

    // Check if session with name already exists for this school
    const existing = await prisma.academicSession.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      throw new AppError(`Academic session "${trimmedName}" already exists`, 409);
    }

    const session = await prisma.academicSession.create({
      data: {
        schoolId,
        name: trimmedName,
        status: data.setAsActive ? SessionStatus.ACTIVE : SessionStatus.ARCHIVED,
        isArchived: !data.setAsActive,
      },
      include: {
        _count: {
          select: {
            academicTerms: true,
            classes: true,
            subjects: true,
            chapters: true,
            teachers: true,
          },
        },
      },
    });

    if (data.setAsActive) {
      await prisma.$transaction([
        prisma.school.update({
          where: { id: schoolId },
          data: { currentAcademicSessionId: session.id },
        }),
        prisma.academicSession.updateMany({
          where: { schoolId, id: { not: session.id } },
          data: { status: SessionStatus.ARCHIVED, isArchived: true },
        }),
      ]);
    }

    return session;
  },

  async delete(schoolId: string, id: string) {
    const session = await prisma.academicSession.findFirst({
      where: { id, schoolId },
      include: {
        _count: {
          select: {
            classes: true,
            subjects: true,
            chapters: true,
            teachers: true,
          },
        },
      },
    });

    if (!session) {
      throw new AppError('Academic session not found', 404);
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { currentAcademicSessionId: true },
    });

    if (school?.currentAcademicSessionId === id) {
      throw new AppError('Cannot delete the currently active session. Switch to another session first.', 400);
    }

    // Delete session and related empty/cascade records
    await prisma.$transaction(async (tx) => {
      await tx.topicProgress.deleteMany({ where: { academicSessionId: id } });
      await tx.chapterProgress.deleteMany({ where: { academicSessionId: id } });
      await tx.examPaper.deleteMany({ where: { academicSessionId: id } });
      await tx.teacherClass.deleteMany({ where: { academicSessionId: id } });
      await tx.topic.deleteMany({ where: { academicSessionId: id } });
      await tx.chapter.deleteMany({ where: { academicSessionId: id } });
      await tx.subject.deleteMany({ where: { academicSessionId: id } });
      await tx.class.deleteMany({ where: { academicSessionId: id } });
      await tx.academicTerm.deleteMany({ where: { academicSessionId: id } });
      await tx.academicSession.delete({ where: { id } });
    });

    return { message: 'Academic session deleted successfully' };
  },

  async switchSession(schoolId: string, sessionId: string) {
    // Verify session exists for this school
    const session = await prisma.academicSession.findFirst({
      where: {
        id: sessionId,
        schoolId,
      },
    });

    if (!session) {
      throw new AppError('Invalid session for this school', 403);
    }

    // Update current session and synchronize status/isArchived
    await prisma.$transaction([
      prisma.school.update({
        where: { id: schoolId },
        data: { currentAcademicSessionId: sessionId },
      }),
      prisma.academicSession.updateMany({
        where: { schoolId, id: { not: sessionId } },
        data: { status: SessionStatus.ARCHIVED, isArchived: true },
      }),
      prisma.academicSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.ACTIVE, isArchived: false },
      }),
    ]);

    return prisma.school.findUnique({
      where: { id: schoolId },
    });
  },

  async archive(id: string) {
    const session = await this.getById(id);

    // Cannot archive if it's the current session
    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
    });

    if (school?.currentAcademicSessionId === id) {
      throw new AppError('Cannot archive the current active session', 400);
    }

    return prisma.academicSession.update({
      where: { id },
      data: { status: SessionStatus.ARCHIVED, isArchived: true },
    });
  },

  async importClasses(sourceSessionId: string, targetSessionId: string) {
    const sourceSession = await this.getById(sourceSessionId);
    const targetSession = await this.getById(targetSessionId);

    if (sourceSession.schoolId !== targetSession.schoolId) {
      throw new AppError('Sessions must belong to the same school', 400);
    }

    const sourceClasses = await prisma.class.findMany({
      where: {
        academicSessionId: sourceSessionId,
        deletedAt: null,
      },
    });

    if (sourceClasses.length === 0) {
      throw new AppError('No classes found in source session', 404);
    }

    const createdClasses = await Promise.all(
      sourceClasses.map((srcClass) =>
        prisma.class.create({
          data: {
            schoolId: srcClass.schoolId,
            academicSessionId: targetSessionId,
            name: srcClass.name,
            grade: srcClass.grade,
            section: srcClass.section,
            description: srcClass.description,
            sortOrder: srcClass.sortOrder,
          },
        }),
      ),
    );

    return {
      message: `Successfully imported ${createdClasses.length} classes`,
      count: createdClasses.length,
    };
  },

  async importSubjects(sourceSessionId: string, targetSessionId: string) {
    const sourceSession = await this.getById(sourceSessionId);
    const targetSession = await this.getById(targetSessionId);

    if (sourceSession.schoolId !== targetSession.schoolId) {
      throw new AppError('Sessions must belong to the same school', 400);
    }

    const sourceSubjects = await prisma.subject.findMany({
      where: {
        academicSessionId: sourceSessionId,
        deletedAt: null,
      },
    });

    if (sourceSubjects.length === 0) {
      throw new AppError('No subjects found in source session', 404);
    }

    // Map old class IDs to new class IDs if they exist in target session
    const sourceClasses = await prisma.class.findMany({
      where: { academicSessionId: sourceSessionId },
    });

    const targetClasses = await prisma.class.findMany({
      where: { academicSessionId: targetSessionId },
    });

    const classMapping: Record<string, string> = {};
    sourceClasses.forEach((src) => {
      const matching = targetClasses.find(
        (tgt) => tgt.name === src.name && tgt.section === src.section,
      );
      if (matching) {
        classMapping[src.id] = matching.id;
      }
    });

    const createdSubjects = await Promise.all(
      sourceSubjects.map((srcSubject) =>
        prisma.subject.create({
          data: {
            schoolId: srcSubject.schoolId,
            academicSessionId: targetSessionId,
            classId: srcSubject.classId ? classMapping[srcSubject.classId] || null : null,
            name: srcSubject.name,
            code: srcSubject.code,
            description: srcSubject.description,
            color: srcSubject.color,
            sortOrder: srcSubject.sortOrder,
          },
        }),
      ),
    );

    return {
      message: `Successfully imported ${createdSubjects.length} subjects`,
      count: createdSubjects.length,
    };
  },

  async importTeachers(sourceSessionId: string, targetSessionId: string) {
    const sourceSession = await this.getById(sourceSessionId);
    const targetSession = await this.getById(targetSessionId);

    if (sourceSession.schoolId !== targetSession.schoolId) {
      throw new AppError('Sessions must belong to the same school', 400);
    }

    // Get teachers belonging to source session
    let sourceTeachers = await prisma.teacher.findMany({
      where: {
        academicSessionId: sourceSessionId,
        schoolId: sourceSession.schoolId,
        deletedAt: null,
      },
    });

    // If no teachers specifically tagged with sourceSessionId, look up active teachers in this school
    if (sourceTeachers.length === 0) {
      sourceTeachers = await prisma.teacher.findMany({
        where: {
          schoolId: sourceSession.schoolId,
          deletedAt: null,
        },
      });
    }

    // Get teacher-class mappings from source session
    const sourceTeacherClasses = await prisma.teacherClass.findMany({
      where: {
        academicSessionId: sourceSessionId,
      },
    });

    if (sourceTeachers.length === 0 && sourceTeacherClasses.length === 0) {
      throw new AppError('No teachers found in this school to import', 404);
    }

    // Assign teachers to the target session (only those not already in target session)
    const teachersToUpdate = sourceTeachers.filter((t) => t.academicSessionId !== targetSessionId);
    if (teachersToUpdate.length > 0) {
      await prisma.teacher.updateMany({
        where: {
          id: { in: teachersToUpdate.map((t) => t.id) },
          schoolId: sourceSession.schoolId,
        },
        data: {
          academicSessionId: targetSessionId,
        },
      });
    }

    let successAssignmentsCount = 0;

    if (sourceTeacherClasses.length > 0) {
      // Map old IDs to new IDs
      const sourceClasses = await prisma.class.findMany({
        where: { academicSessionId: sourceSessionId },
      });

      const targetClasses = await prisma.class.findMany({
        where: { academicSessionId: targetSessionId },
      });

      const sourceSubjects = await prisma.subject.findMany({
        where: { academicSessionId: sourceSessionId },
      });

      const targetSubjects = await prisma.subject.findMany({
        where: { academicSessionId: targetSessionId },
      });

      const classMapping: Record<string, string> = {};
      const subjectMapping: Record<string, string> = {};

      sourceClasses.forEach((src) => {
        const matching = targetClasses.find(
          (tgt) => tgt.name === src.name && tgt.section === src.section,
        );
        if (matching) {
          classMapping[src.id] = matching.id;
        }
      });

      sourceSubjects.forEach((src) => {
        const matching = targetSubjects.find((tgt) => tgt.name === src.name);
        if (matching) {
          subjectMapping[src.id] = matching.id;
        }
      });

      // Create teacher-class mappings in target session
      const createdTeacherClasses = await Promise.all(
        sourceTeacherClasses.map(async (srcTC) => {
          const newClassId = classMapping[srcTC.classId];
          const newSubjectId = srcTC.subjectId ? subjectMapping[srcTC.subjectId] : null;

          if (!newClassId) {
            return null; // Skip if class mapping not found
          }

          // Check if mapping already exists in target session to avoid unique constraint collisions
          const existing = await prisma.teacherClass.findFirst({
            where: {
              academicSessionId: targetSessionId,
              teacherId: srcTC.teacherId,
              classId: newClassId,
              subjectId: newSubjectId,
              schoolId: srcTC.schoolId,
            },
          });
          if (existing) {
            return existing;
          }

          return prisma.teacherClass.create({
            data: {
              schoolId: srcTC.schoolId,
              academicSessionId: targetSessionId,
              teacherId: srcTC.teacherId,
              classId: newClassId,
              subjectId: newSubjectId,
            },
          });
        }),
      );

      successAssignmentsCount = createdTeacherClasses.filter((tc) => tc !== null).length;
    }

    const messageParts: string[] = [];
    if (sourceTeachers.length > 0) {
      messageParts.push(`${sourceTeachers.length} teachers`);
    }
    if (successAssignmentsCount > 0) {
      messageParts.push(`${successAssignmentsCount} assignments`);
    }

    return {
      message: `Successfully imported ${messageParts.join(' and ')}`,
      teacherCount: sourceTeachers.length,
      assignmentCount: successAssignmentsCount,
    };
  },

  async importStructure(
    sourceSessionId: string,
    targetSessionId: string,
    options: { importClasses?: boolean; importTeachers?: boolean } = {},
  ) {
    const doClasses = options.importClasses ?? true;
    const doTeachers = options.importTeachers ?? false;

    if (!doClasses && !doTeachers) {
      throw new AppError('Select at least classes or teachers to import', 400);
    }

    const results: { classes?: any; teachers?: any } = {};
    const messages: string[] = [];

    if (doClasses) {
      results.classes = await this.importClasses(sourceSessionId, targetSessionId);
      messages.push(`${results.classes.count} classes`);
    }

    if (doTeachers) {
      results.teachers = await this.importTeachers(sourceSessionId, targetSessionId);
      messages.push(results.teachers.message.replace(/^Successfully imported\s+/i, ''));
    }

    return {
      message: `Successfully imported ${messages.join(' and ')}`,
      results,
    };
  },

  async importSyllabus(sourceSessionId: string, targetSessionId: string) {
    const sourceSession = await this.getById(sourceSessionId);
    const targetSession = await this.getById(targetSessionId);

    if (sourceSession.schoolId !== targetSession.schoolId) {
      throw new AppError('Sessions must belong to the same school', 400);
    }

    // Get source chapters
    const sourceChapters = await prisma.chapter.findMany({
      where: {
        academicSessionId: sourceSessionId,
        deletedAt: null,
      },
      include: {
        topics: {
          where: { deletedAt: null },
        },
      },
    });

    if (sourceChapters.length === 0) {
      throw new AppError('No syllabus data found in source session', 404);
    }

    // Map old IDs to new IDs
    const sourceClasses = await prisma.class.findMany({
      where: { academicSessionId: sourceSessionId },
    });

    const targetClasses = await prisma.class.findMany({
      where: { academicSessionId: targetSessionId },
    });

    const sourceSubjects = await prisma.subject.findMany({
      where: { academicSessionId: sourceSessionId },
    });

    const targetSubjects = await prisma.subject.findMany({
      where: { academicSessionId: targetSessionId },
    });

    const classMapping: Record<string, string> = {};
    const subjectMapping: Record<string, string> = {};
    const chapterMapping: Record<string, string> = {};

    sourceClasses.forEach((src) => {
      const matching = targetClasses.find(
        (tgt) => tgt.name === src.name && tgt.section === src.section,
      );
      if (matching) {
        classMapping[src.id] = matching.id;
      }
    });

    sourceSubjects.forEach((src) => {
      const matching = targetSubjects.find((tgt) => tgt.name === src.name);
      if (matching) {
        subjectMapping[src.id] = matching.id;
      }
    });

    // Create chapters and topics
    const createdChapters = await Promise.all(
      sourceChapters.map(async (srcChapter) => {
        const newClassId = classMapping[srcChapter.classId];
        const newSubjectId = subjectMapping[srcChapter.subjectId];

        if (!newClassId || !newSubjectId) {
          return null;
        }

        const chapter = await prisma.chapter.create({
          data: {
            schoolId: srcChapter.schoolId,
            academicSessionId: targetSessionId,
            classId: newClassId,
            subjectId: newSubjectId,
            title: srcChapter.title,
            description: srcChapter.description,
            notes: srcChapter.notes,
            estimatedTeachingDays: srcChapter.estimatedTeachingDays,
            sortOrder: srcChapter.sortOrder,
          },
        });

        chapterMapping[srcChapter.id] = chapter.id;

        // Create topics for this chapter
        if (srcChapter.topics.length > 0) {
          await prisma.topic.createMany({
            data: srcChapter.topics.map((srcTopic) => ({
              schoolId: srcTopic.schoolId,
              academicSessionId: targetSessionId,
              chapterId: chapter.id,
              title: srcTopic.title,
              description: srcTopic.description,
              notes: srcTopic.notes,
              sortOrder: srcTopic.sortOrder,
            })),
          });
        }

        return chapter;
      }),
    );

    const successCount = createdChapters.filter((ch) => ch !== null).length;

    return {
      message: `Successfully imported ${successCount} chapters with topics`,
      count: successCount,
    };
  },
};
