// ============================================================
// HyperExcellence - Taches par fonction (Phase 8)
// Taches recurrentes rattachees a un role (pas a un rayon/circuit),
// validees une fois par periode (Q/H/M/T/S/A) pour toute l'equipe.
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

/** Toutes les taches de fonction actives pour un role donne. */
export async function listTasksForRole(role: UserRole): Promise<FunctionTask[]> {
  const result = await databases.listDocuments(APPWRITE_DATABASE_ID, FUNCTION_TASKS_COLLECTION_ID, [
    Query.equal('role', role),
    Query.equal('is_active', true),
    Query.limit(200),
  ]);
  return (result.documents as any[]).map(mapTask);
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

  // Une requete par tache : le volume de taches de fonction reste faible
  // (quelques dizaines), donc c'est acceptable en clarte de code.
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
}

export async function updateFunctionTask(input: UpdateFunctionTaskInput) {
  return callFunction({ action: 'update_function_task', ...input });
}

export async function toggleFunctionTask(taskId: string, isActive: boolean) {
  return callFunction({ action: 'toggle_function_task', taskId, isActive });
}
