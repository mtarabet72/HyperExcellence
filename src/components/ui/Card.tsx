// ============================================================
// HyperExcellence - Design System : Card
// ============================================================
import { ReactNode } from 'react';

type Tone = 'default' | 'nested' | 'danger';
type Padding = 'sm' | 'md';

interface CardProps {
  children: ReactNode;
  /** 'nested' = panneau imbrique (fond plus sombre), 'danger' = bloc d'alerte */
  tone?: Tone;
  padding?: Padding;
  className?: string;
}

const TONES: Record<Tone, string> = {
  default: 'bg-slate-900 border-slate-800',
  nested: 'bg-slate-950 border-slate-700',
  danger: 'bg-red-950/40 border-red-800',
};

const PADDINGS: Record<Padding, string> = {
  sm: 'p-3',
  md: 'p-4',
};

export function Card({
  children,
  tone = 'default',
  padding = 'sm',
  className = '',
}: CardProps) {
  return (
    <div className={`border rounded-lg ${TONES[tone]} ${PADDINGS[padding]} ${className}`}>
      {children}
    </div>
  );
}
