// ============================================================
// HyperExcellence - Traduction arabe du Circuit 4 (Libre Service/Ruptures)
// Remplit label_ar pour les 26 taches deja creees. Idempotent.
// ============================================================
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

const TRANSLATIONS = {
  189: 'ترتيب أرفف التبريد للألبان واللحوم الباردة والمجمدات',
  190: 'لا فراغ ظاهر، لا نقص كبير',
  191: 'زجاج أرفف التبريد نظيف دون بقع طازجة',
  192: 'المعدات تعمل: أبواب الثلاجات مغلقة، لا بخار',
  193: 'وضع الأسعار صحيح حسب العائلة',
  194: 'لا منتج يسيل أو يذوب',
  195: 'لا ذباب أو أجسام غريبة أو حشرات',
  196: 'توفر المنتج المطلوب',
  197: 'قارئ الأسعار يعمل بشكل جيد',
  198: 'شاي حبوب Lion 4011 200غ - التوفر والسعر معروض',
  199: 'خميرة Ideal 10 أكياس - التوفر والسعر معروض',
  200: 'كعكة اسفنجية Merendina Big M 52غ - التوفر والسعر معروض',
  201: 'وافل بالكاكاو Tagger 22غ - التوفر والسعر معروض',
  202: 'سكر Cosumar 2 كلغ - التوفر والسعر معروض',
  203: 'كوكاكولا بلاستيك 1 لتر - التوفر والسعر معروض',
  204: 'ماء سيدي علي 1.5 لتر - التوفر والسعر معروض',
  205: 'خبز ساندويتش فردي - التوفر والسعر معروض',
  206: 'خبز عادي - التوفر والسعر معروض',
  207: 'جبلي x2/x3 - التوفر والسعر معروض',
  208: 'حليب جودة معقم 1 لتر بسدادة - التوفر والسعر معروض',
  209: 'رايبي جميلة بالرمان 165غ x8 - التوفر والسعر معروض',
  210: 'ماء عين السايس 5 لتر - التوفر والسعر معروض',
  211: 'جبن بيبي إيدام غراند كور 900غ - التوفر والسعر معروض',
  212: 'دانون أصيل بالفانيليا x8 - التوفر والسعر معروض',
  213: 'زبدة سونطرال 1 كلغ 82% - التوفر والسعر معروض',
  214: 'بيض طبيعي x30 - التوفر والسعر معروض',
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
