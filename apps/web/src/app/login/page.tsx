'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { Suspense } from 'react';
import { motion, type Variants } from 'framer-motion';
import { LoginForm } from '@/features/auth/components/login-form';
import { MascotLogo } from '@/components/common/mascot-logo';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export default function LoginPage() {
  return (
    <div suppressHydrationWarning className="relative min-h-screen bg-[#f8f9ff] text-[#0b1c30] selection:bg-[#d3e4fe] selection:text-[#0037b0] overflow-hidden">
      {/* Background soft ambient glowing blobs with gentle breathing animation */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.18, 0.12] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
          className="absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_70%)] blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.11, 0.06] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-40 left-[-10%] h-[450px] w-[750px] rounded-full bg-[radial-gradient(circle_at_center,rgba(11,28,48,0.08),transparent_70%)] blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.07, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-32 right-[-10%] h-[450px] w-[750px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.10),transparent_70%)] blur-3xl"
        />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-4 py-4 sm:px-6 sm:py-8">
        {/* Top bar back link */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between pb-4 sm:pb-6"
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
        <div className="grid grid-cols-1 items-center gap-6 lg:gap-12 lg:grid-cols-12 py-2 sm:py-4">
          {/* ── Left Column: Value Proposition (Desktop Only to keep Mobile clean & focused) ── */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="hidden lg:block lg:col-span-7 space-y-7"
          >
            <motion.div variants={fadeInUp}>
              <Link href="/" className="inline-flex items-center gap-3 group">
                <MascotLogo size={48} animated />
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-0.5">
                    <span className="text-xl font-black tracking-tight text-[#0b1c30]">
                      Syllabus
                    </span>
                    <span className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                      Tracker
                    </span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-0.5 animate-pulse" />
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold tracking-wide mt-0.5">
                    Academic Operations OS
                  </span>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp} className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-[#0b1c30]">
                The Precision Academic OS for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-700 underline decoration-wavy decoration-emerald-300">
                  Educational Excellence
                </span>
              </h1>
              <p className="max-w-xl text-sm sm:text-base leading-relaxed text-[#434655]">
                Log in to coordinate classroom pacing across grades, auto-generate board-aligned exam blueprints, and ensure 100% notebook audit compliance.
              </p>
            </motion.div>

            {/* Meaningful Feature Highlights with Hover Interactions */}
            <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <motion.div
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="rounded-2xl border border-emerald-200/80 bg-white/80 backdrop-blur-sm p-4 shadow-xs hover:shadow-md transition-all cursor-default"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">3-Stage Engine</span>
                </div>
                <p className="text-xs font-semibold text-[#0b1c30]">
                  Teaching ➔ Q&A ➔ Notebooks
                </p>
                <p className="text-[11px] text-[#434655] mt-1 leading-snug">
                  Never lag behind CBSE calendar schedules.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="rounded-2xl border border-blue-200/80 bg-white/80 backdrop-blur-sm p-4 shadow-xs hover:shadow-md transition-all cursor-default"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">Exam Blueprint</span>
                </div>
                <p className="text-xs font-semibold text-[#0b1c30]">
                  Automated Question Papers
                </p>
                <p className="text-[11px] text-[#434655] mt-1 leading-snug">
                  Weightage matrices & difficulty balance.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="rounded-2xl border border-amber-200/80 bg-white/80 backdrop-blur-sm p-4 shadow-xs hover:shadow-md transition-all cursor-default"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">CBSE CPD Log</span>
                </div>
                <p className="text-xs font-semibold text-[#0b1c30]">
                  Teacher Training Tracker
                </p>
                <p className="text-[11px] text-[#434655] mt-1 leading-snug">
                  Mandatory 50-hour compliance with audit export.
                </p>
              </motion.div>
            </motion.div>

            {/* Telemetry Social Proof */}
            <motion.div
              variants={fadeInUp}
              className="grid grid-cols-3 gap-4 border-t border-[#c4c5d7]/40 pt-4 max-w-xl"
            >
              <div>
                <p className="text-xl font-black text-[#0b1c30]">450+</p>
                <p className="text-xs text-[#434655]">Schools Onboarded</p>
              </div>
              <div>
                <p className="text-xl font-black text-emerald-600">98.6%</p>
                <p className="text-xs text-[#434655]">Pacing Accuracy</p>
              </div>
              <div>
                <p className="text-xl font-black text-[#0b1c30]">3.4M</p>
                <p className="text-xs text-[#434655]">Copies Audited</p>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right Column: Sign In Card with Entrance Animation ── */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-[#c4c5d7]/60 bg-white shadow-2xl shadow-emerald-950/10 transition-all"
            >
              {/* Clean Light Header */}
              <div className="bg-gradient-to-b from-emerald-50/70 via-white to-white px-6 pt-6 pb-3 text-center border-b border-[#c4c5d7]/30">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                  className="mx-auto mb-2 flex items-center justify-center"
                >
                  <div className="p-2 rounded-2xl bg-emerald-100/70 border border-emerald-200/80 shadow-xs">
                    <MascotLogo size={42} animated />
                  </div>
                </motion.div>
                <h2 className="text-xl font-extrabold tracking-tight text-[#0b1c30]">Welcome Back</h2>
                <p className="mt-0.5 text-xs text-[#434655]">
                  Sign in to your school management portal
                </p>
              </div>

              {/* Form Content */}
              <div className="px-6 py-6 sm:px-8">
                <Suspense
                  fallback={<div className="h-40 animate-pulse rounded-xl bg-gray-100" />}
                >
                  <LoginForm />
                </Suspense>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-[#c4c5d7]/30 text-xs text-[#434655]">
          © 2026 SyllabusTracker Academic Management Platform. All rights reserved.
        </div>
      </div>
    </div>
  );
}