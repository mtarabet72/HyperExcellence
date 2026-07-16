// ============================================================
// HyperExcellence - Verrouillage de la collection profiles
// Phase 4 Securite : plus de create/update direct pour "Users".
// Toute modification doit passer par les Appwrite Functions
// create-employee / update-employee (verification role ADMIN).
// ============================================================
import { Client, Databases, Permission, Role } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

async function run() {
  console.log('Verrouillage de profiles...');
  await databases.updateCollection(
    DB_ID,
    'profiles',
    'Profiles',
    [Permission.read(Role.users())], // lecture seule pour Users
    false
  );
  console.log('OK: profiles est maintenant en lecture seule pour les utilisateurs.');
  console.log('Creation et modification passent desormais uniquement par les Functions.');
}

run().catch((e) => {
  console.error('Erreur:', e.message || e);
  process.exit(1);
});
