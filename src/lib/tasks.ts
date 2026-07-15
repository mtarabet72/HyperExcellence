// ============================================================
// HyperExcellence - Lecture des tâches & enregistrement des exécutions
// Bascule automatique online/offline (Circuit 8), avec cache local
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

/**
 * Récupère les tâches d'une checklist.
 * - En ligne : lit Appwrite, puis met à jour le cache local pour un usage
 *   hors-ligne futur (préchargement, Circuit 8 point 1).
 * - Hors ligne : lit directement le cache local.
 */
export async function getTasksForChecklist(checklistId: string): Promise<TaskTemplate[]> {
  if (navigator.onLine) {
    try {
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
      const tasks = result.documents as unknown as TaskTemplate[];

      // Mise à jour du cache local pour usage hors-ligne futur
      await offlineDb.cachedTasks.put({
        checklistId,
        tasksJson: JSON.stringify(tasks),
        cachedAt: Date.now(),
      });

      return tasks;
    } catch {
      // Requête échouée malgré navigator.onLine=true -> on tente le cache
    }
  }

  const cached = await offlineDb.cachedTasks.get(checklistId);
  if (cached) {
    return JSON.parse(cached.tasksJson) as TaskTemplate[];
  }
  return [];
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
  offlineId?: string;
  wasOffline: boolean;
}

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
      // Bascule en mode file d'attente locale
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
