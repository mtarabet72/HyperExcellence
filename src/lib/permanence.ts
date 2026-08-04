// ============================================================
// HyperExcellence - Permanence Magasin (Manager on Duty)
// Determine qui est de permanence a un instant donne, avec gestion
// du chevauchement de minuit sur chaque creneau (horaires personnalisables).
// ============================================================
import { databases, functions } from './appwrite';
import { APPWRITE_DATABASE_ID } from '../constants';
import { getAppConfig, DEFAULT_CONFIG } from './settings';

const PERMANENCE_COLLECTION_ID = 'permanenceplanning';
const UPDATE_EMPLOYEE_FUNCTION_ID = '6a592c6000074266e563';

export type PermanenceSlot = 'matin' | 'soir' | 'tranche';

export interface PermanenceDay {
  date: string; // YYYY-MM-DD
  matinUserId: string | null;
  matinHeureDebut: string | null;
  matinHeureFin: string | null;
  matinNote: string;
  soirUserId: string | null;
  soirHeureDebut: string | null;
  soirHeureFin: string | null;
  soirNote: string;
  trancheUserId: string | null;
  trancheHeureDebut: string | null;
  trancheHeureFin: string | null;
  trancheNote: string;
}

function mapDoc(d: any): PermanenceDay {
  return {
    date: d.$id,
    matinUserId: d.matin_user_id || null,
    matinHeureDebut: d.matin_heure_debut || null,
    matinHeureFin: d.matin_heure_fin || null,
    matinNote: d.matin_note || '',
    soirUserId: d.soir_user_id || null,
    soirHeureDebut: d.soir_heure_debut || null,
    soirHeureFin: d.soir_heure_fin || null,
    soirNote: d.soir_note || '',
    trancheUserId: d.tranche_user_id || null,
    trancheHeureDebut: d.tranche_heure_debut || null,
    trancheHeureFin: d.tranche_heure_fin || null,
    trancheNote: d.tranche_note || '',
  };
}

function emptyDay(date: string): PermanenceDay {
  return {
    date,
    matinUserId: null,
    matinHeureDebut: null,
    matinHeureFin: null,
    matinNote: '',
    soirUserId: null,
    soirHeureDebut: null,
    soirHeureFin: null,
    soirNote: '',
    trancheUserId: null,
    trancheHeureDebut: null,
    trancheHeureFin: null,
    trancheNote: '',
  };
}

export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function yesterday(d: Date): Date {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return y;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Recupere le planning d'un jour precis (document vide si aucune affectation). */
export async function getPermanenceForDate(date: string): Promise<PermanenceDay> {
  try {
    const doc = await databases.getDocument(APPWRITE_DATABASE_ID, PERMANENCE_COLLECTION_ID, date);
    return mapDoc(doc);
  } catch {
    return emptyDay(date);
  }
}

/**
 * Determine si un creneau (avec heures propres) est actif a l'instant "at",
 * en tenant compte d'un eventuel chevauchement de minuit.
 */
function slotActiveAt(
  debut: string | null,
  fin: string | null,
  nowMin: number
): boolean {
  if (!debut || !fin) return false;
  const d = toMinutes(debut);
  const f = toMinutes(fin);
  const crossesMidnight = f < d;
  return crossesMidnight ? nowMin >= d || nowMin <= f : nowMin >= d && nowMin <= f;
}

/**
 * Determine le responsable actif pour un creneau donne, a un instant precis.
 * Verifie d'abord si le creneau d'hier deborde sur maintenant (chevauchement
 * de minuit), sinon si le creneau d'aujourd'hui est en cours.
 * Si aucune heure n'est definie pour Matin/Soir, se rabat sur les horaires
 * par defaut de la configuration (Settings).
 */
export async function getActiveResponsible(
  slot: PermanenceSlot,
  at: Date = new Date()
): Promise<{ userId: string | null; date: string; note: string }> {
  const config = await getAppConfig().catch(() => DEFAULT_CONFIG);
  const todayKey = dateKey(at);
  const yesterdayKey = dateKey(yesterday(at));
  const [today, yesterdayPlan] = await Promise.all([
    getPermanenceForDate(todayKey),
    getPermanenceForDate(yesterdayKey),
  ]);
  const nowMin = at.getHours() * 60 + at.getMinutes();

  function resolveHours(day: PermanenceDay) {
    if (slot === 'matin') {
      return {
        debut: day.matinHeureDebut || config.shift_matin_debut,
        fin: day.matinHeureFin || config.shift_matin_fin,
        userId: day.matinUserId,
        note: day.matinNote,
      };
    }
    if (slot === 'soir') {
      return {
        debut: day.soirHeureDebut || config.shift_soir_debut,
        fin: day.soirHeureFin || config.shift_soir_fin,
        userId: day.soirUserId,
        note: day.soirNote,
      };
    }
    return {
      debut: day.trancheHeureDebut,
      fin: day.trancheHeureFin,
      userId: day.trancheUserId,
      note: day.trancheNote,
    };
  }

  // Le creneau d'hier deborde-t-il sur maintenant ?
  const yHours = resolveHours(yesterdayPlan);
  if (yHours.userId && slotActiveAt(yHours.debut, yHours.fin, nowMin)) {
    const d = yHours.debut ? toMinutes(yHours.debut) : 0;
    const f = yHours.fin ? toMinutes(yHours.fin) : 0;
    const crossesMidnight = f < d;
    if (crossesMidnight && nowMin <= f) {
      return { userId: yHours.userId, date: yesterdayKey, note: yHours.note };
    }
  }

  // Sinon, le creneau d'aujourd'hui
  const tHours = resolveHours(today);
  if (tHours.userId && slotActiveAt(tHours.debut, tHours.fin, nowMin)) {
    return { userId: tHours.userId, date: todayKey, note: tHours.note };
  }

  return { userId: null, date: todayKey, note: '' };
}

/** Les 3 responsables actifs en ce moment (pour la banniere d'accueil). */
export async function getTodayPermanenceSummary(at: Date = new Date()) {
  const [matin, soir, tranche] = await Promise.all([
    getActiveResponsible('matin', at),
    getActiveResponsible('soir', at),
    getActiveResponsible('tranche', at),
  ]);
  return { matin, soir, tranche };
}

async function callFunction(payload: Record<string, unknown>) {
  const execution = await functions.createExecution(
    UPDATE_EMPLOYEE_FUNCTION_ID,
    JSON.stringify(payload),
    false
  );
  const result = JSON.parse(execution.responseBody);
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

export interface AssignPermanenceInput {
  date: string;
  matinUserId?: string;
  matinHeureDebut?: string;
  matinHeureFin?: string;
  soirUserId?: string;
  soirHeureDebut?: string;
  soirHeureFin?: string;
  trancheUserId?: string;
  trancheHeureDebut?: string;
  trancheHeureFin?: string;
}

export async function assignPermanence(input: AssignPermanenceInput) {
  return callFunction({ action: 'assign_permanence', ...input });
}

export async function updateHandoverNote(date: string, slot: PermanenceSlot, note: string) {
  return callFunction({ action: 'update_handover_note', date, slot, note });
}

/** Planning d'un mois complet, pour l'ecran Admin (YYYY-MM). */
export async function getPermanenceForMonth(yearMonth: string): Promise<PermanenceDay[]> {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${yearMonth}-${String(d).padStart(2, '0')}`);
  }
  const results = await Promise.all(dates.map(getPermanenceForDate));
  return results;
}
