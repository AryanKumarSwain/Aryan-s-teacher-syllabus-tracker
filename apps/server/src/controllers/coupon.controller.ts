import type { Request, Response, NextFunction } from 'express';
import { couponService } from '../services/coupon.service.js';
import { sendSuccess } from '../utils/api-response.js';

export const couponController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const coupons = await couponService.list();
      sendSuccess(res, coupons);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await couponService.getById(String(req.params.id));
      sendSuccess(res, coupon);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await couponService.create(req.body);
      sendSuccess(res, coupon, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await couponService.update(String(req.params.id), req.body);
      sendSuccess(res, coupon);
    } catch (err) {
      next(err);
    }
  },

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await couponService.toggleActive(String(req.params.id));
      sendSuccess(res, coupon);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await couponService.delete(String(req.params.id));
      sendSuccess(res, { message: 'Coupon deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, amount } = req.body;
      const result = await couponService.validateCoupon(String(code || ''), Number(amount || 0));
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
};
