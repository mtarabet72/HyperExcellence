// ============================================================
// HyperExcellence - Design System : Button
// ============================================================
import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'success' | 'info' | 'ghost' | 'successSoft' | 'dangerSoft';
type Size = 'xs' | 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-amber-500 text-slate-950 font-medium',
  success: 'bg-emerald-500 text-slate-950 font-medium',
  info: 'bg-blue-500 text-slate-950 font-medium',
  ghost: 'bg-slate-800 text-slate-200',
  successSoft: 'bg-emerald-500/20 text-emerald-400',
  dangerSoft: 'bg-red-500/20 text-red-400',
};

const SIZES: Record<Size, string> = {
  xs: 'py-1.5 px-3 text-xs',
  sm: 'py-2 px-3 text-xs',
  md: 'py-2.5 px-4 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'sm',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'rounded-lg disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
