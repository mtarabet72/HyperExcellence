// ============================================================
// HyperExcellence - Seed du premier compte ADMIN de test
// À exécuter UNE FOIS via GitHub Actions
// ============================================================
import { Client, Users, Databases, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);

const DB_ID = 'hyperclean_pro';

// ---------- Identifiants du compte de test ----------
const BADGE_NUMBER = 'ADMIN01';
const PIN = '123456';
const FULL_NAME = 'Mohamed - Admin QHSE';
const EMAIL = `${BADGE_NUMBER.toLowerCase()}@hyperexcellence.local`;

// ⚠️ DOIT rester strictement identique à deriveAppwritePassword()
// dans src/lib/auth.ts, sinon la connexion échouera.
function deriveAppwritePassword(pin) {
  const cleanPin = pin.trim().padStart(4, '0');
  return `HXC-${cleanPin}-SEC`;
}

async function run() {
  const password = deriveAppwritePassword(PIN);

  console.log('Création du compte Auth...');
  const user = await users.create(ID.unique(), EMAIL, undefined, password, FULL_NAME);
  console.log('✅ Compte Auth créé:', user.$id);

  console.log('Création du profil...');
  await databases.createDocument(DB_ID, 'profiles', ID.unique(), {
    user_id: user.$id,
    full_name: FULL_NAME,
    role: 'ADMIN',
    department_id: null,
    sector: null,
    badge_number: BADGE_NUMBER,
    is_active: true,
  });
  console.log('✅ Profil ADMIN créé et lié.');

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
