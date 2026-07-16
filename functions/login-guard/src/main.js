// ============================================================
// HyperExcellence - Appwrite Function : garde-fou de connexion
// Phase 4 Securite : blocage apres 5 echecs, 15 minutes.
// Accessible AVANT authentification (role Any) car appelee
// pendant la saisie du badge/PIN, avant toute session ouverte.
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
    const { badgeNumber, action } = body;

    if (!badgeNumber || !action) {
      return res.json({ error: 'Parametres manquants.' }, 400);
    }

    const profiles = await databases.listDocuments(DB_ID, 'profiles', [
      Query.equal('badge_number', badgeNumber),
    ]);

    if (profiles.documents.length === 0) {
      // Badge inconnu : on ne revele pas cette info, on repond simplement "autorise"
      // (l'echec viendra de toute facon du login Appwrite lui-meme).
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
        const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        payload.locked_until = lockUntil.toISOString();
        payload.failed_attempts = 0; // reinitialise pour le prochain cycle apres deblocage
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

    return res.json({ error: 'Action inconnue.' }, 400);
  } catch (e) {
    error(e.message || String(e));
    return res.json({ error: e.message || 'Erreur inconnue.' }, 500);
  }
};
