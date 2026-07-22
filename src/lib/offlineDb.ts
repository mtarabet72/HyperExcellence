// ============================================================
// HyperExcellence - Base locale Dexie (Circuit 8, offline)
// ============================================================
import Dexie, { Table } from 'dexie';

export interface PendingExecution {
  offlineId: string;
  zoneId: string;
  taskId: string;
  executedBy: string;
  status: string;
  comment?: string | null;
  photoAfterUrl?: string | null; // URL Appwrite si uploadée en ligne
  photoBlob?: Blob | null; // photo brute si prise hors-ligne, à uploader au sync
  executedAt: string;
  shift?: string | null; // shift actif au moment de l'exécution (figé)
  enRetard?: boolean | null; // heure cible de la tâche dépassée
  createdLocallyAt: number;
}

export interface PendingNC {
  offlineId: string;
  zoneId: string;
  taskExecutionOfflineId: string;
  gravite: string;
  actionImmediate: string;
  declaredBy: string;
  createdLocallyAt: number;
}

export interface CachedTaskList {
  checklistId: string;
  tasksJson: string;
  cachedAt: number;
}

class OfflineDatabase extends Dexie {
  pendingExecutions!: Table<PendingExecution, string>;
  pendingNCs!: Table<PendingNC, string>;
  cachedTasks!: Table<CachedTaskList, string>;

  constructor() {
    super('hyperexcellence-offline');
    this.version(3).stores({
      pendingExecutions: 'offlineId, createdLocallyAt',
      pendingNCs: 'offlineId, createdLocallyAt',
      cachedTasks: 'checklistId, cachedAt',
    });
  }
}

export const offlineDb = new OfflineDatabase();

export function generateOfflineId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
