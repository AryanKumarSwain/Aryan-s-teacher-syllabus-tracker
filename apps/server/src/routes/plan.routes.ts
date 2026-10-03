import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { subscriptionPlanController } from '../controllers/subscription-plan.controller.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

export const planRoutes = Router();

// Publicly accessible for landing page and schools (Super Admin sees inactive plans too)
planRoutes.get('/', optionalAuth, subscriptionPlanController.list);
planRoutes.get('/:id', optionalAuth, subscriptionPlanController.getById);

// Super Admin only mutations
planRoutes.post('/', authenticate, authorize(UserRole.SUPER_ADMIN), subscriptionPlanController.create);
planRoutes.patch('/:id', authenticate, authorize(UserRole.SUPER_ADMIN), subscriptionPlanController.update);
planRoutes.patch('/:id/toggle', authenticate, authorize(UserRole.SUPER_ADMIN), subscriptionPlanController.toggleActive);
planRoutes.delete('/:id', authenticate, authorize(UserRole.SUPER_ADMIN), subscriptionPlanController.delete);
