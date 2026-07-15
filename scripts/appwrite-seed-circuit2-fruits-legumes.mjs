// ============================================================
// HyperExcellence - Seed Circuit 2 : Service SBAM - Fruits et Légumes
// Pilier 02 - Tâches 110 à 123. Idempotent.
// Note: 121 partagée avec le Circuit 3 PND HACCP (déjà créée).
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-2-fruits-legumes';
const CHECKLIST = {
  department_id: 'fruits_legumes',
  name: 'Circuit Service SBAM - Fruits et Légumes',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 02',
  circuit_number: 2,
  is_active: true,
};

const TASKS = [
  { n: 110, label: 'Au moins un vendeur présent dans le rayon', gravite: 'MAJEURE' },
  { n: 111, label: 'Balisage prix et origine du produit', gravite: 'MINEURE' },
  { n: 112, label: 'Accusé réception si occupé, sous 5 minutes', gravite: 'MINEURE' },
  { n: 113, label: 'Salutation : Bonjour, sourire, contact visuel', gravite: 'MINEURE' },
  { n: 114, label: 'Tenue complète, hygiène corporelle, badge visible', gravite: 'MAJEURE', photo: true },
  { n: 115, label: 'Découverte du besoin : questions et reformulation', gravite: 'MINEURE' },
  { n: 116, label: 'Congé : demande besoin supplémentaire + formule de politesse', gravite: 'MINEURE' },
  { n: 117, label: 'Fraîcheur visible des produits, tri des produits abîmés', gravite: 'MAJEURE', photo: true },
  { n: 118, label: 'Présentation soignée : rangement, mise en valeur', gravite: 'MINEURE', photo: true },
  { n: 119, label: 'Pesée exacte réalisée devant le client', gravite: 'MAJEURE' },
  { n: 120, label: 'Sacs et emballages disponibles pour le client', gravite: 'MINEURE' },
  { n: 122, label: 'Téléphone personnel interdit pendant le service', gravite: 'MINEURE' },
  { n: 123, label: 'Pas de regroupement de personnel dans le rayon', gravite: 'MINEURE' },
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
  console.log(`✅ Circuit 2 Fruits et Légumes seedé : ${TASKS.length} tâches (dont 121 partagée avec Circuit 3, non recréée).`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
