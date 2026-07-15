// ============================================================
// HyperExcellence - Seed Circuit 2 : Service SBAM - Electroménager
// Pilier 02 - Tâches 034 à 049. Idempotent.
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-2-electromenager';
const CHECKLIST = {
  department_id: 'electromenager',
  name: 'Circuit Service SBAM - Electroménager',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 02',
  circuit_number: 2,
  is_active: true,
};

const TASKS = [
  { n: 34, label: 'Au moins un vendeur présent dans le rayon', gravite: 'MAJEURE' },
  { n: 35, label: 'Abordage sous 5 minutes, accusé réception si occupé', gravite: 'MINEURE' },
  { n: 36, label: 'Salutation : Bonjour, sourire, contact visuel', gravite: 'MINEURE' },
  { n: 37, label: 'Tenue complète, hygiène corporelle, badge visible', gravite: 'MAJEURE', photo: true },
  { n: 38, label: 'Découverte du besoin : questions et reformulation', gravite: 'MINEURE' },
  { n: 40, label: 'Conseil clair, convaincant et satisfaisant', gravite: 'MINEURE' },
  { n: 41, label: 'Congé : demande besoin supplémentaire + formule de politesse', gravite: 'MINEURE' },
  { n: 42, label: 'Balisage prix et fiche technique complète par produit', gravite: 'MAJEURE' },
  { n: 43, label: 'Merchandising sans vide apparent', gravite: 'MAJEURE' },
  { n: 44, label: 'Disponibilité du produit recherché', gravite: 'MAJEURE' },
  { n: 45, label: 'Temps d\'attente caisse électro ≤3 clients', gravite: 'MINEURE' },
  { n: 47, label: 'Matériel fonctionnel : TPE et imprimante opérationnels', gravite: 'MAJEURE' },
  { n: 48, label: 'Téléphone personnel interdit pendant le service', gravite: 'MINEURE' },
  { n: 49, label: 'Pas de regroupement de personnel dans le rayon', gravite: 'MINEURE' },
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
      console.log(`  → Tâche ${task.n} déjà existante, ignorée.`);
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
  console.log(`✅ Circuit 2 Electroménager seedé : ${TASKS.length} tâches.`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
