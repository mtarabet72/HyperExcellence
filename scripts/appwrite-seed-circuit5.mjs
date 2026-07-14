// ============================================================
// HyperExcellence - Seed Circuit 5 : Caisses
// Pilier 04 - Tâches 220 à 228. Idempotent.
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-5-caisses';
const CHECKLIST = {
  department_id: 'caisses',
  name: 'Circuit Caisses - Dernière Image Client',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 04',
  circuit_number: 5,
  is_active: true,
};

const TASKS = [
  { n: 220, label: 'Sourire', gravite: 'MINEURE' },
  { n: 221, label: 'Bonjour (Sabah el kheir)', gravite: 'MINEURE' },
  { n: 222, label: 'Au revoir (Bslama)', gravite: 'MINEURE' },
  { n: 223, label: 'Merci (Choukrane)', gravite: 'MINEURE' },
  { n: 224, label: 'Contact visuel', gravite: 'MINEURE' },
  { n: 225, label: 'Annonce du montant global au centime près (arabe ou français)', gravite: 'MAJEURE' },
  { n: 226, label: 'Zone caisse propre, équipements fonctionnels et disponibles', gravite: 'MAJEURE' },
  { n: 227, label: 'Demande de la carte de fidélité Marjane', gravite: 'MINEURE' },
  { n: 228, label: 'Jugement global : expérience caisse agréable ? (note 1 à 5)', gravite: 'MAJEURE' },
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
  console.log(`✅ Circuit 5 seedé : ${TASKS.length} tâches.`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
