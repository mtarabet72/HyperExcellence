// ============================================================
// HyperExcellence - Appwrite Function : modification d'employe
// + Garde-fou de connexion (fusionne pour rester sous la limite que
// de 2 Functions du plan gratuit Appwrite).
//
// Deux familles d'actions distinguees par la presence de "action":
// - action = check/fail/reset : garde-fou PIN, PAS d'authentification requise
// - pas d'action (update classique) : modification profil, ADMIN requis
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const DB_ID = 'hyperclean_pro';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const databases = new Databases(client);

  try {
    const body = JSON.parse(req.bodyRaw || '{}');
    log('BODY RECU: ' + JSON.stringify(body));

    // ---------- Branche garde-fou PIN (pas d'auth requise) ----------
    if (body.action === 'check' || body.action === 'fail' || body.action === 'reset') {
      const { badgeNumber, action } = body;
      if (!badgeNumber) {
        return res.json({ error: 'badgeNumber manquant.' }, 400);
      }

      const profiles = await databases.listDocuments(DB_ID, 'profiles', [
        Query.equal('badge_number', badgeNumber),
      ]);

      if (profiles.documents.length === 0) {
        return res.json({ allowed: true });
      }
      const profile = profiles.documents[0];

      if (action === 'check') {
        const now = new Date();
        if (profile.locked_until && new Date(profile.locked_until) > now) {
          const minutesLeft = Math.ceil((new Date(profile.locked_until) - now) / 60000);
          return res.json({ allowed: false, minutesLeft });
        }
        return res.json({ allowed: true });
      }

      if (action === 'fail') {
        const attempts = (profile.failed_attempts || 0) + 1;
        const payload = { failed_attempts: attempts };
        if (attempts >= MAX_ATTEMPTS) {
          payload.locked_until = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
          payload.failed_attempts = 0;
        }
        await databases.updateDocument(DB_ID, 'profiles', profile.$id, payload);
        log('Echec enregistre pour badge ' + badgeNumber + ' (' + attempts + '/' + MAX_ATTEMPTS + ')');
        return res.json({ recorded: true, attempts, locked: attempts >= MAX_ATTEMPTS });
      }

      if (action === 'reset') {
        await databases.updateDocument(DB_ID, 'profiles', profile.$id, {
          failed_attempts: 0,
          locked_until: null,
        });
        return res.json({ reset: true });
      }
    }

    // ---------- Branche modification employe (ADMIN requis) ----------
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
