// ============================================================
// HyperExcellence - Design System : tuile de statistique
// ============================================================
import { Card } from './Card';

interface StatProps {
  value: string | number;
  label: string;
  /** Couleur CSS de la valeur (voir tokens COLORS / GRAVITE_COLORS). */
  color?: string;
  /** 'center' = grande tuile centree, 'left' = tuile de KPI alignee a gauche */
  align?: 'center' | 'left';
  hint?: string;
}

export function Stat({ value, label, color, align = 'center', hint }: StatProps) {
  if (align === 'left') {
    return (
      <Card>
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-xl font-bold" style={color ? { color } : undefined}>
          {value}
        </p>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </Card>
    );
  }
  return (
    <Card className="text-center">
      <p className="text-2xl font-bold" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </Card>
  );
}
