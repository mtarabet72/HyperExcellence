// ============================================================
// HyperExcellence - Taches par fonction (Phase 8)
// Taches recurrentes rattachees a un role (pas a un rayon/circuit),
// validees une fois par periode (Q/H/M/T/S/A) pour toute l'equipe.
// Filtre optionnel par secteur pour les roles a portee sectorielle.
// ============================================================
import { Query } from 'appwrite';
import { databases, functions } from './appwrite';
import { APPWRITE_DATABASE_ID, UserRole } from '../constants';

const FUNCTION_TASKS_COLLECTION_ID = 'functiontasks';
const FUNCTION_COMPLETIONS_COLLECTION_ID = 'functiontaskcompletions';
const UPDATE_EMPLOYEE_FUNCTION_ID = '6a592c6000074266e563';

export const FREQUENCIES = {
  QUOTIDIEN: 'QUOTIDIEN',
  HEBDO: 'HEBDO',
  MENSUEL: 'MENSUEL',
  TRIMESTRIEL: 'TRIMESTRIEL',
  SEMESTRIEL: 'SEMESTRIEL',
  ANNUEL: 'ANNUEL',
} as const;

export type Frequency = (typeof FREQUENCIES)[keyof typeof FREQUENCIES];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  QUOTIDIEN: 'Quotidien',
  HEBDO: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  SEMESTRIEL: 'Semestriel',
  ANNUEL: 'Annuel',
};

export interface FunctionTask {
  $id: string;
  role: UserRole;
  label: string;
  labelAr: string;
  frequency: Frequency;
  description: string;
  sector: string | null;
  isActive: boolean;
}

function mapTask(d: any): FunctionTask {
  return {
    $id: d.$id,
    role: d.role,
    label: d.label,
    labelAr: d.label_ar || d.label,
    frequency: d.frequency,
    description: d.description || '',
    sector: d.sector || null,
    isActive: d.is_active !== false,
  };
}

/** Numero de semaine ISO 8601 (1-53). */
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Calcule la cle de periode courante pour une frequence donnee.
 * Cette cle est ce qui determine si une tache a deja ete validee
 * "cette periode-ci" : une seule completion existe par (tache, periode).
 */
