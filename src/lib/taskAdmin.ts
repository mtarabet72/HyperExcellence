// ============================================================
// HyperExcellence - Administration des taches (CRUD via Function)
// L'ecriture passe par la Function serveur : `task_templates` est
// verrouille en lecture seule cote client (Phase 4).
// ============================================================
import { Query } from 'appwrite';
import { databases, functions } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, Gravite } from '../constants';
import { TaskTemplate } from './tasks';

const UPDATE_EMPLOYEE_FUNCTION_ID = '6a592c6000074266e563';

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

/**
 * Liste TOUTES les taches d'un circuit, actives ET desactivees.
 * (getTasksForChecklist ne renvoie que les actives, pour le terrain.)
 */
export async function listAllTasksForChecklist(checklistId: string): Promise<TaskTemplate[]> {
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.TASK_TEMPLATES,
    [
      Query.equal('checklist_id', checklistId),
      Query.orderAsc('sort_order'),
      Query.limit(300),
    ]
  );
  return result.documents as unknown as TaskTemplate[];
}

export interface CreateTaskInput {
  checklistId: string;
  taskNumber: number;
  label: string;
  labelAr?: string;
  defaultGravite: Gravite;
  sortOrder?: number;
  requiresPhoto?: boolean;
  requiresTemperature?: boolean;
  executionTime?: string;
}

export async function createTask(input: CreateTaskInput) {
  return callFunction({ action: 'create_task', ...input });
}

export interface UpdateTaskInput {
  taskId: string;
  label?: string;
  labelAr?: string;
  defaultGravite?: Gravite;
  taskNumber?: number;
  sortOrder?: number;
  requiresPhoto?: boolean;
  requiresTemperature?: boolean;
  /** Chaine vide = effacer l'heure cible. */
  executionTime?: string;
}

export async function updateTask(input: UpdateTaskInput) {
  return callFunction({ action: 'update_task', ...input });
}

export async function toggleTask(taskId: string, isActive: boolean) {
  return callFunction({ action: 'toggle_task', taskId, isActive });
}
