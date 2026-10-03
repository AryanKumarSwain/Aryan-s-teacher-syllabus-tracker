'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, X, Building2, GraduationCap } from 'lucide-react';
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
  const [loginRole, setLoginRole] = useState<'admin' | 'teacher'>('admin');
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
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
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
                  className="rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500"
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
                    className="rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 pr-10"
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all"
              >
                {verifyingResetOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </>
          )}

          {resetOtpVerified && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-sm font-semibold text-emerald-800">✓ Password reset successfully. You can now login with your new password.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Role Toggle Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-[#c4c5d7]/50">
            <button
              type="button"
              onClick={() => setLoginRole('admin')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                loginRole === 'admin'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginRole('teacher')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                loginRole === 'teacher'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Teacher Login</span>
            </button>
          </div>

          {loginRole === 'teacher' && (
            <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-2.5 text-[11px] text-emerald-900 leading-snug">
              💡 <strong>Teacher Portal:</strong> Use your official email and credentials assigned by your School Administrator.
            </div>
          )}

          <form onSubmit={handleLoginSubmit(onSubmit)} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                {loginRole === 'admin' ? 'Admin Email Address' : 'Teacher Email Address'}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={loginRole === 'admin' ? 'admin@school.edu' : 'teacher@school.edu'}
                className="rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-sm"
                {...registerLogin('email')}
              />
              {loginErrors.email && <p className="text-destructive text-xs">{loginErrors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 pr-10 text-sm"
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
              {loginErrors.password && <p className="text-destructive text-xs">{loginErrors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loginRole === 'admin' ? 'Sign In as Admin' : 'Sign In as Teacher'}
            </Button>

            {/* Google Login ONLY for School Admin */}
            {loginRole === 'admin' && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400 font-medium">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl border border-gray-200 bg-white hover:bg-slate-50 font-semibold py-2.5 text-gray-700 shadow-xs active:scale-[0.98] transition-all"
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
              </>
            )}

            {/* Role-specific bottom message */}
            <div className="mt-4 pt-3 border-t border-gray-100 text-center text-xs text-[#434655]">
              {loginRole === 'admin' ? (
                <p>
                  New school?{' '}
                  <Link
                    href="/register"
                    className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Register your institution
                  </Link>
                </p>
              ) : (
                <p className="text-[11px] text-gray-500">
                  Don't have teacher login access? Please contact your School Administrator.
                </p>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
