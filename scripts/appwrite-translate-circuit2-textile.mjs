// ============================================================
// HyperExcellence - Traduction arabe Circuit 2 - Textile/Literie/PGC
// Remplit label_ar pour les 7 taches deja creees. Idempotent.
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const TRANSLATIONS = {
  164: 'مراقبة وضع العلامات - منطقة النسيج (3 منتجات مراقبة)',
  165: 'عدم وجود فراغ ظاهر - منطقة النسيج',
  175: 'مراقبة وضع العلامات - منطقة الفراش (3 منتجات مراقبة)',
  176: 'عدم وجود فراغ ظاهر - منطقة الفراش',
  180: 'لقاء الزبون: موظف حاضر يحيي',
  182: 'مراقبة وضع العلامات - منطقة المنتجات العامة (3 منتجات مراقبة)',
  183: 'عدم وجود فراغ ظاهر - منطقة المنتجات العامة',
};

async function run() {
  let updated = 0;
  for (const [taskNumber, labelAr] of Object.entries(TRANSLATIONS)) {
    const result = await databases.listDocuments(DB_ID, 'task_templates', [
      Query.equal('task_number', parseInt(taskNumber)),
    ]);
    if (result.documents.length === 0) {
      console.log('Tache ' + taskNumber + ' introuvable, ignoree.');
      continue;
    }
    const doc = result.documents[0];
    await databases.updateDocument(DB_ID, 'task_templates', doc.$id, {
      label_ar: labelAr,
    });
    console.log('Tache ' + taskNumber + ' traduite.');
    updated++;
  }
  console.log('');
  console.log('Termine: ' + updated + ' taches traduites.');
}

run().catch((e) => {
  console.error('Erreur:', e.message || e);
  process.exit(1);
});
