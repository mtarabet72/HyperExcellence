// ============================================================
// HyperExcellence - Traduction arabe Circuit 2 - Poissonnerie
// Remplit label_ar pour les 15 taches deja creees. Idempotent.
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const TRANSLATIONS = {
  94: 'حضور بائع واحد على الأقل في الرف',
  95: 'وضع علامات السعر والمنشأ للمنتج',
  96: 'الإشارة إلى الزبون في حالة الانشغال خلال 5 دقائق',
  97: 'وزن دقيق أمام الزبون',
  98: 'التحية: صباح الخير، ابتسامة، تواصل بالنظر',
  99: 'زي كامل، نظافة شخصية، بطاقة، قفازات',
  100: 'اكتشاف الحاجة: أسئلة وإعادة الصياغة',
  101: 'الوداع: السؤال عن حاجة إضافية وعبارة مجاملة',
  102: 'الطزاجة ظاهرة للمنتج (عين صافية، رائحة محايدة)',
  103: 'الثلج / الطاولة المبردة معبأة بشكل صحيح',
  104: 'تحضير وتغليف نظيفان',
  106: 'التزام النظافة والجودة لمرجان معروض في الرف',
  107: 'عدم وجود رائحة كريهة في الرف',
  108: 'يمنع استخدام الهاتف الشخصي أثناء الخدمة',
  109: 'عدم تجمع الموظفين في الرف',
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
