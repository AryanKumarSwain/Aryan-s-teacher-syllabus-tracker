'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles,
  BookOpen,
  Users,
  Check,
  Layers,
  ArrowRight,
  Calculator,
  Download,
  ShieldCheck,
  Search,
  Filter,
  BarChart3,
  CalendarRange,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

// Safe LaTeX renderer helper
function RenderLatex({ tex, displayMode = false }: { tex: string; displayMode?: boolean }) {
  const html = useMemo(() => {
    try {
      // Dynamic require or import of katex
      const katex = require('katex');
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode,
      });
    } catch (e) {
      return `<span>${tex}</span>`;
    }
  }, [tex, displayMode]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PlatformFeaturesShowcase() {
  const [activeTab, setActiveTab] = useState<'exam-paper' | 'teacher-training' | 'progress-tracking' | 'academic-timeline'>('exam-paper');

  // Exam Paper Tab State
  const [activeExamSection, setActiveExamSection] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('B');
  const [showMarkingScheme, setShowMarkingScheme] = useState(false);

  // Progress Tracking Tab State
  const [progressViewMode, setProgressViewMode] = useState<'teachers' | 'classes' | 'subjects'>('teachers');

  // Teacher Training (CPD) Tab State
  const [selectedTeacherIndex, setSelectedTeacherIndex] = useState(0);

  const teachersCpd = [
    {
      name: 'Dr. Aris Thorne',
      subject: 'PGT Senior Mathematics',
      grade: 'Class 10 & 12',
      totalHours: 44,
      cbseCoeHours: 24,
      inHouseHours: 20,
      targetHours: 50,
      recentCert: 'NEP 2020 Pedagogical Transformation (CBSE COE)',
      recentDate: 'Sept 28, 2026',
      status: 'On Track (88%)',
    },
    {
      name: 'Ms. Priya Sharma',
      subject: 'TGT Science & Chemistry',
      grade: 'Class 9 & 10',
      totalHours: 52,
      cbseCoeHours: 28,
      inHouseHours: 24,
      targetHours: 50,
      recentCert: 'AI & Experiential Science Labs (DIKSHA / Sahodaya)',
      recentDate: 'Oct 01, 2026',
      status: 'Quota Completed (104%)',
    },
    {
      name: 'Mr. Rajesh Verma',
      subject: 'PGT Physics',
      grade: 'Class 11 & 12',
      totalHours: 32,
      cbseCoeHours: 16,
      inHouseHours: 16,
      targetHours: 50,
      recentCert: 'Assessment Design & Rubrics (CBSE Training Portal)',
      recentDate: 'Sept 15, 2026',
      status: 'Attention Needed (64%)',
    },
  ];

  return (
    <section className="py-10 sm:py-20 bg-gradient-to-b from-white via-[#f8f9ff] to-white border-y border-[#c4c5d7]/30" id="platform-engines">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-16 space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#eff4ff] border border-[#b7c4ff]/60 text-xs font-bold text-[#1d4ed8] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Complete Academic Suite</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0b1c30] tracking-tight leading-tight">
            Built for Real Indian School Operations
          </h2>
          <p className="text-base text-[#434655] leading-relaxed">
            Beyond basic syllabus ticks — discover the specialized modules that streamline board exam preparations, mandatory CBSE teacher training quotas, multi-class velocity audits, and working day calendar calculations.
          </p>
        </div>

        {/* 4 Primary Navigation Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-10 max-w-5xl mx-auto">
          {/* Tab 1 */}
          <button
            onClick={() => setActiveTab('exam-paper')}
            className={`p-3.5 sm:p-4 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
              activeTab === 'exam-paper'
                ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-lg shadow-blue-600/25 scale-[1.02]'
                : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-[#c4c5d7]/40 hover:border-[#1d4ed8]/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === 'exam-paper' ? 'bg-white/20 text-white' : 'bg-[#eff4ff] text-[#1d4ed8]'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${activeTab === 'exam-paper' ? 'bg-white/20 text-blue-100' : 'bg-blue-50 text-[#1d4ed8]'}`}>
                CBSE Aligned
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm">Exam Paper Studio</h3>
              <p className={`text-[11px] mt-0.5 line-clamp-1 ${activeTab === 'exam-paper' ? 'text-blue-100' : 'text-[#434655]'}`}>
                Blueprints, KaTeX & PDF Export
              </p>
            </div>
          </button>

          {/* Tab 2 */}
          <button
            onClick={() => setActiveTab('teacher-training')}
            className={`p-3.5 sm:p-4 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
              activeTab === 'teacher-training'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-lg shadow-emerald-700/25 scale-[1.02]'
                : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-[#c4c5d7]/40 hover:border-emerald-600/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === 'teacher-training' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                <Award className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${activeTab === 'teacher-training' ? 'bg-white/20 text-emerald-100' : 'bg-emerald-50 text-emerald-700'}`}>
                50-Hour Quota
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm">CBSE Training Tracker</h3>
              <p className={`text-[11px] mt-0.5 line-clamp-1 ${activeTab === 'teacher-training' ? 'text-emerald-100' : 'text-[#434655]'}`}>
                COE + In-House CPD Hours
              </p>
            </div>
          </button>

          {/* Tab 3 */}
          <button
            onClick={() => setActiveTab('progress-tracking')}
            className={`p-3.5 sm:p-4 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
              activeTab === 'progress-tracking'
                ? 'bg-gradient-to-br from-[#ea580c] to-[#f97316] text-white border-[#ea580c] shadow-lg shadow-orange-500/30 scale-[1.02]'
                : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-[#c4c5d7]/40 hover:border-orange-500/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === 'progress-tracking' ? 'bg-white/20 text-white' : 'bg-orange-50 text-[#ea580c]'}`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${activeTab === 'progress-tracking' ? 'bg-white/20 text-orange-100' : 'bg-orange-50 text-[#ea580c]'}`}>
                360° Velocity
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm">Multi-Tier Tracking</h3>
              <p className={`text-[11px] mt-0.5 line-clamp-1 ${activeTab === 'progress-tracking' ? 'text-orange-100' : 'text-[#434655]'}`}>
                Teachers, Classes & Subjects
              </p>
            </div>
          </button>

          {/* Tab 4 */}
          <button
            onClick={() => setActiveTab('academic-timeline')}
            className={`p-3.5 sm:p-4 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
              activeTab === 'academic-timeline'
                ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-lg shadow-slate-900/25 scale-[1.02]'
                : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-[#c4c5d7]/40 hover:border-slate-800/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === 'academic-timeline' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#0f172a]'}`}>
                <Calendar className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${activeTab === 'academic-timeline' ? 'bg-white/20 text-slate-300' : 'bg-slate-100 text-[#0f172a]'}`}>
                Working Days
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm">Admin Calendar & Timeline</h3>
              <p className={`text-[11px] mt-0.5 line-clamp-1 ${activeTab === 'academic-timeline' ? 'text-slate-300' : 'text-[#434655]'}`}>
                Session Terms & Holidays
              </p>
            </div>
          </button>
        </div>

        {/* Dynamic Interactive Display Area */}
        <div className="bg-white rounded-3xl border border-[#c4c5d7]/40 shadow-xl overflow-hidden p-6 sm:p-8 lg:p-10">
          <AnimatePresence mode="wait">
            
            {/* 1. EXAM PAPER STUDIO TAB */}
            {activeTab === 'exam-paper' && (
              <motion.div
                key="exam-paper"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center"
              >
                {/* Left Pitch */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#1d4ed8]">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Instant Board-Compliant Papers</span>
                  </div>

                  <h3 className="text-xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                    Generate Complete Exam Papers in Minutes, Not Days
                  </h3>

                  <p className="text-xs sm:text-sm text-[#434655] leading-relaxed">
                    Eliminate manual paper typing. SyllabusTracker transforms verified Stage-3 chapters directly into CBSE standard blueprints with automated marks distribution and LaTeX formulas.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">CBSE Section A-E Segmentation</p>
                        <p className="text-[11px] text-[#434655]">Standard MCQs, Assertion-Reason, Short Answer, Long Answer, and Case-Study questions.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Native KaTeX Math & Science Formulas</p>
                        <p className="text-[11px] text-[#434655]">Square roots, fractions, matrices, integrals, and chemical reaction notation rendered sharp at print resolution.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Bloom&apos;s Cognitive Weighting & Rubrics</p>
                        <p className="text-[11px] text-[#434655]">Automatic cognitive tags (Knowledge, Application, Analysis) with full step-by-step marking schemes.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link
                      href="/admin/exam-papers"
                      className="inline-flex items-center gap-2 bg-[#1d4ed8] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <span>Try Exam Paper Creator</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-[11px] text-[#434655] font-medium flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      Print & PDF Ready
                    </span>
                  </div>
                </div>

                {/* Right Interactive Simulator */}
                <div className="lg:col-span-7 bg-[#f8f9ff] rounded-2xl border border-[#c4c5d7]/50 p-3.5 sm:p-6 shadow-inner">
                  {/* Paper Header Strip */}
                  <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#c4c5d7]/40 shadow-xs mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#1d4ed8] px-2 py-0.5 rounded">
                          Class 10 • Mathematics
                        </span>
                        <span className="text-[10px] text-[#434655] font-semibold">Mid-Term Exam</span>
                      </div>
                      <h4 className="text-[11px] sm:text-xs font-bold text-[#0b1c30] mt-1">Code: 041/2026 • Time: 3 Hrs • Max Marks: 80</h4>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <span className="inline-block text-[11px] sm:text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        38 Questions • 5 Sections
                      </span>
                    </div>
                  </div>

                  {/* Section Selector Pills */}
                  <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1.5 text-xs no-scrollbar">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setActiveExamSection(sec)}
                        className={`shrink-0 px-2.5 sm:px-3 py-1 rounded-lg font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all ${
                          activeExamSection === sec
                            ? 'bg-[#1d4ed8] text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-[#434655] border border-[#c4c5d7]/40'
                        }`}
                      >
                        Section {sec} {sec === 'A' ? '(MCQ - 20M)' : sec === 'B' ? '(VSA - 10M)' : sec === 'C' ? '(SA - 18M)' : sec === 'D' ? '(LA - 20M)' : '(Case - 12M)'}
                      </button>
                    ))}
                  </div>

                  {/* Simulated Question Card with KaTeX Formula */}
                  <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-[#c4c5d7]/40 shadow-sm space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#eff4ff] text-[#1d4ed8] font-black text-xs flex items-center justify-center border border-[#b7c4ff]/50 shrink-0">
                          {activeExamSection === 'A' ? 'Q1' : activeExamSection === 'B' ? 'Q21' : activeExamSection === 'C' ? 'Q27' : activeExamSection === 'D' ? 'Q32' : 'Q36'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#434655] bg-slate-100 px-2 py-0.5 rounded truncate max-w-[220px] sm:max-w-none">
                          {activeExamSection === 'A' ? 'Chapter 01: Real Numbers' : activeExamSection === 'B' ? 'Chapter 04: Quadratic Equations' : activeExamSection === 'C' ? 'Chapter 08: Trigonometry' : activeExamSection === 'D' ? 'Chapter 06: Triangles' : 'Chapter 12: Surface Areas'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {activeExamSection === 'A' ? '1 Mark' : activeExamSection === 'B' ? '2 Marks' : activeExamSection === 'C' ? '3 Marks' : activeExamSection === 'D' ? '5 Marks' : '4 Marks'}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Application (Bloom Level 3)
                        </span>
                      </div>
                    </div>

                    {/* Question Content with Math Equation */}
                    <div className="text-xs sm:text-sm text-[#0b1c30] leading-relaxed pl-0 sm:pl-8">
                      {activeExamSection === 'B' ? (
                        <div>
                          <p className="font-medium mb-2">
                            Find the discriminant and nature of the roots for the given quadratic equation:
                          </p>
                          <div className="my-2.5 p-2.5 bg-[#f8f9ff] rounded-lg border border-[#c4c5d7]/30 text-center font-mono">
                            <RenderLatex tex="3x^{2} - 5x + 2 = 0" displayMode={true} />
                          </div>
                          <p className="text-xs text-[#434655]">
                            Hence, calculate the real roots using the quadratic formula{' '}
                            <RenderLatex tex="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}" />.
                          </p>
                        </div>
                      ) : activeExamSection === 'A' ? (
                        <div>
                          <p className="font-medium mb-2">
                            If two positive integers <RenderLatex tex="a" /> and <RenderLatex tex="b" /> are written as <RenderLatex tex="a = x^3y^2" /> and <RenderLatex tex="b = xy^3" />, where <RenderLatex tex="x, y" /> are prime numbers, then <RenderLatex tex="\text{HCF}(a, b)" /> is:
                          </p>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            <div className="p-1.5 rounded bg-slate-50 border border-slate-200">(A) <RenderLatex tex="xy" /></div>
                            <div className="p-1.5 rounded bg-emerald-50 border border-emerald-300 font-bold text-emerald-800">(B) <RenderLatex tex="xy^2" /> ✓</div>
                            <div className="p-1.5 rounded bg-slate-50 border border-slate-200">(C) <RenderLatex tex="x^3y^3" /></div>
                            <div className="p-1.5 rounded bg-slate-50 border border-slate-200">(D) <RenderLatex tex="x^2y^2" /></div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium mb-2">
                            Prove that the ratio of the areas of two similar triangles is equal to the square of the ratio of their corresponding sides:
                          </p>
                          <div className="my-2 p-2 bg-[#f8f9ff] rounded-lg border border-[#c4c5d7]/30 text-center font-mono">
                            <RenderLatex tex="\frac{\text{Area}(\Delta ABC)}{\text{Area}(\Delta PQR)} = \left(\frac{AB}{PQ}\right)^2" displayMode={true} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Marking Scheme Toggle */}
                    <div className="pt-2 border-t border-[#c4c5d7]/30 flex items-center justify-between text-xs">
                      <button
                        onClick={() => setShowMarkingScheme(!showMarkingScheme)}
                        className="text-xs font-bold text-[#1d4ed8] hover:underline flex items-center gap-1"
                      >
                        <span>{showMarkingScheme ? 'Hide Marking Scheme' : 'View Teacher Marking Rubric & Steps'}</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showMarkingScheme ? 'rotate-90' : ''}`} />
                      </button>
                      <span className="text-[11px] text-[#434655]">Step Marks: [1 + 1 = 2 Marks]</span>
                    </div>

                    {/* Collapsible Rubric */}
                    {showMarkingScheme && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1.5 text-emerald-900"
                      >
                        <p className="font-bold flex items-center gap-1 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> CBSE Official Marking Steps:
                        </p>
                        <p>1. Discriminant calculation: <RenderLatex tex="D = (-5)^2 - 4(3)(2) = 25 - 24 = 1 > 0" /> (1 Mark)</p>
                        <p>2. Conclusion: Two distinct real roots exist: <RenderLatex tex="x = 1, \frac{2}{3}" /> (1 Mark)</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. CBSE TEACHER TRAINING (CPD) TAB */}
            {activeTab === 'teacher-training' && (
              <motion.div
                key="teacher-training"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center"
              >
                {/* Left Pitch */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                    <Award className="w-3.5 h-3.5" />
                    <span>CBSE Affiliation Bye-Law 5.3 Enforced</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                    Mandatory 50-Hour Faculty CPD Tracking
                  </h3>

                  <p className="text-sm text-[#434655] leading-relaxed">
                    Never fail a CBSE inspection or accreditation audit. SyllabusTracker automatically tracks every teacher&apos;s 50 annual continuous professional development (CPD) hours across mandatory portals.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">25h CBSE COE + 25h In-House Quota</p>
                        <p className="text-[11px] text-[#434655]">Dual progress meters enforce exact breakdown between Centre of Excellence workshops and DIKSHA/Sahodaya modules.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Domain Competency Matrix</p>
                        <p className="text-[11px] text-[#434655]">Categorize hours across Pedagogical Innovations, Subject Competency, ICT Tech & NEP 2020 Inclusive Education.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Certificate Audit Telemetry</p>
                        <p className="text-[11px] text-[#434655]">Faculty upload training completion certificates directly with admin approval workflows and instant SARAS export.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Link
                      href="/admin/teacher-training"
                      className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <span>Explore Training Tracker</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-[11px] text-[#434655] font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      CBSE Affiliation Compliant
                    </span>
                  </div>
                </div>

                {/* Right Interactive Simulator */}
                <div className="lg:col-span-7 bg-[#f8f9ff] rounded-2xl border border-[#c4c5d7]/50 p-4 sm:p-6 shadow-inner">
                  {/* Teacher Selector Pills */}
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
                    {teachersCpd.map((t, idx) => (
                      <button
                        key={t.name}
                        onClick={() => setSelectedTeacherIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                          selectedTeacherIndex === idx
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-[#434655] border border-[#c4c5d7]/40'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{t.name}</span>
                        <span className="text-[10px] opacity-75">({t.totalHours}/50h)</span>
                      </button>
                    ))}
                  </div>

                  {/* Active Teacher Card */}
                  {(() => {
                    const current = teachersCpd[selectedTeacherIndex] ?? teachersCpd[0]!;
                    const percentTotal = Math.min(100, Math.round((current.totalHours / 50) * 100));
                    const percentCoe = Math.min(100, Math.round((current.cbseCoeHours / 25) * 100));
                    const percentInHouse = Math.min(100, Math.round((current.inHouseHours / 25) * 100));

                    return (
                      <div className="bg-white rounded-xl p-5 border border-[#c4c5d7]/40 shadow-sm space-y-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-extrabold text-[#0b1c30]">{current.name}</h4>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                {current.status}
                              </span>
                            </div>
                            <p className="text-xs text-[#434655] mt-0.5">{current.subject} • {current.grade}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-emerald-700">{current.totalHours}</span>
                            <span className="text-xs text-[#434655] font-semibold"> / 50 Hours</span>
                          </div>
                        </div>

                        {/* Overall Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-[#0b1c30]">Total Annual CPD Progress</span>
                            <span className="text-emerald-700">{percentTotal}% Completed</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                              style={{ width: `${percentTotal}%` }}
                            />
                          </div>
                        </div>

                        {/* Dual Sub-Quotas Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-lg bg-[#f8f9ff] border border-[#eff4ff]">
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="font-bold text-[#0b1c30]">CBSE COE Workshops</span>
                              <span className="font-black text-blue-700">{current.cbseCoeHours}/25 hrs</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percentCoe}%` }} />
                            </div>
                            <p className="text-[10px] text-[#434655] mt-1.5">Official Board Centres</p>
                          </div>

                          <div className="p-3 rounded-lg bg-[#f8f9ff] border border-[#eff4ff]">
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="font-bold text-[#0b1c30]">In-House / Sahodaya</span>
                              <span className="font-black text-emerald-700">{current.inHouseHours}/25 hrs</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${percentInHouse}%` }} />
                            </div>
                            <p className="text-[10px] text-[#434655] mt-1.5">DIKSHA & Campus Training</p>
                          </div>
                        </div>

                        {/* Recent Certificate Badge */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-600" />
                            <div>
                              <p className="font-bold text-[#0b1c30] text-[11px]">{current.recentCert}</p>
                              <p className="text-[10px] text-[#434655]">Verified on {current.recentDate}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Audit Signed
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* 3. MULTI-TIER PROGRESS TRACKING TAB */}
            {activeTab === 'progress-tracking' && (
              <motion.div
                key="progress-tracking"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center"
              >
                {/* Left Pitch */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-[#ea580c]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Real-Time Pacing Velocity</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                    Multi-Tier Progress Across Teachers, Classes & Subjects
                  </h3>

                  <p className="text-sm text-[#434655] leading-relaxed">
                    Principals and HODs get complete operational visibility. Spot which section is lagging behind in physics or which teacher has pending notebook audits before the pre-boards arrive.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Teacher Velocity & Notebook Backlogs</p>
                        <p className="text-[11px] text-[#434655]">Planned lectures vs actual delivered classes with real-time copy audit counts.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Parallel Section Benchmarking</p>
                        <p className="text-[11px] text-[#434655]">Compare Class 10-A vs 10-B pacing to ensure uniform coverage across all sections.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Automated Lag Warnings</p>
                        <p className="text-[11px] text-[#434655]">Intelligent alerts trigger when any subject falls &gt;10% behind expected syllabus pace.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Link
                      href="/admin/progress"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/25 transition-all active:scale-95"
                    >
                      <span>Open Admin Progress Matrix</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Right Interactive Simulator */}
                <div className="lg:col-span-7 bg-[#f8f9ff] rounded-2xl border border-[#c4c5d7]/50 p-4 sm:p-6 shadow-inner">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2 mb-4 bg-white p-1 rounded-xl border border-[#c4c5d7]/40 w-fit text-xs">
                    <button
                      onClick={() => setProgressViewMode('teachers')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        progressViewMode === 'teachers' ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white shadow-xs' : 'text-[#434655] hover:text-[#0b1c30]'
                      }`}
                    >
                      By Teachers (Faculty)
                    </button>
                    <button
                      onClick={() => setProgressViewMode('classes')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        progressViewMode === 'classes' ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white shadow-xs' : 'text-[#434655] hover:text-[#0b1c30]'
                      }`}
                    >
                      By Classes (6th-12th)
                    </button>
                    <button
                      onClick={() => setProgressViewMode('subjects')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        progressViewMode === 'subjects' ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white shadow-xs' : 'text-[#434655] hover:text-[#0b1c30]'
                      }`}
                    >
                      By Subjects
                    </button>
                  </div>

                  {/* Dynamic View Cards */}
                  <div className="bg-white rounded-xl p-5 border border-[#c4c5d7]/40 shadow-sm space-y-3.5">
                    {progressViewMode === 'teachers' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-[#c4c5d7]/30 text-xs font-bold text-[#434655]">
                          <span>Faculty Member</span>
                          <span>Subject & Class</span>
                          <span>Syllabus Pacing</span>
                          <span>Status</span>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                          <div>
                            <p className="font-bold text-[#0b1c30]">Prof. Aris Thorne</p>
                            <p className="text-[10px] text-[#434655]">18 Topics Delivered</p>
                          </div>
                          <span className="text-[11px] text-[#434655]">Mathematics (10-A)</span>
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] font-bold text-emerald-700 mb-0.5">
                              <span>94.2%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded-full" style={{ width: '94%' }} />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Optimum ✓
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                          <div>
                            <p className="font-bold text-[#0b1c30]">Ms. Priya Sharma</p>
                            <p className="text-[10px] text-[#434655]">15 Topics Delivered</p>
                          </div>
                          <span className="text-[11px] text-[#434655]">Science (9-B)</span>
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] font-bold text-emerald-700 mb-0.5">
                              <span>91.0%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded-full" style={{ width: '91%' }} />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            On Track ✓
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1.5">
                          <div>
                            <p className="font-bold text-[#0b1c30]">Mr. Rajesh Verma</p>
                            <p className="text-[10px] text-amber-700">3 Lectures Delayed</p>
                          </div>
                          <span className="text-[11px] text-[#434655]">Physics (11-A)</span>
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] font-bold text-amber-700 mb-0.5">
                              <span>71.5%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: '71.5%' }} />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Delay Alert
                          </span>
                        </div>
                      </div>
                    )}

                    {progressViewMode === 'classes' && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-[#0b1c30]">Class 10 — Secondary Board (Section A & B)</span>
                            <span className="text-emerald-700">89.4% Average</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full" style={{ width: '89.4%' }} />
                          </div>
                          <p className="text-[10px] text-[#434655] mt-1">142 of 160 Topics Verified across 6 Core Subjects</p>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-[#0b1c30]">Class 12 — Senior Secondary (Science Stream)</span>
                            <span className="text-emerald-700">85.0% Average</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full" style={{ width: '85%' }} />
                          </div>
                          <p className="text-[10px] text-[#434655] mt-1">Physics, Chemistry, Math & Biology Laboratory Blueprints on schedule</p>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-[#0b1c30]">Class 9 — Middle High School</span>
                            <span className="text-blue-700">92.8% Average</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: '92.8%' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {progressViewMode === 'subjects' && (
                      <div className="space-y-2.5">
                        <div className="p-2.5 rounded-lg bg-[#f8f9ff] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                            <span className="font-bold text-[#0b1c30]">Mathematics</span>
                          </div>
                          <span className="text-[11px] text-[#434655]">15 / 16 Chapters Completed</span>
                          <span className="font-extrabold text-emerald-700">94.0%</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#f8f9ff] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                            <span className="font-bold text-[#0b1c30]">Science & Chemistry</span>
                          </div>
                          <span className="text-[11px] text-[#434655]">14 / 16 Chapters Completed</span>
                          <span className="font-extrabold text-emerald-700">88.5%</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#f8f9ff] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                            <span className="font-bold text-[#0b1c30]">Social Studies</span>
                          </div>
                          <span className="text-[11px] text-[#434655]">18 / 22 Chapters Completed</span>
                          <span className="font-extrabold text-amber-700">81.8%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. ADMIN ACADEMIC CALENDAR & TIMELINE TAB */}
            {activeTab === 'academic-timeline' && (
              <motion.div
                key="academic-timeline"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center"
              >
                {/* Left Pitch */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Real Working Day Calibration</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                    Admin Academic Calendar & Teaching Day Engine
                  </h3>

                  <p className="text-sm text-[#434655] leading-relaxed">
                    Most schools plan based on a 365-day calendar. SyllabusTracker automatically calculates real available teaching days by subtracting weekly holidays, vacations, and government gazetted holidays.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Net Teaching Days Formula</p>
                        <p className="text-[11px] text-[#434655]">365 Days − 52 Sundays − 24 2nd/4th Saturdays − 45 Vacation Days = 214 Actual Teaching Periods.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Term & Exam Freeze Milestones</p>
                        <p className="text-[11px] text-[#434655]">Schedule Term 1, Mid-Terms, Pre-Boards & Annual exam freeze dates with automated countdowns.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">1-Click Session Rollover Migration</p>
                        <p className="text-[11px] text-[#434655]">Migrate whole school structures from 2025-26 into 2026-27 without re-entering curriculum blueprints.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Link
                      href="/admin/academic-timeline"
                      className="inline-flex items-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <span>Open Academic Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Right Interactive Simulator */}
                <div className="lg:col-span-7 bg-[#f8f9ff] rounded-2xl border border-[#c4c5d7]/50 p-4 sm:p-6 shadow-inner">
                  {/* Session Banner */}
                  <div className="bg-white rounded-xl p-4 border border-[#c4c5d7]/40 shadow-xs mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                          Active Session 2025-26
                        </span>
                        <h4 className="text-xs font-bold text-[#0b1c30] mt-1">St. Xavier&apos;s Senior Secondary Academy</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        Term 2 Running
                      </span>
                    </div>

                    {/* Timeline Days Breakdown */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#c4c5d7]/30 text-center">
                      <div className="p-2 rounded bg-slate-50">
                        <p className="text-lg font-black text-[#0b1c30]">214</p>
                        <p className="text-[10px] text-[#434655]">Total Teaching Days</p>
                      </div>
                      <div className="p-2 rounded bg-blue-50">
                        <p className="text-lg font-black text-blue-700">168</p>
                        <p className="text-[10px] text-[#434655]">Days Elapsed (78%)</p>
                      </div>
                      <div className="p-2 rounded bg-emerald-50">
                        <p className="text-lg font-black text-emerald-700">46</p>
                        <p className="text-[10px] text-[#434655]">Classes Remaining</p>
                      </div>
                    </div>
                  </div>

                  {/* Milestones Sequence */}
                  <div className="bg-white rounded-xl p-4 border border-[#c4c5d7]/40 shadow-sm space-y-3">
                    <h5 className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                      <span>Upcoming Academic Deadlines & Freeze Dates</span>
                    </h5>

                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="font-bold text-[#0b1c30]">Mid-Term Blueprint Lock</p>
                            <p className="text-[10px] text-[#434655]">October 14, 2026</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded shadow-2xs">
                          Completed ✓
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-bold text-[#0b1c30]">Winter Vacation Break (12 Days)</p>
                            <p className="text-[10px] text-[#434655]">Dec 22 — Jan 02, 2027</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded shadow-2xs">
                          Teaching Frozen
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <div>
                            <p className="font-bold text-[#0b1c30]">Pre-Board 100% Verification Cutoff</p>
                            <p className="text-[10px] text-[#434655]">January 18, 2027 • 26 Days Left</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                          Mandatory Stage 3
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
