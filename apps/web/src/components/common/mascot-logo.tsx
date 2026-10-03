'use client';

import { motion } from 'framer-motion';

interface MascotLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export function MascotLogo({
  className = '',
  size = 40,
  animated = false,
}: MascotLogoProps) {
  const content = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`overflow-visible drop-shadow-sm ${className}`}
    >
      <defs>
        <linearGradient id="bodyGrad-comp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="60%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        <linearGradient id="tummyGrad-comp" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        <linearGradient id="capGrad-comp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        <linearGradient id="goldGrad-comp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="#94A3B8" opacity="0.35" />

      {/* Left Arm holding syllabus checklist paper */}
      <g>
        <ellipse cx="23" cy="74" rx="7" ry="12" fill="#1D4ED8" transform="rotate(25 23 74)" />
        <circle cx="18" cy="83" r="5" fill="#93C5FD" />
        <rect x="7" y="75" width="13" height="17" rx="2" fill="#FFFFFF" stroke="#0037B0" strokeWidth="1.2" transform="rotate(-12 13 83)" />
        <line x1="10" y1="79" x2="16" y2="79" stroke="#10B981" strokeWidth="1.2" />
        <line x1="10" y1="83" x2="16" y2="83" stroke="#10B981" strokeWidth="1.2" />
        <line x1="10" y1="87" x2="14" y2="87" stroke="#3B82F6" strokeWidth="1.2" />
      </g>

      {/* Right Arm holding golden pointer wand */}
      <g>
        <ellipse cx="97" cy="74" rx="7" ry="12" fill="#1D4ED8" transform="rotate(-25 97 74)" />
        <circle cx="102" cy="67" r="6" fill="#93C5FD" />
        <path d="M102,65 L113,51" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="113" cy="51" r="3" fill="#FBBF24" />
      </g>

      {/* Round Body */}
      <circle cx="60" cy="70" r="34" fill="url(#bodyGrad-comp)" />

      {/* White Belly Plate */}
      <ellipse cx="60" cy="76" rx="23" ry="21" fill="url(#tummyGrad-comp)" />

      {/* Bowtie */}
      <polygon points="52,63 68,63 64,68 68,73 52,73 56,68" fill="#EF4444" />
      <circle cx="60" cy="68" r="2.5" fill="#B91C1C" />

      {/* Cheeks Blush */}
      <ellipse cx="40" cy="64" rx="5" ry="3" fill="#F472B6" opacity="0.7" />
      <ellipse cx="80" cy="64" rx="5" ry="3" fill="#F472B6" opacity="0.7" />

      {/* Black Smart Glasses Frame */}
      <rect x="33" y="47" width="22" height="17" rx="5" fill="#FFFFFF" fillOpacity="0.8" stroke="#0F172A" strokeWidth="2.5" />
      <rect x="65" y="47" width="22" height="17" rx="5" fill="#FFFFFF" fillOpacity="0.8" stroke="#0F172A" strokeWidth="2.5" />
      <line x1="55" y1="54" x2="65" y2="54" stroke="#0F172A" strokeWidth="2.5" />

      {/* Expressive Eyes */}
      <ellipse cx="44" cy="55.5" rx="5" ry="6" fill="#0F172A" />
      <circle cx="42" cy="53.5" r="2" fill="#FFFFFF" />

      <ellipse cx="76" cy="55.5" rx="5" ry="6" fill="#0F172A" />
      <circle cx="74" cy="53.5" r="2" fill="#FFFFFF" />

      {/* Beak */}
      <polygon points="56,64 64,64 60,69" fill="#F59E0B" />

      {/* Graduation Mortarboard Cap */}
      <g>
        <ellipse cx="60" cy="38" rx="20" ry="7" fill="#0F172A" />
        <polygon points="60,18 97,30 60,42 23,30" fill="url(#capGrad-comp)" stroke="#334155" strokeWidth="1.2" />
        <circle cx="60" cy="30" r="3.5" fill="url(#goldGrad-comp)" />
        <path d="M60,30 Q72,34 76,46" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="76" cy="47" r="3.5" fill="#D97706" />
      </g>

    </svg>
  );

  if (animated) {
    return (
      <motion.div
        whileHover={{ scale: 1.08, rotate: [0, -4, 4, 0] }}
        transition={{ duration: 0.3 }}
        className="inline-flex items-center justify-center cursor-pointer select-none"
      >
        {content}
      </motion.div>
    );
  }

  return <div className="inline-flex items-center justify-center select-none">{content}</div>;
}
