// ============================================================
// HyperExcellence - Seed du premier compte ADMIN de test
// Idempotent : peut être relancé sans erreur si déjà exécuté.
// ============================================================
import { Client, Users, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);

const DB_ID = 'hyperclean_pro';

const BADGE_NUMBER = 'ADMIN01';
const PIN = '123456';
const FULL_NAME = 'Mohamed - Admin QHSE';
const EMAIL = `${BADGE_NUMBER.toLowerCase()}@hyperexcellence.local`;

// ⚠️ DOIT rester strictement identique à deriveAppwritePassword()
// dans src/lib/auth.ts
function deriveAppwritePassword(pin) {
  const cleanPin = pin.trim().padStart(4, '0');
  return `HXC-${cleanPin}-SEC`;
}

async function getOrCreateAuthUser() {
  const password = deriveAppwritePassword(PIN);

  // Cherche si un compte avec cet email existe déjà
  const existing = await users.list([Query.equal('email', EMAIL)]);
  if (existing.total > 0) {
    console.log('ℹ️ Compte Auth déjà existant, réutilisation:', existing.users[0].$id);
    return existing.users[0];
  }

  const user = await users.create(ID.unique(), EMAIL, undefined, password, FULL_NAME);
  console.log('✅ Compte Auth créé:', user.$id);
  return user;
}

async function getOrCreateProfile(userId) {
  const existing = await databases.listDocuments(DB_ID, 'profiles', [
    Query.equal('user_id', userId),
  ]);
  if (existing.total > 0) {
    console.log('ℹ️ Profil déjà existant, rien à faire.');
    return existing.documents[0];
  }

  const profile = await databases.createDocument(DB_ID, 'profiles', ID.unique(), {
    user_id: userId,
    full_name: FULL_NAME,
    role: 'ADMIN',
    department_id: null,
    sector: null,
    badge_number: BADGE_NUMBER,
    is_active: true,
  });
  console.log('✅ Profil ADMIN créé et lié.');
  return profile;
}

async function run() {
  console.log('Vérification du compte Auth...');
  const user = await getOrCreateAuthUser();

  console.log('Vérification du profil...');
  await getOrCreateProfile(user.$id);

  console.log('');
  console.log('=== IDENTIFIANTS DE CONNEXION (à saisir dans l\'app) ===');
  console.log('Badge:', BADGE_NUMBER);
  console.log('PIN:', PIN);
  console.log('==========================================================');
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
