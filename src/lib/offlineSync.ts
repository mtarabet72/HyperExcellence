// ============================================================
// HyperExcellence - Synchronisation offline -> Appwrite (Circuit 8)
// Upload différé des photos prises hors-ligne.
// Les NC hors-ligne passent desormais par la Function serveur
// (create_nc), pour beneficier des permissions par document
// (label admin/supervisor + createur), comme les NC en ligne.
// ============================================================
import { ID, Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS } from '../constants';
import { offlineDb } from './offlineDb';
import { uploadTaskPhoto } from './storage';
import { createNonConformite } from './nonConformites';

export async function syncPendingData(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  const pendingExecutions = await offlineDb.pendingExecutions
    .orderBy('createdLocallyAt')
    .toArray();

  const executionIdMap: Record<string, string> = {};

  for (const exec of pendingExecutions) {
    try {
      const existing = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.TASK_EXECUTIONS,
        [Query.equal('offline_id', exec.offlineId)]
      );

      let realId: string;
      if (existing.total > 0) {
        realId = existing.documents[0].$id;
      } else {
        // Upload de la photo prise hors-ligne, maintenant que le réseau est là
        let photoUrl = exec.photoAfterUrl || null;
        if (exec.photoBlob && !photoUrl) {
          const file = new File([exec.photoBlob], `${exec.offlineId}.jpg`, {
            type: exec.photoBlob.type || 'image/jpeg',
          });
          photoUrl = await uploadTaskPhoto(file);
        }

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
            photo_after: photoUrl,
            executed_at: exec.executedAt,
            offline_id: exec.offlineId,
            shift: exec.shift || null,
            en_retard: exec.enRetard ?? false,
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
      const taskExecutionId = executionIdMap[nc.taskExecutionOfflineId] || undefined;

      // Passe par la Function serveur (action create_nc) : memes permissions
      // par document (createur + label admin/supervisor) qu'une NC en ligne.
      await createNonConformite({
        zoneId: nc.zoneId,
        taskExecutionId,
        gravite: nc.gravite as any,
        actionImmediate: nc.actionImmediate,
        declaredBy: nc.declaredBy,
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
