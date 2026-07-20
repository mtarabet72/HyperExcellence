// ============================================================
// HyperExcellence - Design System : Badge
// ============================================================
import { ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'danger';

interface BadgeProps {
  children: ReactNode;
  /** Couleur d'accent libre (ex: GRAVITE_COLORS). Prioritaire sur `tone`. */
  color?: string;
  tone?: Tone;
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-800 text-slate-300',
  success: 'bg-emerald-500/20 text-emerald-400',
  danger: 'bg-red-500/20 text-red-400',
};

export function Badge({ children, color, tone = 'neutral' }: BadgeProps) {
  if (color) {
    return (
      <span
        className="text-xs font-semibold px-2 py-1 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {children}
      </span>
    );
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${TONES[tone]}`}>{children}</span>
  );
}
