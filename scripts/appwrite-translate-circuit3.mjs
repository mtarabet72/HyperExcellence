// ============================================================
// HyperExcellence - Traduction arabe du Circuit 3 (PND HACCP)
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
  61: 'المخبزة والحلويات - الرف نظيف، المعدات، الأرضية، الجدران، الأدوات',
  76: 'اللحوم والدواجن - الرف نظيف، المعدات، الأرضية، الجدران، الأدوات',
  90: 'الطعام الجاهز - الرف نظيف، المعدات، الأرضية، الجدران، الأدوات',
  105: 'السمك - الرف نظيف، المعدات، الأرضية، الجدران، الأدوات',
  121: 'الفواكه والخضر - الرف نظيف، المعدات، الأرضية، الجدران، الأدوات',
  137: 'الجبن والمقبلات - الرف نظيف، المعدات، الأرضية، الجدران، الأدوات',
  153: 'التوابل والزيتون والمنتجات السائبة - الرف نظيف (نقطة حرجة للمواد المسببة للحساسية)',
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
