// ============================================================
// HyperExcellence - Seed Circuit 2 : Service SBAM - Traiteur
// Pilier 02 - Tâches 080 à 093. Idempotent.
// Note: 090 partagée avec le Circuit 3 PND HACCP (déjà créée).
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-2-traiteur';
const CHECKLIST = {
  department_id: 'traiteur',
  name: 'Circuit Service SBAM - Traiteur',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 02',
  circuit_number: 2,
  is_active: true,
};

const TASKS = [
  { n: 80, label: 'Au moins un vendeur présent dans le rayon', gravite: 'MAJEURE' },
  { n: 81, label: 'Balisage prix et composition du produit', gravite: 'MINEURE' },
  { n: 82, label: 'Accusé réception si occupé, sous 5 minutes', gravite: 'MINEURE' },
  { n: 83, label: 'Pesée exacte réalisée devant le client', gravite: 'MAJEURE' },
  { n: 84, label: 'Salutation : Bonjour, sourire, contact visuel', gravite: 'MINEURE' },
  { n: 85, label: 'Tenue complète, hygiène corporelle, badge, gants', gravite: 'MAJEURE', photo: true },
  { n: 86, label: 'Découverte du besoin : questions et reformulation', gravite: 'MINEURE' },
  { n: 87, label: 'Congé : demande besoin supplémentaire + formule de politesse', gravite: 'MINEURE' },
  { n: 88, label: 'Fraîcheur visible et présentation soignée du produit', gravite: 'CRITIQUE', photo: true },
  { n: 89, label: 'Vitrine propre, sans buée, produit bien visible', gravite: 'MAJEURE' },
  { n: 91, label: 'Préparation et emballage propres', gravite: 'MAJEURE', photo: true },
  { n: 92, label: 'Téléphone personnel interdit pendant le service', gravite: 'MINEURE' },
  { n: 93, label: 'Pas de regroupement de personnel dans le rayon', gravite: 'MINEURE' },
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
  console.log(`✅ Circuit 2 Traiteur seedé : ${TASKS.length} tâches (dont 090 partagée avec Circuit 3, non recréée).`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
