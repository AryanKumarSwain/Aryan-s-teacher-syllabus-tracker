'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart } from 'lucide-react';

interface AcademicMascotProps {
  currentTip?: string;
  className?: string;
}

const DEFAULT_TIPS = [
  "Hi! I'm Prof. Pacy, your Academic Pacing Mascot! 🎓",
  'Did you know? Traditional checklists fail 68% of school audits! 📚',
  'Try clicking Stage 1, 2, and 3 below to see live syllabus verification! ✍️',
  'Stage 3 (Notebook checking) is our secret sauce — zero blind sign-offs! 🔍',
  'Role-based dashboards keep every campus strictly organized! 🛡️',
  'Need printable test papers? Our live exam builder formats them in seconds! 📝',
];

export function AcademicMascot({
  currentTip,
  className = '',
}: AcademicMascotProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [isWaving, setIsWaving] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  // Periodic eye blink
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Tip rotation
  useEffect(() => {
    if (currentTip) return;
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % DEFAULT_TIPS.length);
    }, 7000);
    return () => clearInterval(tipInterval);
  }, [currentTip]);

  const activeMessage = currentTip || DEFAULT_TIPS[tipIndex];

  const handleCharacterClick = () => {
    setIsWaving(true);
    setShowHeart(true);
    setTipIndex((prev) => (prev + 1) % DEFAULT_TIPS.length);
    setTimeout(() => setIsWaving(false), 1200);
    setTimeout(() => setShowHeart(false), 1000);
  };

  return (
    <div className={`relative flex flex-row items-center gap-2.5 sm:gap-3.5 w-full max-w-sm sm:max-w-md ${className}`}>
      {/* Animated Character Avatar / Mascot SVG (Left side) */}
      <motion.div
        onClick={handleCharacterClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative cursor-pointer select-none shrink-0 w-12 h-12 sm:w-16 sm:h-16"
      >
        {/* Heart float animation on click */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -40, scale: 1.2 }}
              exit={{ opacity: 0 }}
              className="absolute -top-6 left-6 pointer-events-none text-rose-500 z-30"
            >
              <Heart className="h-6 w-6 fill-rose-500" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character Base & Glow */}
        <motion.div
          animate={{
            y: [0, -4, 0],
            rotate: [0, 1.5, -1.5, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: 'easeInOut',
          }}
          className="relative w-12 h-12 sm:w-16 sm:h-16 drop-shadow-md"
        >
          <svg viewBox="0 0 120 120" className="w-full h-full block">
            <defs>
              <linearGradient id="bodyGrad-hero" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="60%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#1E3A8A" />
              </linearGradient>

              <linearGradient id="tummyGrad-hero" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E0F2FE" />
              </linearGradient>

              <linearGradient id="capGrad-hero" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>

              <linearGradient id="goldGrad-hero" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>

            {/* Ambient Shadow */}
            <ellipse cx="60" cy="114" rx="34" ry="6" fill="rgba(15, 23, 42, 0.15)" />

            {/* Left Arm holding notebook */}
            <motion.g
              animate={isWaving ? { rotate: [-10, 25, -10, 25, 0] } : { rotate: [0, 4, 0] }}
              transition={{ duration: isWaving ? 1 : 3, repeat: isWaving ? 0 : Infinity }}
              style={{ transformOrigin: '28px 75px' }}
            >
              <ellipse cx="24" cy="78" rx="8" ry="14" fill="#1D4ED8" transform="rotate(25 24 78)" />
              <circle cx="18" cy="88" r="6" fill="#93C5FD" />
              <rect x="8" y="80" width="14" height="18" rx="2" fill="#FFFFFF" stroke="#0037B0" strokeWidth="1.5" transform="rotate(-15 15 89)" />
              <line x1="12" y1="84" x2="18" y2="84" stroke="#10B981" strokeWidth="1.5" />
              <line x1="12" y1="88" x2="18" y2="88" stroke="#10B981" strokeWidth="1.5" />
              <line x1="12" y1="92" x2="16" y2="92" stroke="#3B82F6" strokeWidth="1.5" />
            </motion.g>

            {/* Right Arm (Waving hand with feather wand) */}
            <motion.g
              animate={isWaving ? { rotate: [0, 35, -15, 30, 0] } : { rotate: [0, -6, 0] }}
              transition={{ duration: isWaving ? 1 : 2.5, repeat: isWaving ? 0 : Infinity }}
              style={{ transformOrigin: '92px 75px' }}
            >
              <ellipse cx="96" cy="78" rx="8" ry="14" fill="#1D4ED8" transform="rotate(-25 96 78)" />
              <circle cx="102" cy="70" r="7" fill="#93C5FD" />
              <path d="M102,68 L114,54" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="114" cy="54" r="3" fill="#FBBF24" />
            </motion.g>

            {/* Main Round Body */}
            <ellipse cx="60" cy="74" rx="36" ry="34" fill="url(#bodyGrad-hero)" />

            {/* Belly / Vest Plate */}
            <ellipse cx="60" cy="80" rx="24" ry="22" fill="url(#tummyGrad-hero)" />

            {/* Bowtie */}
            <path d="M52,66 L68,66 L64,72 L68,78 L52,78 L56,72 Z" fill="#EF4444" />
            <circle cx="60" cy="72" r="3" fill="#DC2626" />

            {/* Cheeks blush */}
            <ellipse cx="40" cy="68" rx="5" ry="3" fill="#F472B6" opacity="0.6" />
            <ellipse cx="80" cy="68" rx="5" ry="3" fill="#F472B6" opacity="0.6" />

            {/* Big Expressive Smart Glasses */}
            <rect x="34" y="50" width="22" height="18" rx="6" fill="rgba(255,255,255,0.7)" stroke="#1E293B" strokeWidth="2.5" />
            <rect x="64" y="50" width="22" height="18" rx="6" fill="rgba(255,255,255,0.7)" stroke="#1E293B" strokeWidth="2.5" />
            <line x1="56" y1="58" x2="64" y2="58" stroke="#1E293B" strokeWidth="2.5" />

            {/* Eyes (Blinking animation) */}
            {isBlinking ? (
              <>
                <line x1="39" y1="59" x2="51" y2="59" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                <line x1="69" y1="59" x2="81" y2="59" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="45" cy="59" rx="5" ry="6" fill="#0F172A" />
                <circle cx="43" cy="57" r="2" fill="#FFFFFF" />

                <ellipse cx="75" cy="59" rx="5" ry="6" fill="#0F172A" />
                <circle cx="73" cy="57" r="2" fill="#FFFFFF" />
              </>
            )}

            {/* Smile */}
            <path d="M56,70 Q60,75 64,70" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />

            {/* Graduation Cap */}
            <g>
              <ellipse cx="60" cy="40" rx="20" ry="7" fill="#0F172A" />
              <polygon points="60,20 96,32 60,44 24,32" fill="url(#capGrad-hero)" stroke="#334155" strokeWidth="1" />
              <circle cx="60" cy="32" r="3" fill="url(#goldGrad-hero)" />
              <motion.g
                animate={{ rotate: [-6, 6, -6] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                style={{ transformOrigin: '60px 32px' }}
              >
                <path d="M60,32 Q72,36 78,48" fill="none" stroke="#F59E0B" strokeWidth="1.8" />
                <polygon points="76,48 81,49 80,56 75,55" fill="url(#goldGrad-hero)" />
              </motion.g>
            </g>
          </svg>
        </motion.div>
      </motion.div>

      {/* Speech Bubble (Right side of mascot, tail points to mascot on the left) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMessage}
          initial={{ opacity: 0, x: -8, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="relative flex-1 min-w-0 rounded-xl bg-white p-2 sm:p-2.5 shadow-sm border border-blue-100 text-left dark:bg-slate-900 dark:border-slate-800"
        >
          {/* Bubble tail pointing left towards mascot */}
          <div className="absolute -left-1.5 top-3.5 h-2 w-2 rotate-45 bg-white border-b border-l border-blue-100 dark:bg-slate-900 dark:border-slate-800 block" />

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              <Sparkles className="h-2.5 w-2.5 animate-spin text-amber-500" style={{ animationDuration: '6s' }} />
              <span>PROF. PACY • ACADEMIC MASCOT</span>
            </div>
          </div>

          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 font-medium leading-snug">
            {activeMessage}
          </p>

          <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1 text-[9px] text-slate-400 dark:border-slate-800">
            <span className="cursor-pointer hover:text-blue-600 font-semibold" onClick={handleCharacterClick}>
              Click me for advice!
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Online
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
