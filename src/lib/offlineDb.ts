// ============================================================
// HyperExcellence - Base locale Dexie (Circuit 8, offline)
// ============================================================
import Dexie, { Table } from 'dexie';

export interface PendingExecution {
  offlineId: string; // clé unique générée localement, évite les doublons au sync
  zoneId: string;
  taskId: string;
  executedBy: string;
  status: string;
  comment?: string | null;
  photoAfterUrl?: string | null;
  executedAt: string;
  createdLocallyAt: number; // timestamp local, pour trier la file d'attente
}

export interface PendingNC {
  offlineId: string;
  zoneId: string;
  taskExecutionOfflineId: string; // référence l'exécution en attente correspondante
  gravite: string;
  actionImmediate: string;
  declaredBy: string;
  createdLocallyAt: number;
}

class OfflineDatabase extends Dexie {
  pendingExecutions!: Table<PendingExecution, string>;
  pendingNCs!: Table<PendingNC, string>;

  constructor() {
    super('hyperexcellence-offline');
    this.version(1).stores({
      pendingExecutions: 'offlineId, createdLocallyAt',
      pendingNCs: 'offlineId, createdLocallyAt',
    });
  }
}

export const offlineDb = new OfflineDatabase();

/**
 * Génère un identifiant local unique (utilisé comme offline_id côté Appwrite
 * pour la déduplication lors de la synchronisation).
 */
export function generateOfflineId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
