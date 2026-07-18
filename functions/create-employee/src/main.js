// ============================================================
// HyperExcellence - Appwrite Function : creation d'employe
// Executee cote serveur Appwrite, jamais cote navigateur.
// ============================================================
import { Client, Users, Databases, Query, ID } from 'node-appwrite';

const EMAIL_DOMAIN = 'hyperexcellence.local';
const DB_ID = 'hyperclean_pro';

function deriveAppwritePassword(pin) {
  const cleanPin = String(pin).trim().padStart(4, '0');
  return `HXC-${cleanPin}-SEC`;
}

function badgeToEmail(badgeNumber) {
  return `${badgeNumber.trim().toLowerCase().replace(/\s+/g, '')}@${EMAIL_DOMAIN}`;
}

function labelForRole(role) {
  if (role === 'ADMIN') return 'admin';
  const supervisorRoles = [
    'CHEF_SECTEUR',
    'CHEF_DEPARTEMENT',
    'CHEF_RAYON',
    'CHEF_SECURITE',
    'CHEF_CAISSE',
    'MAITRE_METIER',
  ];
  if (supervisorRoles.includes(role)) return 'supervisor';
  return null;
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const users = new Users(client);
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
    const { badgeNumber, pin, fullName, role, departmentId, sector } = body;

    if (!badgeNumber || !pin || !fullName || !role) {
      return res.json({ error: 'Champs requis manquants.' }, 400);
    }

    const email = badgeToEmail(badgeNumber);
    const password = deriveAppwritePassword(pin);

    const newUser = await users.create(ID.unique(), email, undefined, password, fullName);
    log(`Compte Auth cree: ${newUser.$id}`);

    const label = labelForRole(role);
    if (label) {
      await users.updateLabels(newUser.$id, [label]);
      log(`Label applique: ${label}`);
    }

    const profile = await databases.createDocument(DB_ID, 'profiles', ID.unique(), {
      user_id: newUser.$id,
      full_name: fullName,
      role,
      department_id: departmentId || null,
      sector: sector || null,
      badge_number: badgeNumber,
      is_active: true,
    });
    log(`Profil cree: ${profile.$id}`);

    return res.json({ success: true, userId: newUser.$id, profileId: profile.$id });
  } catch (e) {
    error(e.message || String(e));
    return res.json({ error: e.message || 'Erreur inconnue.' }, 500);
  }
};
