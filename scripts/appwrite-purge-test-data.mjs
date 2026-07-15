// ============================================================
// HyperExcellence - Purge des données de test avant terrain
// Supprime : exécutions, NC, CAPA, audit_log, employés (sauf ADMIN01)
// Conserve : circuits, tâches, zones, départements, Teams
// ============================================================
import { Client, Databases, Users, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const users = new Users(client);
const DB_ID = 'hyperclean_pro';

const COLLECTIONS_TO_WIPE = [
  'task_executions',
  'non_conformites',
  'capa',
  'audit_log',
];

async function wipeCollection(collectionId) {
  let totalDeleted = 0;
  while (true) {
    const result = await databases.listDocuments(DB_ID, collectionId, [Query.limit(100)]);
    if (result.documents.length === 0) break;

    for (const doc of result.documents) {
      await databases.deleteDocument(DB_ID, collectionId, doc.$id);
      totalDeleted++;
    }
    console.log(`  → ${collectionId}: ${totalDeleted} supprimés jusqu'ici...`);
  }
  console.log(`✅ ${collectionId}: ${totalDeleted} documents supprimés au total.`);
}

async function wipeEmployeesExceptAdmin() {
  let totalDeleted = 0;
  while (true) {
    const result = await databases.listDocuments(DB_ID, 'profiles', [
      Query.notEqual('badge_number', 'ADMIN01'),
      Query.limit(100),
    ]);
    if (result.documents.length === 0) break;

    for (const profile of result.documents) {
      try {
        await users.delete(profile.user_id);
      } catch (e) {
        console.log(`  ⚠️ Compte Auth déjà absent pour ${profile.full_name} (${profile.user_id})`);
      }
      await databases.deleteDocument(DB_ID, 'profiles', profile.$id);
      totalDeleted++;
      console.log(`  → Supprimé: ${profile.full_name} (Badge: ${profile.badge_number || '—'})`);
    }
  }
  console.log(`✅ Employés supprimés (hors ADMIN01): ${totalDeleted}`);
}

async function run() {
  console.log('=== DÉBUT DE LA PURGE ===');
  console.log('');

  for (const collectionId of COLLECTIONS_TO_WIPE) {
    console.log(`Purge de ${collectionId}...`);
    await wipeCollection(collectionId);
    console.log('');
  }

  console.log('Purge des employés de test (hors ADMIN01)...');
  await wipeEmployeesExceptAdmin();
  console.log('');

  console.log('=== PURGE TERMINÉE ===');
  console.log('Conservé intact : circuits, tâches, zones, départements, compte ADMIN01.');
}

run().catch((e) => {
  console.error('❌ Erreur pendant la purge:', e.message || e);
  process.exit(1);
});
