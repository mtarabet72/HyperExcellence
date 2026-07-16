// ============================================================
// HyperExcellence - Appwrite Function : modification d'employe
// Executee cote serveur. Verifie que l'appelant est ADMIN
// avant toute modification de profil (nom, role, rayon, secteur, statut).
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const DB_ID = 'hyperclean_pro';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const databases = new Databases(client);

  try {
    const callerUserId = req.headers['x-appwrite-user-id'];
    if (!callerUserId) {
      return res.json({ error: 'Non authentifie.' }, 401);
    }

    const callerProfiles = await databases.listDocuments(DB_ID, 'profiles', [
      Query.equal('user_id', callerUserId),
    ]);
    const callerProfile = callerProfiles.documents[0];
    if (!callerProfile || callerProfile.role !== 'ADMIN') {
      return res.json({ error: 'Reserve aux administrateurs.' }, 403);
    }

    const body = JSON.parse(req.bodyRaw || '{}');
    const { profileId, fullName, role, departmentId, sector, isActive } = body;

    if (!profileId) {
      return res.json({ error: 'profileId manquant.' }, 400);
    }

    const payload = {};
    if (fullName !== undefined) payload.full_name = fullName;
    if (role !== undefined) payload.role = role;
    if (departmentId !== undefined) payload.department_id = departmentId || null;
    if (sector !== undefined) payload.sector = sector || null;
    if (isActive !== undefined) payload.is_active = isActive;

    const updated = await databases.updateDocument(DB_ID, 'profiles', profileId, payload);
    log('Profil modifie: ' + profileId);

    return res.json({ success: true, profileId: updated.$id });
  } catch (e) {
    error(e.message || String(e));
    return res.json({ error: e.message || 'Erreur inconnue.' }, 500);
  }
};
