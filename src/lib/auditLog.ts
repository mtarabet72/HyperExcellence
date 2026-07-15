// ============================================================
// HyperExcellence - Journal d'audit immuable (Circuit 6)
// Append-only : on écrit, on ne modifie/supprime jamais.
// ============================================================
import { ID } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS } from '../constants';

export async function writeAuditLog(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
}) {
  return databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.AUDIT_LOG,
    ID.unique(),
    {
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      payload: params.payload ? JSON.stringify(params.payload) : null,
    }
  );
}
