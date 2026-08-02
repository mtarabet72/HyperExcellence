// ============================================================
// HyperExcellence - Permanence Magasin (Manager on Duty)
// Determine qui est de permanence a un instant donne, avec gestion
// du chevauchement de minuit pour le creneau "Tranche" (horaire libre).
// ============================================================
import { databases, functions } from './appwrite';
import { APPWRITE_DATABASE_ID } from '../constants';

const PERMANENCE_COLLECTION_ID = 'permanenceplanning';
const UPDATE_EMPLOYEE_FUNCTION_ID = '6a592c6000074266e563';

export type PermanenceSlot = 'matin' | 'soir' | 'tranche';

export interface PermanenceDay {
  date: string; // YYYY-MM-DD
  matinUserId: string | null;
  matinNote: string;
  soirUserId: string | null;
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
    matinNote: d.matin_note || '',
    soirUserId: d.soir_user_id || null,
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
    matinNote: '',
    soirUserId: null,
    soirNote: '',
    trancheUserId: null,
    trancheHeureDebut: null,
    trancheHeureFin: null,
    trancheNote: '',
  };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
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
 * Determine le responsable actif pour un creneau donne, a un instant precis.
 * Gere le chevauchement de minuit pour "tranche" : si le creneau d'hier
 * finit apres minuit et que l'heure actuelle est encore dans cette plage,
 * c'est le responsable d'hier qui reste actif.
 */
export async function getActiveResponsible(
  slot: PermanenceSlot,
  at: Date = new Date()
): Promise<{ userId: string | null; date: string; note: string }> {
  const todayKey = dateKey(at);
  const today = await getPermanenceForDate(todayKey);

  if (slot !== 'tranche') {
    const userId = slot === 'matin' ? today.matinUserId : today.soirUserId;
    const note = slot === 'matin' ? today.matinNote : today.soirNote;
    return { userId, date: todayKey, note };
  }

  // Creneau "tranche" : verifie d'abord si le creneau d'hier deborde sur maintenant
  const yesterdayKey = dateKey(yesterday(at));
  const yesterdayPlan = await getPermanenceForDate(yesterdayKey);
  const nowMin = at.getHours() * 60 + at.getMinutes();

  if (
    yesterdayPlan.trancheUserId &&
    yesterdayPlan.trancheHeureDebut &&
    yesterdayPlan.trancheHeureFin
  ) {
    const debut = toMinutes(yesterdayPlan.trancheHeureDebut);
    const fin = toMinutes(yesterdayPlan.trancheHeureFin);
    const crossesMidnight = fin < debut;
    if (crossesMidnight && nowMin <= fin) {
      return {
        userId: yesterdayPlan.trancheUserId,
        date: yesterdayKey,
        note: yesterdayPlan.trancheNote,
      };
    }
  }

  // Sinon, le creneau tranche d'aujourd'hui s'applique s'il est en cours
  if (today.trancheUserId && today.trancheHeureDebut && today.trancheHeureFin) {
    const debut = toMinutes(today.trancheHeureDebut);
    const fin = toMinutes(today.trancheHeureFin);
    const crossesMidnight = fin < debut;
    const isActive = crossesMidnight ? nowMin >= debut : nowMin >= debut && nowMin <= fin;
    if (isActive) {
      return { userId: today.trancheUserId, date: todayKey, note: today.trancheNote };
    }
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
  soirUserId?: string;
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
