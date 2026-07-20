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
 * - 'nested' (defaut) : le champ est sur un panneau slate-950 -> champ slate-900
 * - 'card'            : le champ est sur une carte slate-900   -> champ slate-950
 */
type On = 'nested' | 'card';

const SURFACE: Record<On, string> = {
  nested: 'bg-slate-900',
  card: 'bg-slate-950',
};

const BASE =
  'w-full rounded-lg border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-400 font-medium">{children}</p>;
}

/** Label semantique pour les vrais formulaires. */
export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs text-slate-400 mb-1">{children}</label>;
}

export function Input({
  on = 'nested',
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { on?: On }) {
  return <input className={`${BASE} ${SURFACE[on]} ${className}`} {...props} />;
}

export function Textarea({
  on = 'nested',
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { on?: On }) {
  return <textarea className={`${BASE} ${SURFACE[on]} ${className}`} {...props} />;
}

export function Select({
  on = 'nested',
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { on?: On }) {
  return <select className={`${BASE} ${SURFACE[on]} ${className}`} {...props} />;
}
