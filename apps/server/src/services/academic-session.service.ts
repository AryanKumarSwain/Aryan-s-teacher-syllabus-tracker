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

    // 1. Check active subscription and plan limits
    const activeSubscription = await prisma.subscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    if (!activeSubscription) {
      throw new AppError(
        'No active subscription plan found. Please upgrade or purchase a plan to create academic sessions.',
        403,
      );
    }

    const now = new Date();
    if (new Date(activeSubscription.endDate) < now) {
      throw new AppError(
        'Your subscription plan has expired. Please renew or upgrade your plan to create academic sessions.',
        403,
      );
    }

    // 2. Count existing sessions vs allowed sessions by plan
    const [currentSessionsCount, sessionPurchasesCount] = await Promise.all([
      prisma.academicSession.count({ where: { schoolId } }),
      prisma.paymentTransaction.count({ where: { schoolId, status: 'SUCCESS', billingCycle: 'SESSION' } }),
    ]);

    const planSessionLimit = activeSubscription.plan.sessionLimit ?? 1;
    const allowedSessions = Math.max(planSessionLimit, 1 + sessionPurchasesCount);

    if (currentSessionsCount >= allowedSessions) {
      throw new AppError(
        `Academic session limit reached (${currentSessionsCount}/${allowedSessions}). Your current plan "${activeSubscription.plan.name}" allows up to ${allowedSessions} session(s). Please upgrade your plan to create more sessions.`,
        403,
      );
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

  async update(schoolId: string, id: string, data: { name: string }) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new AppError('Session name is required', 400);
    }

    const session = await prisma.academicSession.findFirst({
      where: { id, schoolId },
    });

    if (!session) {
      throw new AppError('Academic session not found', 404);
    }

    if (session.name !== trimmedName) {
      const duplicate = await prisma.academicSession.findFirst({
        where: {
          schoolId,
          name: trimmedName,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new AppError(`A session with name "${trimmedName}" already exists`, 409);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.academicSession.update({
        where: { id },
        data: { name: trimmedName },
      });

      // Synchronize related academicTerm if exists
      await tx.academicTerm.updateMany({
        where: { academicSessionId: id, schoolId },
        data: { name: trimmedName },
      });

      return s;
    });

    return updated;
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
      return {
        message: 'No classes found in source session',
        count: 0,
      };
    }

    let createdCount = 0;
    for (const srcClass of sourceClasses) {
      const existing = await prisma.class.findFirst({
        where: {
          schoolId: srcClass.schoolId,
          academicSessionId: targetSessionId,
          name: srcClass.name,
          section: srcClass.section ?? null,
          deletedAt: null,
        },
      });

      if (!existing) {
        await prisma.class.create({
          data: {
            schoolId: srcClass.schoolId,
            academicSessionId: targetSessionId,
            name: srcClass.name,
            grade: srcClass.grade,
            section: srcClass.section,
            description: srcClass.description,
            sortOrder: srcClass.sortOrder,
          },
        });
        createdCount++;
      } else {
        createdCount++;
      }
    }

    return {
      message: `Successfully imported ${createdCount} classes`,
      count: createdCount,
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
      return {
        message: 'No subjects found in source session',
        count: 0,
      };
    }

    // Map old class IDs to new class IDs in target session
    const sourceClasses = await prisma.class.findMany({
      where: { academicSessionId: sourceSessionId, deletedAt: null },
    });

    let targetClasses = await prisma.class.findMany({
      where: { academicSessionId: targetSessionId, deletedAt: null },
    });

    const classMapping: Record<string, string> = {};
    for (const src of sourceClasses) {
      let matching = targetClasses.find(
        (tgt) =>
          tgt.name.toLowerCase() === src.name.toLowerCase() &&
          (tgt.section || '') === (src.section || ''),
      );

      // If class doesn't exist in target session yet, auto-create it
      if (!matching) {
        matching = await prisma.class.create({
          data: {
            schoolId: src.schoolId,
            academicSessionId: targetSessionId,
            name: src.name,
            grade: src.grade,
            section: src.section,
            description: src.description,
            sortOrder: src.sortOrder,
          },
        });
        targetClasses.push(matching);
      }
      classMapping[src.id] = matching.id;
    }

    let createdCount = 0;
    for (const srcSubject of sourceSubjects) {
      const targetClassId = srcSubject.classId ? classMapping[srcSubject.classId] || null : null;

      const existing = await prisma.subject.findFirst({
        where: {
          schoolId: srcSubject.schoolId,
          academicSessionId: targetSessionId,
          classId: targetClassId,
          name: srcSubject.name,
          deletedAt: null,
        },
      });

      if (!existing) {
        await prisma.subject.create({
          data: {
            schoolId: srcSubject.schoolId,
            academicSessionId: targetSessionId,
            classId: targetClassId,
            name: srcSubject.name,
            code: srcSubject.code,
            description: srcSubject.description,
            color: srcSubject.color,
            sortOrder: srcSubject.sortOrder,
          },
        });
        createdCount++;
      } else {
        createdCount++;
      }
    }

    return {
      message: `Successfully imported ${createdCount} subjects`,
      count: createdCount,
    };
  },

  async importTeachers(sourceSessionId: string, targetSessionId: string) {
    const sourceSession = await this.getById(sourceSessionId);
    const targetSession = await this.getById(targetSessionId);

    if (sourceSession.schoolId !== targetSession.schoolId) {
      throw new AppError('Sessions must belong to the same school', 400);
    }

    // 1. Find all active teachers in this school
    const schoolTeachers = await prisma.teacher.findMany({
      where: {
        schoolId: sourceSession.schoolId,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (schoolTeachers.length === 0) {
      return {
        message: 'No teachers found in school',
        teacherCount: 0,
        assignmentCount: 0,
      };
    }

    // 2. Point all teachers to the target academic session so relations remain active
    await prisma.teacher.updateMany({
      where: {
        schoolId: sourceSession.schoolId,
        deletedAt: null,
      },
      data: {
        academicSessionId: targetSessionId,
      },
    });

    // 3. Get source teacher assignments
    const sourceTeacherClasses = await prisma.teacherClass.findMany({
      where: {
        academicSessionId: sourceSessionId,
      },
    });

    let successAssignmentsCount = 0;

    if (sourceTeacherClasses.length > 0) {
      // Ensure target classes exist
      const sourceClasses = await prisma.class.findMany({
        where: { academicSessionId: sourceSessionId, deletedAt: null },
      });
      let targetClasses = await prisma.class.findMany({
        where: { academicSessionId: targetSessionId, deletedAt: null },
      });

      const classMapping: Record<string, string> = {};
      for (const src of sourceClasses) {
        let matching = targetClasses.find(
          (tgt) =>
            tgt.name.toLowerCase() === src.name.toLowerCase() &&
            (tgt.section || '') === (src.section || ''),
        );
        if (!matching) {
          matching = await prisma.class.create({
            data: {
              schoolId: src.schoolId,
              academicSessionId: targetSessionId,
              name: src.name,
              grade: src.grade,
              section: src.section,
              description: src.description,
              sortOrder: src.sortOrder,
            },
          });
          targetClasses.push(matching);
        }
        classMapping[src.id] = matching.id;
      }

      // Ensure target subjects exist
      const sourceSubjects = await prisma.subject.findMany({
        where: { academicSessionId: sourceSessionId, deletedAt: null },
      });
      let targetSubjects = await prisma.subject.findMany({
        where: { academicSessionId: targetSessionId, deletedAt: null },
      });

      const subjectMapping: Record<string, string> = {};
      for (const src of sourceSubjects) {
        const mappedTargetClassId = src.classId ? classMapping[src.classId] || null : null;
        let matching = targetSubjects.find((tgt) => {
          const nameMatches = tgt.name.toLowerCase() === src.name.toLowerCase();
          if (!nameMatches) return false;
          if (mappedTargetClassId) return tgt.classId === mappedTargetClassId;
          return true;
        }) || targetSubjects.find((tgt) => tgt.name.toLowerCase() === src.name.toLowerCase());

        if (!matching) {
          matching = await prisma.subject.create({
            data: {
              schoolId: src.schoolId,
              academicSessionId: targetSessionId,
              classId: mappedTargetClassId,
              name: src.name,
              code: src.code,
              description: src.description,
              color: src.color,
              sortOrder: src.sortOrder,
            },
          });
          targetSubjects.push(matching);
        }
        subjectMapping[src.id] = matching.id;
      }

      // Create teacher assignments in target session
      for (const srcTC of sourceTeacherClasses) {
        const newClassId = classMapping[srcTC.classId];
        const newSubjectId = srcTC.subjectId ? subjectMapping[srcTC.subjectId] : null;

        if (!newClassId) continue;

        const existing = await prisma.teacherClass.findFirst({
          where: {
            academicSessionId: targetSessionId,
            teacherId: srcTC.teacherId,
            classId: newClassId,
            subjectId: newSubjectId,
            schoolId: srcTC.schoolId,
          },
        });

        if (!existing) {
          await prisma.teacherClass.create({
            data: {
              schoolId: srcTC.schoolId,
              academicSessionId: targetSessionId,
              teacherId: srcTC.teacherId,
              classId: newClassId,
              subjectId: newSubjectId,
            },
          });
        }
        successAssignmentsCount++;
      }
    }

    const messageParts: string[] = [`${schoolTeachers.length} teachers`];
    if (successAssignmentsCount > 0) {
      messageParts.push(`${successAssignmentsCount} assignments`);
    }

    return {
      message: `Successfully imported ${messageParts.join(' and ')}`,
      teacherCount: schoolTeachers.length,
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

    // 1. Get source chapters with their topics
    const sourceChapters = await prisma.chapter.findMany({
      where: {
        academicSessionId: sourceSessionId,
        deletedAt: null,
      },
      include: {
        topics: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (sourceChapters.length === 0) {
      return {
        message: 'No chapters found in source session',
        count: 0,
      };
    }

    // 2. Ensure target classes exist
    const sourceClasses = await prisma.class.findMany({
      where: { academicSessionId: sourceSessionId, deletedAt: null },
    });
    let targetClasses = await prisma.class.findMany({
      where: { academicSessionId: targetSessionId, deletedAt: null },
    });

    const classMapping: Record<string, string> = {};
    for (const src of sourceClasses) {
      let matching = targetClasses.find(
        (tgt) =>
          tgt.name.toLowerCase() === src.name.toLowerCase() &&
          (tgt.section || '') === (src.section || ''),
      );
      if (!matching) {
        matching = await prisma.class.create({
          data: {
            schoolId: src.schoolId,
            academicSessionId: targetSessionId,
            name: src.name,
            grade: src.grade,
            section: src.section,
            description: src.description,
            sortOrder: src.sortOrder,
          },
        });
        targetClasses.push(matching);
      }
      classMapping[src.id] = matching.id;
    }

    // 3. Ensure target subjects exist
    const sourceSubjects = await prisma.subject.findMany({
      where: { academicSessionId: sourceSessionId, deletedAt: null },
    });
    let targetSubjects = await prisma.subject.findMany({
      where: { academicSessionId: targetSessionId, deletedAt: null },
    });

    const subjectMapping: Record<string, string> = {};
    for (const src of sourceSubjects) {
      const mappedTargetClassId = src.classId ? classMapping[src.classId] || null : null;
      let matching = targetSubjects.find((tgt) => {
        const nameMatches = tgt.name.toLowerCase() === src.name.toLowerCase();
        if (!nameMatches) return false;
        if (mappedTargetClassId) return tgt.classId === mappedTargetClassId;
        return true;
      }) || targetSubjects.find((tgt) => tgt.name.toLowerCase() === src.name.toLowerCase());

      if (!matching) {
        matching = await prisma.subject.create({
          data: {
            schoolId: src.schoolId,
            academicSessionId: targetSessionId,
            classId: mappedTargetClassId,
            name: src.name,
            code: src.code,
            description: src.description,
            color: src.color,
            sortOrder: src.sortOrder,
          },
        });
        targetSubjects.push(matching);
      }
      subjectMapping[src.id] = matching.id;
    }

    // 4. Create chapters and topics in target session
    let importedChapterCount = 0;
    let importedTopicCount = 0;

    for (const srcChapter of sourceChapters) {
      const newClassId = classMapping[srcChapter.classId];
      const newSubjectId = subjectMapping[srcChapter.subjectId];

      if (!newClassId || !newSubjectId) {
        continue;
      }

      // Check if chapter already exists in target session
      let targetChapter = await prisma.chapter.findFirst({
        where: {
          schoolId: srcChapter.schoolId,
          academicSessionId: targetSessionId,
          classId: newClassId,
          subjectId: newSubjectId,
          title: srcChapter.title,
          deletedAt: null,
        },
      });

      if (!targetChapter) {
        targetChapter = await prisma.chapter.create({
          data: {
            schoolId: srcChapter.schoolId,
            academicSessionId: targetSessionId,
            classId: newClassId,
            subjectId: newSubjectId,
            title: srcChapter.title,
            description: srcChapter.description,
            notes: srcChapter.notes,
            chapterNo: srcChapter.chapterNo,
            termName: srcChapter.termName,
            estimatedTeachingDays: srcChapter.estimatedTeachingDays,
            sortOrder: srcChapter.sortOrder,
          },
        });
        importedChapterCount++;
      }

      // Create topics for this chapter
      if (srcChapter.topics.length > 0) {
        for (const srcTopic of srcChapter.topics) {
          const existingTopic = await prisma.topic.findFirst({
            where: {
              schoolId: srcTopic.schoolId,
              academicSessionId: targetSessionId,
              chapterId: targetChapter.id,
              title: srcTopic.title,
              deletedAt: null,
            },
          });

          if (!existingTopic) {
            await prisma.topic.create({
              data: {
                schoolId: srcTopic.schoolId,
                academicSessionId: targetSessionId,
                chapterId: targetChapter.id,
                title: srcTopic.title,
                description: srcTopic.description,
                notes: srcTopic.notes,
                sortOrder: srcTopic.sortOrder,
              },
            });
            importedTopicCount++;
          }
        }
      }
    }

    return {
      message: `Successfully imported ${importedChapterCount} chapters and ${importedTopicCount} topics`,
      count: importedChapterCount,
      topicCount: importedTopicCount,
    };
  },
};
