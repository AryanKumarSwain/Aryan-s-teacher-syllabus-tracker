'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MascotLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

/**
 * Official SyllabusTracker Emblem Icon
 * Displays the circular syllabus notebook with progress checkmark
 */
export function MascotLogo({
  className = '',
  size = 40,
  animated = false,
}: MascotLogoProps) {
  const imageElement = (
    <img
      src="/logo-transparent.png"
      alt="SyllabusTracker Logo"
      width={size}
      height={size}
      className={`rounded-full object-contain shrink-0 drop-shadow-sm select-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      draggable={false}
    />
  );

  if (!animated) {
    return imageElement;
  }

  return (
    <motion.div
      className="inline-flex shrink-0 items-center justify-center"
      whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
    >
      {imageElement}
    </motion.div>
  );
}
