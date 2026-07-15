// ============================================================
// HyperExcellence - Traduction arabe du Circuit 1 (Confort)
// Remplit label_ar pour les 22 taches deja creees. Idempotent.
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const TRANSLATIONS = {
  1: 'الموقف نظيف (فحص بصري)',
  2: 'الموقف آمن: لا متسولين، لا كلاب ضالة، الإنارة تعمل',
  3: 'مكان متاح دون عرقلة بعربات التسوق أو النفايات',
  4: 'الممرات خالية، التنقل سهل',
  5: 'حاويات النفايات متوفرة وغير ممتلئة',
  6: 'توفر عربات التسوق بما فيها 160 لتر للمتاجر المدمجة',
  7: 'سلال المشتريات الصغيرة متوفرة',
  8: 'عربات التسوق في حالة جيدة وتتحرك بسلاسة',
  9: 'عربات التسوق نظيفة، دون مناديل أو تذاكر',
  10: 'مأوى عربات التسوق نظيف ومصان',
  11: 'الواجهة واللافتة نظيفة ومضاءة في المساء',
  12: 'الإضاءة والموسيقى الخلفية (تقييم من 1 إلى 5)',
  13: 'التكييف مضبوط بشكل جيد (22-24 درجة)',
  14: 'لافتات التوجيه في حالة جيدة',
  15: 'المرحاض نظيف وصحي',
  16: 'المرحاض يعمل: المغاسل، السيفون، موزع الصابون، القفل، الإنارة',
  17: 'المستلزمات متوفرة: الصابون، ورق التواليت',
  18: 'الممرات المركزية وخط الصناديق نظيفة وخالية',
  20: 'عدم وجود رائحة كريهة',
  24: 'الأعوان حاضرون أمام الصناديق',
  25: 'ارتداء البطاقة بشكل ظاهر',
  26: 'النظافة الشخصية والزي الكامل نظيف ومكوي',
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
