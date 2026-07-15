// ============================================================
// HyperExcellence - Heatmap magasin par département (Circuit 7)
// Vert >95%, Orange 80-95%, Rouge <80%
// ============================================================
import { Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS } from '../constants';

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
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

export interface DepartmentHeat {
  departmentId: string;
  total: number;
  fait: number;
  taux: number; // 0-100, ou -1 si aucune donnée aujourd'hui
}

export async function getHeatmapData(): Promise<DepartmentHeat[]> {
  const [executionsResult, zonesResult] = await Promise.all([
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_EXECUTIONS, [
      Query.greaterThanEqual('executed_at', startOfToday()),
      Query.limit(1000),
    ]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
  ]);

  const zoneToDept: Record<string, string> = {};
  for (const z of zonesResult.documents as any[]) {
    zoneToDept[z.$id] = z.department_id;
  }

  const executions = dedupeLatestPerTask(executionsResult.documents);

  const byDept: Record<string, { total: number; fait: number }> = {};
  for (const e of executions as any[]) {
    const deptId = zoneToDept[e.zone_id] || 'inconnu';
    if (!byDept[deptId]) byDept[deptId] = { total: 0, fait: 0 };
    byDept[deptId].total++;
    if (e.status === 'FAIT') byDept[deptId].fait++;
  }

  return Object.entries(byDept).map(([departmentId, v]) => ({
    departmentId,
    total: v.total,
    fait: v.fait,
    taux: v.total > 0 ? Math.round((v.fait / v.total) * 100) : -1,
  }));
}

export function heatColor(taux: number): string {
  if (taux < 0) return '#334155'; // slate-700, pas de donnée aujourd'hui
  if (taux >= 95) return '#10b981'; // vert
  if (taux >= 80) return '#f97316'; // orange
  return '#ef4444'; // rouge
}
