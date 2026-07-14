// ============================================================
// HyperExcellence - Appwrite Function : création d'employé
// Exécutée côté serveur Appwrite, jamais côté navigateur.
// ============================================================
import { Client, Users, Databases, Query, ID } from 'node-appwrite';

const EMAIL_DOMAIN = 'hyperexcellence.local';
const DB_ID = 'hyperclean_pro';

// Doit rester identique à src/lib/auth.ts (deriveAppwritePassword)
function deriveAppwritePassword(pin) {
  const cleanPin = String(pin).trim().padStart(4, '0');
  return `HXC-${cleanPin}-SEC`;
}

function badgeToEmail(badgeNumber) {
  return `${badgeNumber.trim().toLowerCase().replace(/\s+/g, '')}@${EMAIL_DOMAIN}`;
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const users = new Users(client);
  const databases = new Databases(client);

  try {
    // ---------- Vérification : l'appelant doit être ADMIN ----------
    const callerUserId = req.headers['x-appwrite-user-id'];
    if (!callerUserId) {
      return res.json({ error: 'Non authentifié.' }, 401);
    }

    const callerProfiles = await databases.listDocuments(DB_ID, 'profiles', [
      Query.equal('user_id', callerUserId),
    ]);
    const callerProfile = callerProfiles.documents[0];
    if (!callerProfile || callerProfile.role !== 'ADMIN') {
      return res.json({ error: 'Réservé aux administrateurs.' }, 403);
    }

    // ---------- Lecture des paramètres envoyés par l'app ----------
    const body = JSON.parse(req.bodyRaw || '{}');
    const { badgeNumber, pin, fullName, role, departmentId, sector } = body;

    if (!badgeNumber || !pin || !fullName || !role) {
      return res.json({ error: 'Champs requis manquants.' }, 400);
    }

    const email = badgeToEmail(badgeNumber);
    const password = deriveAppwritePassword(pin);

    // ---------- Création du compte Auth ----------
    const newUser = await users.create(ID.unique(), email, undefined, password, fullName);
    log(`Compte Auth créé: ${newUser.$id}`);

    // ---------- Création du profil ----------
    const profile = await databases.createDocument(DB_ID, 'profiles', ID.unique(), {
      user_id: newUser.$id,
      full_name: fullName,
      role,
      department_id: departmentId || null,
      sector: sector || null,
      badge_number: badgeNumber,
      is_active: true,
    });
    log(`Profil créé: ${profile.$id}`);

    return res.json({ success: true, userId: newUser.$id, profileId: profile.$id });
  } catch (e) {
    error(e.message || String(e));
    return res.json({ error: e.message || 'Erreur inconnue.' }, 500);
  }
};
