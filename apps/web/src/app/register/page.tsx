'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/features/auth/schemas/login.schema';
import { PasswordStrengthMeter } from '@/features/auth/components/password-strength-meter';
import { api, ApiError } from '@/services/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const password = watch('password', '');
  const email = watch('email', '');

  const handleSendOtp = async () => {
    if (!email || errors.email) {
      toast.error('Please enter a valid email first');
      return;
    }
    try {
      setSendingOtp(true);
      await api.post('/auth/register/send-otp', { email }, true);
      setOtpSent(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = watch('otp', '');
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    try {
      setVerifyingOtp(true);
      await api.post('/auth/register/verify-otp', { email, otp }, true);
      setOtpVerified(true);
      toast.success('Email verified successfully');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!otpVerified) {
      toast.error('Please verify your email with OTP first');
      return;
    }
    try {
      await api.post(
        '/auth/register',
        {
          schoolName: data.schoolName,
          adminName: data.adminName,
          email: data.email,
          password: data.password,
          phone: data.phone,
        },
        true,
      );
      toast.success('School registered! Please sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Registration failed');
    }
  };

  return (
    <div suppressHydrationWarning className="text-foreground relative min-h-screen bg-[#f0f4f8]">
      {/* Subtle background blobs referencing the dashboard's blue/teal palette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-40 left-[-20%] h-[440px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,168,83,0.10),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-32 right-[-20%] h-[440px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(21,88,176,0.09),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        {/* ── Left: branding panel ── */}
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1558b0] shadow-md">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#1a73e8]">
              Syllabus<span className="font-normal text-gray-400">Tracker</span>
            </span>
          </Link>

          <h1 className="mt-10 text-4xl font-bold leading-tight tracking-tight text-gray-800">
            Get started with your school's syllabus management platform
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-500">
            Register your institution in minutes and start tracking syllabus progress across all
            classes, subjects, and teachers.
          </p>

          {/* Feature pills */}
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              {
                k: 'Free Trial',
                v: '30 days access',
                color: 'border-blue-200 bg-blue-50',
                text: 'text-blue-700',
                dot: 'bg-blue-500',
              },
              {
                k: 'Quick Setup',
                v: '5 min registration',
                color: 'border-teal-200 bg-teal-50',
                text: 'text-teal-700',
                dot: 'bg-teal-500',
              },
              {
                k: 'No Credit Card',
                v: 'Start free today',
                color: 'border-green-200 bg-green-50',
                text: 'text-green-700',
                dot: 'bg-green-500',
              },
            ].map((x) => (
              <div key={x.k} className={`rounded-2xl border ${x.color} p-4`}>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${x.dot}`} />
                  <p className={`text-xs font-semibold ${x.text}`}>{x.k}</p>
                </div>
                <p className="text-sm font-bold text-gray-700">{x.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: register card ── */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            {/* Blue header bar */}
            <div className="bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-6 py-5 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Register your school</h2>
              <p className="mt-0.5 text-sm text-blue-100">
                Create an admin account for your institution
              </p>
            </div>

            <div className="px-6 py-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* School name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    School name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    {...register('schoolName')}
                    placeholder="e.g. Sunrise International School"
                    className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                  />
                  {errors.schoolName && (
                    <p className="text-xs text-red-500">{errors.schoolName.message}</p>
                  )}
                </div>

                {/* Admin name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Admin name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    {...register('adminName')}
                    placeholder="Full name"
                    className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                  />
                  {errors.adminName && (
                    <p className="text-xs text-red-500">{errors.adminName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email <span className="text-red-400">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      {...register('email')}
                      placeholder="admin@school.com"
                      className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                      disabled={otpVerified}
                    />
                    {!otpVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || !email || !!errors.email}
                        className="rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sendingOtp ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                {/* OTP */}
                {!otpVerified && otpSent && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      OTP <span className="text-red-400">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        {...register('otp')}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp}
                        className="rounded-lg bg-[#1a73e8] px-3 text-sm font-medium text-white hover:bg-[#1558b0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                    {errors.otp && <p className="text-xs text-red-500">{errors.otp.message}</p>}
                  </div>
                )}

                {otpVerified && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                    <p className="text-sm font-medium text-green-700">✓ Email verified successfully</p>
                  </div>
                )}

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Phone number <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="tel"
                    {...register('phone')}
                    placeholder="+91 9876543210"
                    className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Password <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      placeholder="••••••••"
                      className="rounded-lg border-gray-200 pr-10 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} />
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Confirm password <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="password"
                    {...register('confirmPassword')}
                    placeholder="••••••••"
                    className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Submit — green like dashboard action buttons */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#34a853] py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-[#2d9249] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create account
                </button>
              </form>

              <div className="relative mt-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="text-muted-foreground bg-white px-2">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                  window.location.href = `${apiUrl}/api/auth/google`;
                }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
              </button>

              <p className="mt-5 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-[#1a73e8] hover:text-[#1558b0] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
