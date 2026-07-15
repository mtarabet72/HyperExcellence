// ============================================================
// HyperExcellence - Lecture des tâches & enregistrement des exécutions
// Bascule automatique online/offline (Circuit 8)
// ============================================================
import { ID, Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, TaskStatus, Gravite } from '../constants';
import { offlineDb, generateOfflineId } from './offlineDb';

export interface TaskTemplate {
  $id: string;
  checklist_id: string;
  task_number: number;
  label: string;
  requires_photo: boolean;
  requires_temperature: boolean;
  default_gravite: Gravite;
  sort_order: number;
  is_active: boolean;
}

export async function getTasksForChecklist(checklistId: string): Promise<TaskTemplate[]> {
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.TASK_TEMPLATES,
    [
      Query.equal('checklist_id', checklistId),
      Query.equal('is_active', true),
      Query.orderAsc('sort_order'),
      Query.limit(300),
    ]
  );
  return result.documents as unknown as TaskTemplate[];
}

export interface SubmitTaskExecutionInput {
  zoneId: string;
  taskId: string;
  executedBy: string;
  status: TaskStatus;
  comment?: string;
  photoBeforeUrl?: string;
  photoAfterUrl?: string;
}

export interface SubmitResult {
  $id: string;
  offlineId?: string; // présent si enregistré hors-ligne
  wasOffline: boolean;
}

/**
 * Enregistre l'exécution d'une tâche.
 * - En ligne : écrit directement dans Appwrite.
 * - Hors ligne : écrit dans la file d'attente locale (Dexie), sync plus tard.
 */
export async function submitTaskExecution(
  input: SubmitTaskExecutionInput
): Promise<SubmitResult> {
  const executedAt = new Date().toISOString();

  if (navigator.onLine) {
    try {
      const doc = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.TASK_EXECUTIONS,
        ID.unique(),
        {
          zone_id: input.zoneId,
          task_id: input.taskId,
          executed_by: input.executedBy,
          status: input.status,
          comment: input.comment || null,
          photo_after: input.photoAfterUrl || null,
          executed_at: executedAt,
        }
      );
      return { $id: doc.$id, wasOffline: false };
    } catch {
      // La requête a échoué malgré navigator.onLine=true (ex: coupure brutale)
      // -> on bascule en mode file d'attente locale.
    }
  }

  const offlineId = generateOfflineId();
  await offlineDb.pendingExecutions.add({
    offlineId,
    zoneId: input.zoneId,
    taskId: input.taskId,
    executedBy: input.executedBy,
    status: input.status,
    comment: input.comment || null,
    photoAfterUrl: input.photoAfterUrl || null,
    executedAt,
    createdLocallyAt: Date.now(),
  });
  return { $id: offlineId, offlineId, wasOffline: true };
}
