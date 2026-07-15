// ============================================================
// HyperExcellence - CAPA (Circuit 6, étapes 4-7)
// ============================================================
import { ID, Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS } from '../constants';
import { writeAuditLog } from './auditLog';

export interface Capa {
  $id: string;
  non_conformite_id: string;
  responsable_id: string;
  echeance: string;
  preuve_correction: string | null;
  verified_by: string | null;
  verified_at: string | null;
}

/**
 * Étape 4-5 : Qualification + création CAPA.
 * - causeRacine : analyse 5M saisie par le Chef, stockée sur la NC.
 * - Passe la NC en EN_COURS.
 */
export async function qualifyAndCreateCapa(params: {
  ncId: string;
  causeRacine: string;
  responsableId: string;
  echeance: string;
  actorId: string;
}) {
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.NON_CONFORMITES,
    params.ncId,
    { status: 'EN_COURS', cause: params.causeRacine }
  );

  const capa = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.CAPA,
    ID.unique(),
    {
      non_conformite_id: params.ncId,
      responsable_id: params.responsableId,
      echeance: params.echeance,
      preuve_correction: null,
      verified_by: null,
      verified_at: null,
    }
  );

  await writeAuditLog({
    actorId: params.actorId,
    action: 'QUALIFICATION_CAPA_CREEE',
    entityType: 'non_conformite',
    entityId: params.ncId,
    payload: {
      causeRacine: params.causeRacine,
      responsableId: params.responsableId,
      echeance: params.echeance,
    },
  });

  return capa;
}

/**
 * Récupère la CAPA associée à une NC (s'il y en a une).
 */
export async function getCapaForNC(ncId: string): Promise<Capa | null> {
  const result = await databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.CAPA, [
    Query.equal('non_conformite_id', ncId),
  ]);
  return (result.documents[0] as unknown as Capa) || null;
}

/**
 * Étape 6-7 : Vérification efficacité + Clôture (signature simplifiée = nom saisi).
 */
export async function verifyAndCloseCapa(params: {
  capaId: string;
  ncId: string;
  preuveCorrection: string;
  verifiedBy: string;
  signatureName: string;
  actorId: string;
}) {
  const now = new Date().toISOString();

  await databases.updateDocument(APPWRITE_DATABASE_ID, COLLECTIONS.CAPA, params.capaId, {
    preuve_correction: params.preuveCorrection,
    verified_by: params.verifiedBy,
    verified_at: now,
  });

  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.NON_CONFORMITES,
    params.ncId,
    { status: 'CLOTUREE', closed_at: now }
  );

  await writeAuditLog({
    actorId: params.actorId,
    action: 'CAPA_VERIFIEE_CLOTUREE',
    entityType: 'non_conformite',
    entityId: params.ncId,
    payload: {
      preuveCorrection: params.preuveCorrection,
      signature: params.signatureName,
      verifiedAt: now,
    },
  });
}

/**
 * Liste les CAPA dont l'échéance est dépassée et qui ne sont pas clôturées
 * (Circuit 6, étape 7 : "Si non clôturée à échéance -> escalade").
 */
export async function listOverdueCapas(): Promise<Array<Capa & { ncGravite: string; ncActionImmediate: string }>> {
  const today = new Date().toISOString().slice(0, 10);

  const capasResult = await databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.CAPA, [
    Query.lessThan('echeance', today),
    Query.isNull('verified_at'),
    Query.limit(200),
  ]);

  const overdue: Array<Capa & { ncGravite: string; ncActionImmediate: string }> = [];
  for (const capa of capasResult.documents as any[]) {
    try {
      const nc = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.NON_CONFORMITES,
        capa.non_conformite_id
      );
      if (nc.status !== 'CLOTUREE') {
        overdue.push({ ...capa, ncGravite: nc.gravite, ncActionImmediate: nc.action_immediate });
      }
    } catch {
      // NC introuvable, on ignore cette CAPA orpheline
    }
  }
  return overdue;
}
