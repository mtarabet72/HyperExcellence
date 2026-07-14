// ============================================================
// HyperExcellence - Seed Circuit 4 : Libre Service et Ruptures
// Pilier 03 - Tâches 189 à 214. Idempotent.
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const CHECKLIST_ID = 'circuit-4-libre-service';
const CHECKLIST = {
  department_id: 'apls_frais_ls',
  name: 'Circuit Libre Service et Ruptures',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 03',
  circuit_number: 4,
  is_active: true,
};

const TASKS = [
  // APLS - Libre Service Frais (189-197)
  { n: 189, label: 'Rangement comptoirs réfrigérés crémerie, charcuterie, surgelé', gravite: 'MINEURE' },
  { n: 190, label: 'Pas de rupture, grands vides apparents', gravite: 'MAJEURE' },
  { n: 191, label: 'Vitres meubles réfrigérés propres sans taches fraîches', gravite: 'MINEURE' },
  { n: 192, label: 'Matériel fonctionnel : portes frigos fermées, absence buée', gravite: 'MAJEURE' },
  { n: 193, label: 'Balisage correct : prix à la bonne place par famille', gravite: 'MINEURE' },
  { n: 194, label: 'Pas de produit qui coule ou fond', gravite: 'MAJEURE', photo: true },
  { n: 195, label: 'Pas de mouches, corps étrangers, nuisibles', gravite: 'CRITIQUE', photo: true },
  { n: 196, label: 'Disponibilité du produit recherché', gravite: 'MAJEURE' },
  { n: 197, label: 'Lecteur de prix en état de marche', gravite: 'MINEURE' },

  // Produits imposés - Disponibilité + Prix affiché (198-214)
  { n: 198, label: 'Thé grain Lion 4011 200g — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 199, label: 'Levure Ideal 10 sachets — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 200, label: 'Génoise Merendina Big M 52g — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 201, label: 'Gaufrette Tagger cacao 22g — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 202, label: 'Sucre Cosumar 2kg — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 203, label: 'Coca Cola PET 1L — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 204, label: 'Eau Sidi Ali 1.5L — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 205, label: 'Pain sandwich individuel — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 206, label: 'Baguette normale — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 207, label: 'Jebli x2/x3 — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 208, label: 'Lait UHT Jaouda 1L bouchon — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 209, label: 'Raibi Jamila grenadine 165g x8 — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 210, label: 'Eau Aïn Saïss 5L — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 211, label: 'Baby Edam Grand Coeur 900g — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 212, label: 'Danone Assil vanille x8 — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 213, label: 'Beurre Centrale 1kg 82% — disponibilité & prix affiché', gravite: 'MAJEURE' },
  { n: 214, label: 'Oeuf Nature x30 — disponibilité & prix affiché', gravite: 'MAJEURE' },
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
  console.log(`✅ Circuit 4 seedé : ${TASKS.length} tâches.`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
