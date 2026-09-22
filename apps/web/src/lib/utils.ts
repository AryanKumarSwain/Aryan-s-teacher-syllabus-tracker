import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getTermBadgeStyle(termName: string | undefined | null): string {
  if (!termName) return 'bg-gray-50 text-gray-700 ring-gray-200 border-gray-200';
  const lower = termName.toLowerCase();
  if (lower.includes('1')) {
    return 'bg-indigo-50 text-indigo-700 ring-indigo-300 border-indigo-200';
  }
  if (lower.includes('2')) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-300 border-emerald-200';
  }
  if (lower.includes('3')) {
    return 'bg-amber-50 text-amber-700 ring-amber-300 border-amber-200';
  }
  if (lower.includes('4')) {
    return 'bg-rose-50 text-rose-700 ring-rose-300 border-rose-200';
  }
  return 'bg-blue-50 text-blue-700 ring-blue-300 border-blue-200';
}
