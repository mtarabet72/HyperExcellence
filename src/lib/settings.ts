// ============================================================
// HyperExcellence - Configuration applicative (shifts, retards)
// Lue depuis la collection `settings`, document unique `app_config`.
// ============================================================
import { databases } from './appwrite';
import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  SHIFTS,
  Shift,
  PolitiqueRetard,
} from '../constants';

export const APP_CONFIG_ID = 'app_config';

export interface AppConfig {
  shift_matin_debut: string; // "07:00"
  shift_matin_fin: string; // "14:00"
  shift_soir_debut: string; // "14:00"
  shift_soir_fin: string; // "22:00"
  politique_retard: PolitiqueRetard;
  hors_shift_rattache_a: Shift;
}

/** Repli utilise si la config est illisible (panne reseau, doc absent). */
export const DEFAULT_CONFIG: AppConfig = {
  shift_matin_debut: '07:00',
  shift_matin_fin: '14:00',
  shift_soir_debut: '14:00',
  shift_soir_fin: '22:00',
  politique_retard: 'RETARD',
  hors_shift_rattache_a: 'SOIR',
};

export async function getAppConfig(): Promise<AppConfig> {
  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.SETTINGS,
      APP_CONFIG_ID
    );
    return doc as unknown as AppConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** "07:30" -> 450 (minutes depuis minuit) */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Determine le shift actif a un instant donne.
 * Les plages sont comparees en minutes, borne de fin exclue.
 * Hors de toute plage (ex: 22h-07h), on rattache selon la config.
 */
export function getCurrentShift(config: AppConfig, at: Date = new Date()): Shift {
  const now = at.getHours() * 60 + at.getMinutes();

  const matinDebut = toMinutes(config.shift_matin_debut);
  const matinFin = toMinutes(config.shift_matin_fin);
  const soirDebut = toMinutes(config.shift_soir_debut);
  const soirFin = toMinutes(config.shift_soir_fin);

  if (now >= matinDebut && now < matinFin) return SHIFTS.MATIN;
  if (now >= soirDebut && now < soirFin) return SHIFTS.SOIR;

  return config.hors_shift_rattache_a || SHIFTS.SOIR;
}

/** Vrai si l'heure cible d'une tache est depassee. `executionTime` au format "HH:MM". */
export function isPastExecutionTime(executionTime: string | null, at: Date = new Date()): boolean {
  if (!executionTime) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  return now > toMinutes(executionTime);
}
