import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { softDeleteFilter } from '../repositories/base.repository.js';

export const subscriptionPlanService = {
  async list(onlyActive = false) {
    return prisma.subscriptionPlan.findMany({
      where: {
        ...softDeleteFilter(),
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { subscriptions: true } } },
    });
  },

  async getById(id: string) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id, ...softDeleteFilter() },
    });
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
  },

  async create(data: {
    name: string;
    slug?: string;
    description?: string;
    priceMonthly?: number;
    priceYearly?: number;
    pricePerSession?: number;
    sessionDurationDays?: number;
    sessionLimit?: number;
    teacherLimit?: number;
    features?: string[];
    sortOrder?: number;
  }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    return prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        priceMonthly: data.priceMonthly ?? 0,
        priceYearly: data.priceYearly ?? 0,
        pricePerSession: data.pricePerSession ?? data.priceYearly ?? 0,
        sessionDurationDays: data.sessionDurationDays ?? 365,
        sessionLimit: data.sessionLimit ?? 1,
        teacherLimit: data.teacherLimit ?? 50,
        sortOrder: data.sortOrder ?? 0,
        features: data.features ?? [],
      },
    });
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      pricePerSession: number;
      sessionDurationDays: number;
      sessionLimit: number;
      teacherLimit: number;
      features: string[];
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    await this.getById(id);
    return prisma.subscriptionPlan.update({ where: { id }, data });
  },

  async toggleActive(id: string) {
    const plan = await this.getById(id);
    return prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: !plan.isActive },
    });
  },

  async softDelete(id: string) {
    await this.getById(id);
    return prisma.subscriptionPlan.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  },
};
