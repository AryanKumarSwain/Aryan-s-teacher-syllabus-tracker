'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, type Variants } from 'framer-motion';
import {
  Loader2,
  Building2,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react';
import { api, ApiError } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MascotLogo } from '@/components/common/mascot-logo';

const completeProfileSchema = z.object({
  schoolName: z.string().min(2, 'School name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

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

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: CompleteProfileFormData) => {
    try {
      setIsSubmitting(true);
      // Get accessToken from URL query parameter (passed from Google callback)
      const accessToken = searchParams.get('accessToken');
      const result = await api.post<any>(
        `/auth/complete-google-profile?accessToken=${accessToken || ''}`,
        data,
        true,
      );
      toast.success('School profile setup complete! Welcome aboard.');

      // Update auth store with the updated user data
      if (result.user) {
        setAuth(result.user, result.accessToken);
      }

      router.push('/admin');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to complete profile');
    } finally {
      setIsSubmitting(false);
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
        <div className="grid grid-cols-1 items-center gap-4 lg:gap-10 lg:grid-cols-12 py-3 sm:py-8">
          {/* ── Left Column: Value Proposition (Desktop Only to keep Mobile clean & focused) ── */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="hidden lg:block lg:col-span-6 space-y-5"
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
                Almost there! Complete your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-700 underline decoration-wavy decoration-emerald-300">
                  School Setup
                </span>
              </h1>
              <p className="text-xs sm:text-sm leading-relaxed text-[#434655]">
                Link your Google account to your institution to activate 3-stage syllabus pacing, exam blueprints, and CBSE compliance audits.
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
                  <span className="font-bold text-[#0b1c30]">Instant Portal Creation:</span>
                  <span className="text-[#434655] ml-1">Your administrator workspace is initialized immediately upon submission.</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ x: 3, transition: { duration: 0.2 } }}
                className="flex items-start gap-3 rounded-xl border border-blue-200/70 bg-white/70 backdrop-blur-sm p-3 shadow-xs hover:shadow-sm transition-all cursor-default"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#0b1c30]">Class & Subject Mapping:</span>
                  <span className="text-[#434655] ml-1">Manage all grades, sections, and teachers from a centralized dashboard.</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ x: 3, transition: { duration: 0.2 } }}
                className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-white/70 backdrop-blur-sm p-3 shadow-xs hover:shadow-sm transition-all cursor-default"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#0b1c30]">Zero Data Risk:</span>
                  <span className="text-[#434655] ml-1">Enterprise-grade multi-tenant security with isolated school databases.</span>
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
                <p className="text-lg font-black text-[#0b1c30]">Instant</p>
                <p className="text-[11px] text-[#434655]">Activation</p>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right Column: Clean, Light Card with Entrance Animation ── */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-[#c4c5d7]/70 bg-white shadow-xl shadow-emerald-950/5 transition-all"
            >
              {/* Clean Light Header */}
              <div className="bg-gradient-to-b from-emerald-50/70 via-white to-white px-6 pt-6 pb-3 text-center border-b border-[#c4c5d7]/30">
                <motion.div
                  animate={{ y: [0, -3.5, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                  className="mx-auto mb-2 flex items-center justify-center"
                >
                  <div className="p-2 rounded-2xl bg-emerald-100/70 border border-emerald-200/80 shadow-xs">
                    <MascotLogo size={42} animated />
                  </div>
                </motion.div>
                <h2 className="text-lg font-extrabold tracking-tight text-[#0b1c30]">
                  Complete School Profile
                </h2>
                <p className="mt-0.5 text-xs text-[#434655]">
                  Please provide your institution details to proceed
                </p>
              </div>

              <div className="px-6 py-6 sm:px-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* School name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wide text-gray-700">
                      School Name <span className="text-emerald-600">*</span>
                    </Label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <Input
                        {...register('schoolName')}
                        placeholder="e.g. Sunrise Public School"
                        className="pl-10 h-10 rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-sm"
                      />
                    </div>
                    {errors.schoolName && (
                      <p className="text-xs text-red-500">{errors.schoolName.message}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wide text-gray-700">
                      Official Contact Number <span className="text-emerald-600">*</span>
                    </Label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <Input
                        type="tel"
                        {...register('phone')}
                        placeholder="+91 98765 43210"
                        className="pl-10 h-10 rounded-xl border-gray-200 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500 text-sm"
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                  </div>

                  {/* Submit button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Activating Portal...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete & Launch Portal</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Trust badge */}
                <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#434655]">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Encrypted & secure school registration</span>
                </div>
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

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff]">
          <div className="h-40 w-80 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      }
    >
      <CompleteProfileContent />
    </Suspense>
  );
}
