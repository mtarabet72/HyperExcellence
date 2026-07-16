// ============================================================
// HyperExcellence - Traduction arabe Circuit 2 - Fromage/Charcuterie
// Remplit label_ar pour les 16 taches deja creees. Idempotent.
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const TRANSLATIONS = {
  124: 'حضور بائع واحد على الأقل في الرف',
  125: 'الإشارة إلى الزبون في حالة الانشغال خلال 5 دقائق',
  126: 'التحية: صباح الخير، ابتسامة، تواصل بالنظر',
  127: 'اكتشاف الحاجة: أسئلة وإعادة الصياغة',
  128: 'نصيحة واضحة ومقنعة ومرضية',
  129: 'زي كامل، نظافة شخصية، بطاقة ظاهرة',
  130: 'ارتداء قفاز في يد واحدة على الأقل، دون تلامس مباشر مع المنتج',
  131: 'وضع علامات المنشأ والسلسلة الغذائية للمنتج',
  132: 'الوداع: السؤال عن حاجة إضافية وعبارة مجاملة',
  133: 'وجود بطاقة السعر لكل منتج',
  134: 'تحضير وتغليف عنايان',
  135: 'الطزاجة ظاهرة للمنتج',
  136: 'الواجهة دون بخار، المنتج ظاهر بوضوح',
  138: 'عدم وجود رائحة كريهة في الرف',
  139: 'يمنع استخدام الهاتف الشخصي أثناء الخدمة',
  140: 'عدم تجمع الموظفين في الرف',
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
