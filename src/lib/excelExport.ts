// ============================================================
// HyperExcellence - Export Excel historique filtrable (Circuit 7)
// ============================================================
import * as XLSX from 'xlsx';
import { Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, TASK_STATUS_LABELS, GRAVITE_LABELS, Gravite } from '../constants';

export interface ExcelExportFilters {
  dateDebut: string; // ISO date (yyyy-mm-dd)
  dateFin: string; // ISO date (yyyy-mm-dd)
  departmentId?: string; // filtre optionnel par département (via zone)
  gravite?: Gravite; // filtre optionnel NC uniquement
}

export async function generateExcelExport(filters: ExcelExportFilters) {
  const startISO = new Date(`${filters.dateDebut}T00:00:00`).toISOString();
  const endISO = new Date(`${filters.dateFin}T23:59:59`).toISOString();

  const [executionsResult, ncResult, tasksResult, zonesResult, profilesResult, departmentsResult] =
    await Promise.all([
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_EXECUTIONS, [
        Query.greaterThanEqual('executed_at', startISO),
        Query.lessThanEqual('executed_at', endISO),
        Query.limit(2000),
      ]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.NON_CONFORMITES, [
        Query.greaterThanEqual('$createdAt', startISO),
        Query.lessThanEqual('$createdAt', endISO),
        Query.limit(2000),
      ]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, [Query.limit(500)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(500)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.DEPARTMENTS, [Query.limit(50)]),
    ]);

  const taskLabels: Record<string, string> = {};
  for (const t of tasksResult.documents as any[]) {
    taskLabels[t.$id] = `${t.task_number}. ${t.label}`;
  }
  const zoneToDept: Record<string, string> = {};
  const zoneNames: Record<string, string> = {};
  for (const z of zonesResult.documents as any[]) {
    zoneToDept[z.$id] = z.department_id;
    zoneNames[z.$id] = z.name;
  }
  const profileNames: Record<string, string> = {};
  for (const p of profilesResult.documents as any[]) {
    profileNames[p.$id] = p.full_name;
  }
  const departmentNames: Record<string, string> = {};
  for (const d of departmentsResult.documents as any[]) {
    departmentNames[d.$id] = d.name;
  }

  // ---------- Filtrage exécutions ----------
  let executions = executionsResult.documents as any[];
  if (filters.departmentId) {
    executions = executions.filter((e) => zoneToDept[e.zone_id] === filters.departmentId);
  }

  const executionRows = executions.map((e) => ({
    Date: new Date(e.executed_at).toLocaleDateString('fr-FR'),
    Heure: new Date(e.executed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    Tâche: taskLabels[e.task_id] || e.task_id,
    Zone: zoneNames[e.zone_id] || e.zone_id,
    Département: departmentNames[zoneToDept[e.zone_id]] || '—',
    'Exécuté par': profileNames[e.executed_by] || e.executed_by,
    Statut: TASK_STATUS_LABELS[e.status as keyof typeof TASK_STATUS_LABELS] || e.status,
    Commentaire: e.comment || '',
  }));

  // ---------- Filtrage NC ----------
  let nc = ncResult.documents as any[];
  if (filters.departmentId) {
    nc = nc.filter((n) => zoneToDept[n.zone_id] === filters.departmentId);
  }
  if (filters.gravite) {
    nc = nc.filter((n) => n.gravite === filters.gravite);
  }

  const ncRows = nc.map((n) => ({
    Date: new Date(n.$createdAt).toLocaleDateString('fr-FR'),
    Zone: zoneNames[n.zone_id] || n.zone_id,
    Département: departmentNames[zoneToDept[n.zone_id]] || '—',
    Gravité: GRAVITE_LABELS[n.gravite as Gravite] || n.gravite,
    'Action immédiate': n.action_immediate,
    'Cause racine': n.cause || '',
    'Déclarée par': profileNames[n.declared_by] || n.declared_by,
    Statut: n.status,
    'Clôturée le': n.closed_at ? new Date(n.closed_at).toLocaleDateString('fr-FR') : '',
  }));

  // ---------- Construction du classeur ----------
  const workbook = XLSX.utils.book_new();

  const executionsSheet = XLSX.utils.json_to_sheet(executionRows);
  XLSX.utils.book_append_sheet(workbook, executionsSheet, 'Exécutions');

  const ncSheet = XLSX.utils.json_to_sheet(ncRows);
  XLSX.utils.book_append_sheet(workbook, ncSheet, 'Non Conformités');

  const filename = `historique-hyperexcellence-${filters.dateDebut}-au-${filters.dateFin}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return { executionsCount: executionRows.length, ncCount: ncRows.length };
}
