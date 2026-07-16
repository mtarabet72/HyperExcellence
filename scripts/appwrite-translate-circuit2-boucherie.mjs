// ============================================================
// HyperExcellence - Traduction arabe Circuit 2 - Boucherie
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
  65: 'حضور بائع واحد على الأقل في الرف',
  66: 'مدة انتظار الزبون الظاهرة أقل من 5 دقائق',
  67: 'الإشارة إلى الزبون في حالة الانشغال خلال 5 دقائق',
  69: 'التحية: صباح الخير، ابتسامة، تواصل بالنظر',
  70: 'زي كامل، قبعة، قفازات للخدمة',
  71: 'اكتشاف الحاجة: أسئلة وإعادة الصياغة',
  72: 'الوداع: السؤال عن حاجة إضافية وعبارة مجاملة',
  73: 'وضع علامات المنشأ والسلسلة الغذائية للمنتج',
  74: 'التحضير والتغليف نظيفان',
  75: 'وزن دقيق أمام الزبون',
  77: 'عدم وجود بخار على الواجهة (لا يحجب المنتج)',
  78: 'يمنع استخدام الهاتف الشخصي أثناء الخدمة',
  79: 'عدم تجمع الموظفين في الرف',
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
