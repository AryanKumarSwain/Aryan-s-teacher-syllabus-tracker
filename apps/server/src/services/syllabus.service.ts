import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { getPagination, softDeleteFilter, withTenant } from '../repositories/base.repository.js';

export const syllabusService = {
  // Classes
  async listClasses(
    schoolId: string,
    params: { page: number; pageSize: number; search?: string; academicSessionId?: string },
    teacherId?: string,
  ) {
    const { skip, page, pageSize } = getPagination(params.page, params.pageSize);

    // academicSessionId is now required for session isolation
    if (!params.academicSessionId) {
      throw new AppError('Academic session ID is required', 400);
    }

    const where = withTenant(schoolId, {
      ...softDeleteFilter(),
      academicSessionId: params.academicSessionId,
      ...(params.search && { name: { contains: params.search } }),
      ...(teacherId && {
        teacherClasses: {
          some: {
            teacherId,
            academicSessionId: params.academicSessionId,
          },
        },
      }),
    });

    const [items, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: teacherId
          ? {
            _count: {
              select: {
                subjects: {
                  where: {
                    teacherClasses: { 
                      some: { 
                        teacherId,
                        academicSessionId: params.academicSessionId,
                      },
                    },
                  },
                },
              },
            },
          }
          : { 
            _count: { 
              select: { 
                subjects: {
                  where: { academicSessionId: params.academicSessionId },
                },
              } 
            } 
          },
      }),
      prisma.class.count({ where }),
    ]);

    if (items.length === 0) {
      return { items, total, page, pageSize };
    }

    const classIds = items.map((cls) => cls.id);

    // For teachers: get assigned subject IDs
    // For admins: get all subject IDs
    let allSubjectIds: string[] = [];
    if (teacherId) {
      const teacherSubjects = await prisma.teacherClass.findMany({
        where: { teacherId, classId: { in: classIds } },
        select: { subjectId: true, classId: true },
      });

      allSubjectIds = teacherSubjects
        .map((ts) => ts.subjectId)
        .filter((id): id is string => id !== null);
    } else {
      // Admin: get all subjects for these classes
      const subjects = await prisma.subject.findMany({
        where: withTenant(schoolId, {
          classId: { in: classIds },
          ...softDeleteFilter(),
        }),
        select: { id: true },
      });
      allSubjectIds = subjects.map((s) => s.id);
    }

    const chapters = await prisma.chapter.findMany({
      where: withTenant(schoolId, {
        classId: { in: classIds },
        subjectId: { in: allSubjectIds },
        ...softDeleteFilter(),
      }),
      select: { id: true, classId: true },
    });
    const chapterIds = chapters.map((chapter) => chapter.id);

    // For teachers: get their completed chapters
    // For admins: get any completed chapters
    const sessionFilter = params.academicSessionId ? { academicSessionId: params.academicSessionId } : {};
    const completedProgress = await prisma.chapterProgress.findMany({
      where: {
        schoolId,
        ...sessionFilter,
        ...(teacherId && { teacherId }),
        chapterId: { in: chapterIds },
        chapterStatus: 'COMPLETED',
      },
      select: { chapterId: true },
    });
    const completedSet = new Set(completedProgress.map((item) => item.chapterId));

    const chapterCountByClass = chapters.reduce<Record<string, number>>((acc, chapter) => {
      acc[chapter.classId] = (acc[chapter.classId] || 0) + 1;
      return acc;
    }, {});

    const completedCountByClass = chapters.reduce<Record<string, number>>((acc, chapter) => {
      if (completedSet.has(chapter.id)) {
        acc[chapter.classId] = (acc[chapter.classId] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      items: items.map((cls) => ({
        ...cls,
        totalChapters: chapterCountByClass[cls.id] ?? 0,
        completedChapters: completedCountByClass[cls.id] ?? 0,
        progress:
          (chapterCountByClass[cls.id] ?? 0) > 0
            ? Math.round(
              ((completedCountByClass[cls.id] ?? 0) / (chapterCountByClass[cls.id] ?? 1)) * 100,
            )
            : 0,
      })),
      total,
      page,
      pageSize,
    };
  },

  async listAssignedClasses(
    schoolId: string,
    teacherId: string,
    params: { page: number; pageSize: number; search?: string },
  ) {
    return this.listClasses(schoolId, params, teacherId);
  },

  async createClass(
    schoolId: string,
    data: {
      academicSessionId: string;
      name: string;
      grade?: string;
      section?: string;
      description?: string;
      subjects?: string[];
    },
  ) {
    // Validate that the academic session exists and belongs to the school
    const session = await prisma.academicSession.findFirst({
      where: {
        id: data.academicSessionId,
        schoolId,
      },
    });

    if (!session) {
      throw new AppError('Academic session not found or does not belong to this school', 400);
    }

    const currentClassCount = await prisma.class.count({
      where: { schoolId, deletedAt: null },
    });
    if (currentClassCount >= 100) {
      throw new AppError('Maximum limit of 100 classes reached for this school', 400);
    }

    if (data.subjects?.length) {
      const currentSubjectCount = await prisma.subject.count({
        where: { schoolId, deletedAt: null },
      });
      if (currentSubjectCount + data.subjects.length > 200) {
        throw new AppError(`Cannot add ${data.subjects.length} subjects. Maximum limit of 200 subjects reached (Currently: ${currentSubjectCount}/200).`, 400);
      }
    }

    return prisma.class.create({
      data: {
        schoolId,
        academicSessionId: data.academicSessionId,
        name: data.name,
        grade: data.grade,
        section: data.section,
        description: data.description,
        subjects: data.subjects?.length
          ? {
            create: data.subjects.map((name, index) => ({
              schoolId,
              academicSessionId: data.academicSessionId,
              name,
              sortOrder: index + 1,
            })),
          }
          : undefined,
      },
      include: {
        subjects: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
  },

  async getClassDetails(schoolId: string, id: string, teacherId?: string, academicSessionId?: string) {
    console.log('[syllabusService.getClassDetails]', {
      schoolId,
      id,
      teacherId: teacherId ?? null,
      academicSessionId,
    });

    // academicSessionId is required for session isolation
    if (!academicSessionId) {
      throw new AppError('Academic session ID is required', 400);
    }

    let assignedSubjectIds: string[] | undefined;
    if (teacherId) {
      const teacherAssignments = await prisma.teacherClass.findMany({
        where: { teacherId, classId: id, academicSessionId },
        select: { subjectId: true },
      });
      if (teacherAssignments.length === 0) {
        throw new AppError('Class not found or not assigned to you', 404);
      }
      assignedSubjectIds = teacherAssignments
        .map((tc) => tc.subjectId)
        .filter((subId): subId is string => Boolean(subId));
    }

    const classItem = await prisma.class.findFirst({
      where: withTenant(schoolId, { id, academicSessionId, ...softDeleteFilter() }),
      include: {
        subjects: {
          where: {
            ...softDeleteFilter(),
            // ✅ If teacher: only subjects assigned to this teacher
            ...(teacherId && {
              id: { in: assignedSubjectIds || [] },
            }),
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            chapters: {
              where: softDeleteFilter(),
              orderBy: [{ sortOrder: 'asc' }],
              include: {
                // ✅ No topics included — removed
                chapterProgress: teacherId
                  ? {
                    where: { teacherId },
                    select: {
                      teachingCompleted: true,
                      qaCompleted: true,
                      copyChecked: true,
                      chapterStatus: true,
                      completionPercentage: true,
                    },
                  }
                  : false,
              },
            },
            teacherClasses: {
              include: {
                teacher: { include: { user: true } },
              },
            },
            _count: { select: { chapters: true } },
          },
        },
        teacherClasses: {
          include: {
            teacher: { include: { user: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!classItem) {
      console.log('[syllabusService.getClassDetails] class not found', { schoolId, id, teacherId });
      throw new AppError('Class not found', 404);
    }

    const chapters = await prisma.chapter.findMany({
      where: withTenant(schoolId, {
        classId: id,
        academicSessionId,
        ...softDeleteFilter(),
        // ✅ If teacher: only chapters in their assigned subjects
        ...(teacherId && {
          subjectId: { in: assignedSubjectIds || [] },
        }),
      }),
      select: {
        id: true,
        subjectId: true,
        chapterProgress: teacherId
          ? {
            where: { teacherId },
            select: {
              teachingCompleted: true,
              qaCompleted: true,
              chapterStatus: true,
            },
          }
          : {
            where: { chapterStatus: 'COMPLETED' },
            select: { chapterStatus: true },
          },
      },
    });

    const subjectProgressMap = new Map<string, { total: number; completed: number }>();
    let completedChapters = 0;

    for (const chapter of chapters) {
      const current = subjectProgressMap.get(chapter.subjectId) ?? { total: 0, completed: 0 };
      current.total += 1;
      if (chapter.chapterProgress.length > 0) {
        const progress = chapter.chapterProgress[0];
        if (!progress) {
          subjectProgressMap.set(chapter.subjectId, current);
          continue;
        }
        // For teachers: count as completed if teaching OR Q/A is done
        // For admin: count as completed if chapterStatus is COMPLETED
        const isCompleted = teacherId
          ? 'teachingCompleted' in progress && (progress.teachingCompleted || progress.qaCompleted)
          : progress.chapterStatus === 'COMPLETED';
        if (isCompleted) {
          current.completed += 1;
          completedChapters += 1;
        }
      }
      subjectProgressMap.set(chapter.subjectId, current);
    }

    const subjectDetails = classItem.subjects.map((subject) => {
      const progress = subjectProgressMap.get(subject.id);
      const totalChapters = progress?.total ?? 0;
      const completed = progress?.completed ?? 0;
      const teachers = subject.teacherClasses
        .map((tc) => tc.teacher)
        .filter((t) => t.deletedAt === null);
      const { teacherClasses: _teacherClasses, ...subjectRest } = subject;

      // ✅ Strip topics out of chapters before returning
      const chaptersWithoutTopics = subjectRest.chapters.map(({ ...chapter }) => chapter);

      return {
        ...subjectRest,
        chapters: chaptersWithoutTopics,
        teachers,
        totalChapters,
        completedChapters: completed,
        progressPercentage: totalChapters > 0 ? Math.round((completed / totalChapters) * 100) : 0,
      };
    });

    const overallProgress =
      chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0;

    return {
      ...classItem,
      subjects: subjectDetails,
      assignedTeachers: classItem.teacherClasses
        .filter((a) => a.subject !== null)
        .map((a) => ({
          id: a.teacher.id,
          name: a.teacher.user.name,
          email: a.teacher.user.email,
          subject: a.subject?.name ?? null,
        })),
      overallProgress,
      totalChapters: chapters.length,
      completedChapters,
    };
  },

  async updateClass(schoolId: string, id: string, data: Record<string, unknown>) {
    const item = await prisma.class.findFirst({
      where: withTenant(schoolId, { id, ...softDeleteFilter() }),
    });
    if (!item) throw new AppError('Class not found', 404);
    return prisma.class.update({ where: { id }, data });
  },

  async updateSubject(schoolId: string, id: string, data: Record<string, unknown>) {
    const item = await prisma.subject.findFirst({
      where: withTenant(schoolId, { id, ...softDeleteFilter() }),
    });
    if (!item) throw new AppError('Subject not found', 404);

    const updateData = Object.keys(data).reduce<Record<string, unknown>>((acc, key) => {
      if (data[key] !== undefined) acc[key] = data[key];
      return acc;
    }, {});

    if (Object.keys(updateData).length === 0)
      throw new AppError('At least one field is required', 400);

    return prisma.subject.update({ where: { id }, data: updateData });
  },

  async deleteSubject(schoolId: string, subjectId: string) {
    await prisma.topic.deleteMany({
      where: { chapter: { subjectId, schoolId } },
    });
    await prisma.chapter.deleteMany({ where: { subjectId, schoolId } });
    return prisma.subject.delete({ where: { id: subjectId, schoolId } });
  },

  async deleteTopic(schoolId: string, topicId: string) {
    return prisma.topic.delete({ where: { id: topicId, schoolId } });
  },

  async updateChapter(schoolId: string, id: string, data: Record<string, unknown>) {
    const item = await prisma.chapter.findFirst({
      where: withTenant(schoolId, { id, ...softDeleteFilter() }),
    });
    if (!item) throw new AppError('Chapter not found', 404);
    return prisma.chapter.update({ where: { id }, data });
  },

  async updateTopic(schoolId: string, id: string, data: Record<string, unknown>) {
    const item = await prisma.topic.findFirst({
      where: withTenant(schoolId, { id, ...softDeleteFilter() }),
    });
    if (!item) throw new AppError('Topic not found', 404);
    return prisma.topic.update({ where: { id }, data });
  },

  async deleteChapter(schoolId: string, id: string) {
    const item = await prisma.chapter.findFirst({ where: withTenant(schoolId, { id }) });
    if (!item) throw new AppError('Chapter not found', 404);
    return prisma.chapter.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async deleteClass(schoolId: string, id: string) {
    const item = await prisma.class.findFirst({ where: withTenant(schoolId, { id }) });
    if (!item) throw new AppError('Class not found', 404);
    return prisma.class.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  // Subjects
  async listSubjects(schoolId: string, classId?: string, academicSessionId?: string, teacherId?: string) {
    // academicSessionId is required for session isolation
    if (!academicSessionId) {
      throw new AppError('Academic session ID is required', 400);
    }

    console.log('[listSubjects] Called with:', { schoolId, classId, academicSessionId, teacherId });

    const where: any = withTenant(schoolId, {
      ...softDeleteFilter(),
      academicSessionId,
      ...(classId && { classId }),
    });

    // For teachers: strictly filter by assigned subjects
    if (teacherId) {
      console.log('[listSubjects] Filtering strictly for teacher assigned subjects:', teacherId, 'classId:', classId);
      const teacherClasses = await prisma.teacherClass.findMany({
        where: {
          teacherId,
          academicSessionId,
          ...(classId && { classId }),
        },
        select: { subjectId: true },
      });

      const assignedSubjectIds = teacherClasses
        .map((tc) => tc.subjectId)
        .filter((id): id is string => Boolean(id));

      console.log('[listSubjects] Filtered assignedSubjectIds:', assignedSubjectIds);

      where.id = { in: assignedSubjectIds };
    }

    console.log('[listSubjects] Final where clause:', JSON.stringify(where, null, 2));

    const subjects = await prisma.subject.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        class: true,
        teacherClasses: {
          where: academicSessionId ? { academicSessionId } : undefined,
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { chapters: true, teacherClasses: true } },
      },
    });

    const subjectIds = subjects.map((s) => s.id);

    // Fast lean aggregation query for completed chapter counts:
    // Only selects chapter id, subjectId, and at most 1 completed chapterProgress record
    const chapterStats =
      subjectIds.length > 0
        ? await prisma.chapter.findMany({
            where: {
              schoolId,
              academicSessionId,
              deletedAt: null,
              subjectId: { in: subjectIds },
            },
            select: {
              id: true,
              subjectId: true,
              chapterProgress: {
                where: {
                  schoolId,
                  academicSessionId,
                  chapterStatus: 'COMPLETED',
                },
                select: { id: true },
                take: 1,
              },
            },
          })
        : [];

    const progressMap = new Map<string, { total: number; completed: number }>();
    for (const ch of chapterStats) {
      const current = progressMap.get(ch.subjectId) || { total: 0, completed: 0 };
      current.total += 1;
      if (ch.chapterProgress && ch.chapterProgress.length > 0) {
        current.completed += 1;
      }
      progressMap.set(ch.subjectId, current);
    }

    const result = subjects.map((subject) => {
      // Map and deduplicate teachers assigned to this subject
      const teacherMap = new Map<string, any>();
      (subject.teacherClasses || []).forEach((tc) => {
        if (tc.teacher && tc.teacher.deletedAt === null && tc.teacher.user) {
          teacherMap.set(tc.teacher.id, {
            id: tc.teacher.id,
            name: tc.teacher.user.name,
            email: tc.teacher.user.email,
            phone: tc.teacher.user.phone,
            avatar: tc.teacher.user.avatar,
            user: tc.teacher.user,
          });
        }
      });
      const teachers = Array.from(teacherMap.values());

      const stat = progressMap.get(subject.id) || {
        total: subject._count?.chapters || 0,
        completed: 0,
      };
      const totalChapters = stat.total;
      const completedChaptersCount = stat.completed;
      const progressPercentage =
        totalChapters > 0 ? Math.round((completedChaptersCount / totalChapters) * 100) : 0;

      const { teacherClasses: _, ...subjectClean } = subject;

      return {
        ...subjectClean,
        teachers,
        totalChapters,
        completedChapters: completedChaptersCount,
        progressPercentage,
        progress: {
          totalChapters,
          completedChapters: completedChaptersCount,
          percentage: progressPercentage,
        },
      };
    });

    console.log('[listSubjects] Found subjects:', result.length);
    return result;
  },

  async getSubjectById(schoolId: string, subjectId: string, academicSessionId?: string) {
    if (!academicSessionId) {
      throw new AppError('Academic session ID is required', 400);
    }

    const subject = await prisma.subject.findFirst({
      where: withTenant(schoolId, {
        id: subjectId,
        academicSessionId,
        ...softDeleteFilter(),
      }),
      include: {
        class: true,
        teacherClasses: {
          where: { academicSessionId },
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        chapters: {
          where: {
            deletedAt: null,
            academicSessionId,
          },
          orderBy: [{ sortOrder: 'asc' }, { chapterNo: 'asc' }],
          include: {
            chapterProgress: {
              where: {
                schoolId,
                academicSessionId,
              },
              include: {
                teacher: {
                  include: {
                    user: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            topics: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: { select: { chapters: true, teacherClasses: true } },
      },
    });

    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    // Deduplicate teachers
    const teacherMap = new Map<string, any>();
    (subject.teacherClasses || []).forEach((tc) => {
      if (tc.teacher && tc.teacher.deletedAt === null && tc.teacher.user) {
        teacherMap.set(tc.teacher.id, {
          id: tc.teacher.id,
          name: tc.teacher.user.name,
          email: tc.teacher.user.email,
          phone: tc.teacher.user.phone,
          avatar: tc.teacher.user.avatar,
          user: tc.teacher.user,
        });
      }
    });
    const teachers = Array.from(teacherMap.values());

    let completedChaptersCount = 0;
    let inProgressChaptersCount = 0;
    let teachingCompletedCount = 0;
    let qaCompletedCount = 0;
    let copyCheckedCount = 0;

    const chapters = (subject.chapters || []).map((ch) => {
      const progressList = ch.chapterProgress || [];
      const isCompleted = progressList.some(
        (cp) => cp.chapterStatus === 'COMPLETED' || cp.completionPercentage === 100,
      );
      const isInProgress =
        !isCompleted &&
        progressList.some(
          (cp) =>
            cp.chapterStatus === 'IN_PROGRESS' ||
            (cp.completionPercentage && cp.completionPercentage > 0),
        );

      const hasTeaching = progressList.some((cp) => cp.teachingCompleted);
      const hasQa = progressList.some((cp) => cp.qaCompleted);
      const hasCopy = progressList.some((cp) => cp.copyChecked);

      if (isCompleted) completedChaptersCount++;
      else if (isInProgress) inProgressChaptersCount++;

      if (hasTeaching) teachingCompletedCount++;
      if (hasQa) qaCompletedCount++;
      if (hasCopy) copyCheckedCount++;

      const maxPercentage = progressList.reduce(
        (max, cp) => Math.max(max, cp.completionPercentage || 0),
        0,
      );

      const completedTeacher = progressList.find(
        (cp) => cp.chapterStatus === 'COMPLETED',
      )?.teacher?.user?.name;

      return {
        id: ch.id,
        title: ch.title,
        chapterNo: ch.chapterNo,
        termName: ch.termName,
        sortOrder: ch.sortOrder,
        estimatedTeachingDays: ch.estimatedTeachingDays,
        topicsCount: ch.topics?.length || 0,
        status: isCompleted ? 'COMPLETED' : isInProgress ? 'IN_PROGRESS' : 'PENDING',
        completionPercentage: isCompleted ? 100 : maxPercentage,
        teachingCompleted: hasTeaching,
        qaCompleted: hasQa,
        copyChecked: hasCopy,
        completedByTeacher: completedTeacher || null,
      };
    });

    const totalChapters = chapters.length;
    const pendingChaptersCount = Math.max(
      0,
      totalChapters - completedChaptersCount - inProgressChaptersCount,
    );
    const progressPercentage =
      totalChapters > 0 ? Math.round((completedChaptersCount / totalChapters) * 100) : 0;

    const { teacherClasses: _, ...subjectClean } = subject;

    return {
      ...subjectClean,
      teachers,
      totalChapters,
      completedChapters: completedChaptersCount,
      inProgressChapters: inProgressChaptersCount,
      pendingChapters: pendingChaptersCount,
      progressPercentage,
      progress: {
        totalChapters,
        completedChapters: completedChaptersCount,
        inProgressChapters: inProgressChaptersCount,
        pendingChapters: pendingChaptersCount,
        percentage: progressPercentage,
        teachingCompletedCount,
        qaCompletedCount,
        copyCheckedCount,
      },
      chapters,
    };
  },

  async createSubject(
    schoolId: string,
    data: { academicSessionId: string; classId?: string; name: string; code?: string; description?: string; color?: string },
  ) {
    const currentSubjectCount = await prisma.subject.count({
      where: { schoolId, deletedAt: null },
    });
    if (currentSubjectCount >= 200) {
      throw new AppError('Maximum limit of 200 subjects reached for this school (Limit: 200)', 400);
    }

    return prisma.subject.create({
      data: {
        schoolId,
        academicSessionId: data.academicSessionId,
        name: data.name,
        code: data.code,
        description: data.description,
        color: data.color,
        ...(data.classId ? { classId: data.classId } : {}),
      },
    });
  },

  // Chapters
  async listChapters(schoolId: string, subjectId?: string, teacherId?: string, academicSessionId?: string) {
    // academicSessionId is required for session isolation
    if (!academicSessionId) {
      throw new AppError('Academic session ID is required', 400);
    }

    return prisma.chapter.findMany({
      where: withTenant(schoolId, {
        ...softDeleteFilter(),
        academicSessionId,
        ...(subjectId && { subjectId }),
        ...(teacherId && {
          subject: { teacherClasses: { some: { teacherId } } },
        }),
      }),
      orderBy: [{ sortOrder: 'asc' }],
      include: {
        topics: {
          where: softDeleteFilter(),
          orderBy: { sortOrder: 'asc' },
          include: teacherId ? { topicProgress: { where: { teacherId } } } : undefined,
        },
        subject: true,
        class: true,
        chapterProgress: teacherId ? { where: { teacherId } } : false,
      },
    });
  },

  async createChapter(
    schoolId: string,
    data: {
      academicSessionId: string;
      subjectId: string;
      classId: string;
      title: string;
      description?: string;
      notes?: string;
      chapterNo?: number | string; 
      termName?: string;           
    },
  ) {
    const maxOrder = await prisma.chapter.aggregate({
      where: { schoolId, subjectId: data.subjectId },
      _max: { sortOrder: true },
    });
    const chapterNo =
      data.chapterNo !== undefined && data.chapterNo !== null && !isNaN(Number(data.chapterNo))
        ? Number(data.chapterNo)
        : undefined;
    return prisma.chapter.create({
      data: { schoolId, ...data, chapterNo, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
    });
  },

  // Topics
  async createTopic(
    schoolId: string,
    data: { chapterId: string; title: string; description?: string; notes?: string },
  ) {
    const chapter = await prisma.chapter.findFirst({
      where: withTenant(schoolId, { id: data.chapterId }),
    });
    if (!chapter) throw new AppError('Chapter not found', 404);

    const maxOrder = await prisma.topic.aggregate({
      where: { chapterId: data.chapterId },
      _max: { sortOrder: true },
    });
    return prisma.topic.create({
      data: {
        schoolId,
        academicSessionId: chapter.academicSessionId,
        ...data,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  },

  async getTree(schoolId: string, academicSessionId?: string) {
    // academicSessionId is required for session isolation
    if (!academicSessionId) {
      throw new AppError('Academic session ID is required', 400);
    }

    const classes = await prisma.class.findMany({
      where: withTenant(schoolId, {
        ...softDeleteFilter(),
        academicSessionId,
      }),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        subjects: {
          where: {
            ...softDeleteFilter(),
            academicSessionId,
          },
          orderBy: [{ sortOrder: 'asc' }],
          include: {
            chapters: {
              where: {
                ...softDeleteFilter(),
                academicSessionId,
              },
              orderBy: [{ sortOrder: 'asc' }],
              include: {
                topics: {
                  where: {
                    ...softDeleteFilter(),
                    academicSessionId,
                  },
                  orderBy: [{ sortOrder: 'asc' }]
                },
              },
            },
          },
        },
      },
    });
    return classes;
  },

  async listTopics(schoolId: string, chapterId: string) {
    return prisma.topic.findMany({
      where: withTenant(schoolId, { chapterId, ...softDeleteFilter() }),
      orderBy: [{ sortOrder: 'asc' }],
    });
  },

  async reorderChapters(schoolId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.chapter.updateMany({
          where: withTenant(schoolId, { id }),
          data: { sortOrder: index + 1 },
        }),
      ),
    );
  },

  async bulkCreateClasses(
    schoolId: string,
    academicSessionId: string,
    classes: Array<{ name: string; grade?: string; section?: string; description?: string }>,
  ) {
    // Validate that the academic session exists and belongs to the school
    const session = await prisma.academicSession.findFirst({
      where: {
        id: academicSessionId,
        schoolId,
      },
    });

    if (!session) {
      throw new AppError('Academic session not found or does not belong to this school', 400);
    }

    const results = await prisma.$transaction(
      classes.map((data) =>
        prisma.class.create({
          data: {
            schoolId,
            academicSessionId,
            name: data.name,
            grade: data.grade,
            section: data.section,
            description: data.description,
          },
        }),
      ),
    );
    return { created: results.length, items: results };
  },

  async bulkCreateSubjects(
    schoolId: string,
    academicSessionId: string,
    subjects: Array<{
      name: string;
      code?: string;
      description?: string;
      classId?: string;
      color?: string;
    }>,
  ) {
    // Validate that the academic session exists and belongs to the school
    const session = await prisma.academicSession.findFirst({
      where: {
        id: academicSessionId,
        schoolId,
      },
    });

    if (!session) {
      throw new AppError('Academic session not found or does not belong to this school', 400);
    }

    const results = await prisma.$transaction(
      subjects.map((data) =>
        prisma.subject.create({
          data: {
            schoolId,
            academicSessionId,
            name: data.name,
            code: data.code,
            description: data.description,
            classId: data.classId,
            color: data.color,
          },
        }),
      ),
    );
    return { created: results.length, items: results };
  },
};
