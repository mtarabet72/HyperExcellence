// ============================================================
// HyperExcellence - Seed Circuit 2 : Service SBAM - Épices/Olives/Vrac
// Pilier 02 - Tâches 142 à 156. Idempotent.
// Note: 153 partagée avec le Circuit 3 PND HACCP (déjà créée).
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-2-epices-vrac';
const CHECKLIST = {
  department_id: 'epices_vrac',
  name: 'Circuit Service SBAM - Épices / Olives / Vrac',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 02',
  circuit_number: 2,
  is_active: true,
};

const TASKS = [
  { n: 142, label: 'Au moins un vendeur présent dans le rayon', gravite: 'MAJEURE' },
  { n: 143, label: 'Balisage prix et origine du produit', gravite: 'MINEURE' },
  { n: 144, label: 'Accusé réception si occupé, sous 5 minutes', gravite: 'MINEURE' },
  { n: 145, label: 'Salutation : Bonjour, sourire, contact visuel', gravite: 'MINEURE' },
  { n: 146, label: 'Tenue complète, hygiène corporelle, badge visible', gravite: 'MAJEURE', photo: true },
  { n: 147, label: 'Découverte du besoin : questions et reformulation', gravite: 'MINEURE' },
  { n: 148, label: 'Congé : demande besoin supplémentaire + formule de politesse', gravite: 'MINEURE' },
  { n: 149, label: 'Pesée exacte réalisée devant le client', gravite: 'MAJEURE' },
  { n: 150, label: 'Bacs vrac propres, sans mélange entre produits (allergènes)', gravite: 'CRITIQUE', photo: true },
  { n: 151, label: 'Ustensiles de service dédiés par bac (pas de contamination croisée)', gravite: 'CRITIQUE' },
  { n: 152, label: 'Sachets et emballages disponibles pour le client', gravite: 'MINEURE' },
  { n: 154, label: 'Étiquetage allergènes visible et à jour', gravite: 'CRITIQUE', photo: true },
  { n: 155, label: 'Téléphone personnel interdit pendant le service', gravite: 'MINEURE' },
  { n: 156, label: 'Pas de regroupement de personnel dans le rayon', gravite: 'MINEURE' },
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
  console.log(`✅ Circuit 2 Épices/Olives/Vrac seedé : ${TASKS.length} tâches (dont 153 partagée avec Circuit 3, non recréée).`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
