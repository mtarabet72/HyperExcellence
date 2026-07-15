// ============================================================
// HyperExcellence - Export PDF d'audit journalier (Circuit 7)
// Dédoublonne, regroupe par Pilier, inclut les photos preuves.
// Accepte une date cible pour consulter l'historique.
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Query } from 'appwrite';
import { databases } from './appwrite';
import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  TASK_STATUS_LABELS,
  GRAVITE_LABELS,
  PILIER_LABELS_BY_CIRCUIT_NUMBER,
} from '../constants';

function startOfDay(dateStr?: string): string {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(dateStr?: string): string {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function dedupeLatestPerTask(executions: any[]): any[] {
  const latest: Record<string, any> = {};
  for (const e of executions) {
    const key = `${e.task_id}|${e.zone_id}`;
    if (!latest[key] || new Date(e.executed_at) > new Date(latest[key].executed_at)) {
      latest[key] = e;
    }
  }
  return Object.values(latest);
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Génère le PDF d'audit pour une date donnée (par défaut : aujourd'hui).
 * dateStr au format 'yyyy-mm-dd'.
 */
export async function generateDailyAuditPDF(dateStr?: string) {
  const rangeStart = startOfDay(dateStr);
  const rangeEnd = endOfDay(dateStr);

  const [executionsResult, ncResult, tasksResult, checklistsResult, zonesResult, profilesResult] =
    await Promise.all([
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_EXECUTIONS, [
        Query.greaterThanEqual('executed_at', rangeStart),
        Query.lessThanEqual('executed_at', rangeEnd),
        Query.limit(1000),
      ]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.NON_CONFORMITES, [
        Query.greaterThanEqual('$createdAt', rangeStart),
        Query.lessThanEqual('$createdAt', rangeEnd),
        Query.limit(1000),
      ]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, [Query.limit(500)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.CHECKLIST_TEMPLATES, [Query.limit(50)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(500)]),
    ]);

  const taskLabels: Record<string, string> = {};
  const taskToChecklist: Record<string, string> = {};
  for (const t of tasksResult.documents as any[]) {
    taskLabels[t.$id] = `${t.task_number}. ${t.label}`;
    taskToChecklist[t.$id] = t.checklist_id;
  }
  const checklistPilier: Record<string, number> = {};
  for (const c of checklistsResult.documents as any[]) {
    checklistPilier[c.$i
