import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { teacherTrainingRepository } from '../repositories/teacher-training.repository.js';
import { CPD_STANDARDS, ALL_CATALOG_TOPICS } from '../constants/cbse-training-catalog.js';

export interface TeacherCpdSummary {
  teacherId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  subjectNames: string[];
  classNames: string[];
  totalHours: number;
  effectiveTotalHours?: number;
  cbseHours: number;
  effectiveCbseHours?: number;
  schoolHours: number;
  effectiveSchoolHours?: number;
  domain1Hours: number; // Core Values & Ethics (out of 12)
  domain2Hours: number; // Knowledge & Practice (out of 24)
  domain3Hours: number; // Professional Growth (out of 14)
  academicActivityHours: number;
  offlineHours: number;
  onlineHours: number;
  totalProgress: number; // 0 - 100%
  cbseProgress: number;
  schoolProgress: number;
  domain1Progress: number;
  domain2Progress: number;
  domain3Progress: number;
  hoursRemaining: number;
  complianceStatus: 'COMPLIANT' | 'IN_PROGRESS' | 'NOT_STARTED';
  recordsCount: number;
  recentRecords?: any[];
}

function computeCpdSummary(teacher: any): TeacherCpdSummary {
  const records = teacher.trainingRecords || [];

  let totalHours = 0;
  let cbseHours = 0;
  let schoolHours = 0;
  let domain1Hours = 0;
  let domain2Hours = 0;
  let domain3Hours = 0;
  let academicActivityHours = 0;
  let offlineHours = 0;
  let onlineHours = 0;

  for (const rec of records) {
    // Only count VERIFIED records towards CPD hours — SUBMITTED records are pending admin approval
    if (rec.status !== 'VERIFIED') continue;
    const hrs = Number(rec.hours) || 0;
    totalHours += hrs;

    if (rec.provider === 'CBSE') {
      cbseHours += hrs;
    } else {
      schoolHours += hrs;
    }

    if (rec.trainingMode === 'OFFLINE') {
      offlineHours += hrs;
    } else {
      onlineHours += hrs;
    }

    if (rec.domain === 'CORE_VALUES_ETHICS') {
      domain1Hours += hrs;
    } else if (rec.domain === 'KNOWLEDGE_PRACTICE') {
      domain2Hours += hrs;
    } else if (rec.domain === 'PROFESSIONAL_GROWTH') {
      domain3Hours += hrs;
      if (rec.isAcademicActivity) {
        academicActivityHours += hrs;
      }
    }
  }

  // Academic activity hours count up to 11 hrs max towards Domain 3 school portion as per circular
  const effectiveAcademicHrs = Math.min(11, academicActivityHours);
  const adjustedDomain3Hrs = domain3Hours - academicActivityHours + effectiveAcademicHrs;

  // CBSE and School quotas each contribute up to 25 hours towards the 50-hour mandatory target.
  // Excess hours in either category do NOT count towards the other quota or the 50h progress.
  const effectiveCbseHours = Math.min(25, cbseHours);
  const effectiveSchoolHours = Math.min(25, schoolHours);
  const effectiveTotalHours = Number((effectiveCbseHours + effectiveSchoolHours).toFixed(1));

  const totalProgress = Math.min(100, Math.round((effectiveTotalHours / CPD_STANDARDS.TOTAL_HOURS_REQUIRED) * 100));
  const cbseProgress = Math.min(100, Math.round((effectiveCbseHours / CPD_STANDARDS.CBSE_HOURS_REQUIRED) * 100));
  const schoolProgress = Math.min(100, Math.round((effectiveSchoolHours / CPD_STANDARDS.SCHOOL_HOURS_REQUIRED) * 100));
  const domain1Progress = Math.min(100, Math.round((domain1Hours / CPD_STANDARDS.DOMAINS.CORE_VALUES_ETHICS.totalRequired) * 100));
  const domain2Progress = Math.min(100, Math.round((domain2Hours / CPD_STANDARDS.DOMAINS.KNOWLEDGE_PRACTICE.totalRequired) * 100));
  const domain3Progress = Math.min(100, Math.round((adjustedDomain3Hrs / CPD_STANDARDS.DOMAINS.PROFESSIONAL_GROWTH.totalRequired) * 100));

  let complianceStatus: 'COMPLIANT' | 'IN_PROGRESS' | 'NOT_STARTED' = 'NOT_STARTED';
  if (cbseHours >= 25 && schoolHours >= 25) {
    complianceStatus = 'COMPLIANT';
  } else if (totalHours > 0) {
    complianceStatus = 'IN_PROGRESS';
  }

  const hoursRemaining = Math.max(0, Number((50 - effectiveTotalHours).toFixed(1)));

  const subjectNames = Array.from(
    new Set(
      (teacher.teacherClasses || [])
        .map((tc: any) => tc.subject?.name)
        .filter(Boolean),
    ),
  ) as string[];

  const classNames = Array.from(
    new Set(
      (teacher.teacherClasses || [])
        .map((tc: any) => tc.class?.name)
        .filter(Boolean),
    ),
  ) as string[];

  return {
    teacherId: teacher.id,
    name: teacher.user?.name || 'Unknown Teacher',
    email: teacher.user?.email || '',
    phone: teacher.user?.phone,
    avatar: teacher.user?.avatar,
    subjectNames,
    classNames,
    totalHours: Number(totalHours.toFixed(1)),
    effectiveTotalHours,
    cbseHours: Number(cbseHours.toFixed(1)),
    effectiveCbseHours: Number(effectiveCbseHours.toFixed(1)),
    schoolHours: Number(schoolHours.toFixed(1)),
    effectiveSchoolHours: Number(effectiveSchoolHours.toFixed(1)),
    domain1Hours: Number(domain1Hours.toFixed(1)),
    domain2Hours: Number(domain2Hours.toFixed(1)),
    domain3Hours: Number(adjustedDomain3Hrs.toFixed(1)),
    academicActivityHours: Number(effectiveAcademicHrs.toFixed(1)),
    offlineHours: Number(offlineHours.toFixed(1)),
    onlineHours: Number(onlineHours.toFixed(1)),
    totalProgress,
    cbseProgress,
    schoolProgress,
    domain1Progress,
    domain2Progress,
    domain3Progress,
    hoursRemaining,
    complianceStatus,
    recordsCount: records.length,
    recentRecords: records.slice(0, 5),
  };
}

