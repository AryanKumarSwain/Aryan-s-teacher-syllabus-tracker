import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { subscriptionPlanController } from '../controllers/subscription-plan.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const planRoutes = Router();

planRoutes.use(authenticate);
planRoutes.get('/', subscriptionPlanController.list);
planRoutes.get('/:id', subscriptionPlanController.getById);

planRoutes.post('/', authorize(UserRole.SUPER_ADMIN), subscriptionPlanController.create);
planRoutes.patch('/:id', authorize(UserRole.SUPER_ADMIN), subscriptionPlanController.update);
planRoutes.patch('/:id/toggle', authorize(UserRole.SUPER_ADMIN), subscriptionPlanController.toggleActive);
planRoutes.delete('/:id', authorize(UserRole.SUPER_ADMIN), subscriptionPlanController.delete);