export function getPeriodKey(frequency: Frequency, at: Date = new Date()): string {
  const year = at.getFullYear();
  const month = at.getMonth() + 1; // 1-12

  switch (frequency) {
    case 'QUOTIDIEN': {
      const m = String(month).padStart(2, '0');
      const d = String(at.getDate()).padStart(2, '0');
      return `${year}-${m}-${d}`;
    }
    case 'HEBDO':
      return `${year}-W${String(isoWeek(at)).padStart(2, '0')}`;
    case 'MENSUEL':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'TRIMESTRIEL':
      return `${year}-T${Math.ceil(month / 3)}`;
    case 'SEMESTRIEL':
      return `${year}-S${month <= 6 ? 1 : 2}`;
    case 'ANNUEL':
      return `${year}`;
    default:
      return `${year}-${String(month).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Taches actives pour un role donne, filtrees par secteur si le profil
 * en a un : une tache sans secteur (null) s'applique a tout le monde
 * ayant ce role ; une tache avec un secteur ne s'applique qu'aux profils
 * de ce secteur precis.
 */
export async function listTasksForRole(
  role: UserRole,
  sector?: string | null
): Promise<FunctionTask[]> {
  const result = await databases.listDocuments(APPWRITE_DATABASE_ID, FUNCTION_TASKS_COLLECTION_ID, [
    Query.equal('role', role),
    Query.equal('is_active', true),
    Query.limit(200),
  ]);
  const all = (result.documents as any[]).map(mapTask);
  return all.filter((t) => !t.sector || t.sector === sector);
}

/** Toutes les taches de fonction, actives et desactivees (pour l'admin). */
export async function listAllFunctionTasks(): Promise<FunctionTask[]> {
  const result = await databases.listDocuments(APPWRITE_DATABASE_ID, FUNCTION_TASKS_COLLECTION_ID, [
    Query.limit(500),
  ]);
  return (result.documents as any[]).map(mapTask);
}

export interface CompletionInfo {
  completedBy: string;
  completedAt: string;
  note: string;
}

/**
 * Verifie, pour une liste de taches, si chacune a deja ete validee sur
 * SA periode courante. Retourne une map task_id -> info de completion.
 */
export async function getCompletionsForTasks(
  tasks: FunctionTask[]
): Promise<Record<string, CompletionInfo>> {
  const out: Record<string, CompletionInfo> = {};
  if (tasks.length === 0) return out;

  await Promise.all(
    tasks.map(async (task) => {
      const periodKey = getPeriodKey(task.frequency);
      const result = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        FUNCTION_COMPLETIONS_COLLECTION_ID,
        [
          Query.equal('task_id', task.$id),
          Query.equal('period_key', periodKey),
          Query.limit(1),
        ]
      );
      if (result.documents.length > 0) {
        const doc = result.documents[0] as any;
        out[task.$id] = {
          completedBy: doc.completed_by,
          completedAt: doc.completed_at,
          note: doc.note || '',
        };
      }
    })
  );
  return out;
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

export async function completeFunctionTask(taskId: string, note?: string) {
  return callFunction({ action: 'complete_function_task', taskId, note });
}

export interface CreateFunctionTaskInput {
  role: UserRole;
  label: string;
  labelAr?: string;
  frequency: Frequency;
  description?: string;
  sector?: string;
}

export async function createFunctionTask(input: CreateFunctionTaskInput) {
  return callFunction({ action: 'create_function_task', ...input });
}

export interface UpdateFunctionTaskInput {
  taskId: string;
  role?: UserRole;
  label?: string;
  labelAr?: string;
  frequency?: Frequency;
  description?: string;
  sector?: string;
}

export async function updateFunctionTask(input: UpdateFunctionTaskInput) {
  return callFunction({ action: 'update_function_task', ...input });
}

export async function toggleFunctionTask(taskId: string, isActive: boolean) {
  return callFunction({ action: 'toggle_function_task', taskId, isActive });
}
export interface FunctionTaskHeat {
  bucket: string; // 'FRAIS' | 'PGC' | 'SUPPORT' | 'GENERAL'
  label: string;
  total: number;
  validated: number;
  taux: number; // 0-100, ou -1 si aucune tache dans ce bucket
}

/**
 * Regroupe les taches de fonction actives par secteur (pour Chef Secteur/
 * Departement), avec une case "GENERAL" pour les roles sans secteur
 * (Chef Rayon, Securite, Caisse, Maitre Metier, RH, Admin).
 */
export async function getFunctionTaskHeatmapData(): Promise<FunctionTaskHeat[]> {
  const allTasks = await listAllFunctionTasks();
  const activeTasks = allTasks.filter((t) => t.isActive);
  const completions = await getCompletionsForTasks(activeTasks);

  const buckets: Record<string, { total: number; validated: number }> = {
    FRAIS: { total: 0, validated: 0 },
    PGC: { total: 0, validated: 0 },
    SUPPORT: { total: 0, validated: 0 },
    GENERAL: { total: 0, validated: 0 },
  };

  for (const task of activeTasks) {
    const key = task.sector || 'GENERAL';
    if (!buckets[key]) buckets[key] = { total: 0, validated: 0 };
    buckets[key].total++;
    if (completions[task.$id]) buckets[key].validated++;
  }

  const labels: Record<string, string> = {
    FRAIS: 'Secteur Frais',
    PGC: 'Secteur PGC',
    SUPPORT: 'Secteur Support',
    GENERAL: 'Toutes fonctions',
  };

  return Object.entries(buckets)
    .filter(([, v]) => v.total > 0)
    .map(([bucket, v]) => ({
      bucket,
      label: labels[bucket] || bucket,
      total: v.total,
      validated: v.validated,
      taux: v.total > 0 ? Math.round((v.validated / v.total) * 100) : -1,
    }));
}
