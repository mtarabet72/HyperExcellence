// ============================================================
// HyperExcellence - Provisioning des Teams Appwrite (Boucle 1)
// Une team = un département/rayon. À exécuter UNE FOIS.
// ============================================================
import { Client, Teams } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const teams = new Teams(client);

// teamId (utilisé aussi comme department_id dans profiles) + nom affiché + pilier
const DEPARTMENTS = [
  // Secteur Frais
  { id: 'boucherie', name: 'Boucherie / Volaille à la coupe', secteur: 'FRAIS' },
  { id: 'poissonnerie', name: 'Poissonnerie', secteur: 'FRAIS' },
  { id: 'traiteur', name: 'Traiteur', secteur: 'FRAIS' },
  { id: 'fromage_charcuterie', name: 'Fromage / Charcuterie à la coupe', secteur: 'FRAIS' },
  { id: 'boulangerie', name: 'Boulangerie / Pâtisserie', secteur: 'FRAIS' },
  { id: 'fruits_legumes', name: 'Fruits et Légumes', secteur: 'FRAIS' },
  { id: 'epices_vrac', name: 'Épices / Olives / Vrac', secteur: 'FRAIS' },

  // Secteur PGC / Non-Alimentaire
  { id: 'electromenager', name: 'Electroménager', secteur: 'PGC' },
  { id: 'textile_pgc', name: 'Textile / Literie / PGC', secteur: 'PGC' },
  { id: 'apls_frais_ls', name: 'Libre Service Frais (APLS)', secteur: 'PGC' },
  { id: 'rayon_pgc_ruptures', name: 'Rayon PGC - Produits Imposés', secteur: 'PGC' },

  // Support / Transversal
  { id: 'confort_environnement', name: 'Confort & Environnement', secteur: 'SUPPORT' },
  { id: 'securite', name: 'Sécurité', secteur: 'SUPPORT' },
  { id: 'caisses', name: 'Caisses', secteur: 'SUPPORT' },
];

async function run() {
  for (const dept of DEPARTMENTS) {
    console.log(`Team: ${dept.id} (${dept.name})`);
    await teams.create(dept.id, dept.name).catch(ignoreIfExists);
  }
  console.log('✅ Teams créées:', DEPARTMENTS.length);
}

function ignoreIfExists(e) {
  if (e?.code !== 409) console.error(e.message || e);
  else console.log('  → déjà existante, ignorée');
}

run().catch(console.error);
