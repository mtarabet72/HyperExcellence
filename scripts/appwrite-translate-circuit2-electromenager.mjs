// ============================================================
// HyperExcellence - Traduction arabe Circuit 2 - Electromenager
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
  34: 'حضور بائع واحد على الأقل في الرف',
  35: 'الإشارة إلى الزبون خلال 5 دقائق في حالة الانشغال',
  36: 'التحية: صباح الخير، ابتسامة، تواصل بالنظر',
  37: 'زي كامل، نظافة شخصية، بطاقة ظاهرة',
  38: 'اكتشاف الحاجة: أسئلة وإعادة الصياغة',
  40: 'نصيحة واضحة ومقنعة ومرضية',
  41: 'الوداع: السؤال عن حاجة إضافية وعبارة مجاملة',
  42: 'وضع علامات السعر والبطاقة التقنية الكاملة لكل منتج',
  43: 'عرض المنتجات دون فراغ ظاهر',
  44: 'توفر المنتج المطلوب',
  45: 'مدة انتظار صندوق الأجهزة المنزلية أقل من أو تساوي 3 زبناء',
  47: 'المعدات تعمل: جهاز الدفع والطابعة يعملان',
  48: 'يمنع استخدام الهاتف الشخصي أثناء الخدمة',
  49: 'عدم تجمع الموظفين في الرف',
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
