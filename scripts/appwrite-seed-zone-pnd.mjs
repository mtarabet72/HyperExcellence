// ============================================================
// HyperExcellence - Seed d'une zone de test pour le Circuit 3 (PND)
// ============================================================
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const ZONE = {
  department_id: 'boucherie',
  name: 'Rayons Frais - Nettoyage & Désinfection',
  qr_code: 'QR-PND-01',
  risk_level: 'CRITIQUE',
  is_active: true,
};

async function run() {
  const existing = await databases.listDocuments(DB_ID, 'zones', [
    Query.equal('qr_code', ZONE.qr_code),
  ]);
  if (existing.total > 0) {
    console.log('ℹ️ Zone déjà existante:', existing.documents[0].$id);
    return;
  }

  const zone = await databases.createDocument(DB_ID, 'zones', ID.unique(), ZONE);
  console.log('✅ Zone créée:', zone.$id);
  console.log('');
  console.log('=== ZONE ID (à réutiliser dans le code) ===');
  console.log(zone.$id);
  console.log('=============================================');
}

run().catch((e) => {
  console.error('❌ Erreur:', e.message || e);
  process.exit(1);
});
