import { prisma } from '@school-syllabus/database';
import type { Prisma } from '@school-syllabus/database';
import { withTenant } from './base.repository.js';

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
      select: {
        id: true,
        examName: true,
        examDate: true,
        totalMarks: true,
        duration: true,
        instructions: true,
        status: true,
        createdAt: true,
        styleFontFamily: true,
        styleFontSize: true,
        styleColor: true,
        templateType: true,
        pdfUrl: true,
        googleDriveFileId: true,
        googleDriveWebViewLink: true,
        school: { 
          select: { 
            id: true, 
            name: true,
            examPaperTemplates: {
              select: { id: true, logoUrl: true },
              take: 1
            }
          } 
        },
        class: { select: { id: true, name: true, grade: true, section: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, user: { select: { id: true, name: true } } } },
        _count: { select: { sections: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string, schoolId: string) {
    return prisma.examPaper.findFirst({
      where: withTenant(schoolId, { id }),
      select: {
        id: true,
        classId: true,
        subjectId: true,
        teacherId: true,
        academicSessionId: true,
        examName: true,
        examDate: true,
        totalMarks: true,
        duration: true,
        instructions: true,
        status: true,
        styleFontFamily: true,
        styleFontSize: true,
        styleColor: true,
        templateType: true,
        pdfUrl: true,
        googleDriveFileId: true,
        googleDriveWebViewLink: true,
        school: { 
          select: { 
            id: true, 
            name: true,
            examPaperTemplates: {
              select: { id: true, logoUrl: true },
              take: 1
            }
          } 
        },
        class: { select: { id: true, name: true, grade: true, section: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, user: { select: { id: true, name: true } } } },
        sections: { include: { questions: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
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

  async upsertTemplate(
    schoolId: string,
    data: { headerHtml?: string; footerHtml?: string; instructions?: string; logoUrl?: string },
  ) {
    return prisma.examPaperTemplate.upsert({
      where: { schoolId },
      create: {
        headerHtml: data.headerHtml ?? '',
        footerHtml: data.footerHtml,
        instructions: data.instructions,
        logoUrl: data.logoUrl,
        school: { connect: { id: schoolId } },
      },
      update: data,
    });
  },

  async getTemplate(schoolId: string) {
    let template = await prisma.examPaperTemplate.findUnique({ where: { schoolId } });
    if (!template) {
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { logo: true } });
      template = await prisma.examPaperTemplate.create({
        data: {
          schoolId,
          headerHtml: '',
          logoUrl: school?.logo || null,
        },
      });
    } else if (!template.logoUrl) {
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { logo: true } });
      if (school?.logo) {
        template = await prisma.examPaperTemplate.update({
          where: { schoolId },
          data: { logoUrl: school.logo },
        });
      }
    }
    return template;
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
