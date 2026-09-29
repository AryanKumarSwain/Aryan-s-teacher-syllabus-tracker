import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { subscriptionController } from '../controllers/subscription.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rate-limiter.js';

export const subscriptionRoutes = Router();

subscriptionRoutes.use(authenticate);

// Admin current subscription & checkout
subscriptionRoutes.get('/current', subscriptionController.getCurrentSubscription);
subscriptionRoutes.get('/history', subscriptionController.getSubscriptionHistory);
subscriptionRoutes.post('/create-order', paymentLimiter, subscriptionController.createRazorpayOrder);
subscriptionRoutes.post('/verify-payment', paymentLimiter, subscriptionController.verifyPayment);

// Superadmin analytics
subscriptionRoutes.get('/analytics', authorize(UserRole.SUPER_ADMIN), subscriptionController.getPlatformAnalytics);
