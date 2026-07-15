// ============================================================
// HyperExcellence - Seed Circuit 2 : Service SBAM - Textile/Literie/PGC
// Pilier 02 - Tâches 164-165, 175-176, 180, 182-183 (seules détaillées
// dans le document source sur la plage 164-185). Idempotent.
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-2-textile-pgc';
const CHECKLIST = {
  department_id: 'textile_pgc',
  name: 'Circuit Service SBAM - Textile / Literie / PGC',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 02',
  circuit_number: 2,
  is_active: true,
};

const TASKS = [
  { n: 164, label: 'Contrôle balisage — Zone Textile (3 produits vérifiés)', gravite: 'MINEURE' },
  { n: 165, label: 'Pas de vide apparent — Zone Textile', gravite: 'MAJEURE' },
  { n: 175, label: 'Contrôle balisage — Zone Literie (3 produits vérifiés)', gravite: 'MINEURE' },
  { n: 176, label: 'Pas de vide apparent — Zone Literie', gravite: 'MAJEURE' },
  { n: 180, label: 'Rencontre client : employé présent qui salue', gravite: 'MINEURE' },
  { n: 182, label: 'Contrôle balisage — Zone PGC (3 produits vérifiés)', gravite: 'MINEURE' },
  { n: 183, label: 'Pas de vide apparent — Zone PGC', gravite: 'MAJEURE' },
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
      requires_photo: false,
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
  console.log(`✅ Circuit 2 Textile/Literie/PGC seedé : ${TASKS.length} tâches.`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
