// ============================================================
// HyperExcellence - Calcul des KPI (Circuit 10)
// Dédoublonne : ne garde que la dernière exécution par tâche/zone/shift.
// Accepte une date cible (par défaut aujourd'hui) et un shift optionnel.
// ============================================================
import { Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, Gravite, Shift } from '../constants';

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

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Une tache refaite au shift du soir ne doit pas ecraser celle du matin :
 * le shift fait donc partie de la cle de dedoublonnage.
 * Les executions anterieures aux shifts (shift absent) sont regroupees
 * sous la cle 'LEGACY'.
 */
function dedupeLatestPerTask(executions: any[]): any[] {
  const latest: Record<string, any> = {};
  for (const e of executions) {
    const key = `${e.task_id}|${e.zone_id}|${e.shift || 'LEGACY'}`;
    if (!latest[key] || new Date(e.executed_at) > new Date(latest[key].executed_at)) {
      latest[key] = e;
    }
  }
  return Object.values(latest);
}

export interface CircuitStat {
  checklistId: string;
  total: number;
  fait: number;
  tauxConformite: number;
}

export interface VendeurScore {
  profileId: string;
  total: number;
  fait: number;
  score: number;
}

export interface ShiftStat {
  total: number;
  fait: number;
  tauxConformite: number;
}

export interface DashboardStats {
  totalExecutionsToday: number;
  faitToday: number;
  nonFaitToday: number;
  ecartToday: number;
  tauxConformite: number;
  retardsCount: number;
  parShift: Record<Shift, ShiftStat>;
  ncOuvertesParGravite: Record<Gravite, number>;
  topZonesRisque: { zoneId: string; count: number }[];
  parCircuit: CircuitStat[];
  mttrHeures: number | null;
  scoresSBAM: VendeurScore[];
  tauxRuptureAPLS: number | null;
}

/**
 * Calcule les KPI pour une date donnée (par défaut : aujourd'hui).
 * dateStr au format 'yyyy-mm-dd'.
 * shift : 'MATIN' | 'SOIR' pour restreindre a une tranche, null = journee complete.
 */
