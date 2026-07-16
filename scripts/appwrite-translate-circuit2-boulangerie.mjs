// ============================================================
// HyperExcellence - Traduction arabe Circuit 2 - Boulangerie
// Remplit label_ar pour les 14 taches deja creees. Idempotent.
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const TRANSLATIONS = {
  50: 'حضور بائع واحد على الأقل في الرف',
  51: 'وضع علامات السعر بشكل صحيح لكل منتج',
  52: 'الإشارة إلى الزبون في حالة الانشغال خلال 5 دقائق',
  53: 'الميزان موجود ويعمل',
  54: 'التحية: صباح الخير، ابتسامة، تواصل بالنظر',
  55: 'زي كامل، نظافة شخصية، بطاقة، قبعة',
  56: 'اكتشاف الحاجة: أسئلة وإعادة الصياغة',
  57: 'الوداع: السؤال عن حاجة إضافية وعبارة مجاملة',
  58: 'تغليف نظيف وعنايى',
  59: 'ترتيب الواجهة دون خلط بين المنتجات',
  60: 'نصيحة واضحة وجودة ظاهرة للمنتجات',
  62: 'نظافة المعدات (آلة التقطيع، طاولات العمل)',
  63: 'يمنع استخدام الهاتف الشخصي أثناء الخدمة',
  64: 'عدم تجمع الموظفين في الرف',
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
