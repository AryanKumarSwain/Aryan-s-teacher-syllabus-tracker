'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface BrandIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function BrandIcon({ size = 36, className = '', animated = true }: BrandIconProps) {
  const imageElement = (
    <img
      src="/logo-transparent.png"
      alt="SyllabusTracker Icon"
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

interface BrandTextProps {
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light' | 'auto';
  tagline?: string;
  showTagline?: boolean;
  className?: string;
}

export function BrandText({
  size = 'md',
  theme = 'auto',
  tagline = 'Academic Operations OS',
  showTagline = true,
  className = '',
}: BrandTextProps) {
  const titleSizes = {
    sm: 'text-sm font-extrabold',
    md: 'text-base font-extrabold',
    lg: 'text-xl font-black',
  };

  const taglineSizes = {
    sm: 'text-[9.5px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  };

  // Color handling for dark/light contexts
  const syllabusColor =
    theme === 'dark'
      ? 'text-white'
      : theme === 'light'
      ? 'text-[#0b1c30]'
      : 'text-[#0b1c30] dark:text-white';

  const trackerColor = 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent';

  const taglineColor =
    theme === 'dark'
      ? 'text-emerald-400/90'
      : theme === 'light'
      ? 'text-[#434655]'
      : 'text-[#434655] dark:text-emerald-400';

  return (
    <div className={`flex flex-col leading-tight select-none ${className}`}>
      <div className="flex items-center gap-0.5">
        <span className={`tracking-tight ${syllabusColor} ${titleSizes[size]}`}>
          Syllabus
        </span>
        <span className={`tracking-tight font-extrabold ${trackerColor} ${titleSizes[size]}`}>
          Tracker
        </span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5 animate-pulse" />
      </div>
      {showTagline && (
        <span className={`font-semibold tracking-wide truncate ${taglineColor} ${taglineSizes[size]}`}>
          {tagline}
        </span>
      )}
    </div>
  );
}

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  iconSize?: number;
  theme?: 'dark' | 'light' | 'auto';
  tagline?: string;
  showTagline?: boolean;
  href?: string;
  className?: string;
  animated?: boolean;
}

export function BrandLogo({
  size = 'md',
  iconSize,
  theme = 'auto',
  tagline,
  showTagline = true,
  href,
  className = '',
  animated = true,
}: BrandLogoProps) {
  const defaultIconSizes = {
    sm: 30,
    md: 38,
    lg: 48,
  };

  const calculatedIconSize = iconSize ?? defaultIconSizes[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 group cursor-pointer ${className}`}>
      <BrandIcon size={calculatedIconSize} animated={animated} />
      <BrandText
        size={size}
        theme={theme}
        tagline={tagline}
        showTagline={showTagline}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
