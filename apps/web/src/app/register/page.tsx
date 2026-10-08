'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/features/auth/schemas/login.schema';
import { PasswordStrengthMeter } from '@/features/auth/components/password-strength-meter';
import { api, ApiError } from '@/services/api-client';
import { getGoogleAuthUrl } from '@/config/env';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MascotLogo } from '@/components/common/mascot-logo';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

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
    <div suppressHydrationWarning className="relative min-h-screen bg-[#f8f9ff] text-[#0b1c30] selection:bg-[#d3e4fe] selection:text-[#0037b0] flex flex-col justify-between overflow-hidden">
      {/* Background ambient lighting with subtle breathing animation */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.10, 0.16, 0.10] }}
          transition={{ repeat: Infinity, duration: 8.5, ease: 'easeInOut' }}
          className="absolute -top-32 left-1/2 h-[450px] w-[850px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_70%)] blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.07, 1], opacity: [0.07, 0.13, 0.07] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut', delay: 1.5 }}
          className="absolute -bottom-32 right-[-10%] h-[400px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.10),transparent_70%)] blur-3xl"
        />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8 py-5">
        {/* Top header navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between pb-4 border-b border-[#c4c5d7]/30"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-[#434655] hover:text-emerald-700 transition-colors group shrink-0"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="sm:hidden">Back to Home</span>
            <span className="hidden sm:inline">Back to SyllabusTracker Home</span>
          </Link>
        </motion.div>

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 items-center gap-4 lg:gap-8 lg:grid-cols-12 py-3 sm:py-6">
          {/* ── Left Column: Value Proposition (Desktop Only to keep Mobile clean & focused) ── */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="hidden lg:block lg:col-span-5 space-y-5"
          >
            <motion.div variants={fadeInUp}>
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <MascotLogo size={42} animated />
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-0.5">
                    <span className="text-lg font-black tracking-tight text-[#0b1c30]">
                      Syllabus
                    </span>
                    <span className="text-lg font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                      Tracker
                    </span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5 animate-pulse" />
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold tracking-wide mt-0.5">
                    Academic Operations OS
                  </span>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp} className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-[#0b1c30]">
                Transform Your School's Academic Delivery in{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-700 underline decoration-wavy decoration-emerald-300">
                  5 Minutes
                </span>
              </h1>
              <p className="text-xs sm:text-sm leading-relaxed text-[#434655]">
                Equip your teachers with precision syllabus pacing, automated exam blueprints, and CBSE compliance audits.
              </p>
            </motion.div>

            {/* Concise Feature Highlights with Hover Interactions */}
            <motion.div variants={fadeInUp} className="space-y-2.5">
              <motion.div
                whileHover={{ x: 3, transition: { duration: 0.2 } }}
                className="flex items-start gap-3 rounded-xl border border-emerald-200/70 bg-white/70 backdrop-blur-sm p-3 shadow-xs hover:shadow-sm transition-all cursor-default"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#0b1c30]">3-Stage Validation Engine:</span>
                  <span className="text-[#434655] ml-1">Teaching, Q&A sessions, & 100% notebook check audits.</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ x: 3, transition: { duration: 0.2 } }}
                className="flex items-start gap-3 rounded-xl border border-blue-200/70 bg-white/70 backdrop-blur-sm p-3 shadow-xs hover:shadow-sm transition-all cursor-default"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#0b1c30]">Exam Blueprint Maker:</span>
                  <span className="text-[#434655] ml-1">Instant question paper generation balanced to your syllabus weightage.</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ x: 3, transition: { duration: 0.2 } }}
                className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-white/70 backdrop-blur-sm p-3 shadow-xs hover:shadow-sm transition-all cursor-default"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#0b1c30]">CBSE CPD Tracker:</span>
                  <span className="text-[#434655] ml-1">50-hour mandatory teacher training with one-click audit exports.</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Compact Telemetry */}
            <motion.div
              variants={fadeInUp}
              className="grid grid-cols-3 gap-3 border-t border-[#c4c5d7]/30 pt-3"
            >
              <div>
                <p className="text-lg font-black text-[#0b1c30]">450+</p>
                <p className="text-[11px] text-[#434655]">Schools Trust Us</p>
              </div>
              <div>
                <p className="text-lg font-black text-emerald-600">100%</p>
                <p className="text-[11px] text-[#434655]">Board Aligned</p>
              </div>
              <div>
                <p className="text-lg font-black text-[#0b1c30]">5 Mins</p>
                <p className="text-[11px] text-[#434655]">Setup Time</p>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right Column: Compact & Clean Register Card (NO BLACK BG) with Entrance Animation ── */}
          <div className="lg:col-span-7 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#c4c5d7]/70 bg-white shadow-xl shadow-emerald-950/5 transition-all"
            >
              {/* Clean, Light Header (NO BLACK BG) */}
              <div className="bg-gradient-to-b from-emerald-50/70 via-white to-white px-6 pt-5 pb-3 text-center border-b border-[#c4c5d7]/30">
                <motion.div
                  animate={{ y: [0, -3.5, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                  className="mx-auto mb-2 flex items-center justify-center"
                >
                  <div className="p-2 rounded-2xl bg-emerald-100/70 border border-emerald-200/80 shadow-xs">
                    <MascotLogo size={40} animated />
                  </div>
                </motion.div>
                <h2 className="text-lg font-extrabold tracking-tight text-[#0b1c30]">
                  Register Your School
                </h2>
                <p className="mt-0.5 text-xs text-[#434655]">
                  Create an administrator account for your institution
                </p>
              </div>

              {/* Concise 2-Column Form */}
              <div className="px-5 py-5 sm:px-7">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* School Name */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        School Name <span className="text-emerald-600">*</span>
                      </Label>
                      <Input
                        {...register('schoolName')}
                        placeholder="e.g. Sunrise Public School"
                        className="h-9 rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-xs"
                      />
                      {errors.schoolName && (
                        <p className="text-[10px] text-red-500">{errors.schoolName.message}</p>
                      )}
                    </div>

                    {/* Admin Name */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Admin Name <span className="text-emerald-600">*</span>
                      </Label>
                      <Input
                        {...register('adminName')}
                        placeholder="Principal / Academic Director"
                        className="h-9 rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-xs"
                      />
                      {errors.adminName && (
                        <p className="text-[10px] text-red-500">{errors.adminName.message}</p>
                      )}
                    </div>

                    {/* Official Email */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Official Email <span className="text-emerald-600">*</span>
                      </Label>
                      <div className="flex gap-1.5">
                        <Input
                          type="email"
                          {...register('email')}
                          placeholder="admin@school.edu"
                          className="h-9 rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-xs"
                          disabled={otpVerified}
                        />
                        {!otpVerified && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={sendingOtp || !email || !!errors.email}
                            className="h-9 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 transition-all shrink-0"
                          >
                            {sendingOtp ? '...' : otpSent ? 'Resend' : 'Send OTP'}
                          </button>
                        )}
                      </div>
                      {errors.email && <p className="text-[10px] text-red-500">{errors.email.message}</p>}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Phone Number <span className="text-emerald-600">*</span>
                      </Label>
                      <Input
                        type="tel"
                        {...register('phone')}
                        placeholder="+91 98765 43210"
                        className="h-9 rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-xs"
                      />
                      {errors.phone && <p className="text-[10px] text-red-500">{errors.phone.message}</p>}
                    </div>

                    {/* OTP verification inline */}
                    {!otpVerified && otpSent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="sm:col-span-2 space-y-1 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80"
                      >
                        <Label className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                          Enter 6-Digit Email OTP <span className="text-emerald-600">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            {...register('otp')}
                            placeholder="6-digit code"
                            maxLength={6}
                            className="h-8 rounded-lg border-emerald-300 bg-white focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp}
                            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all shrink-0"
                          >
                            {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                          </button>
                        </div>
                        {errors.otp && <p className="text-[10px] text-red-500">{errors.otp.message}</p>}
                      </motion.div>
                    )}

                    {otpVerified && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="sm:col-span-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2"
                      >
                        <p className="text-xs font-bold text-emerald-800">✓ Official email verified</p>
                      </motion.div>
                    )}

                    {/* Password */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Password <span className="text-emerald-600">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          {...register('password')}
                          placeholder="••••••••"
                          className="h-9 rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 pr-9 text-xs"
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Confirm Password <span className="text-emerald-600">*</span>
                      </Label>
                      <Input
                        type="password"
                        {...register('confirmPassword')}
                        placeholder="••••••••"
                        className="h-9 rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-xs"
                      />
                      {errors.confirmPassword && (
                        <p className="text-[10px] text-red-500">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Password strength compact indicator */}
                  {password && (
                    <div className="pt-1">
                      <PasswordStrengthMeter password={password} />
                    </div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Create School Account</span>
                  </motion.button>
                </form>

                {/* Google Sign-in & Login Link */}
                <div className="relative my-2.5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2 text-gray-400 font-medium">Or continue with</span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 shadow-xs transition-all hover:bg-gray-50"
                  onClick={() => {
                    window.location.href = getGoogleAuthUrl();
                  }}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </motion.button>

                <p className="mt-3 text-center text-xs text-[#434655]">
                  Already registered?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Sign in to Portal
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-3 border-t border-[#c4c5d7]/30 text-xs text-[#434655]">
          © 2026 SyllabusTracker Academic Management Platform. All rights reserved.
        </div>
      </div>
    </div>
  );
}
