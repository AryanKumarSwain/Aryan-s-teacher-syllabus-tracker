'use client';

import React from 'react';

export interface CpdQuotaProgressBarProps {
  cbseHours: number;
  schoolHours: number;
  targetCbse?: number;
  targetSchool?: number;
  effectiveTotalHours?: number;
  className?: string;
  showLegend?: boolean;
}

export function CpdQuotaProgressBar({
  cbseHours = 0,
  schoolHours = 0,
  targetCbse = 25,
  targetSchool = 25,
  effectiveTotalHours,
  className = '',
  showLegend = false,
}: CpdQuotaProgressBarProps) {
  const totalTarget = Math.max(1, targetCbse + targetSchool);
  const effectiveCbse = Math.min(targetCbse, Math.max(0, cbseHours));
  const effectiveSchool = Math.min(targetSchool, Math.max(0, schoolHours));
  const providerSum = effectiveCbse + effectiveSchool;

  // If effectiveTotalHours is supplied (constrained by domain compliance),
  // scale the filled segments so the total bar fill accurately matches effectiveTotalHours.
  const cappedEffectiveTotal =
    effectiveTotalHours !== undefined
      ? Math.min(totalTarget, Math.max(0, effectiveTotalHours))
      : providerSum;

  const scale = providerSum > 0 ? Math.min(1, cappedEffectiveTotal / providerSum) : 0;

  const cbsePercent = ((effectiveCbse * scale) / totalTarget) * 100;
  const schoolPercent = ((effectiveSchool * scale) / totalTarget) * 100;

  return (
    <div className="w-full space-y-1">
      <div
        className={`relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100 flex shadow-inner ${className}`}
      >
        {cbsePercent > 0 && (
          <div
            style={{ width: `${cbsePercent}%` }}
            className="h-full bg-[#1a73e8] transition-all duration-300 hover:opacity-90 cursor-help"
            title={`CBSE Quota: ${cbseHours}h (${effectiveCbse}/${targetCbse}h effective)`}
          />
        )}
        {schoolPercent > 0 && (
          <div
            style={{ width: `${schoolPercent}%` }}
            className="h-full bg-emerald-500 transition-all duration-300 hover:opacity-90 cursor-help"
            title={`School Quota: ${schoolHours}h (${effectiveSchool}/${targetSchool}h effective)`}
          />
        )}
      </div>

      {showLegend && (
        <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#1a73e8] inline-block" />
            CBSE: {effectiveCbse}/{targetCbse}h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            School: {effectiveSchool}/{targetSchool}h
          </span>
        </div>
      )}
    </div>
  );
}

export default CpdQuotaProgressBar;
