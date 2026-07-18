// ============================================================
// HyperExcellence - Circuit Non Conformité (Circuit 6)
// ============================================================
import { Query } from 'appwrite';
import { databases, functions } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, Gravite, NCStatus } from '../constants';

const UPDATE_EMPLOYEE_FUNCTION_ID = '6a592c6000074266e563';

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
 * Crée une Non Conformité via la Function serveur (update-employee),
 * pour que les permissions par document (label admin/supervisor)
 * soient appliquées correctement, sans restriction cote client.
 */
export async function createNonConformite(input: CreateNCInput) {
  const execution = await functions.createExecution(
    UPDATE_EMPLOYEE_FUNCTION_ID,
    JSON.stringify({
      action: 'create_nc',
      zoneId: input.zoneId,
      taskExecutionId: input.taskExecutionId,
      gravite: input.gravite,
      actionImmediate: input.actionImmediate,
    }),
    false // synchrone : on attend la reponse
  );

  const result = JSON.parse(execution.responseBody);
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
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
 * TODO (étape suivante) : passer aussi par la Function serveur.
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
