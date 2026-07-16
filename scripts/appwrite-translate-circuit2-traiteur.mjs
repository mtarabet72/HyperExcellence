// ============================================================
// HyperExcellence - Traduction arabe Circuit 2 - Traiteur
// Remplit label_ar pour les 13 taches deja creees. Idempotent.
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const TRANSLATIONS = {
  80: 'حضور بائع واحد على الأقل في الرف',
  81: 'وضع علامات السعر ومكونات المنتج',
  82: 'الإشارة إلى الزبون في حالة الانشغال خلال 5 دقائق',
  83: 'وزن دقيق أمام الزبون',
  84: 'التحية: صباح الخير، ابتسامة، تواصل بالنظر',
  85: 'زي كامل، نظافة شخصية، بطاقة، قفازات',
  86: 'اكتشاف الحاجة: أسئلة وإعادة الصياغة',
  87: 'الوداع: السؤال عن حاجة إضافية وعبارة مجاملة',
  88: 'الطزاجة ظاهرة والعرض العنائي للمنتج',
  89: 'الواجهة نظيفة، دون بخار، المنتج ظاهر بوضوح',
  91: 'تحضير وتغليف نظيفان',
  92: 'يمنع استخدام الهاتف الشخصي أثناء الخدمة',
  93: 'عدم تجمع الموظفين في الرف',
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
