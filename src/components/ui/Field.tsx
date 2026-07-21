// ============================================================
// HyperExcellence - Design System : champs de formulaire
// ============================================================
import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from 'react';

/**
 * `on` designe le fond du conteneur, pour garder le contraste :
 * - 'nested' (defaut) : champ sur un panneau slate-950 -> champ slate-900
 * - 'card'            : champ sur une carte slate-900   -> champ slate-950
 */
type On = 'nested' | 'card';
/** 'md' = compact (formulaires denses), 'lg' = confort tactile (connexion terrain) */
type FieldSize = 'md' | 'lg';

const SURFACE: Record<On, string> = {
  nested: 'bg-slate-900',
  card: 'bg-slate-950',
};

const FIELD_SIZES: Record<FieldSize, string> = {
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

const BASE =
  'w-full rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500';

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-400 font-medium">{children}</p>;
}

/** Label semantique pour les vrais formulaires. */
export function Label({
  children,
  size = 'md',
  htmlFor,
}: {
  children: ReactNode;
  size?: FieldSize;
  htmlFor?: string;
}) {
  const cls = size === 'lg' ? 'text-sm text-slate-300' : 'text-xs text-slate-400';
  return (
    <label htmlFor={htmlFor} className={`block mb-1 ${cls}`}>
      {children}
    </label>
  );
}

// `size` natif (numerique) est ecarte : on reutilise ce nom pour l'echelle du design system.
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  on?: On;
  size?: FieldSize;
};
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  on?: On;
  size?: FieldSize;
};
type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  on?: On;
  size?: FieldSize;
};

export function Input({ on = 'nested', size = 'md', className = '', ...props }: InputProps) {
  return (
    <input className={`${BASE} ${SURFACE[on]} ${FIELD_SIZES[size]} ${className}`} {...props} />
  );
}

export function Textarea({
  on = 'nested',
  size = 'md',
  className = '',
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={`${BASE} ${SURFACE[on]} ${FIELD_SIZES[size]} ${className}`}
      {...props}
    />
  );
}

export function Select({ on = 'nested', size = 'md', className = '', ...props }: SelectProps) {
  return (
    <select className={`${BASE} ${SURFACE[on]} ${FIELD_SIZES[size]} ${className}`} {...props} />
  );
}
