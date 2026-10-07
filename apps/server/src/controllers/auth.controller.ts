import type { Request, Response, NextFunction } from 'express';
import { COOKIE_NAMES } from '../constants/index.js';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { userRepository } from '../repositories/user.repository.js';
import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import bcrypt from 'bcryptjs';
import { sendOtpEmail } from '../emails/send-otp-email.js';
import passport from 'passport';
import { env } from '../config/env.js';
import { createSessionId, signAccessToken, signRefreshToken, hashToken, verifyAccessToken } from '../utils/jwt.js';

// In-memory OTP store: userId → { otp, expiresAt }
// For production use Redis, but this works for single-server setups
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createAuthSession(res: Response, user: any) {
  const sessionId = createSessionId();
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    sessionId,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  authService.setAuthCookies(res, accessToken, refreshToken);

  return { accessToken, refreshToken, payload };
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      // Set auth cookies for the session
      authService.setAuthCookies(res, result.accessToken, result.refreshToken);

      // If the user does not yet have a `schoolId`, require profile completion
      // before allowing normal access. Return the short-lived access token so
      // the frontend can call `/complete-google-profile` (or `PATCH /me`) while
      // cookies may not be sent.
      if (!result.user.schoolId) {
        return sendSuccess(res, {
          user: result.user,
          accessToken: result.accessToken,
          requiresProfileCompletion: true,
        });
      }

      sendSuccess(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerSchoolAdmin(req.body);
      sendSuccess(
        res,
        { schoolId: result.school.id, message: 'School registered successfully' },
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  // Send OTP for email verification during registration
  async sendRegistrationOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Use email as key for registration OTP
      otpStore.set(`reg_${email}`, { otp, expiresAt });

      try {
        await sendOtpEmail({
          to: email,
          name: 'User',
          otp,
        });
      } catch (emailErr) {
        otpStore.delete(`reg_${email}`);
        const message = emailErr instanceof Error ? emailErr.message : 'Failed to send verification email';
        console.error('[Auth] sendRegistrationOtp email failed', { email, message });
        throw new AppError(
          `Could not send verification code: ${message}. Check SMTP or Resend configuration.`,
          502,
        );
      }

      sendSuccess(res, { message: `Verification code sent to ${email}` });
    } catch (err) {
      next(err);
    }
  },

  // Verify OTP for registration
  async verifyRegistrationOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ success: false, error: 'Email and OTP are required' });
      }

      const stored = otpStore.get(`reg_${email}`);

      if (!stored) {
        throw new AppError('No OTP requested. Please request a new code.', 400);
      }
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(`reg_${email}`);
        throw new AppError('OTP has expired. Please request a new code.', 400);
      }
      if (stored.otp !== otp) {
        throw new AppError('Invalid verification code.', 401);
      }

      // OTP is valid, delete it
      otpStore.delete(`reg_${email}`);

      sendSuccess(res, { message: 'OTP verified successfully' });
    } catch (err) {
      next(err);
    }
  },

  // Send OTP for password reset (no auth required)
  async sendPasswordResetOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) {
        // Don't reveal if email exists or not for security
        return sendSuccess(res, { message: 'If an account exists with this email, a verification code will be sent' });
      }

      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Use email as key for password reset OTP
      otpStore.set(`reset_${email}`, { otp, expiresAt });

      try {
        await sendOtpEmail({
          to: user.email,
          name: user.name ?? 'User',
          otp,
        });
      } catch (emailErr) {
        otpStore.delete(`reset_${email}`);
        const message = emailErr instanceof Error ? emailErr.message : 'Failed to send verification email';
        console.error('[Auth] sendPasswordResetOtp email failed', { email, message });
        throw new AppError(
          `Could not send verification code: ${message}. Check SMTP or Resend configuration.`,
          502,
        );
      }

      sendSuccess(res, { message: `Verification code sent to ${user.email}` });
    } catch (err) {
      next(err);
    }
  },

  // Verify OTP and reset password (no auth required)
  async verifyOtpAndResetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, error: 'Email, OTP, and new password are required' });
      }

      const stored = otpStore.get(`reset_${email}`);

      if (!stored) {
        throw new AppError('No OTP requested. Please request a new code.', 400);
      }
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(`reset_${email}`);
        throw new AppError('OTP has expired. Please request a new code.', 400);
      }
      if (stored.otp !== otp) {
        throw new AppError('Invalid verification code.', 401);
      }

      // OTP is valid, delete it
      otpStore.delete(`reset_${email}`);

      // Update password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { passwordHash },
      });

      sendSuccess(res, { message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken =
        req.body.refreshToken || (req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] as string);
      if (!refreshToken) {
        return res.status(401).json({ success: false, error: 'Refresh token required' });
      }
      const result = await authService.refresh(refreshToken);
      authService.setAuthCookies(res, result.accessToken, result.refreshToken);
      sendSuccess(res, { accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined;
      await authService.logout(refreshToken);
      authService.clearAuthCookies(res);
      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userRepository.findById(req.user!.sub);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      let school: { id: string; name: string; currentAcademicSessionId: string | null; logo?: string | null } | undefined;
      if (user.schoolId) {
        const schoolData = await prisma.school.findUnique({
          where: { id: user.schoolId },
          select: {
            id: true,
            name: true,
            logo: true,
            currentAcademicSessionId: true,
            examPaperTemplates: {
              select: { logoUrl: true },
              take: 1,
            },
          },
        });
        if (schoolData) {
          school = {
            id: schoolData.id,
            name: schoolData.name,
            currentAcademicSessionId: schoolData.currentAcademicSessionId,
            logo: schoolData.logo || schoolData.examPaperTemplates?.[0]?.logoUrl || null,
          };
        }
      }

      let teacherId: string | null = null;
      if (user.role === 'TEACHER') {
        const teacher = await prisma.teacher.findFirst({
          where: {
            userId: user.id,
            ...(school?.currentAcademicSessionId ? { academicSessionId: school.currentAcademicSessionId } : {}),
          },
        });
        if (teacher) {
          teacherId = teacher.id;
        }
      }

      sendSuccess(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        teacherId,
        avatar: user.avatar,
        phone: user.phone,
        school,
      });
    } catch (err) {
      next(err);
    }
  },

  // Update profile (name, phone only — no password here)
  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { name, phone } = req.body as { name?: string; phone?: string };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          schoolId: true,
          avatar: true,
        },
      });

      sendSuccess(res, updatedUser);
    } catch (err) {
      next(err);
    }
  },

  // Step 1 — Send OTP to user's email
  async sendPasswordOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);

      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(userId, { otp, expiresAt });

      try {
        await sendOtpEmail({
          to: user.email,
          name: user.name ?? 'User',
          otp,
        });
      } catch (emailErr) {
        otpStore.delete(userId);
        const message =
          emailErr instanceof Error ? emailErr.message : 'Failed to send verification email';
        console.error('[Auth] sendPasswordOtp email failed', {
          userId,
          email: user.email,
          message,
        });
        throw new AppError(
          `Could not send verification code: ${message}. Check SMTP or Resend configuration.`,
          502,
        );
      }

      sendSuccess(res, { message: `Verification code sent to ${user.email}` });
    } catch (err) {
      next(err);
    }
  },

  // Step 2 — Verify OTP + set new password
  async verifyOtpAndChangePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { otp, newPassword } = req.body as { otp: string; newPassword: string };

      const stored = otpStore.get(userId);

      if (!stored) {
        throw new AppError('No OTP requested. Please request a new code.', 400);
      }
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(userId);
        throw new AppError('OTP has expired. Please request a new code.', 400);
      }
      if (stored.otp !== otp) {
        throw new AppError('Invalid verification code.', 401);
      }

      // OTP valid — update password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Clear OTP after use
      otpStore.delete(userId);

      sendSuccess(res, { message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  },

  // Google OAuth - initiate authentication
  async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        throw new AppError('Google OAuth is not configured', 500);
      }
      passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    } catch (err) {
      next(err);
    }
  },

  // Google OAuth - callback handler
  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if this callback is for Google Drive integration
      const stateStr = req.query.state as string;
      if (stateStr) {
        try {
          const decoded = JSON.parse(Buffer.from(stateStr, 'base64url').toString('utf-8'));
          if (decoded.type === 'GOOGLE_DRIVE' || (decoded.schoolId && decoded.returnUrl)) {
            const { googleDriveController } = await import('./google-drive.controller.js');
            return googleDriveController.callback(req, res, next);
          }
        } catch {
          // not a base64 json state, continue with passport login
        }
      }

      passport.authenticate(
        'google',
        { failureRedirect: '/login?error=google_auth_failed' },
        async (err, user, info: any) => {
          if (err || !user) {
            console.error('[googleCallback] Authentication failed:', err);
            return res.redirect(`${env.APP_URL}/login?error=google_auth_failed`);
          }

          console.log('[googleCallback] User authenticated:', user.email);
          console.log('[googleCallback] User has phone:', !!user.phone);
          console.log('[googleCallback] User has schoolId:', !!user.schoolId);

          // Create a session cookie for the user before redirecting.
          const { accessToken } = await createAuthSession(res, user);
          console.log('[googleCallback] Auth session created, cookies set');

          // If this user has not completed profile (missing school or phone),
          // prompt them to complete their profile (school name, phone).
          const requiresProfileCompletion = user.role !== 'SUPER_ADMIN' && (!user.schoolId || !user.phone);
          if (requiresProfileCompletion) {
            console.log('[googleCallback] Incomplete profile (missing school/phone) — redirecting to complete-profile');
            // Include the short-lived access token in the redirect so the frontend
            // can complete the profile without relying on cross-site cookies.
            return res.redirect(
              `${env.APP_URL}/complete-profile?accessToken=${encodeURIComponent(accessToken)}`,
            );
          }

          const roleRedirects: Record<string, string> = {
            SUPER_ADMIN: '/super-admin',
            SCHOOL_ADMIN: '/admin',
            TEACHER: '/teacher',
          };

          const redirectPath = roleRedirects[user.role] || '/';
          console.log('[googleCallback] Redirecting to:', redirectPath);
          res.redirect(`${env.APP_URL}${redirectPath}`);
        },
      )(req, res, next);
    } catch (err) {
      next(err);
    }
  },

  // Complete Google profile - add school name and phone
  async completeGoogleProfile(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[completeGoogleProfile] Request received');
      console.log('[completeGoogleProfile] Cookies:', Object.keys(req.cookies || {}));
      console.log('[completeGoogleProfile] req.user:', req.user);
      
      // If user is not authenticated via token, try to get from accessToken (query/body/header)
      // or fall back to refresh token cookie. This ensures the frontend can
      // complete the profile when cross-site cookies aren't sent.
      let userId = req.user?.sub;

      if (!userId) {
        // Check for accessToken passed in query or body or Authorization header
        const accessTokenFromQuery = (req.query as any)?.accessToken as string | undefined;
        const accessTokenFromBody = (req.body as any)?.accessToken as string | undefined;
        const authHeader = (req.headers.authorization as string) || '';
        const accessTokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

        const accessToken = accessTokenFromQuery || accessTokenFromBody || accessTokenFromHeader;

        if (accessToken) {
          try {
            const payload = verifyAccessToken(accessToken);
            userId = payload.sub;
            req.user = { sub: payload.sub, email: payload.email, role: payload.role, schoolId: payload.schoolId };
            console.log('[completeGoogleProfile] Authenticated from accessToken for user:', userId);
          } catch (tokenErr) {
            console.error('[completeGoogleProfile] Invalid accessToken provided:', tokenErr);
            throw new AppError('Invalid authentication token. Please try logging in again.', 401);
          }
        } else {
          const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] as string;
          console.log('[completeGoogleProfile] Refresh token from cookies:', refreshToken ? 'found' : 'not found');

          if (!refreshToken) {
            console.error('[completeGoogleProfile] No refresh token or access token found');
            throw new AppError('Authentication required. Please try logging in again.', 401);
          }

          try {
            const result = await authService.refresh(refreshToken);
            userId = result.user.sub;
            req.user = { sub: result.user.sub, email: result.user.email, role: result.user.role, schoolId: result.user.schoolId };
            console.log('[completeGoogleProfile] Successfully refreshed token for user:', userId);
          } catch (refreshErr) {
            console.error('[completeGoogleProfile] Refresh token invalid:', refreshErr);
            throw new AppError('Session expired. Please try logging in again.', 401);
          }
        }
      }

      const { schoolName, phone } = req.body as { schoolName: string; phone: string };

      console.log('[completeGoogleProfile] Creating school for user:', userId);
      // Generate a unique slug from the school name
      const slug = schoolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        + '-' + Date.now().toString(36);
      
      // Create school for the user
      const school = await prisma.school.create({
        data: {
          name: schoolName,
          slug,
          email: req.user?.email || 'admin@school.com',
          status: 'ACTIVE',
        },
      });
      console.log('[completeGoogleProfile] School created:', school.id);

      // Update user with phone and schoolId
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          phone,
          schoolId: school.id,
        },
      });
      console.log('[completeGoogleProfile] User updated:', updatedUser.id);

      // Refresh the auth token so the user's schoolId is included in the JWT payload.
      const { accessToken } = await createAuthSession(res, updatedUser);
      console.log('[completeGoogleProfile] New auth session created');

      sendSuccess(res, {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          schoolId: updatedUser.schoolId,
          phone: updatedUser.phone,
        },
        school,
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  },
};
