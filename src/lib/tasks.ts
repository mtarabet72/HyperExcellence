// ============================================================
// HyperExcellence - Lecture des taches & enregistrement des executions
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
  label_ar?: string | null;
  requires_photo: boolean;
  requires_temperature: boolean;
  default_gravite: Gravite;
  sort_order: number;
  is_active: boolean;
}

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

      await offlineDb.cachedTasks.put({
        checklistId,
        tasksJson: JSON.stringify(tasks),
        cachedAt: Date.now(),
      });

      return tasks;
    } catch {
      // fallback cache ci-dessous
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
  photoAfterUrl?: string;
  photoBlob?: Blob;
  /** Shift actif au moment de l'execution (fige, jamais recalcule ensuite). */
  shift?: string;
  /** Vrai si l'heure cible de la tache etait depassee. */
  enRetard?: boolean;
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

  if (navigator.onLine && !input.photoBlob) {
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
          shift: input.shift || null,
          en_retard: input.enRetard ?? false,
        }
      );
      return { $id: doc.$id, wasOffline: false };
    } catch {
      // bascule file d'attente locale
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
    photoBlob: input.photoBlob || null,
    executedAt,
    shift: input.shift || null,
    enRetard: input.enRetard ?? false,
    createdLocallyAt: Date.now(),
  });
  return { $id: offlineId, offlineId, wasOffline: true };
}
function startOfDayISO(dateStr?: string): string {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayISO(dateStr?: string): string {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export interface ExecutedTaskInfo {
  status: TaskStatus;
  enRetard: boolean;
  shift: string | null;
}

/**
 * Retourne les taches deja executees sur une zone, indexees par task_id.
 * - `shift` renseigne : uniquement les executions de ce shift.
 * - `shift` null      : toutes les executions de la journee (vue globale).
 * En cas de doublon, la plus recente l'emporte.
 */
export async function getExecutionsForShift(
  zoneId: string,
  shift: string | null,
  dateStr?: string
): Promise<Record<string, ExecutedTaskInfo>> {
  try {
    const filters = [
      Query.equal('zone_id', zoneId),
      Query.greaterThanEqual('executed_at', startOfDayISO(dateStr)),
      Query.lessThanEqual('executed_at', endOfDayISO(dateStr)),
      Query.limit(500),
    ];
    if (shift) filters.push(Query.equal('shift', shift));

    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.TASK_EXECUTIONS,
      filters
    );

    const byTask: Record<string, ExecutedTaskInfo & { at: string }> = {};
    for (const doc of result.documents as any[]) {
      const prev = byTask[doc.task_id];
      if (!prev || new Date(doc.executed_at) > new Date(prev.at)) {
        byTask[doc.task_id] = {
          status: doc.status,
          enRetard: !!doc.en_retard,
          shift: doc.shift || null,
          at: doc.executed_at,
        };
      }
    }

    const out: Record<string, ExecutedTaskInfo> = {};
    for (const [taskId, info] of Object.entries(byTask)) {
      out[taskId] = { status: info.status, enRetard: info.enRetard, shift: info.shift };
    }
    return out;
  } catch {
    return {}; // hors-ligne ou erreur : on repart d'un etat vide, sans bloquer la checklist
  }
}
