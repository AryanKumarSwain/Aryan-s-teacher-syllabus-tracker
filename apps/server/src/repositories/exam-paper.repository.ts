import { prisma } from '@school-syllabus/database';
import type { Prisma } from '@school-syllabus/database';
import { withTenant, softDeleteFilter } from './base.repository.js';

export const examPaperRepository = {
  async create(data: Prisma.ExamPaperCreateInput) {
    return prisma.examPaper.create({ data });
  },

  async findManyBySchool(schoolId: string, academicSessionId?: string, teacherId?: string) {
    return prisma.examPaper.findMany({
      where: withTenant(schoolId, {
        ...(academicSessionId && { academicSessionId }),
        ...(teacherId && { teacherId }),
      }),
      include: {
        class: { select: { id: true, name: true, grade: true, section: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, user: { select: { id: true, name: true } } } },
        sections: { include: { questions: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string, schoolId: string) {
    return prisma.examPaper.findFirst({
      where: withTenant(schoolId, { id }),
      include: {
        class: { select: { id: true, name: true, grade: true, section: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, user: { select: { id: true, name: true } } } },
        sections: { include: { questions: true }, orderBy: { order: 'asc' } },
      },
    });
  },

  async update(id: string, schoolId: string, data: Prisma.ExamPaperUpdateInput) {
    return prisma.examPaper.update({
      where: { id, schoolId },
      data,
    });
  },

  async delete(id: string, schoolId: string) {
    return prisma.examPaper.delete({ where: { id, schoolId } });
  },

  async upsertTemplate(schoolId: string, data: Prisma.ExamPaperTemplateCreateInput | Prisma.ExamPaperTemplateUpdateInput) {
    return prisma.examPaperTemplate.upsert({
      where: { schoolId },
      create: { schoolId, ...data } as Prisma.ExamPaperTemplateCreateInput,
      update: data as Prisma.ExamPaperTemplateUpdateInput,
    });
  },

  async getTemplate(schoolId: string) {
    return prisma.examPaperTemplate.findUnique({ where: { schoolId } });
  },

  async createSection(data: Prisma.ExamSectionCreateInput) {
    return prisma.examSection.create({ data });
  },

  async deleteSections(examPaperId: string) {
    return prisma.examSection.deleteMany({ where: { examPaperId } });
  },

  async createQuestion(data: Prisma.ExamQuestionCreateInput) {
    return prisma.examQuestion.create({ data });
  },

  async deleteQuestions(sectionId: string) {
    return prisma.examQuestion.deleteMany({ where: { sectionId } });
  },
};
