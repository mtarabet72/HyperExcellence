// ============================================================
// HyperExcellence - Seed Circuit 1 : Confort et Environnement Client
// Pilier 01 - Tâches 001 à 026. Idempotent.
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

// ---------- Le checklist_template (parent) ----------
const CHECKLIST_ID = 'circuit-1-confort';
const CHECKLIST = {
  department_id: 'confort_environnement',
  name: 'Circuit Confort et Environnement Client',
  frequency: 'QUOTIDIENNE',
  prp_ref: 'Pilier 01',
  circuit_number: 1,
  is_active: true,
};

// ---------- Les 26 tâches ----------
const TASKS = [
  // Étape 1 - Parking (001-005)
  { n: 1, label: 'Le parking est propre (contrôle visuel)', gravite: 'MINEURE' },
  { n: 2, label: 'Parking sécurisé : pas de mendiants, chiens errants, éclairage fonctionnel', gravite: 'MAJEURE' },
  { n: 3, label: 'Place disponible sans entrave caddies ou déchets', gravite: 'MINEURE' },
  { n: 4, label: 'Allées dégagées, circulation facile', gravite: 'MINEURE' },
  { n: 5, label: 'Poubelles disponibles et non débordantes', gravite: 'MINEURE', photo: true },

  // Étape 2 - Caddies et Paniers (006-010)
  { n: 6, label: 'Disponibilité caddies dont 160L pour magasins compacts', gravite: 'MINEURE' },
  { n: 7, label: 'Paniers petits achats disponibles', gravite: 'MINEURE' },
  { n: 8, label: 'Caddies en bon état et roulent bien', gravite: 'MINEURE' },
  { n: 9, label: 'Caddies propres, sans mouchoirs ou tickets', gravite: 'MINEURE' },
  { n: 10, label: 'Abris caddies propres et entretenus', gravite: 'MINEURE' },

  // Étape 3 - Confort et Cadre (011-020, 023)
  { n: 11, label: 'Façade et enseigne Marjane propre et éclairée le soir', gravite: 'MINEURE', photo: true },
  { n: 12, label: 'Luminosité, musique d\'ambiance (note 1 à 5)', gravite: 'MINEURE' },
  { n: 13, label: 'Climatisation bien réglée (22-24°C)', gravite: 'MINEURE' },
  { n: 14, label: 'Signalétique orientation en bon état', gravite: 'MINEURE' },
  { n: 15, label: 'Toilettes propres et hygiéniques', gravite: 'CRITIQUE' },
  { n: 16, label: 'Toilettes fonctionnelles : lavabos, chasse, distributeur savon, serrure, éclairage', gravite: 'MAJEURE' },
  { n: 17, label: 'Consommables disponibles : savon, papier hygiénique', gravite: 'MINEURE' },
  { n: 18, label: 'Allées centrales et ligne caisse propres et dégagées', gravite: 'CRITIQUE' },
  { n: 20, label: 'Absence d\'odeur désagréable', gravite: 'MINEURE' },

  // Circuit Sécurité (024-026)
  { n: 24, label: 'Agents présents devant caisses', gravite: 'MAJEURE' },
  { n: 25, label: 'Port du badge visible', gravite: 'MINEURE' },
  { n: 26, label: 'Hygiène corporelle et tenue complète propre et repassée', gravite: 'MINEURE', photo: true },
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
  console.log(`✅ Circuit 1 seedé : ${TASKS.length} tâches.`);
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
