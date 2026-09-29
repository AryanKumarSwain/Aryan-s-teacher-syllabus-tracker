import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { couponController } from '../controllers/coupon.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

import { paymentLimiter } from '../middleware/rate-limiter.js';

export const couponRoutes = Router();

couponRoutes.use(authenticate);

// Validate can be called by Admin during checkout
couponRoutes.post('/validate', paymentLimiter, couponController.validate);

// Super admin coupon management
couponRoutes.get('/', authorize(UserRole.SUPER_ADMIN), couponController.list);
couponRoutes.get('/:id', authorize(UserRole.SUPER_ADMIN), couponController.getById);
couponRoutes.post('/', authorize(UserRole.SUPER_ADMIN), couponController.create);
couponRoutes.patch('/:id', authorize(UserRole.SUPER_ADMIN), couponController.update);
couponRoutes.patch('/:id/toggle', authorize(UserRole.SUPER_ADMIN), couponController.toggleActive);
couponRoutes.delete('/:id', authorize(UserRole.SUPER_ADMIN), couponController.delete);
