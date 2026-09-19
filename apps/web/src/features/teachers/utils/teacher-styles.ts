export const CARD_THEMES = [
  {
    border: 'hover:border-blue-200',
    accentBg: 'bg-blue-50/70',
    accentText: 'text-blue-600',
    iconColor: 'text-blue-500',
  },
  {
    border: 'hover:border-purple-200',
    accentBg: 'bg-purple-50/70',
    accentText: 'text-purple-600',
    iconColor: 'text-purple-500',
  },
  {
    border: 'hover:border-emerald-200',
    accentBg: 'bg-emerald-50/70',
    accentText: 'text-emerald-600',
    iconColor: 'text-emerald-500',
  },
  {
    border: 'hover:border-amber-200',
    accentBg: 'bg-amber-50/70',
    accentText: 'text-amber-600',
    iconColor: 'text-amber-500',
  },
  {
    border: 'hover:border-rose-200',
    accentBg: 'bg-rose-50/70',
    accentText: 'text-rose-600',
    iconColor: 'text-rose-500',
  },
  {
    border: 'hover:border-cyan-200',
    accentBg: 'bg-cyan-50/70',
    accentText: 'text-cyan-600',
    iconColor: 'text-cyan-500',
  },
];

export function getTeacherColorStyles(id: string): (typeof CARD_THEMES)[0] {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return CARD_THEMES[sum % CARD_THEMES.length]!;
}
