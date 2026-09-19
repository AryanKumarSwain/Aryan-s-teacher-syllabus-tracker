'use client';

interface DomainStackedProgressBarProps {
  domain1Hours: number;
  domain2Hours: number;
  domain3Hours: number;
  totalHours: number;
  targetHours?: number;
  className?: string;
  showLegend?: boolean;
}

export function DomainStackedProgressBar({
  domain1Hours,
  domain2Hours,
  domain3Hours,
  totalHours,
  targetHours = 50,
  className = '',
  showLegend = false,
}: DomainStackedProgressBarProps) {
  const effectiveMax = Math.max(targetHours, totalHours);
  // Calculate percentage of each domain towards target
  const p1 = effectiveMax > 0 ? (domain1Hours / effectiveMax) * 100 : 0;
  const p2 = effectiveMax > 0 ? (domain2Hours / effectiveMax) * 100 : 0;
  const p3 = effectiveMax > 0 ? (domain3Hours / effectiveMax) * 100 : 0;

  return (
    <div className="w-full space-y-1">
      <div
        className={`relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100 flex shadow-inner ${className}`}
      >
        {p1 > 0 && (
          <div
            style={{ width: `${p1}%` }}
            className="h-full bg-indigo-500 transition-all duration-300 hover:opacity-90 cursor-help"
            title={`Domain 1 (Ethics): ${domain1Hours}h`}
          />
        )}
        {p2 > 0 && (
          <div
            style={{ width: `${p2}%` }}
            className="h-full bg-sky-500 transition-all duration-300 hover:opacity-90 cursor-help"
            title={`Domain 2 (Practice): ${domain2Hours}h`}
          />
        )}
        {p3 > 0 && (
          <div
            style={{ width: `${p3}%` }}
            className="h-full bg-emerald-500 transition-all duration-300 hover:opacity-90 cursor-help"
            title={`Domain 3 (Growth): ${domain3Hours}h`}
          />
        )}
      </div>

      {showLegend && (
        <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            D1: {domain1Hours}h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
            D2: {domain2Hours}h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            D3: {domain3Hours}h
          </span>
        </div>
      )}
    </div>
  );
}
