// ============================================================
// HyperExcellence - Seed Circuit 2 : Service SBAM - Boulangerie/Pâtisserie
// Pilier 02 - Tâches 050 à 064. Idempotent.
// Note: 061 partagée avec le Circuit 3 PND HACCP (déjà créée).
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-2-boulangerie';
const CHECKLIST = {
  department_id: 'boulangerie',
  name: 'Circuit Service SBAM - Boulangerie / Pâtisserie',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 02',
  circuit_number: 2,
  is_active: true,
};

const TASKS = [
  { n: 50, label: 'Au moins un vendeur présent dans le rayon', gravite: 'MAJEURE' },
  { n: 51, label: 'Balisage prix correct par produit', gravite: 'MINEURE' },
  { n: 52, label: 'Accusé réception si occupé, sous 5 minutes', gravite: 'MINEURE' },
  { n: 53, label: 'Balance présente et fonctionnelle', gravite: 'MAJEURE' },
  { n: 54, label: 'Salutation : Bonjour, sourire, contact visuel', gravite: 'MINEURE' },
  { n: 55, label: 'Tenue complète, hygiène corporelle, badge, calot', gravite: 'MAJEURE', photo: true },
  { n: 56, label: 'Découverte du besoin : questions et reformulation', gravite: 'MINEURE' },
  { n: 57, label: 'Congé : demande besoin supplémentaire + formule de politesse', gravite: 'MINEURE' },
  { n: 58, label: 'Emballage propre et soigné', gravite: 'MAJEURE' },
  { n: 59, label: 'Disposition en vitrine sans mélange de produits', gravite: 'MINEURE' },
  { n: 60, label: 'Conseil clair et qualité visible des produits', gravite: 'MAJEURE' },
  { n: 62, label: 'Propreté du matériel (trancheuse, plans de travail)', gravite: 'MAJEURE', photo: true },
  { n: 63, label: 'Téléphone personnel interdit pendant le service', gravite: 'MINEURE' },
  { n: 64, label: 'Pas de regroupement de personnel dans le rayon', gravite: 'MINEURE' },
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
  console.log(`✅ Circuit 2 Boulangerie seedé : ${TASKS.length} tâches (dont 061 partagée avec Circuit 3, non recréée).`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
