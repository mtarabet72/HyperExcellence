// ============================================================
// HyperExcellence - Seed Circuit 3 : PND HACCP (transversal)
// Une tâche de nettoyage/désinfection par rayon frais. Idempotent.
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-3-pnd-haccp';
const CHECKLIST = {
  department_id: 'boucherie', // transversal, voir note visibilité côté app
  name: 'Circuit PND HACCP - Nettoyage & Désinfection',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'ISO 22000 PRP 8',
  circuit_number: 3,
  is_active: true,
};

const TASKS = [
  { n: 61, label: 'Boulangerie/Pâtisserie — rayon propre, matériel, sols, murs, outils', gravite: 'MAJEURE' },
  { n: 76, label: 'Boucherie/Volaille — rayon propre, matériel, sols, murs, outils', gravite: 'MAJEURE' },
  { n: 90, label: 'Traiteur — rayon propre, matériel, sols, murs, outils', gravite: 'MAJEURE' },
  { n: 105, label: 'Poissonnerie — rayon propre, matériel, sols, murs, outils', gravite: 'MAJEURE' },
  { n: 121, label: 'Fruits et Légumes — rayon propre, matériel, sols, murs, outils', gravite: 'MAJEURE' },
  { n: 137, label: 'Fromage/Charcuterie — rayon propre, matériel, sols, murs, outils', gravite: 'MAJEURE' },
  { n: 153, label: 'Épices/Olives/Vrac — rayon propre, matériel, sols, murs, outils (point critique allergènes)', gravite: 'CRITIQUE' },
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
      requires_photo: true,
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
  console.log(`✅ Circuit 3 seedé : ${TASKS.length} tâches.`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
