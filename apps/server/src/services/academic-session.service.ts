import { prisma, SessionStatus } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { getPagination, softDeleteFilter } from '../repositories/base.repository.js';

export const academicSessionService = {
  async list(params: { page: number; pageSize: number; schoolId?: string; status?: string }) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);
    const where = {
      ...(params.schoolId && { schoolId: params.schoolId }),
      ...(params.status && { status: params.status as SessionStatus }),
    };

    const [items, total] = await Promise.all([
      prisma.academicSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              academicTerms: true,
              classes: true,
              subjects: true,
              chapters: true,
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
          },
        },
      },
    });
    if (!session) throw new AppError('Academic session not found', 404);
    return session;
  },

  async getBySchoolId(schoolId: string) {
    return prisma.academicSession.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            academicTerms: true,
            classes: true,
            subjects: true,
          },
        },
      },
    });
  },

  async create(data: { schoolId: string; name: string }) {
    // Check if session name already exists for this school
    const existing = await prisma.academicSession.findFirst({
      where: { schoolId: data.schoolId, name: data.name },
    });

    if (existing) {
      throw new AppError(`Session "${data.name}" already exists for this school`, 400);
    }

    const session = await prisma.academicSession.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        status: SessionStatus.ACTIVE,
      },
    });

    // Always set the newly created session as the current session
    await prisma.school.update({
      where: { id: data.schoolId },
      data: { currentAcademicSessionId: session.id },
    });

    return session;
  },

  async switchSession(schoolId: string, sessionId: string) {
    // Verify session belongs to school
    const session = await this.getById(sessionId);
    if (session.schoolId !== schoolId) {
      throw new AppError('Session does not belong to this school', 403);
    }

    // Update current session
    return prisma.school.update({
      where: { id: schoolId },
      data: { currentAcademicSessionId: sessionId },
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

    // Get teacher-class mappings from source session
    const sourceTeacherClasses = await prisma.teacherClass.findMany({
      where: {
        academicSessionId: sourceSessionId,
      },
    });

    if (sourceTeacherClasses.length === 0) {
      throw new AppError('No teacher assignments found in source session', 404);
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
      sourceTeacherClasses.map((srcTC) => {
        const newClassId = classMapping[srcTC.classId];
        const newSubjectId = srcTC.subjectId ? subjectMapping[srcTC.subjectId] : null;

        if (!newClassId) {
          return null; // Skip if class mapping not found
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

    const successCount = createdTeacherClasses.filter((tc) => tc !== null).length;

    return {
      message: `Successfully imported ${successCount} teacher assignments`,
      count: successCount,
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
