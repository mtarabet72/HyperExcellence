// ============================================================
// HyperExcellence - Calcul des KPI (Circuit 10)
// ============================================================
import { Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, Gravite } from '../constants';

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface DashboardStats {
  totalExecutionsToday: number;
  faitToday: number;
  nonFaitToday: number;
  ecartToday: number;
  tauxConformite: number; // 0-100
  ncOuvertesParGravite: Record<Gravite, number>;
  topZonesRisque: { zoneId: string; count: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // ---------- Exécutions du jour ----------
  const executionsResult = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.TASK_EXECUTIONS,
    [Query.greaterThanEqual('executed_at', startOfToday()), Query.limit(1000)]
  );
  const executions = executionsResult.documents;

  const totalExecutionsToday = executions.length;
  const faitToday = executions.filter((e: any) => e.status === 'FAIT').length;
  const nonFaitToday = executions.filter((e: any) => e.status === 'NON_FAIT').length;
  const ecartToday = executions.filter((e: any) => e.status === 'ECART').length;
  const tauxConformite =
    totalExecutionsToday > 0 ? Math.round((faitToday / totalExecutionsToday) * 100) : 0;

  // ---------- NC ouvertes, par gravité ----------
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

  // ---------- Top zones à risque (NC sur 7 jours) ----------
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

  return {
    totalExecutionsToday,
    faitToday,
    nonFaitToday,
    ecartToday,
    tauxConformite,
    ncOuvertesParGravite,
    topZonesRisque,
  };
}
