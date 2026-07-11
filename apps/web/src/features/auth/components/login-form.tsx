'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { UserRole } from '@school-syllabus/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, passwordSchema, type LoginFormData } from '../schemas/login.schema';
import { api, ApiError } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { AuthUser, LoginResponse } from '@school-syllabus/types';
import { toast } from 'sonner';
import { z } from 'zod';

const roleRedirects: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '/super-admin',
  [UserRole.SCHOOL_ADMIN]: '/admin',
  [UserRole.TEACHER]: '/teacher',
};

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpVerified, setResetOtpVerified] = useState(false);
  const [sendingResetOtp, setSendingResetOtp] = useState(false);
  const [verifyingResetOtp, setVerifyingResetOtp] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerReset,
    watch: watchReset,
    formState: { errors: resetErrors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        email: z.string().email('Invalid email'),
        otp: z.string().length(6, 'OTP must be 6 digits'),
        newPassword: passwordSchema,
      })
    ),
  });

  const resetEmail = watchReset('email', '');
  const resetOtp = watchReset('otp', '');
  const newPassword = watchReset('newPassword', '');

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await api.post<LoginResponse>('/auth/login', data);
      setAuth(result.user as AuthUser, result.accessToken);

      // Cookie set karo taaki middleware bhi happy rahe
      document.cookie = `access_token=${result.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      toast.success('Welcome back!');
      const redirect = searchParams.get('redirect');
      router.push(
        redirect && redirect.startsWith('/')
          ? redirect
          : (roleRedirects[result.user.role as UserRole] ?? '/'),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Login failed');
    }
  };

  const handleSendResetOtp = async () => {
    if (!resetEmail || resetErrors.email) {
      toast.error('Please enter a valid email first');
      return;
    }
    try {
      setSendingResetOtp(true);
      await api.post('/auth/password-reset/send-otp', { email: resetEmail }, true);
      setResetOtpSent(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setSendingResetOtp(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    if (!resetOtp || resetOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    if (!newPassword || resetErrors.newPassword) {
      toast.error('Please enter a valid new password');
      return;
    }
    try {
      setVerifyingResetOtp(true);
      await api.post('/auth/password-reset/verify', { email: resetEmail, otp: resetOtp, newPassword }, true);
      setResetOtpVerified(true);
      toast.success('Password reset successfully');
      setShowForgotPassword(false);
      // Reset form
      setResetOtpSent(false);
      setResetOtpVerified(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setVerifyingResetOtp(false);
    }
  };

  return (
    <>
      {showForgotPassword ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Reset Password</h3>
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="flex gap-2">
              <Input
                id="reset-email"
                type="email"
                placeholder="you@school.edu"
                {...registerReset('email')}
                disabled={resetOtpSent}
              />
              {!resetOtpSent && (
                <button
                  type="button"
                  onClick={handleSendResetOtp}
                  disabled={sendingResetOtp || !resetEmail || !!resetErrors.email}
                  className="rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingResetOtp ? 'Sending...' : 'Send OTP'}
                </button>
              )}
            </div>
            {resetErrors.email && <p className="text-destructive text-sm">{resetErrors.email.message}</p>}
          </div>

          {resetOtpSent && !resetOtpVerified && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reset-otp">OTP</Label>
                <Input
                  id="reset-otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  {...registerReset('otp')}
                />
                {resetErrors.otp && <p className="text-destructive text-sm">{resetErrors.otp.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...registerReset('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {resetErrors.newPassword && <p className="text-destructive text-sm">{resetErrors.newPassword.message}</p>}
              </div>

              <Button
                type="button"
                onClick={handleVerifyResetOtp}
                disabled={verifyingResetOtp}
                className="w-full"
              >
                {verifyingResetOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </>
          )}

          {resetOtpVerified && (
            <div className="rounded-lg bg-green-50 the border border-green-200 p-3">
              <p className="text-sm font-medium text-green-700">✓ Password reset successfully. You can now login with your new password.</p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleLoginSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@school.edu" {...registerLogin('email')} />
            {loginErrors.email && <p className="text-destructive text-sm">{loginErrors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#1a73e8] hover:text-[#1558b0] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...registerLogin('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginErrors.password && <p className="text-destructive text-sm">{loginErrors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="text-muted-foreground bg-white px-2">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
              window.location.href = `${apiUrl}/api/auth/google`;
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </form>
      )}
    </>
  );
}
