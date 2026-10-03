'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  FileText,
  Check,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Layers,
  Lock,
  Calendar,
  PlayCircle,
  RefreshCw,
  Search,
  Award,
  Send,
  Building2,
  BarChart3,
  HelpCircle,
  Clock,
  ExternalLink,
  Flame,
  Star,
  Crown,
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api-client';
import type { Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AcademicMascot } from '@/components/landing/academic-mascot';
import { MascotLogo } from '@/components/common/mascot-logo';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceMonthly: string | number;
  priceYearly: string | number;
  pricePerSession?: string | number;
  sessionDurationDays?: number;
  sessionLimit?: number;
  teacherLimit: number;
  features?: string[] | any;
  isActive: boolean;
  sortOrder?: number;
}

function parsePlanFeatures(rawFeatures: any): string[] {
  if (Array.isArray(rawFeatures)) return rawFeatures;
  if (typeof rawFeatures === 'string') {
    try {
      const parsed = JSON.parse(rawFeatures);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return rawFeatures.split(',').map((f: string) => f.trim()).filter(Boolean);
    }
  }
  return [];
}

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};


export default function LandingPage() {
  // Interactive Simulator State (Hero & 3-Stage section)
  const [stage1Done, setStage1Done] = useState(true);
  const [stage2Done, setStage2Done] = useState(true);
  const [stage3Checked, setStage3Checked] = useState(34);
  const [mascotTip, setMascotTip] = useState<string | undefined>(undefined);
  const [quickLogged, setQuickLogged] = useState(false);

  // RBAC active persona tab (School Admin & Teacher)
  const [activePersona, setActivePersona] = useState<'schooladmin' | 'teacher'>('schooladmin');

  // Sandbox Search query
  const [sandboxSearch, setSandboxSearch] = useState('');


  // Fetch dynamic plans created by Super Admin from backend database
  const { data: serverPlans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['landing-plans'],
    queryFn: () => api.get<SubscriptionPlan[]>('/plans'),
  });

  const activePlans = useMemo(() => {
    return [...serverPlans]
      .filter((p) => p.isActive !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [serverPlans]);

  // Handle stage 3 quick log batch
  const handleQuickLog = () => {
    setStage3Checked(42);
    setQuickLogged(true);
    setMascotTip('Woohoo! 🎉 All 42 notebooks stamped! Chapter 05 is now 100% verified and exam-ready!');
    setTimeout(() => {
      setMascotTip(undefined);
    }, 6000);
  };

  const sandboxRows = useMemo(() => {
    const data = [
      {
        id: '1',
        name: 'Class 10 — Physics & Chemistry',
        teacher: 'Dr. Sarah Jenkins',
        pacing: 91,
        copiesChecked: '88/88 Audited',
        status: 'Audited',
        nextAudit: 'Oct 28 (Weekly Audit)',
        alert: false,
      },
      {
        id: '2',
        name: 'Class 9 — Mathematics',
        teacher: 'Prof. Michael Vance',
        pacing: 86,
        copiesChecked: '64/64 Audited',
        status: 'Audited',
        nextAudit: 'Nov 02 (Monthly Audit)',
        alert: false,
      },
      {
        id: '3',
        name: 'Class 8 — General Science',
        teacher: 'Elena Rostov (Sub)',
        pacing: 62,
        copiesChecked: '21/54 Checked (Lagging)',
        status: 'Audit Alert',
        nextAudit: 'Overdue by 3 days',
        alert: true,
      },
      {
        id: '4',
        name: 'Class 11 — Advanced Biology',
        teacher: 'Dr. Kabir Sen',
        pacing: 94,
        copiesChecked: '52/52 Audited',
        status: 'Audited',
        nextAudit: 'Nov 05 (Bi-Weekly)',
        alert: false,
      },
    ];

    if (!sandboxSearch.trim()) return data;
    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(sandboxSearch.toLowerCase()) ||
        r.teacher.toLowerCase().includes(sandboxSearch.toLowerCase())
    );
  }, [sandboxSearch]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] selection:bg-[#d3e4fe] selection:text-[#0037b0] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-[#0b1c30]/85 backdrop-blur-md border-b border-[#c4c5d7]/40 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <MascotLogo size={46} animated />
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-[#0b1c30]">
                SyllabusTracker
              </span>
              <span className="text-[11px] text-[#434655] font-medium leading-none">
                Academic Operations OS
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-[#434655]">
            <a href="#features" className="hover:text-emerald-700 transition-colors">
              Features
            </a>
            <a href="#3stage-tracking" className="hover:text-emerald-700 transition-colors flex items-center gap-1">
              <span>3-Stage Tracking</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            </a>
            <a href="#rbac-matrix" className="hover:text-emerald-700 transition-colors">
              Multi-Tenant RBAC
            </a>
            <a href="#dashboard" className="hover:text-emerald-700 transition-colors">
              Live Sandbox
            </a>
            <a href="#pricing" className="hover:text-emerald-700 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Trailing CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-[#0b1c30] px-3.5 py-2 rounded-lg hover:text-emerald-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/20 transition-all duration-200 active:scale-95 flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative pt-6 pb-12 sm:pt-8 sm:pb-16 overflow-hidden hero-glow">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            {/* Top Operational Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex justify-center lg:justify-start mb-3.5"
            >
              <div className="inline-flex items-center gap-2 bg-white/90 border border-[#b7c4ff]/50 rounded-full px-3.5 py-1 shadow-xs text-xs font-medium text-[#0037b0]">
                <Zap className="w-3.5 h-3.5 text-[#1d4ed8] fill-[#1d4ed8]" />
                <span className="font-bold tracking-wide">Multi-Tenant Academic Operations OS</span>
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]" />
                </span>
                <span className="text-[#434655] hidden sm:inline">Live Pacing Telemetry</span>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Column: Strategic Pitch */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="lg:col-span-6 space-y-4 text-center lg:text-left"
              >
                <motion.h1
                  variants={fadeInUp}
                  className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-[#0b1c30] leading-[1.12]"
                >
                  The Precision Syllabus OS for{' '}
                  <span className="text-[#1d4ed8] relative inline-block underline decoration-[#6cf8bb] decoration-wavy decoration-2">
                    Educational
                  </span>{' '}
                  <span className="text-[#006c49]">Excellence</span>
                </motion.h1>

                <motion.p variants={fadeInUp} className="text-sm sm:text-base text-[#434655] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Ditch superficial checklists. Track curriculum velocity down to chapters & topics with mandatory{' '}
                  <strong className="text-[#0b1c30] font-semibold">3-stage validation</strong>, automated session rollovers, and integrated exam blueprint generation.
                </motion.p>

                {/* Primary Action Buttons */}
                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                  <a
                    href="#3stage-tracking"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 hover:-translate-y-0.5"
                  >
                    <span>Explore Live Interactive Demo</span>
                    <PlayCircle className="w-4 h-4" />
                  </a>
                  <a
                    href="#dashboard"
                    className="w-full sm:w-auto bg-white hover:bg-emerald-50/60 text-[#0b1c30] border border-[#c4c5d7]/80 text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-xs hover:shadow-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
                  >
                    <span>Inspect Sandbox Telemetry</span>
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                  </a>
                </motion.div>

                {/* Academic Mascot Companion next to Hero */}
                <motion.div variants={fadeInUp} className="pt-1">
                  <AcademicMascot
                    currentTip={mascotTip}
                    className="justify-center lg:justify-start"
                  />
                </motion.div>

                {/* Key Telemetry Badges */}
                <motion.div variants={fadeInUp} className="pt-3 grid grid-cols-3 gap-2.5 border-t border-[#c4c5d7]/40 text-left">
                  <div className="p-2 rounded-lg bg-white/60 border border-[#eff4ff]">
                    <p className="text-xl sm:text-2xl font-extrabold text-[#1d4ed8]">450+</p>
                    <p className="text-[11px] text-[#434655] font-medium leading-tight">Institutions Onboarded</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/60 border border-[#eff4ff]">
                    <p className="text-xl sm:text-2xl font-extrabold text-[#006c49]">98.6%</p>
                    <p className="text-[11px] text-[#434655] font-medium leading-tight">Pacing Accuracy</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/60 border border-[#eff4ff]">
                    <p className="text-xl sm:text-2xl font-extrabold text-[#0b1c30]">3.4M</p>
                    <p className="text-[11px] text-[#434655] font-medium leading-tight">Copies Checked</p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column: 3D Interactive Showcase with Orbit Badges & Pop-out Cards */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6 relative hero-3d-perspective py-4 px-1 sm:px-3"
              >
                {/* Vibrant Ambient Glow Backdrop (Reflects Reference Image) */}
                <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-tr from-blue-600/25 via-indigo-600/20 to-purple-600/20 rounded-[3rem] blur-3xl pointer-events-none -z-20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/15 rounded-full blur-2xl pointer-events-none -z-20" />

                {/* Floating Orbit Sphere 1 (Top-Left): Academic Timetable */}
                <div className="absolute -top-5 -left-3 sm:-top-6 sm:-left-5 z-30 animate-orbit-1">
                  <div className="relative flex flex-col items-center group cursor-pointer">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 backdrop-blur-md border-2 border-white shadow-[0_14px_30px_rgba(29,78,216,0.20)] ring-6 ring-blue-500/10 flex flex-col items-center justify-center p-1 text-center hover:scale-110 transition-transform">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-50 text-[#1d4ed8] flex items-center justify-center shadow-xs">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1d4ed8]" />
                      </div>
                      <span className="text-[7.5px] sm:text-[8px] font-black uppercase text-[#1d4ed8] tracking-widest mt-0.5">TIMETABLE</span>
                    </div>
                    {/* Glowing pulse ring */}
                    <span className="absolute top-0 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full shadow-xs animate-pulse" />
                  </div>
                </div>

                {/* Floating Orbit Sphere 2 (Bottom-Left): CBSE Syllabus Blueprint (Kept within fold) */}
                <div className="absolute -bottom-3 -left-3 sm:-bottom-4 sm:-left-5 z-30 animate-orbit-2">
                  <div className="relative flex flex-col items-center group cursor-pointer">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 backdrop-blur-md border-2 border-white shadow-[0_14px_30px_rgba(99,102,241,0.20)] ring-6 ring-indigo-500/10 flex flex-col items-center justify-center p-1 text-center hover:scale-110 transition-transform">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                      </div>
                      <span className="text-[7.5px] sm:text-[8px] font-black uppercase text-indigo-600 tracking-widest mt-0.5">SYLLABUS</span>
                    </div>
                  </div>
                </div>

                {/* Floating Orbit Sphere 3 (Right Center): 3D Courses Orb */}
                <div className="absolute top-1/3 -right-2 sm:-right-5 z-30 animate-orbit-3">
                  <div className="relative flex flex-col items-center group cursor-pointer">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#4f46e5] text-white border-2 border-white shadow-[0_18px_38px_rgba(29,78,216,0.32)] ring-6 ring-blue-500/15 flex flex-col items-center justify-center p-1.5 text-center hover:scale-110 transition-transform">
                      <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 drop-shadow-md" />
                      <span className="text-[8px] sm:text-[9px] font-black tracking-widest uppercase text-blue-100 mt-0.5">COURSES</span>
                    </div>
                    <span className="absolute top-0 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-md animate-ping" />
                  </div>
                </div>

                {/* Secondary Tilted Card Peeking from Behind */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-blue-600/15 to-purple-600/20 rounded-3xl -rotate-1 scale-[0.98] translate-y-2 translate-x-2 -z-10 border border-white/60 shadow-lg pointer-events-none" />

                {/* Main 3D Tilted Showcase Window */}
                <div className="hero-3d-window relative bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-[#c4c5d7]/50 shadow-[0_24px_55px_-12px_rgba(11,28,48,0.22)] overflow-hidden">
                  {/* Window Topbar */}
                  <div className="bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#1e40af] text-white px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight">Class 10 — Advanced Mathematics</h3>
                          <span className="bg-white/20 text-white text-[8.5px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">CBSE-IX</span>
                        </div>
                        <p className="text-[10px] text-white/80">Section A • Term 2 (2025-26) • Lead: Prof. Aris Thorne</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-200 border border-emerald-300/40 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      PACING: OPTIMUM
                    </span>
                  </div>

                  {/* Workflow Sub-nav Bar */}
                  <div className="px-4 py-2 sm:px-5 bg-[#f8f9ff] border-b border-[#c4c5d7]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#0b1c30] font-bold">Active Syllabus Progression:</span>
                      <span className="text-[#1d4ed8] font-black">
                        {stage3Checked === 42 ? '100% Completed' : '94.2% Completed'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[#434655] font-semibold text-[10.5px]">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] animate-pulse" /> 18 Chapters
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> 72 Topics
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Exam Oct 14
                      </span>
                    </div>
                  </div>

                  {/* Body: Chapter 04 (Backgrounded) & Pop-out Floating Active Card */}
                  <div className="p-3.5 sm:p-4 space-y-2.5 relative">
                    {/* Chapter 04 Item: Finished Layer */}
                    <div className="border border-[#c4c5d7]/40 rounded-xl p-2.5 sm:p-3 bg-white/80 shadow-2xs">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-[#1d4ed8] uppercase tracking-wider bg-[#eff4ff] px-1.5 py-0.5 rounded border border-[#b7c4ff]/50">
                              Chapter 04
                            </span>
                            <span className="text-xs font-bold text-[#0b1c30]">Quadratic Equations & Roots</span>
                          </div>
                          <p className="text-[10px] text-[#434655] mt-0.5">Allocated: 14 Lectures • Actual: 13 Lectures Logged</p>
                        </div>
                        <span className="bg-emerald-500/15 text-emerald-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Closed
                        </span>
                      </div>

                      {/* 3-Stage Progress Grid */}
                      <div className="grid grid-cols-3 gap-1.5 bg-[#f8f9ff] p-2 rounded-lg border border-[#c4c5d7]/30 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs">✓</span>
                          <div>
                            <p className="text-[9.5px] font-bold text-[#0b1c30]">1. Teaching</p>
                            <p className="text-[8.5px] text-[#434655]">Delivered</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-[#c4c5d7]/40 pl-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs">✓</span>
                          <div>
                            <p className="text-[9.5px] font-bold text-[#0b1c30]">2. Q&A Held</p>
                            <p className="text-[8.5px] text-[#434655]">Completed</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-[#c4c5d7]/40 pl-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shadow-2xs">✓</span>
                          <div>
                            <p className="text-[9.5px] font-bold text-[#0b1c30]">3. Notebooks</p>
                            <p className="text-[8.5px] text-emerald-700 font-bold">42/42 Verified</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pop-out Elevated 3D Active Card: Chapter 05 */}
                    <motion.div
                      animate={quickLogged ? { scale: [1, 1.02, 1], borderColor: '#10b981' } : {}}
                      className="relative rounded-xl p-3.5 sm:p-4 bg-white border-2 border-[#1d4ed8]/50 shadow-[0_16px_35px_-8px_rgba(29,78,216,0.24)] sm:-translate-y-1 sm:translate-x-1 transition-all duration-300 ring-1 ring-blue-500/20"
                    >
                      {/* Top Pill / Badge */}
                      <div className="absolute -top-3 right-3 bg-gradient-to-r from-[#1d4ed8] via-blue-600 to-indigo-600 text-white text-[8.5px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-md border border-white/80 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        <span>LIVE AUDIT ENGINE</span>
                      </div>

                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-[#1d4ed8] uppercase tracking-wider bg-[#eff4ff] px-1.5 py-0.5 rounded border border-[#b7c4ff]/50">
                              Chapter 05
                            </span>
                            <span className="text-xs sm:text-sm font-black text-[#0b1c30]">Arithmetic Progressions & Series</span>
                          </div>
                          <p className="text-[10px] text-[#434655] mt-0.5">Target Exam Weightage: 12 Marks • Due Oct 14</p>
                        </div>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border shadow-2xs ${
                            stage3Checked === 42
                              ? 'bg-emerald-500/15 text-emerald-800 border-emerald-300/40'
                              : 'bg-amber-100 text-amber-900 border-amber-300/60'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {stage3Checked === 42 ? '100% Verified' : 'Stage 3 Active'}
                        </span>
                      </div>

                      {/* 3-Stage Interactive Buttons */}
                      <div className="grid grid-cols-3 gap-1.5 bg-[#f8f9ff] p-2 rounded-lg border border-[#c4c5d7]/40 text-xs">
                        <button
                          onClick={() => {
                            setStage1Done(!stage1Done);
                            setMascotTip(stage1Done ? 'Stage 1 toggled off: Lectures need verification!' : 'Great! Teaching phase verified! 📖');
                          }}
                          className="flex items-center gap-1.5 text-left hover:bg-white p-1 rounded-md transition-all"
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-2xs ${stage1Done ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {stage1Done ? '✓' : '1'}
                          </span>
                          <div>
                            <p className="text-[9.5px] font-bold text-[#0b1c30]">1. Teaching</p>
                            <p className="text-[8.5px] text-[#006c49] font-bold">{stage1Done ? 'Finished' : 'Pending'}</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setStage2Done(!stage2Done);
                            setMascotTip(stage2Done ? 'Stage 2 toggled: Don’t forget student doubt queries!' : 'Q&A session logged! Students ready! ❓');
                          }}
                          className="flex items-center gap-1.5 border-l border-[#c4c5d7]/40 pl-1.5 text-left hover:bg-white p-1 rounded-md transition-all"
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-2xs ${stage2Done ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {stage2Done ? '✓' : '2'}
                          </span>
                          <div>
                            <p className="text-[9.5px] font-bold text-[#0b1c30]">2. Q&A Held</p>
                            <p className="text-[8.5px] text-[#006c49] font-bold">{stage2Done ? 'Held (Oct 04)' : 'Pending'}</p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 border-l border-[#c4c5d7]/40 pl-1.5">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-2xs ${stage3Checked === 42 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white animate-pulse'}`}>
                            {stage3Checked === 42 ? '✓' : '✍'}
                          </span>
                          <div>
                            <p className="text-[9.5px] font-bold text-[#0b1c30]">3. Notebooks</p>
                            <p className={`text-[8.5px] font-bold ${stage3Checked === 42 ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {stage3Checked}/42 ({Math.round((stage3Checked / 42) * 100)}%)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Real-time Action Strip with Quick Log Button */}
                      <div className="mt-2.5 pt-2 border-t border-[#c4c5d7]/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${stage3Checked === 42 ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                          <span className="text-[10px] font-medium text-[#434655]">
                            {stage3Checked === 42 ? 'All 42 student copies verified!' : '8 Copies pending audit'}
                          </span>
                        </div>
                        {stage3Checked < 42 ? (
                          <button
                            onClick={handleQuickLog}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10px] font-extrabold px-3 py-1 rounded-lg shadow-sm shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Quick Log (Batch 8)</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Stage 3 Completed
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Window Footer Status */}
                  <div className="bg-[#eff4ff]/80 px-4 py-2 sm:px-5 sm:py-2.5 border-t border-[#c4c5d7]/40 flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-[#434655] flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
                      <span>Next board sync in 32 mins</span>
                    </span>
                    <a href="#3stage-tracking" className="text-emerald-700 font-bold hover:underline flex items-center gap-1 group">
                      <span>Explore Matrix</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 3-STAGE ACADEMIC CHECKPOINT ENGINE */}
        <section className="py-20 bg-white border-y border-[#c4c5d7]/30" id="3stage-tracking">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#1d4ed8] bg-[#eff4ff] px-3.5 py-1 rounded-full border border-[#b7c4ff]/50">
                Patent-Pending Academic Methodology
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b1c30] tracking-tight">
                The 3-Stage Academic Checkpoint Engine
              </h2>
              <p className="text-base text-[#434655] leading-relaxed">
                Standard school software allows teachers to mark entire terms &quot;Done&quot; with a single click.
                SyllabusTracker enforces true pedagogical fidelity through immutable three-stage verification.
              </p>
            </div>

            {/* Checkpoints Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Stage 1 */}
              <div className="bg-[#f8f9ff] rounded-2xl p-7 border border-[#c4c5d7]/40 hover:border-[#1d4ed8]/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#0037b0] text-white flex items-center justify-center mb-5 shadow-md">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="inline-block bg-[#0037b0]/10 text-[#0037b0] text-[10px] font-bold px-2.5 py-1 rounded-md mb-2">
                    STAGE 01
                  </div>
                  <h3 className="text-lg font-bold text-[#0b1c30] mb-2">Teaching Completed</h3>
                  <p className="text-xs text-[#434655] leading-relaxed mb-6">
                    Curriculum delivery logging with lecture date stamps, blackboard notes attachments, and concept breakdown markers. Prevents skipped sub-topics.
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#c4c5d7]/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#0b1c30] font-medium">Topic Coverage:</span>
                    <span className="text-[#1d4ed8] font-bold">100% Logged</span>
                  </div>
                  <div className="w-full bg-[#c4c5d7]/20 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#1d4ed8] h-full w-full rounded-full shimmer-bar text-[#1d4ed8]" />
                  </div>
                  <span className="text-[10px] text-[#434655] block text-right font-medium">Requires Faculty Digital Sign-off</span>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="bg-[#f8f9ff] rounded-2xl p-7 border border-[#c4c5d7]/40 hover:border-[#1d4ed8]/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#1d4ed8] text-white flex items-center justify-center mb-5 shadow-md">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="inline-block bg-[#1d4ed8]/10 text-[#1d4ed8] text-[10px] font-bold px-2.5 py-1 rounded-md mb-2">
                    STAGE 02
                  </div>
                  <h3 className="text-lg font-bold text-[#0b1c30] mb-2">Q&A Session Held</h3>
                  <p className="text-xs text-[#434655] leading-relaxed mb-6">
                    Dedicated doubt-clearing sessions recorded. Students flag unclear sections through their portal, ensuring classroom dialogue before exams are scheduled.
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#c4c5d7]/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#0b1c30] font-medium">Doubt Clearance Index:</span>
                    <span className="text-[#1d4ed8] font-bold">96.4% Resolved</span>
                  </div>
                  <div className="w-full bg-[#c4c5d7]/20 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#1d4ed8] h-full w-[96%] rounded-full shimmer-bar text-[#1d4ed8]" />
                  </div>
                  <span className="text-[10px] text-[#434655] block text-right font-medium">31 Student Queries Addressed</span>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="bg-[#f8f9ff] rounded-2xl p-7 border-2 border-[#10b981]/60 hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative">
                <div className="absolute -top-3.5 right-6 bg-[#006c49] text-white text-[10px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-emerald-300/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-200" />
                  <span>GAME CHANGER</span>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#006c49] text-white flex items-center justify-center mb-5 shadow-md">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="inline-block bg-[#006c49]/10 text-[#006c49] text-[10px] font-bold px-2.5 py-1 rounded-md mb-2">
                    STAGE 03 CRITICAL
                  </div>
                  <h3 className="text-lg font-bold text-[#0b1c30] mb-2">Notebooks Verified</h3>
                  <p className="text-xs text-[#434655] leading-relaxed mb-6">
                    Physically verified student copies checked and audited. Teachers register completion numbers, preventing blind paper sign-offs before term exams.
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#c4c5d7]/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#0b1c30] font-medium">Submissions Corrected:</span>
                    <span className="text-[#006c49] font-bold">Physical Audit Log</span>
                  </div>
                  <div className="w-full bg-[#c4c5d7]/20 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#006c49] h-full w-full rounded-full shimmer-bar text-[#006c49]" />
                  </div>
                  <span className="text-[10px] text-[#006c49] font-bold block text-right">Principal-Level Inspection Ready</span>
                </div>
              </div>
            </div>

            {/* Warning Callout Box */}
            <div className="mt-12 bg-[#eff4ff] rounded-2xl p-6 border border-[#b7c4ff]/60 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0b1c30]">Why Traditional Checklists Fail Academic Audits</h4>
                  <p className="text-xs text-[#434655] mt-0.5">
                    Over 68% of schools discover incomplete syllabi only during exam week because teachers check off &quot;completed&quot; without physical notebook auditing.
                  </p>
                </div>
              </div>
              <a
                href="#rbac-matrix"
                className="shrink-0 bg-[#0b1c30] hover:bg-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-xs"
              >
                See Multi-Tenant RBAC →
              </a>
            </div>
          </div>
        </section>

        {/* MULTI-TENANT RBAC INTERACTIVE EXPLORER */}
        <section className="py-20 bg-[#f8f9ff]" id="rbac-matrix">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Role-Based Workflows
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b1c30] tracking-tight mt-2">
                  Tailored Workflows for Every Academic Persona
                </h2>
                <p className="text-sm text-[#434655] mt-2 max-w-2xl font-normal">
                  Dedicated role-based dashboards guarantee that School Principals, Academic Coordinators, and Subject Faculty receive razor-focused views without permission clutter.
                </p>
              </div>

              {/* Segmented Persona Tabs (School Admin & Teacher View only) */}
              <div className="inline-flex bg-white p-1 rounded-xl border border-[#c4c5d7]/50 shadow-xs">
                {(['schooladmin', 'teacher'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setActivePersona(role);
                      if (role === 'schooladmin') setMascotTip('School Admin view: Term rollovers, teacher workloads & audit pacing!');
                      if (role === 'teacher') setMascotTip('Teacher view: Rapid post-lecture logging in under 15 seconds!');
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activePersona === role
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-[#434655] hover:text-[#0b1c30]'
                    }`}
                  >
                    {role === 'schooladmin' ? 'School Admin' : 'Teacher View'}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona Content Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Table / Metrics View */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-[#c4c5d7]/50 p-6 sm:p-7 shadow-md">
                <AnimatePresence mode="wait">


                  {activePersona === 'schooladmin' && (
                    <motion.div
                      key="schooladmin"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-[#1d4ed8] text-white flex items-center justify-center font-bold shadow-xs">
                            ADM
                          </span>
                          <div>
                            <h3 className="text-base font-bold text-[#0b1c30]">School Principal & Head of Academics</h3>
                            <p className="text-xs text-[#434655]">Term Pacing, Teacher Allocations & Session Rollovers</p>
                          </div>
                        </div>
                        <span className="bg-[#6cf8bb]/30 text-[#006c49] font-bold text-[10px] px-3 py-1 rounded-full">
                          Term 2 (2025-26)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#c4c5d7]/30">
                          <p className="text-[10px] text-[#434655]">Academic Teachers</p>
                          <p className="text-lg font-extrabold text-[#0b1c30]">48 Active</p>
                        </div>
                        <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#c4c5d7]/30">
                          <p className="text-[10px] text-[#434655]">Term Rollover Ready</p>
                          <p className="text-lg font-extrabold text-[#1d4ed8]">1-Click</p>
                        </div>
                        <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#c4c5d7]/30">
                          <p className="text-[10px] text-[#434655]">Exam Blueprint Sync</p>
                          <p className="text-lg font-extrabold text-[#006c49]">Automated</p>
                        </div>
                      </div>

                      <p className="text-xs text-[#434655]">
                        Principals can initiate annual session transitions in 30 seconds: classes, sections, and curriculum trees rollover seamlessly into the 2026-27 session.
                      </p>
                    </motion.div>
                  )}

                  {activePersona === 'teacher' && (
                    <motion.div
                      key="teacher"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-[#006c49] text-white flex items-center justify-center font-bold shadow-xs">
                            FAC
                          </span>
                          <div>
                            <h3 className="text-base font-bold text-[#0b1c30]">Faculty Instant Action Console</h3>
                            <p className="text-xs text-[#434655]">Log lecture delivery, student doubts, and notebook audits in 15 seconds</p>
                          </div>
                        </div>
                        <span className="bg-[#eff4ff] text-[#1d4ed8] font-bold text-[10px] px-3 py-1 rounded-full">
                          4 Periods Today
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 bg-[#f8f9ff] rounded-xl border border-[#c4c5d7]/40 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-[#0b1c30]">Physics — Grade 11-A (Period 3)</p>
                            <p className="text-[11px] text-[#434655]">Electromagnetic Induction Basics • 42 Students</p>
                          </div>
                          <span className="bg-[#6cf8bb]/30 text-[#006c49] text-[10px] font-bold px-2 py-0.5 rounded-md">
                            All 3 Stages Verified
                          </span>
                        </div>
                        <div className="p-3.5 bg-[#f8f9ff] rounded-xl border border-[#c4c5d7]/40 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-[#0b1c30]">Chemistry — Grade 9-C (Period 5)</p>
                            <p className="text-[11px] text-[#434655]">Periodic Trends & Valency Check • 38 Students</p>
                          </div>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Notebook Check Pending
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 pt-4 border-t border-[#c4c5d7]/30 flex items-center justify-between text-xs">
                  <span className="text-[#434655]">Enterprise Schema Isolation & Zero Data Leakage</span>
                  <Link href="/register" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
                    <span>Explore Workspace</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Side Fast Action Card */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-[#c4c5d7]/50 p-6 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#006c49]">Teacher Viewport</span>
                    <Sparkles className="w-4 h-4 text-[#006c49]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0b1c30] mb-1">Instant Milestone Logger</h3>
                  <p className="text-xs text-[#434655] mb-5">Designed for rapid faculty inputs directly after class dismissal.</p>

                  <div className="space-y-3">
                    <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#c4c5d7]/30">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Physics — 11-A</span>
                        <span className="text-[#1d4ed8]">Period 3</span>
                      </div>
                      <p className="text-[11px] text-[#434655] mb-2">Topic: Electromagnetic Induction</p>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg active:scale-95 shadow-xs transition-colors">
                          ✓ Log Lecture
                        </button>
                        <button className="flex-1 bg-white text-[#0b1c30] border border-[#c4c5d7]/60 text-[10px] font-bold py-1.5 rounded-lg active:scale-95 shadow-xs">
                          ❓ Q&A Done
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#c4c5d7]/30">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Chemistry — 9-C</span>
                        <span className="text-[#434655]">Period 5</span>
                      </div>
                      <p className="text-[11px] text-[#434655] mb-2">Topic: Periodic Table & Valency</p>
                      <button className="w-full bg-[#006c49] text-white text-[10px] font-bold py-1.5 rounded-lg active:scale-95 shadow-xs flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verify Notebooks (38/38)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#c4c5d7]/30 text-center">
                  <span className="text-[10px] text-[#434655]">Zero paperwork. All inputs feed into district telemetry.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ADVANCED MODULAR CAPABILITIES (Bento Grid) */}
        <section className="py-20 bg-white border-y border-[#c4c5d7]/30" id="features">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#1d4ed8] bg-[#eff4ff] px-3.5 py-1 rounded-full border border-[#b7c4ff]/50">
                Enterprise Modular Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b1c30] tracking-tight">
                Everything Academic Leaders Demand in One System
              </h2>
              <p className="text-base text-[#434655]">
                From seamless multi-year term rollovers to instant exam paper formatting directly from completed syllabus blocks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="bg-[#f8f9ff] rounded-2xl p-6 border border-[#c4c5d7]/40 hover:border-[#1d4ed8]/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#1d4ed8] text-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                    <RefreshCw className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-[#0b1c30] mb-2">Automated Session Rollover</h3>
                  <p className="text-xs text-[#434655] leading-relaxed">
                    Migrate classes, subject matrices, and lesson sequences across 2025-26 to 2026-27 terms in seconds. Retain historical telemetry without re-entering curriculum blueprints.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#c4c5d7]/20 flex items-center text-[#1d4ed8] font-bold text-xs group-hover:translate-x-1 transition-transform">
                  <span>Zero data re-entry</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#f8f9ff] rounded-2xl p-6 border border-[#c4c5d7]/40 hover:border-[#006c49]/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#006c49] text-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-[#0b1c30] mb-2">Live Exam Paper Builder</h3>
                  <p className="text-xs text-[#434655] leading-relaxed">
                    Convert verified Stage-3 chapters directly into board-compliant printable exam sheets. Auto-assign marks distribution, MCQs, and subjective rubrics based on real pacing.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#c4c5d7]/20 flex items-center text-[#006c49] font-bold text-xs group-hover:translate-x-1 transition-transform">
                  <span>Print-ready PDF formatting</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#f8f9ff] rounded-2xl p-6 border border-[#c4c5d7]/40 hover:border-[#0037b0]/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#0037b0] text-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-[#0b1c30] mb-2">Faculty Training & CPD</h3>
                  <p className="text-xs text-[#434655] leading-relaxed">
                    Log teacher professional development hours, workshop certifications, and pedagogic audits. Ensure continuous accreditation readiness for NAAC, IB, and state boards.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#c4c5d7]/20 flex items-center text-[#0037b0] font-bold text-xs group-hover:translate-x-1 transition-transform">
                  <span>Accreditation Ready</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-[#f8f9ff] rounded-2xl p-6 border border-[#c4c5d7]/40 hover:border-[#0b1c30]/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#0b1c30] text-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-[#0b1c30] mb-2">Zero-Leakage Multi-Tenancy</h3>
                  <p className="text-xs text-[#434655] leading-relaxed">
                    Isolated database schemas per institutional tenant, scoped JWT credentials, AES-256 encryption at rest, and full FERPA/GDPR student privacy compliance out of the box.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#c4c5d7]/20 flex items-center text-[#0b1c30] font-bold text-xs group-hover:translate-x-1 transition-transform">
                  <span>FERPA & GDPR Verified</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE SYLLABUS HEALTH & LIVE SANDBOX */}
        <section className="py-20 bg-[#f8f9ff]" id="dashboard">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="bg-white rounded-3xl border border-[#c4c5d7]/50 shadow-xl overflow-hidden">
              {/* Sandbox Header */}
              <div className="bg-[#eff4ff] p-6 border-b border-[#c4c5d7]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#1d4ed8]" />
                    <h3 className="text-lg font-bold text-[#0b1c30]">Institutional Pacing Sandbox</h3>
                  </div>
                  <p className="text-xs text-[#434655]">Live telemetry simulation: St. Jude Collegiate Campus (Term 2)</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={sandboxSearch}
                      onChange={(e) => setSandboxSearch(e.target.value)}
                      placeholder="Search class or teacher..."
                      className="bg-white border border-[#c4c5d7]/70 rounded-xl px-3.5 py-1.5 text-xs text-[#0b1c30] placeholder:text-[#434655]/60 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 w-48 sm:w-60 shadow-xs"
                    />
                    <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-[#434655]" />
                  </div>
                  <Link
                    href="/register"
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-xs"
                  >
                    Get Started
                  </Link>
                </div>
              </div>

              {/* Sandbox Metrics Cluster */}
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-[#f8f9ff] p-4 rounded-xl border border-[#c4c5d7]/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#434655]">Active Subjects</p>
                      <p className="text-xl font-extrabold text-[#0b1c30]">42 Enrolled</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#1d4ed8] flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-[#f8f9ff] p-4 rounded-xl border border-[#c4c5d7]/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#434655]">Curriculum Velocity</p>
                      <p className="text-xl font-extrabold text-[#006c49]">+4.8% Ahead</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-[#f8f9ff] p-4 rounded-xl border border-[#c4c5d7]/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#434655]">Notebook Check Ratio</p>
                      <p className="text-xl font-extrabold text-[#0b1c30]">92.4% Verified</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#1d4ed8] flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-[#f8f9ff] p-4 rounded-xl border border-[#c4c5d7]/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#434655]">Lagging Alerts</p>
                      <p className="text-xl font-extrabold text-amber-700">1 Subject at Risk</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Grade Matrix Table */}
                <div className="border border-[#c4c5d7]/30 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8f9ff] font-bold text-[#434655] uppercase text-[10px] border-b border-[#c4c5d7]/30">
                      <tr>
                        <th className="py-3 px-4">Class Level</th>
                        <th className="py-3 px-4">Lead Teacher</th>
                        <th className="py-3 px-4">Teaching Pacing</th>
                        <th className="py-3 px-4">Notebook Submission</th>
                        <th className="py-3 px-4">Next Inspection</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c4c5d7]/20">
                      {sandboxRows.map((row) => (
                        <tr
                          key={row.id}
                          className={`hover:bg-[#f8f9ff]/70 transition-colors ${row.alert ? 'bg-amber-50/50' : ''}`}
                        >
                          <td className="py-3.5 px-4 font-bold text-[#0b1c30] flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${row.alert ? 'bg-amber-500 animate-ping' : 'bg-[#006c49]'}`} />
                            {row.name}
                          </td>
                          <td className="py-3.5 px-4 text-[#434655]">{row.teacher}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0b1c30]">{row.pacing}%</span>
                              <div className="w-20 bg-[#c4c5d7]/20 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${row.alert ? 'bg-amber-500' : 'bg-[#1d4ed8]'}`}
                                  style={{ width: `${row.pacing}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`font-semibold flex items-center gap-1 ${row.alert ? 'text-amber-700' : 'text-[#006c49]'}`}>
                              {row.alert ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                              {row.copiesChecked}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#434655]">{row.nextAudit}</td>
                          <td className="py-3.5 px-4 text-right">
                            <Link href="/register" className="text-emerald-700 font-bold hover:underline">
                              Inspect →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INSTITUTIONAL PRICING & TIERS */}
        <section className="py-20 bg-white border-y border-[#c4c5d7]/30" id="pricing">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#1d4ed8] bg-[#eff4ff] px-3.5 py-1 rounded-full border border-[#b7c4ff]/50">
                Transparent Institutional Licensing
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b1c30] tracking-tight">
                Predictable Pricing for Modern Campuses
              </h2>
              <p className="text-base text-[#434655]">
                Zero hidden fees. Full database schema isolation and continuous automatic compliance upgrades included in every plan.
              </p>

            </div>

            {/* Dynamic Plans from Super Admin */}
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8 items-stretch">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="bg-[#f8f9ff] rounded-2xl p-7 border border-[#c4c5d7]/40 flex flex-col justify-between animate-pulse"
                  >
                    <div className="space-y-4">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                      <div className="h-6 w-48 bg-slate-200 rounded" />
                      <div className="h-4 w-full bg-slate-100 rounded" />
                      <div className="h-10 w-32 bg-slate-200 rounded mt-4" />
                      <div className="space-y-2 pt-4">
                        <div className="h-4 w-full bg-slate-100 rounded" />
                        <div className="h-4 w-4/5 bg-slate-100 rounded" />
                        <div className="h-4 w-3/4 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="h-11 w-full bg-slate-200 rounded-xl mt-8" />
                  </div>
                ))}
              </div>
            ) : activePlans.length > 0 ? (
              <div
                className={`grid grid-cols-1 ${
                  activePlans.length === 1
                    ? 'max-w-md'
                    : activePlans.length === 2
                    ? 'md:grid-cols-2 max-w-4xl'
                    : 'md:grid-cols-3 max-w-6xl'
                } mx-auto gap-8 items-stretch`}
              >
                {activePlans.map((plan, index) => {
                  const isPremium =
                    plan.name.toLowerCase().includes('premium') ||
                    plan.slug.includes('premium') ||
                    plan.sortOrder === 2 ||
                    index === 1;

                  const sessionPrice = Number(plan.pricePerSession || plan.priceYearly || 0);
                  const displayPrice = sessionPrice > 0 ? sessionPrice : (Number(plan.priceMonthly) || 0);
                  const displayInterval = plan.sessionLimit && plan.sessionLimit > 1
                    ? `/ ${plan.sessionLimit} Academic Sessions`
                    : '/ Academic Session';
                  const durationDays = plan.sessionDurationDays || 365;

                  const rawFeatures = parsePlanFeatures(plan.features);

                  return isPremium ? (
                    /* GOLD FIRE THEME WITH ANIMATED BORDER: Premium Academic Session */
                    <div
                      key={plan.id}
                      className="relative rounded-2xl gold-fire-card transition-all duration-300"
                    >
                      {/* Top Pill / Badge - unclipped & prominent */}
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg shadow-amber-500/40 border border-amber-300 flex items-center gap-1.5 whitespace-nowrap">
                        <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-300 animate-pulse" />
                        <span>MOST POPULAR • MAX VALUE</span>
                      </div>

                      {/* Border wrapper: exactly 2px border frame */}
                      <div className="relative w-full h-full p-[2px] rounded-2xl overflow-hidden flex flex-col justify-between">
                        {/* Animated Molten Gold Fire Stream */}
                        <div className="gold-fire-stream" aria-hidden="true" />

                        {/* Card Content Interior - Solid Pure White Background */}
                        <div className="relative z-10 w-full h-full rounded-[14px] p-7 flex flex-col justify-between bg-white">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-amber-700 tracking-wider flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                              <span>{plan.teacherLimit ? `UP TO ${plan.teacherLimit} TEACHERS` : 'PREMIUM ENTERPRISE'}</span>
                            </span>
                            <h3 className="text-xl font-black text-amber-950 mt-1 flex items-center gap-1.5">
                              <span>{plan.name}</span>
                              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                            </h3>
                            <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed min-h-[36px] font-medium">
                              {plan.description || 'Full-featured package for complete academic syllabus governance and exam generation.'}
                            </p>

                            <div className="mt-5 mb-6 rounded-xl p-4 bg-amber-50/70 border border-amber-200/80 shadow-xs">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-4xl font-black text-amber-950">
                                  ₹{displayPrice.toLocaleString()}
                                </span>
                                <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">
                                  {displayInterval}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-900 border border-amber-400/30">
                                  <Clock className="h-3 w-3" /> Duration: {durationDays} Days Full Access
                                </span>
                              </div>
                            </div>

                            <ul className="space-y-2.5 text-xs text-[#434655]">
                              {plan.sessionLimit && plan.sessionLimit > 0 && (
                                <li className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span className="font-bold text-amber-950">
                                    {plan.sessionLimit} Academic Sessions Managed
                                  </span>
                                </li>
                              )}
                              {plan.teacherLimit && plan.teacherLimit > 0 && (
                                <li className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>Up to {plan.teacherLimit} Faculty Logins</span>
                                </li>
                              )}
                              {rawFeatures.map((feat, fIdx) => (
                                <li key={fIdx} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-8">
                            <Link
                              href={`/register?plan=${encodeURIComponent(plan.slug || plan.id)}`}
                              className="w-full block text-center text-xs font-black py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 active:scale-95 transition-all flex items-center justify-center gap-2 border border-amber-400/50"
                            >
                              <Flame className="w-4 h-4 text-amber-100 fill-amber-200" />
                              <span>Select {plan.name}</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* BLUE THEME: Standard Academic Session */
                    <div
                      key={plan.id}
                      className="relative rounded-2xl p-7 flex flex-col justify-between border-2 border-emerald-600 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-xl shadow-emerald-600/10 hover:shadow-2xl hover:border-emerald-700 transition-all duration-300"
                    >
                      {/* Top Pill / Badge */}
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>STANDARD CAMPUS</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">
                          {plan.teacherLimit ? `UP TO ${plan.teacherLimit} TEACHERS` : 'ACADEMIC TIER'}
                        </span>
                        <h3 className="text-xl font-bold text-[#0b1c30] mt-1">{plan.name}</h3>
                        <p className="text-xs text-[#434655] mt-1.5 leading-relaxed min-h-[36px]">
                          {plan.description || 'Comprehensive syllabus tracking, checkpoint governance and class management.'}
                        </p>

                        <div className="mt-5 mb-6 rounded-xl p-4 bg-emerald-50/70 border border-emerald-200/70 shadow-xs">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-extrabold text-emerald-700">
                              ₹{displayPrice.toLocaleString()}
                            </span>
                            <span className="text-xs text-[#434655] font-bold uppercase tracking-wider">
                              {displayInterval}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              <Clock className="h-3 w-3 text-emerald-600" /> Duration: {durationDays} Days Full Access
                            </span>
                          </div>
                        </div>

                        <ul className="space-y-2.5 text-xs text-[#434655]">
                          {plan.sessionLimit && plan.sessionLimit > 0 && (
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-medium text-[#0b1c30]">
                                {plan.sessionLimit} Academic Session{plan.sessionLimit > 1 ? 's' : ''} Managed
                              </span>
                            </li>
                          )}
                          {plan.teacherLimit && plan.teacherLimit > 0 && (
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Up to {plan.teacherLimit} Faculty Logins</span>
                            </li>
                          )}
                          {rawFeatures.map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8">
                        <Link
                          href={`/register?plan=${encodeURIComponent(plan.slug || plan.id)}`}
                          className="w-full block text-center text-xs font-bold py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                          Select {plan.name}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback static tiers in case of network downtime */
              <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8 items-stretch">
                {/* Fallback Plan 1: Standard Academic Session (Emerald Theme) */}
                <div className="relative rounded-2xl p-7 flex flex-col justify-between border-2 border-emerald-600 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-xl shadow-emerald-600/10 hover:shadow-2xl transition-all duration-300">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>STANDARD CAMPUS</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">UP TO 50 TEACHERS</span>
                    <h3 className="text-xl font-bold text-[#0b1c30] mt-1">Standard Academic Session</h3>
                    <p className="text-xs text-[#434655] mt-1.5 leading-relaxed min-h-[36px]">
                      Ideal for small to medium schools managing 1 academic session.
                    </p>

                    <div className="mt-5 mb-6 rounded-xl p-4 bg-emerald-50/70 border border-emerald-200/70 shadow-xs">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold text-emerald-700">₹7,999</span>
                        <span className="text-xs text-[#434655] font-bold uppercase tracking-wider">/ Academic Session</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          <Clock className="h-3 w-3 text-emerald-600" /> Duration: 365 Days Full Access
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#434655]">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium text-[#0b1c30]">1 Academic Session Managed</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Up to 50 Faculty Logins</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Full 3-Stage Checkpoint Engine</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Homework & Notebook Audit Module</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8">
                    <Link
                      href="/register"
                      className="w-full block text-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-95"
                    >
                      Select Standard Plan
                    </Link>
                  </div>
                </div>

                {/* Fallback Plan 2: Premium Academic Session (Gold Fire Theme) */}
                <div className="relative rounded-2xl gold-fire-card transition-all duration-300">
                  {/* Top Pill / Badge - unclipped & prominent */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg shadow-amber-500/40 border border-amber-300 flex items-center gap-1.5 whitespace-nowrap">
                    <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-300 animate-pulse" />
                    <span>MOST POPULAR • MAX VALUE</span>
                  </div>

                  {/* Border wrapper: exactly 2px border frame */}
                  <div className="relative w-full h-full p-[2px] rounded-2xl overflow-hidden flex flex-col justify-between">
                    {/* Animated Molten Gold Fire Stream */}
                    <div className="gold-fire-stream" aria-hidden="true" />

                    {/* Card Content Interior - Solid Pure White Background */}
                    <div className="relative z-10 w-full h-full rounded-[14px] p-7 flex flex-col justify-between bg-white">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-amber-700 tracking-wider flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>UP TO 50 TEACHERS</span>
                        </span>
                        <h3 className="text-xl font-black text-amber-950 mt-1 flex items-center gap-1.5">
                          <span>Premium Academic Session</span>
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        </h3>
                        <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed min-h-[36px] font-medium">
                          Full-featured package for complete academic syllabus governance and exam generation.
                        </p>

                        <div className="mt-5 mb-6 rounded-xl p-4 bg-amber-50/70 border border-amber-200/80 shadow-xs">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-black text-amber-950">₹14,999</span>
                            <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">/ 2 Academic Sessions</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-900 border border-amber-400/30">
                              <Clock className="h-3 w-3" /> Duration: 365 Days Full Access
                            </span>
                          </div>
                        </div>

                        <ul className="space-y-2.5 text-xs text-[#434655]">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="font-bold text-amber-950">2 Academic Sessions Managed</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Up to 50 Faculty Logins</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Automated Session Rollovers</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Live Exam Paper Builder with PDF Export</span>
                          </li>
                        </ul>
                      </div>

                      <div className="mt-8">
                        <Link
                          href="/register"
                          className="w-full block text-center bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black py-3.5 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 active:scale-95 transition-all flex items-center justify-center gap-2 border border-amber-400/50"
                        >
                          <Flame className="w-4 h-4 text-amber-100 fill-amber-200" />
                          <span>Select Premium Plan</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* HIGH-IMPACT CTA BANNER */}
        <section className="py-16 bg-[#f8f9ff]">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="bg-[#0b1c30] rounded-3xl p-8 sm:p-14 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="bg-white/10 text-white border border-white/20 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Zero Transition Friction
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Ready to Modernize Academic Delivery Across Your Schools?
                </h2>
                <p className="text-sm text-white/80 leading-relaxed font-normal">
                  Join 450+ leading schools that have eliminated syllabus blind spots. Deploy in 48 hours with full historical curriculum migration support.
                </p>

                <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
                  <Link
                    href="/register"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <span>Request Institutional Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#dashboard"
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-6 py-3.5 rounded-xl border border-white/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Explore Sandbox</span>
                  </a>
                </div>
              </div>

              {/* Background decorative watermark */}
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12 pointer-events-none">
                <GraduationCap className="w-80 h-80 text-white" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#c4c5d7]/40 py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MascotLogo size={36} animated />
            <span className="text-xs text-[#434655]">
              © 2026 SyllabusTracker. All rights reserved. Academic Management Platform.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-[#434655]">
            <a href="#features" className="hover:text-emerald-700 transition-colors">Features</a>
            <a href="#3stage-tracking" className="hover:text-emerald-700 transition-colors">3-Stage Engine</a>
            <a href="#rbac-matrix" className="hover:text-emerald-700 transition-colors">RBAC Matrix</a>
            <a href="#pricing" className="hover:text-emerald-700 transition-colors">Pricing</a>
            <Link href="/login" className="text-emerald-700 font-bold hover:underline">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}