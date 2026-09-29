import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { authLimiter, otpLimiter } from '../middleware/rate-limiter.js';
import {
  completeGoogleProfileSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateMeSchema,
  verifyOtpSchema,
} from '../validators/auth.validator.js';

export const authRoutes = Router();

authRoutes.post('/login', authLimiter, validateBody(loginSchema), authController.login);
authRoutes.post('/register', authLimiter, validateBody(registerSchema), authController.register);
authRoutes.post('/register/send-otp', otpLimiter, authController.sendRegistrationOtp);
authRoutes.post('/register/verify-otp', authLimiter, authController.verifyRegistrationOtp);
authRoutes.post('/password-reset/send-otp', otpLimiter, authController.sendPasswordResetOtp);
authRoutes.post('/password-reset/verify', authLimiter, authController.verifyOtpAndResetPassword);
authRoutes.post('/refresh', validateBody(refreshSchema), authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authenticate, authController.me);
authRoutes.patch('/me', authenticate, validateBody(updateMeSchema), authController.updateMe);
authRoutes.post('/me/send-otp', authenticate, otpLimiter, authController.sendPasswordOtp);
authRoutes.post(
  '/me/verify-otp',
  authenticate,
  authLimiter,
  validateBody(verifyOtpSchema),
  authController.verifyOtpAndChangePassword,
);
authRoutes.post(
  '/complete-google-profile',
  authLimiter,
  validateBody(completeGoogleProfileSchema),
  authController.completeGoogleProfile,
);
authRoutes.get('/google', authLimiter, authController.googleAuth);
authRoutes.get('/google/callback', authLimiter, authController.googleCallback);
