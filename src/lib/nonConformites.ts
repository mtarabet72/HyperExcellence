// ============================================================
// HyperExcellence - Circuit Non Conformité (Circuit 6)
// ============================================================
import { ID, Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, Gravite, NCStatus } from '../constants';

export interface NonConformite {
  $id: string;
  $createdAt: string;
  zone_id: string;
  task_execution_id: string | null;
  gravite: Gravite;
  cause: string | null;
  action_immediate: string;
  declared_by: string;
  status: NCStatus;
  closed_at: string | null;
}

export interface CreateNCInput {
  zoneId: string;
  taskExecutionId?: string;
  gravite: Gravite;
  actionImmediate: string;
  declaredBy: string;
}

/**
 * Crée une Non Conformité (déclenchée automatiquement quand une tâche
 * est marquée NON_FAIT ou ECART). L'action immédiate est obligatoire,
 * conforme au Circuit 6 de la spécification.
 */
export async function createNonConformite(input: CreateNCInput) {
  return databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.NON_CONFORMITES,
    ID.unique(),
    {
      zone_id: input.zoneId,
      task_execution_id: input.taskExecutionId || null,
      gravite: input.gravite,
      cause: null,
      action_immediate: input.actionImmediate,
      declared_by: input.declaredBy,
      status: 'OUVERTE',
      closed_at: null,
    }
  );
}

/**
 * Liste les NC ouvertes ou en cours, les plus récentes en premier.
 */
export async function listOpenNonConformites(): Promise<NonConformite[]> {
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.NON_CONFORMITES,
    [
      Query.notEqual('status', 'CLOTUREE'),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]
  );
  return result.documents as unknown as NonConformite[];
}

/**
 * Clôture une NC (marquée résolue).
 */
export async function closeNonConformite(ncId: string) {
  return databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.NON_CONFORMITES,
    ncId,
    {
      status: 'CLOTUREE',
      closed_at: new Date().toISOString(),
    }
  );
}
