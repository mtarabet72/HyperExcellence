// ============================================================
// HyperExcellence - Verrouillage des collections de reference
// Phase 4 Securite : lecture seule pour "Users" sur les donnees
// qui ne doivent jamais etre modifiees depuis l'app cote client.
// ============================================================
import { Client, Databases, Permission, Role } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const COLLECTIONS_TO_LOCK = [
  { id: 'departments', name: 'Departments' },
  { id: 'zones', name: 'Zones' },
  { id: 'checklist_templates', name: 'ChecklistTemplates' },
  { id: 'task_templates', name: 'TaskTemplates' },
];

async function run() {
  for (const col of COLLECTIONS_TO_LOCK) {
    console.log('Verrouillage de ' + col.id + '...');
    await databases.updateCollection(
      DB_ID,
      col.id,
      col.name,
      [Permission.read(Role.users())], // lecture seule, plus de create/update pour Users
      false // documentSecurity inchange
    );
    console.log('OK: ' + col.id + ' est maintenant en lecture seule pour les utilisateurs.');
  }
  console.log('');
  console.log('Verrouillage termine. Les scripts avec cle serveur restent fonctionnels.');
}

run().catch((e) => {
  console.error('Erreur:', e.message || e);
  process.exit(1);
});
