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
  photoAfterUrl?: string | null;
  executedAt: string;
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
  checklistId: string; // clé
  tasksJson: string; // liste des TaskTemplate sérialisée
  cachedAt: number;
}

class OfflineDatabase extends Dexie {
  pendingExecutions!: Table<PendingExecution, string>;
  pendingNCs!: Table<PendingNC, string>;
  cachedTasks!: Table<CachedTaskList, string>;

  constructor() {
    super('hyperexcellence-offline');
    this.version(2).stores({
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
