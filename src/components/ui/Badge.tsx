// ============================================================
// HyperExcellence - Design System : Badge
// ============================================================
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  /** Couleur d'accent (ex: GRAVITE_COLORS). Sinon rendu neutre slate. */
  color?: string;
}

export function Badge({ children, color }: BadgeProps) {
  if (!color) {
    return (
      <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full">
        {children}
      </span>
    );
  }
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-full"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {children}
    </span>
  );
}
