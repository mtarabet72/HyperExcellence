// ============================================================
// HyperExcellence - Traduction arabe Circuit 2 - Fruits et Legumes
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
  110: 'حضور بائع واحد على الأقل في الرف',
  111: 'وضع علامات السعر والمنشأ للمنتج',
  112: 'الإشارة إلى الزبون في حالة الانشغال خلال 5 دقائق',
  113: 'التحية: صباح الخير، ابتسامة، تواصل بالنظر',
  114: 'زي كامل، نظافة شخصية، بطاقة ظاهرة',
  115: 'اكتشاف الحاجة: أسئلة وإعادة الصياغة',
  116: 'الوداع: السؤال عن حاجة إضافية وعبارة مجاملة',
  117: 'الطزاجة ظاهرة للمنتجات، فرز المنتجات التالفة',
  118: 'عرض عنائي: ترتيب، إبراز المنتجات',
  119: 'وزن دقيق أمام الزبون',
  120: 'الأكياس والتغليف متوفرة للزبون',
  122: 'يمنع استخدام الهاتف الشخصي أثناء الخدمة',
  123: 'عدم تجمع الموظفين في الرف',
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
