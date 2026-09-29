import type { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { AppError } from '../middleware/error-handler.js';

export const subscriptionController = {
  async getCurrentSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = (req as any).user?.schoolId;
      if (!schoolId) {
        throw new AppError('School ID not found in session', 400);
      }
      const data = await subscriptionService.getCurrentSubscription(schoolId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async createRazorpayOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = (req as any).user?.schoolId;
      if (!schoolId) {
        throw new AppError('School ID not found in session', 400);
      }
      const { planId, billingCycle, couponCode } = req.body;
      if (!planId) {
        throw new AppError('Plan ID is required', 400);
      }
      const order = await subscriptionService.createRazorpayOrder(schoolId, {
        planId,
        billingCycle,
        couponCode,
      });
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  },

  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = (req as any).user?.schoolId;
      if (!schoolId) {
        throw new AppError('School ID not found in session', 400);
      }
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new AppError('Missing payment verification details', 400);
      }
      const result = await subscriptionService.verifyAndActivateSubscription(schoolId, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getPlatformAnalytics(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.getPlatformAnalytics();
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },
};