export const teacherTrainingService = {
  async resolveActiveAcademicSession(schoolId: string, providedSessionId?: string) {
    if (providedSessionId) return providedSessionId;
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { currentAcademicSessionId: true },
    });
    if (!school?.currentAcademicSessionId) {
      const fallbackSession = await prisma.academicSession.findFirst({
        where: { schoolId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (!fallbackSession) throw new AppError('No active academic session found for this school', 400);
      return fallbackSession.id;
    }
    return school.currentAcademicSessionId;
  },

  async resolveTeacherId(schoolId: string, userId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { currentAcademicSessionId: true },
    });
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId,
        deletedAt: null,
        ...(school?.currentAcademicSessionId ? { academicSessionId: school.currentAcademicSessionId } : {}),
      },
      select: { id: true },
    });

    if (!teacher) {
      // Fallback: search without academicSessionId
      const anyTeacher = await prisma.teacher.findFirst({
        where: { schoolId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!anyTeacher) throw new AppError('Teacher profile not found for user', 404);
      return anyTeacher.id;
    }
    return teacher.id;
  },

  async listTeachersWithCpd(schoolId: string, academicSessionId?: string, search?: string) {
    const sessionId = await this.resolveActiveAcademicSession(schoolId, academicSessionId);
    const teachers = await teacherTrainingRepository.findTeachersWithTrainings(schoolId, sessionId, search);
    return teachers.map(computeCpdSummary);
  },

  async getTeacherCpdDetail(teacherId: string, schoolId: string, academicSessionId?: string) {
    const sessionId = await this.resolveActiveAcademicSession(schoolId, academicSessionId);
    const teacher = await teacherTrainingRepository.getTeacherWithTrainings(teacherId, schoolId, sessionId);
    if (!teacher) throw new AppError('Teacher not found', 404);

    const summary = computeCpdSummary(teacher);
    return {
      ...summary,
      trainingRecords: teacher.trainingRecords || [],
    };
  },

  async getSchoolCpdStats(schoolId: string, academicSessionId?: string) {
    const sessionId = await this.resolveActiveAcademicSession(schoolId, academicSessionId);
    const teachers = await teacherTrainingRepository.findTeachersWithTrainings(schoolId, sessionId);
    const summaries = teachers.map(computeCpdSummary);

    const totalTeachers = summaries.length;
    const compliantCount = summaries.filter((s) => s.complianceStatus === 'COMPLIANT').length;
    const inProgressCount = summaries.filter((s) => s.complianceStatus === 'IN_PROGRESS').length;
    const notStartedCount = summaries.filter((s) => s.complianceStatus === 'NOT_STARTED').length;

    const totalHoursLogged = summaries.reduce((acc, s) => acc + s.totalHours, 0);
    const totalCbseHours = summaries.reduce((acc, s) => acc + s.cbseHours, 0);
    const totalSchoolHours = summaries.reduce((acc, s) => acc + s.schoolHours, 0);
    const totalRecords = summaries.reduce((acc, s) => acc + s.recordsCount, 0);

    const schoolComplianceRate = totalTeachers > 0 ? Math.round((compliantCount / totalTeachers) * 100) : 0;

    return {
      totalTeachers,
      compliantCount,
      inProgressCount,
      notStartedCount,
      schoolComplianceRate,
      totalHoursLogged: Number(totalHoursLogged.toFixed(1)),
      totalCbseHours: Number(totalCbseHours.toFixed(1)),
      totalSchoolHours: Number(totalSchoolHours.toFixed(1)),
      totalRecords,
      standards: CPD_STANDARDS,
    };
  },

  // Admin: get all training records with status=SUBMITTED (pending approval) across the school
  async getPendingApprovals(schoolId: string, academicSessionId?: string) {
    const sessionId = await this.resolveActiveAcademicSession(schoolId, academicSessionId);
    const records = await prisma.teacherTrainingRecord.findMany({
      where: {
        schoolId,
        academicSessionId: sessionId,
        status: 'SUBMITTED',
      },
      include: {
        teacher: {
          include: {
            user: { select: { name: true, email: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => ({
      ...r,
      teacherName: r.teacher?.user?.name || 'Unknown',
      teacherEmail: r.teacher?.user?.email || '',
      teacherAvatar: r.teacher?.user?.avatar || null,
    }));
  },

  async createTraining(
    schoolId: string,
    input: {
      teacherId?: string;
      teacherIds?: string[];
      title: string;
      domain: 'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH';
      annexure?: string;
      provider?: 'CBSE' | 'SCHOOL' | 'SAHODAYA' | 'OTHER';
      trainingMode?: 'OFFLINE' | 'ONLINE' | 'BLENDED';
      hours: number;
      startDate?: string;
      endDate?: string;
      organizedBy?: string;
      resourcePerson?: string;
      locationOrPlatform?: string;
      isAcademicActivity?: boolean;
      academicActivityKey?: string;
      certificateNumber?: string;
      certificateUrl?: string;
      remarks?: string;
      status?: 'VERIFIED' | 'SUBMITTED' | 'REJECTED';
    },
    academicSessionId?: string,
  ) {
    const sessionId = await this.resolveActiveAcademicSession(schoolId, academicSessionId);

    const targetTeacherIds: string[] = [];
    if (input.teacherIds && input.teacherIds.length > 0) {
      targetTeacherIds.push(...input.teacherIds);
    } else if (input.teacherId) {
      targetTeacherIds.push(input.teacherId);
    } else {
      throw new AppError('Either teacherId or teacherIds must be provided', 400);
    }

    const startDate = input.startDate ? new Date(input.startDate) : undefined;
    const endDate = input.endDate ? new Date(input.endDate) : undefined;

    if (targetTeacherIds.length === 1) {
      const singleTeacherId = targetTeacherIds[0]!;
      const record = await teacherTrainingRepository.create({
        schoolId,
        academicSessionId: sessionId,
        teacherId: singleTeacherId,
        title: input.title,
        domain: input.domain,
        annexure: input.annexure,
        provider: input.provider,
        trainingMode: input.trainingMode,
        hours: input.hours,
        startDate,
        endDate,
        organizedBy: input.organizedBy,
        resourcePerson: input.resourcePerson,
        locationOrPlatform: input.locationOrPlatform,
        isAcademicActivity: input.isAcademicActivity,
        academicActivityKey: input.academicActivityKey,
        certificateNumber: input.certificateNumber,
        certificateUrl: input.certificateUrl,
        remarks: input.remarks,
        status: input.status ?? 'VERIFIED',
      });
      return { count: 1, record };
    }

    const items = targetTeacherIds.map((tid) => ({
      schoolId,
      academicSessionId: sessionId,
      teacherId: tid,
      title: input.title,
      domain: input.domain,
      annexure: input.annexure,
      provider: input.provider,
      trainingMode: input.trainingMode,
      hours: input.hours,
      startDate,
      endDate,
      organizedBy: input.organizedBy,
      resourcePerson: input.resourcePerson,
      locationOrPlatform: input.locationOrPlatform,
      isAcademicActivity: input.isAcademicActivity,
      academicActivityKey: input.academicActivityKey,
      certificateNumber: input.certificateNumber,
      certificateUrl: input.certificateUrl,
      remarks: input.remarks,
      status: input.status ?? 'VERIFIED',
    }));

    const result = await teacherTrainingRepository.createMany(items);
    return { count: result.count };
  },

  async updateTraining(
    id: string,
    schoolId: string,
    input: {
      title?: string;
      domain?: 'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH';
      annexure?: string;
      provider?: 'CBSE' | 'SCHOOL' | 'SAHODAYA' | 'OTHER';
      trainingMode?: 'OFFLINE' | 'ONLINE' | 'BLENDED';
      hours?: number;
      startDate?: string;
      endDate?: string;
      organizedBy?: string;
      resourcePerson?: string;
      locationOrPlatform?: string;
      isAcademicActivity?: boolean;
      academicActivityKey?: string;
      certificateNumber?: string;
      certificateUrl?: string;
      remarks?: string;
      status?: 'VERIFIED' | 'SUBMITTED' | 'REJECTED';
    },
  ) {
    const existing = await teacherTrainingRepository.findById(id, schoolId);
    if (!existing) throw new AppError('Training record not found', 404);

    return teacherTrainingRepository.update(id, schoolId, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    });
  },

  async deleteTraining(id: string, schoolId: string) {
    const existing = await teacherTrainingRepository.findById(id, schoolId);
    if (!existing) throw new AppError('Training record not found', 404);
    return teacherTrainingRepository.delete(id, schoolId);
  },

  getCatalog() {
    return {
      standards: CPD_STANDARDS,
      topics: ALL_CATALOG_TOPICS,
    };
  },
};
