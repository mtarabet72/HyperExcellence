// ============================================================
// HyperExcellence - Synchronisation offline -> Appwrite (Circuit 8)
// ============================================================
import { ID, Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS } from '../constants';
import { offlineDb, PendingExecution, PendingNC } from './offlineDb';

/**
 * Synchronise toutes les exécutions et NC en attente vers Appwrite.
 * Résolution de conflit : horodatage serveur fait foi (executed_at envoyé
 * tel quel, mais $createdAt sera celui du serveur au moment du sync).
 * offlineId évite les doublons si la fonction est appelée deux fois.
 */
export async function syncPendingData(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  const pendingExecutions = await offlineDb.pendingExecutions
    .orderBy('createdLocallyAt')
    .toArray();

  // Map offlineId d'exécution -> $id réel Appwrite, pour lier les NC ensuite
  const executionIdMap: Record<string, string> = {};

  for (const exec of pendingExecutions) {
    try {
      // Vérifie si déjà synchronisée (déduplication via offline_id)
      const existing = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.TASK_EXECUTIONS,
        [Query.equal('offline_id', exec.offlineId)]
      );

      let realId: string;
      if (existing.total > 0) {
        realId = existing.documents[0].$id;
      } else {
        const created = await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.TASK_EXECUTIONS,
          ID.unique(),
          {
            zone_id: exec.zoneId,
            task_id: exec.taskId,
            executed_by: exec.executedBy,
            status: exec.status,
            comment: exec.comment || null,
            photo_after: exec.photoAfterUrl || null,
            executed_at: exec.executedAt,
            offline_id: exec.offlineId,
          }
        );
        realId = created.$id;
      }

      executionIdMap[exec.offlineId] = realId;
      await offlineDb.pendingExecutions.delete(exec.offlineId);
      synced++;
    } catch (e) {
      console.error('Échec sync exécution', exec.offlineId, e);
      failed++;
    }
  }

  const pendingNCs = await offlineDb.pendingNCs.orderBy('createdLocallyAt').toArray();

  for (const nc of pendingNCs) {
    try {
      const taskExecutionId = executionIdMap[nc.taskExecutionOfflineId] || null;

      await databases.createDocument(APPWRITE_DATABASE_ID, COLLECTIONS.NON_CONFORMITES, ID.unique(), {
        zone_id: nc.zoneId,
        task_execution_id: taskExecutionId,
        gravite: nc.gravite,
        cause: null,
        action_immediate: nc.actionImmediate,
        declared_by: nc.declaredBy,
        status: 'OUVERTE',
        closed_at: null,
      });

      await offlineDb.pendingNCs.delete(nc.offlineId);
      synced++;
    } catch (e) {
      console.error('Échec sync NC', nc.offlineId, e);
      failed++;
    }
  }

  return { synced, failed };
}

export async function countPending(): Promise<number> {
  const [execCount, ncCount] = await Promise.all([
    offlineDb.pendingExecutions.count(),
    offlineDb.pendingNCs.count(),
  ]);
  return execCount + ncCount;
}
