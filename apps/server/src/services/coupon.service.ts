import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { softDeleteFilter } from '../repositories/base.repository.js';

export const couponService = {
  async list() {
    return prisma.coupon.findMany({
      where: softDeleteFilter(),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });
  },

  async getById(id: string) {
    const coupon = await prisma.coupon.findFirst({
      where: { id, ...softDeleteFilter() },
    });
    if (!coupon) throw new AppError('Coupon not found', 404);
    return coupon;
  },

  async create(data: {
    code: string;
    description?: string;
    discountPercent?: number;
    discountAmount?: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    validUntil?: string | Date;
    maxUses?: number;
    isActive?: boolean;
  }) {
    const code = data.code.trim().toUpperCase();
    if (!code) throw new AppError('Coupon code is required', 400);

    const existing = await prisma.coupon.findFirst({
      where: { code, ...softDeleteFilter() },
    });
    if (existing) {
      throw new AppError('A coupon with this code already exists', 400);
    }

    if (!data.discountPercent && !data.discountAmount) {
      throw new AppError('Either discount percent or discount amount is required', 400);
    }

    return prisma.coupon.create({
      data: {
        code,
        description: data.description,
        discountPercent: data.discountPercent ? Number(data.discountPercent) : null,
        discountAmount: data.discountAmount ? Number(data.discountAmount) : null,
        minOrderAmount: data.minOrderAmount ? Number(data.minOrderAmount) : null,
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        maxUses: data.maxUses ? Number(data.maxUses) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  },

  async update(
    id: string,
    data: Partial<{
      code: string;
      description: string;
      discountPercent: number;
      discountAmount: number;
      minOrderAmount: number;
      maxDiscount: number;
      validUntil: string | Date;
      maxUses: number;
      isActive: boolean;
    }>,
  ) {
    await this.getById(id);
    const updateData: any = { ...data };
    if (data.code) updateData.code = data.code.trim().toUpperCase();
    if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent ? Number(data.discountPercent) : null;
    if (data.discountAmount !== undefined) updateData.discountAmount = data.discountAmount ? Number(data.discountAmount) : null;
    if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount ? Number(data.minOrderAmount) : null;
    if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount ? Number(data.maxDiscount) : null;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    if (data.maxUses !== undefined) updateData.maxUses = data.maxUses ? Number(data.maxUses) : null;

    return prisma.coupon.update({
      where: { id },
      data: updateData,
    });
  },

  async toggleActive(id: string) {
    const coupon = await this.getById(id);
    return prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    return prisma.coupon.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  async validateCoupon(code: string, originalAmount: number) {
    const cleanCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findFirst({
      where: { code: cleanCode, ...softDeleteFilter() },
    });

    if (!coupon) {
      throw new AppError('Invalid coupon code', 400);
    }
    if (!coupon.isActive) {
      throw new AppError('This coupon is currently inactive', 400);
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      throw new AppError('This coupon has expired', 400);
    }
    if (coupon.maxUses && coupon.timesUsed >= coupon.maxUses) {
      throw new AppError('This coupon usage limit has been reached', 400);
    }
    if (coupon.minOrderAmount && originalAmount < Number(coupon.minOrderAmount)) {
      throw new AppError(`Order amount must be at least ₹${coupon.minOrderAmount} to use this coupon`, 400);
    }

    let discount = 0;
    if (coupon.discountPercent) {
      discount = (originalAmount * Number(coupon.discountPercent)) / 100;
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }
    } else if (coupon.discountAmount) {
      discount = Number(coupon.discountAmount);
    }

    discount = Math.min(discount, originalAmount);
    const finalAmount = Math.max(0, originalAmount - discount);

    return {
      coupon,
      originalAmount,
      discount,
      finalAmount,
    };
  },
};
