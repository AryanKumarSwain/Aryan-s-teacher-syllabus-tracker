import { prisma } from '@school-syllabus/database';
import { Prisma } from '@school-syllabus/database';

export const teacherTrainingRepository = {
  async create(data: {
    schoolId: string;
    academicSessionId: string;
    teacherId: string;
    title: string;
    domain: 'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH';
    annexure?: string;
    provider?: 'CBSE' | 'SCHOOL' | 'SAHODAYA' | 'OTHER';
    trainingMode?: 'OFFLINE' | 'ONLINE' | 'BLENDED';
    hours: number;
    startDate?: Date;
    endDate?: Date;
    organizedBy?: string;
    locationOrPlatform?: string;
    isAcademicActivity?: boolean;
    academicActivityKey?: string;
    certificateNumber?: string;
    certificateUrl?: string;
    remarks?: string;
    status?: 'VERIFIED' | 'SUBMITTED' | 'REJECTED';
  }) {
    return prisma.teacherTrainingRecord.create({
      data: {
        schoolId: data.schoolId,
        academicSessionId: data.academicSessionId,
        teacherId: data.teacherId,
        title: data.title,
        domain: data.domain,
        annexure: data.annexure,
        provider: data.provider ?? 'CBSE',
        trainingMode: data.trainingMode ?? 'OFFLINE',
        hours: new Prisma.Decimal(data.hours),
        startDate: data.startDate,
        endDate: data.endDate,
        organizedBy: data.organizedBy,
        locationOrPlatform: data.locationOrPlatform,
        isAcademicActivity: data.isAcademicActivity ?? false,
        academicActivityKey: data.academicActivityKey,
        certificateNumber: data.certificateNumber,
        certificateUrl: data.certificateUrl,
        remarks: data.remarks,
        status: data.status ?? 'VERIFIED',
      },
      include: {
        teacher: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });
  },

  async createMany(
    items: Array<{
      schoolId: string;
      academicSessionId: string;
      teacherId: string;
      title: string;
      domain: 'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH';
      annexure?: string;
      provider?: 'CBSE' | 'SCHOOL' | 'SAHODAYA' | 'OTHER';
      trainingMode?: 'OFFLINE' | 'ONLINE' | 'BLENDED';
      hours: number;
      startDate?: Date;
      endDate?: Date;
      organizedBy?: string;
      locationOrPlatform?: string;
      isAcademicActivity?: boolean;
      academicActivityKey?: string;
      certificateNumber?: string;
      certificateUrl?: string;
      remarks?: string;
      status?: 'VERIFIED' | 'SUBMITTED' | 'REJECTED';
    }>,
  ) {
    const data = items.map((item) => ({
      schoolId: item.schoolId,
      academicSessionId: item.academicSessionId,
      teacherId: item.teacherId,
      title: item.title,
      domain: item.domain,
      annexure: item.annexure,
      provider: item.provider ?? 'CBSE',
      trainingMode: item.trainingMode ?? 'OFFLINE',
      hours: new Prisma.Decimal(item.hours),
      startDate: item.startDate,
      endDate: item.endDate,
      organizedBy: item.organizedBy,
      locationOrPlatform: item.locationOrPlatform,
      isAcademicActivity: item.isAcademicActivity ?? false,
      academicActivityKey: item.academicActivityKey,
      certificateNumber: item.certificateNumber,
      certificateUrl: item.certificateUrl,
      remarks: item.remarks,
      status: item.status ?? 'VERIFIED',
    }));

    return prisma.teacherTrainingRecord.createMany({
      data,
    });
  },

  async findById(id: string, schoolId: string) {
    return prisma.teacherTrainingRecord.findFirst({
      where: { id, schoolId },
      include: {
        teacher: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });
  },

  async update(
    id: string,
    schoolId: string,
    data: {
      title?: string;
      domain?: 'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH';
      annexure?: string;
      provider?: 'CBSE' | 'SCHOOL' | 'SAHODAYA' | 'OTHER';
      trainingMode?: 'OFFLINE' | 'ONLINE' | 'BLENDED';
      hours?: number;
      startDate?: Date;
      endDate?: Date;
      organizedBy?: string;
      locationOrPlatform?: string;
      isAcademicActivity?: boolean;
      academicActivityKey?: string;
      certificateNumber?: string;
      certificateUrl?: string;
      remarks?: string;
      status?: 'VERIFIED' | 'SUBMITTED' | 'REJECTED';
    },
  ) {
    return prisma.teacherTrainingRecord.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.domain && { domain: data.domain }),
        ...(data.annexure !== undefined && { annexure: data.annexure }),
        ...(data.provider && { provider: data.provider }),
        ...(data.trainingMode && { trainingMode: data.trainingMode }),
        ...(data.hours !== undefined && { hours: new Prisma.Decimal(data.hours) }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.organizedBy !== undefined && { organizedBy: data.organizedBy }),
        ...(data.locationOrPlatform !== undefined && { locationOrPlatform: data.locationOrPlatform }),
        ...(data.isAcademicActivity !== undefined && { isAcademicActivity: data.isAcademicActivity }),
        ...(data.academicActivityKey !== undefined && { academicActivityKey: data.academicActivityKey }),
        ...(data.certificateNumber !== undefined && { certificateNumber: data.certificateNumber }),
        ...(data.certificateUrl !== undefined && { certificateUrl: data.certificateUrl }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
        ...(data.status && { status: data.status }),
      },
      include: {
        teacher: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });
  },

  async delete(id: string, schoolId: string) {
    return prisma.teacherTrainingRecord.deleteMany({
      where: { id, schoolId },
    });
  },

  async findByTeacher(
    teacherId: string,
    schoolId: string,
    academicSessionId?: string,
    filters?: {
      domain?: string;
      provider?: string;
      status?: string;
    },
  ) {
    return prisma.teacherTrainingRecord.findMany({
      where: {
        teacherId,
        schoolId,
        ...(academicSessionId && { academicSessionId }),
        ...(filters?.domain && { domain: filters.domain as any }),
        ...(filters?.provider && { provider: filters.provider as any }),
        ...(filters?.status && { status: filters.status as any }),
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async findTeachersWithTrainings(
    schoolId: string,
    academicSessionId: string,
    search?: string,
  ) {
    return prisma.teacher.findMany({
      where: {
        schoolId,
        academicSessionId,
        deletedAt: null,
        ...(search
          ? {
              user: {
                OR: [
                  { name: { contains: search } },
                  { email: { contains: search } },
                ],
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            status: true,
          },
        },
        teacherClasses: {
          include: {
            class: { select: { id: true, name: true, grade: true, section: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        trainingRecords: {
          where: {
            academicSessionId,
            status: { not: 'REJECTED' },
          },
          orderBy: { startDate: 'desc' },
        },
      },
      orderBy: {
        user: { name: 'asc' },
      },
    });
  },

  async getTeacherWithTrainings(teacherId: string, schoolId: string, academicSessionId?: string) {
    return prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        teacherClasses: {
          include: {
            class: { select: { id: true, name: true, grade: true, section: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        trainingRecords: {
          where: {
            ...(academicSessionId && { academicSessionId }),
            status: { not: 'REJECTED' },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });
  },
};
