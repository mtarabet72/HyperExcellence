// ============================================================
// HyperExcellence - Seed Circuit 2 : Service SBAM - Poissonnerie
// Pilier 02 - Tâches 094 à 109. Idempotent.
// Note: 105 partagée avec le Circuit 3 PND HACCP (déjà créée).
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-2-poissonnerie';
const CHECKLIST = {
  department_id: 'poissonnerie',
  name: 'Circuit Service SBAM - Poissonnerie',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 02',
  circuit_number: 2,
  is_active: true,
};

const TASKS = [
  { n: 94, label: 'Au moins un vendeur présent dans le rayon', gravite: 'MAJEURE' },
  { n: 95, label: 'Balisage prix et origine du produit', gravite: 'MINEURE' },
  { n: 96, label: 'Accusé réception si occupé, sous 5 minutes', gravite: 'MINEURE' },
  { n: 97, label: 'Pesée exacte réalisée devant le client', gravite: 'MAJEURE' },
  { n: 98, label: 'Salutation : Bonjour, sourire, contact visuel', gravite: 'MINEURE' },
  { n: 99, label: 'Tenue complète, hygiène corporelle, badge, gants', gravite: 'MAJEURE', photo: true },
  { n: 100, label: 'Découverte du besoin : questions et reformulation', gravite: 'MINEURE' },
  { n: 101, label: 'Congé : demande besoin supplémentaire + formule de politesse', gravite: 'MINEURE' },
  { n: 102, label: 'Fraîcheur visible du produit (œil clair, odeur neutre)', gravite: 'CRITIQUE', photo: true },
  { n: 103, label: 'Glace/comptoir réfrigéré correctement rempli', gravite: 'MAJEURE' },
  { n: 104, label: 'Préparation et emballage propres', gravite: 'MAJEURE', photo: true },
  { n: 106, label: 'Engagement hygiène et qualité Marjane affiché dans le rayon', gravite: 'MINEURE', photo: true },
  { n: 107, label: 'Absence d\'odeur désagréable au rayon', gravite: 'MAJEURE' },
  { n: 108, label: 'Téléphone personnel interdit pendant le service', gravite: 'MINEURE' },
  { n: 109, label: 'Pas de regroupement de personnel dans le rayon', gravite: 'MINEURE' },
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
  console.log(`✅ Circuit 2 Poissonnerie seedé : ${TASKS.length} tâches (dont 105 partagée avec Circuit 3, non recréée).`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
