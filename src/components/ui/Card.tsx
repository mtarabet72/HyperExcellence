// ============================================================
// HyperExcellence - Design System : Card
// ============================================================
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  /** 'default' = carte de liste, 'nested' = panneau imbrique (fond plus sombre) */
  tone?: 'default' | 'nested';
  className?: string;
}

export function Card({ children, tone = 'default', className = '' }: CardProps) {
  const tones = {
    default: 'bg-slate-900 border-slate-800',
    nested: 'bg-slate-950 border-slate-700',
  };
  return (
    <div className={`border rounded-lg p-3 ${tones[tone]} ${className}`}>{children}</div>
  );
}