export async function getDashboardStats(
  dateStr?: string,
  shift?: Shift | null
): Promise<DashboardStats> {
  const rangeStart = startOfDay(dateStr);
  const rangeEnd = endOfDay(dateStr);

  const filters = [
    Query.greaterThanEqual('executed_at', rangeStart),
    Query.lessThanEqual('executed_at', rangeEnd),
    Query.limit(1000),
  ];
  if (shift) filters.push(Query.equal('shift', shift));

  const executionsResult = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.TASK_EXECUTIONS,
    filters
  );
  const executions = dedupeLatestPerTask(executionsResult.documents);

  const totalExecutionsToday = executions.length;
  const faitToday = executions.filter((e: any) => e.status === 'FAIT').length;
  const nonFaitToday = executions.filter((e: any) => e.status === 'NON_FAIT').length;
  const ecartToday = executions.filter((e: any) => e.status === 'ECART').length;
  const retardsCount = executions.filter((e: any) => e.en_retard === true).length;
  const tauxConformite =
    totalExecutionsToday > 0 ? Math.round((faitToday / totalExecutionsToday) * 100) : 0;

  // ---------- Repartition par shift ----------
  const parShift: Record<Shift, ShiftStat> = {
    MATIN: { total: 0, fait: 0, tauxConformite: 0 },
    SOIR: { total: 0, fait: 0, tauxConformite: 0 },
  };
  for (const e of executions as any[]) {
    const s = e.shift as Shift | undefined;
    if (s !== 'MATIN' && s !== 'SOIR') continue; // executions anterieures aux shifts
    parShift[s].total++;
    if (e.status === 'FAIT') parShift[s].fait++;
  }
  for (const s of ['MATIN', 'SOIR'] as Shift[]) {
    parShift[s].tauxConformite =
      parShift[s].total > 0 ? Math.round((parShift[s].fait / parShift[s].total) * 100) : 0;
  }

  const tasksResult = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.TASK_TEMPLATES,
    [Query.limit(500)]
  );
  const taskToChecklist: Record<string, string> = {};
  const taskNumber: Record<string, number> = {};
  for (const t of tasksResult.documents as any[]) {
    taskToChecklist[t.$id] = t.checklist_id;
    taskNumber[t.$id] = t.task_number;
  }

  const byChecklist: Record<string, { total: number; fait: number }> = {};
  for (const e of executions as any[]) {
    const checklistId = taskToChecklist[e.task_id] || 'inconnu';
    if (!byChecklist[checklistId]) byChecklist[checklistId] = { total: 0, fait: 0 };
    byChecklist[checklistId].total++;
    if (e.status === 'FAIT') byChecklist[checklistId].fait++;
  }
  const parCircuit: CircuitStat[] = Object.entries(byChecklist).map(([checklistId, v]) => ({
    checklistId,
    total: v.total,
    fait: v.fait,
    tauxConformite: v.total > 0 ? Math.round((v.fait / v.total) * 100) : 0,
  }));

  const byVendeur: Record<string, { total: number; fait: number }> = {};
  for (const e of executions as any[]) {
    const checklistId = taskToChecklist[e.task_id] || '';
    if (!checklistId.startsWith('circuit-2-')) continue;
    const vendeurId = e.executed_by;
    if (!byVendeur[vendeurId]) byVendeur[vendeurId] = { total: 0, fait: 0 };
    byVendeur[vendeurId].total++;
    if (e.status === 'FAIT') byVendeur[vendeurId].fait++;
  }
  const scoresSBAM: VendeurScore[] = Object.entries(byVendeur)
    .map(([profileId, v]) => ({
      profileId,
      total: v.total,
      fait: v.fait,
      score: v.total > 0 ? Math.round((v.fait / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score);

  const ruptureExecutions = executions.filter((e: any) => {
    const n = taskNumber[e.task_id];
    return n !== undefined && n >= 198 && n <= 214;
  });
  const ruptureCount = ruptureExecutions.filter((e: any) => e.status === 'NON_FAIT').length;
  const tauxRuptureAPLS =
    ruptureExecutions.length > 0 ? Math.round((ruptureCount / 17) * 1000) / 10 : null;

  const ncOuvertesResult = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.NON_CONFORMITES,
    [Query.notEqual('status', 'CLOTUREE'), Query.limit(1000)]
  );
  const ncOuvertes = ncOuvertesResult.documents;

  const ncOuvertesParGravite: Record<Gravite, number> = {
    MINEURE: 0,
    MAJEURE: 0,
    CRITIQUE: 0,
  };
  for (const nc of ncOuvertes as any[]) {
    ncOuvertesParGravite[nc.gravite as Gravite]++;
  }

  const nc7joursResult = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.NON_CONFORMITES,
    [Query.greaterThanEqual('$createdAt', daysAgo(7)), Query.limit(1000)]
  );
  const zoneCounts: Record<string, number> = {};
  for (const nc of nc7joursResult.documents as any[]) {
    zoneCounts[nc.zone_id] = (zoneCounts[nc.zone_id] || 0) + 1;
  }
  const topZonesRisque = Object.entries(zoneCounts)
    .map(([zoneId, count]) => ({ zoneId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const ncCloturees30jResult = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.NON_CONFORMITES,
    [
      Query.equal('status', 'CLOTUREE'),
      Query.greaterThanEqual('$createdAt', daysAgo(30)),
      Query.limit(1000),
    ]
  );
  const closedNC = (ncCloturees30jResult.documents as any[]).filter((n) => n.closed_at);
  let mttrHeures: number | null = null;
  if (closedNC.length > 0) {
    const totalHeures = closedNC.reduce((sum, n) => {
      const opened = new Date(n.$createdAt).getTime();
      const closed = new Date(n.closed_at).getTime();
      return sum + (closed - opened) / (1000 * 60 * 60);
    }, 0);
    mttrHeures = Math.round((totalHeures / closedNC.length) * 10) / 10;
  }

  return {
    totalExecutionsToday,
    faitToday,
    nonFaitToday,
    ecartToday,
    tauxConformite,
    retardsCount,
    parShift,
    ncOuvertesParGravite,
    topZonesRisque,
    parCircuit,
    mttrHeures,
    scoresSBAM,
    tauxRuptureAPLS,
  };
}
