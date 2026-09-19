import { prisma } from '@school-syllabus/database';
import { examPaperRepository } from '../repositories/exam-paper.repository.js';
import { AppError } from '../middleware/error-handler.js';

function normalizeExamDate(value?: string) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export const examPaperService = {
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

    if (!teacher) throw new AppError('Teacher profile not found for the active academic session', 404);
    return teacher.id;
  },

  async createPaper(input: {
    schoolId: string;
    teacherUserId: string;
    classId: string;
    subjectId: string;
    examName: string;
    examDate?: string;
    totalMarks?: number;
    duration?: number;
    status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
    styleFontFamily?: string;
    styleFontSize?: string;
    styleColor?: string;
    templateType?: string;
  }) {
    const teacherId = await this.resolveTeacherId(input.schoolId, input.teacherUserId);

    // Get school's current academic session
    const school = await prisma.school.findUnique({
      where: { id: input.schoolId },
      select: { currentAcademicSessionId: true },
    });

    if (!school?.currentAcademicSessionId) {
      throw new AppError('No active academic session found. Please create or select a session first.', 400);
    }

    return examPaperRepository.create({
      school: { connect: { id: input.schoolId } },
      academicSession: { connect: { id: school.currentAcademicSessionId } },
      teacher: { connect: { id: teacherId } },
      class: { connect: { id: input.classId } },
      subject: { connect: { id: input.subjectId } },
      examName: input.examName,
      examDate: normalizeExamDate(input.examDate),
      totalMarks: input.totalMarks,
      duration: input.duration,
      status: input.status ?? 'DRAFT',
      styleFontFamily: input.styleFontFamily,
      styleFontSize: input.styleFontSize,
      styleColor: input.styleColor,
      templateType: input.templateType,
    });
  },

  async listPapers(schoolId: string, academicSessionId?: string, teacherId?: string) {
    return examPaperRepository.findManyBySchool(schoolId, academicSessionId, teacherId);
  },

  async getPaper(id: string, schoolId: string) {
    const paper = await examPaperRepository.findById(id, schoolId);
    if (!paper) throw new AppError('Exam paper not found', 404);
    return paper;
  },

  async updatePaper(id: string, schoolId: string, data: any) {
    const existing = await examPaperRepository.findById(id, schoolId);
    if (!existing) throw new AppError('Exam paper not found', 404);

    const { sections: rawSections, instructions, examDate, ...rest } = data;

    if (rawSections && Array.isArray(rawSections)) {
      // Wipe existing sections (questions will cascade delete due to onDelete: Cascade)
      await prisma.examSection.deleteMany({ where: { examPaperId: id } });

      const sectionsCreateInput = rawSections.map((section: any, sectionIndex: number) => ({
        label: section.label,
        type: section.type,
        marksEach: section.marksEach,
        order: sectionIndex + 1,
        segments: section.segments ?? undefined,
        questions: {
          create: (section.questions ?? []).map((question: any, questionIndex: number) => ({
            questionText: question.questionText,
            options: question.options ?? undefined,
            imageUrl: question.imageUrl ?? undefined,
            subject: question.subject ?? undefined,
            hint: question.hint ?? undefined,
            segmentType: question.segmentType ?? undefined,
            order: questionIndex + 1,
          })),
        },
      }));

      return examPaperRepository.update(id, schoolId, {
        ...rest,
        instructions,
        examDate: examDate ? normalizeExamDate(examDate) : undefined,
        sections: { create: sectionsCreateInput },
      });
    }

    return examPaperRepository.update(id, schoolId, {
      ...rest,
      instructions,
      examDate: examDate ? normalizeExamDate(examDate) : undefined,
    });
  },
  async deletePaper(id: string, schoolId: string) {
    const existing = await examPaperRepository.findById(id, schoolId);
    if (!existing) throw new AppError('Exam paper not found', 404);
    return examPaperRepository.delete(id, schoolId);
  },

  async saveTemplate(schoolId: string, data: { headerHtml?: string; footerHtml?: string; instructions?: string; logoUrl?: string }) {
    return examPaperRepository.upsertTemplate(schoolId, data);
  },

  async getTemplate(schoolId: string) {
    return examPaperRepository.getTemplate(schoolId);
  },
};
