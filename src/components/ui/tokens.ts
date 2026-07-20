// ============================================================
// HyperExcellence - Design System : jetons de couleur
// ============================================================

/** Couleurs semantiques (equivalents hex des classes Tailwind utilisees). */
export const COLORS = {
  success: '#34d399', // emerald-400
  danger: '#f87171', // red-400
  warning: '#fbbf24', // amber-400
  info: '#60a5fa', // blue-400
  orange: '#fb923c', // orange-400
} as const;

/** Seuils de conformite (Circuit 10) : >=90 vert, >=80 orange, sinon rouge. */
export function conformiteColor(taux: number): string {
  if (taux >= 90) return '#10b981';
  if (taux >= 80) return '#f97316';
  return '#ef4444';
}
