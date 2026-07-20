// ============================================================
// HyperExcellence - Design System : barre de progression
// ============================================================
interface ProgressBarProps {
  /** Pourcentage 0-100 */
  value: number;
  color: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, color, size = 'md', className = '' }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div className={`w-full ${height} bg-slate-800 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full transition-all"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}
