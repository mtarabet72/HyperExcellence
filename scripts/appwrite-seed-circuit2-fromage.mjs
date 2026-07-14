// ============================================================
// HyperExcellence - Seed Circuit 2 : Service SBAM - Fromage/Charcuterie
// Pilier 02 - Tâches 124 à 140. Idempotent.
// Note: 137 partagée avec le Circuit 3 PND HACCP (déjà créée).
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-2-fromage-charcuterie';
const CHECKLIST = {
  department_id: 'fromage_charcuterie',
  name: 'Circuit Service SBAM - Fromage / Charcuterie à la coupe',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 02',
  circuit_number: 2,
  is_active: true,
};

const TASKS = [
  { n: 124, label: 'Au moins un vendeur présent dans le rayon', gravite: 'MAJEURE' },
  { n: 125, label: 'Accusé réception si occupé, sous 5 minutes', gravite: 'MINEURE' },
  { n: 126, label: 'Salutation : Bonjour, sourire, contact visuel', gravite: 'MINEURE' },
  { n: 127, label: 'Découverte du besoin : questions et reformulation', gravite: 'MINEURE' },
  { n: 128, label: 'Conseil clair, convaincant et satisfaisant', gravite: 'MINEURE' },
  { n: 129, label: 'Tenue complète, hygiène corporelle, badge visible', gravite: 'MAJEURE', photo: true },
  { n: 130, label: 'Gant porté sur au moins une main, sans contact direct produit', gravite: 'MAJEURE' },
  { n: 131, label: 'Balisage origine et filière du produit', gravite: 'MAJEURE' },
  { n: 132, label: 'Congé : demande besoin supplémentaire + formule de politesse', gravite: 'MINEURE' },
  { n: 133, label: 'Pique prix présent par produit', gravite: 'MINEURE' },
  { n: 134, label: 'Préparation et emballage soignés', gravite: 'MAJEURE', photo: true },
  { n: 135, label: 'Fraîcheur visible du produit', gravite: 'CRITIQUE', photo: true },
  { n: 136, label: 'Vitrine sans buée, produit bien visible', gravite: 'MAJEURE' },
  { n: 138, label: 'Absence d\'odeur désagréable au rayon', gravite: 'MINEURE' },
  { n: 139, label: 'Téléphone personnel interdit pendant le service', gravite: 'MINEURE' },
  { n: 140, label: 'Pas de regroupement de personnel dans le rayon', gravite: 'MINEURE' },
];

async function getOrCreateChecklist() {
  try {
    const existing = await databases.getDocument(DB_ID, 'checklist_templates', CHECKLIST_ID);
    console.log('ℹ️ Checklist déjà existante, réutilisation.');
    return existing;
  } catch {
    const created = await databases.createDocument(DB_ID, 'checklist_templates', CHECKLIST_ID, CHECKLIST);
    console.log('✅ Checklist créée:', created.$id);
    return created;
  }
}

async function seedTasks(checklistId) {
  for (const task of TASKS) {
    const existing = await databases.listDocuments(DB_ID, 'task_templates', [
      Query.equal('task_number', task.n),
    ]);
    if (existing.total > 0) {
      console.log(`  → Tâche ${task.n} déjà existante (probablement partagée), ignorée.`);
      continue;
    }
    await databases.createDocument(DB_ID, 'task_templates', ID.unique(), {
      checklist_id: checklistId,
      task_number: task.n,
      label: task.label,
      requires_photo: !!task.photo,
      requires_temperature: false,
      default_gravite: task.gravite,
      sort_order: task.n,
      is_active: true,
    });
    console.log(`✅ Tâche ${task.n} créée.`);
  }
}

async function run() {
  const checklist = await getOrCreateChecklist();
  await seedTasks(checklist.$id);
  console.log('');
  console.log(`✅ Circuit 2 Fromage/Charcuterie seedé : ${TASKS.length} tâches (dont 137 partagée avec Circuit 3, non recréée).`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
