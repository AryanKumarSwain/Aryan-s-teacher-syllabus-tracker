'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import katex from 'katex';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Sigma, Check, AlertCircle } from 'lucide-react';

interface MathEquationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (latex: string) => void;
}

interface SymbolGroup {
  label: string;
  items: { label: string; symbol: string; snippet: string }[];
}

const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    label: 'Fractions & Roots',
    items: [
      { label: 'Fraction', symbol: 'a/b', snippet: '\\frac{a}{b}' },
      { label: 'Square Root', symbol: '√x', snippet: '\\sqrt{x}' },
      { label: 'N-th Root', symbol: 'ⁿ√x', snippet: '\\sqrt[n]{x}' },
      { label: 'Differential', symbol: 'dy/dx', snippet: '\\frac{dy}{dx}' },
    ],
  },
  {
    label: 'Powers & Indices',
    items: [
      { label: 'Power / Exponent', symbol: 'x²', snippet: 'x^{2}' },
      { label: 'Subscript', symbol: 'x₁', snippet: 'x_{1}' },
      { label: 'Power & Subscript', symbol: 'x₁²', snippet: 'x_{1}^{2}' },
      { label: 'Exponential', symbol: 'eˣ', snippet: 'e^{x}' },
    ],
  },
  {
    label: 'Common Operators',
    items: [
      { label: 'Plus-Minus', symbol: '±', snippet: '\\pm' },
      { label: 'Multiplication', symbol: '×', snippet: '\\times' },
      { label: 'Division', symbol: '÷', snippet: '\\div' },
      { label: 'Dot product', symbol: '·', snippet: '\\cdot' },
      { label: 'Degree', symbol: '°', snippet: '^{\\circ}' },
      { label: 'Not equal', symbol: '≠', snippet: '\\neq' },
      { label: 'Approximate', symbol: '≈', snippet: '\\approx' },
      { label: 'Less/Equal', symbol: '≤', snippet: '\\le' },
      { label: 'Greater/Equal', symbol: '≥', snippet: '\\ge' },
      { label: 'Infinity', symbol: '∞', snippet: '\\infty' },
    ],
  },
  {
    label: 'Greek Letters',
    items: [
      { label: 'pi', symbol: 'π', snippet: '\\pi' },
      { label: 'theta', symbol: 'θ', snippet: '\\theta' },
      { label: 'alpha', symbol: 'α', snippet: '\\alpha' },
      { label: 'beta', symbol: 'β', snippet: '\\beta' },
      { label: 'gamma', symbol: 'γ', snippet: '\\gamma' },
      { label: 'delta', symbol: 'δ', snippet: '\\delta' },
      { label: 'Delta', symbol: 'Δ', snippet: '\\Delta' },
      { label: 'lambda', symbol: 'λ', snippet: '\\lambda' },
      { label: 'mu', symbol: 'μ', snippet: '\\mu' },
      { label: 'omega', symbol: 'ω', snippet: '\\omega' },
      { label: 'sigma', symbol: 'σ', snippet: '\\sigma' },
    ],
  },
  {
    label: 'Calculus & Sums',
    items: [
      { label: 'Integral', symbol: '∫', snippet: '\\int_{a}^{b} f(x)\\,dx' },
      { label: 'Indefinite Integral', symbol: '∫dx', snippet: '\\int f(x)\\,dx' },
      { label: 'Summation', symbol: '∑', snippet: '\\sum_{i=1}^{n} x_i' },
      { label: 'Limit', symbol: 'lim', snippet: '\\lim_{x \\to 0}' },
      { label: 'Vector', symbol: 'v⃗', snippet: '\\vec{v}' },
    ],
  },
];

export function MathEquationDialog({ open, onOpenChange, onInsert }: MathEquationDialogProps) {
  const [latex, setLatex] = useState('\\frac{a}{b}');
  const [activeGroup, setActiveGroup] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Live KaTeX rendering
  const { html, error } = useMemo(() => {
    if (!latex.trim()) {
      return { html: '', error: null };
    }
    try {
      const rendered = katex.renderToString(latex, {
        throwOnError: true,
        displayMode: true,
      });
      return { html: rendered, error: null };
    } catch (err: any) {
      return { html: '', error: err.message || 'Invalid LaTeX expression' };
    }
  }, [latex]);

  const insertSnippet = (snippet: string) => {
    const input = inputRef.current;
    if (!input) {
      setLatex((prev) => (prev ? `${prev} ${snippet}` : snippet));
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const current = latex;
    const nextVal = current.substring(0, start) + snippet + current.substring(end);
    setLatex(nextVal);

    setTimeout(() => {
      input.focus();
      const nextPos = start + snippet.length;
      input.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  const handleConfirm = () => {
    if (!latex.trim() || error) return;
    onInsert(latex.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] p-0 overflow-hidden flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-50 shrink-0">
              <Sigma className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base sm:text-lg font-black text-[#0b1c30]">
                Insert Math Equation / Formula
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 font-medium">
                Type LaTeX or click symbols below to construct mathematical formulas
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Live Preview Box */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Equation Live Preview</Label>
            <div className="mt-1.5 flex min-h-[90px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center shadow-2xs">
              {error ? (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>{error}</span>
                </div>
              ) : html ? (
                <div
                  className="text-lg leading-normal text-slate-900 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Formula preview will appear here
                </span>
              )}
            </div>
          </div>

          {/* LaTeX Input */}
          <div className="space-y-1.5">
            <Label htmlFor="latex-input" className="text-xs font-semibold text-slate-700">
              LaTeX Code
            </Label>
            <Input
              id="latex-input"
              ref={inputRef}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="e.g. \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !error && latex.trim()) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>

          {/* Quick Symbols Palette */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 border-b pb-2">
              {SYMBOL_GROUPS.map((group, idx) => (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => setActiveGroup(idx)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    activeGroup === idx
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 pt-1">
              {SYMBOL_GROUPS[activeGroup]?.items.map((item) => (
                <button
                  key={item.snippet}
                  type="button"
                  onClick={() => insertSnippet(item.snippet)}
                  title={`${item.label} (${item.snippet})`}
                  className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-center transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-2xs active:scale-95"
                >
                  <span className="font-mono text-sm font-semibold text-slate-800">{item.symbol}</span>
                  <span className="truncate w-full text-[10px] text-muted-foreground mt-0.5">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-100 text-xs shadow-2xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!latex.trim() || !!error}
            className="h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all gap-1.5"
          >
            <Check className="h-4 w-4" />
            Insert Equation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
