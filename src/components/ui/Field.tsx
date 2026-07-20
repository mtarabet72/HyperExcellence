// ============================================================
// HyperExcellence - Design System : champs de formulaire
// ============================================================
import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from 'react';

const BASE =
  'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-400 font-medium">{children}</p>;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${BASE} ${className}`} {...props} />;
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${BASE} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${BASE} ${className}`} {...props} />;
}
