// ============================================================
// HyperExcellence - Lecture des tâches & enregistrement des exécutions
// ============================================================
import { ID, Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, TaskStatus, Gravite } from '../constants';

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

export async function submitTaskExecution(input: SubmitTaskExecutionInput) {
  return databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.TASK_EXECUTIONS,
    ID.unique(),
    {
      zone_id: input.zoneId,
      task_id: input.taskId,
      executed_by: input.executedBy,
      status: input.status,
      comment: input.comment || null,
      photo_before: input.photoBeforeUrl || null,
      photo_after: input.photoAfterUrl || null,
      executed_at: new Date().toISOString(),
    }
  );
}
