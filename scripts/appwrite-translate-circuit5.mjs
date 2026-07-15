// ============================================================
// HyperExcellence - Traduction arabe du Circuit 5 (Caisses)
// Remplit label_ar pour les 9 taches deja creees. Idempotent.
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const TRANSLATIONS = {
  220: 'الابتسامة',
  221: 'صباح الخير',
  222: 'مع السلامة',
  223: 'شكرا',
  224: 'التواصل بالنظر',
  225: 'الإعلان عن المبلغ الإجمالي بدقة (بالعربية أو الفرنسية)',
  226: 'منطقة الصندوق نظيفة، المعدات تعمل ومتوفرة',
  227: 'طلب بطاقة الولاء مرجان',
  228: 'التقييم العام: هل كانت تجربة الصندوق ممتعة؟ (تقييم من 1 إلى 5)',
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
