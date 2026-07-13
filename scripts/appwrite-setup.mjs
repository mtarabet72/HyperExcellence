// ============================================================
// HyperExcellence - Provisioning Appwrite (Boucle 1 - Fondations)
// À exécuter UNE FOIS via GitHub Actions (node-appwrite SDK serveur)
// ============================================================
import { Client, Databases, Permission, Role, IndexType } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'hyperclean_pro';

async function run() {
  console.log('Création de la base...');
  await databases.create(DB_ID, 'HyperExcellence').catch(ignoreIfExists);

  await createCollection('departments', 'Departments', [
    ['name', 'string', 128, true],
    ['type', 'enum', ['COMMERCIAL', 'SERVICE', 'SUPPORT'], true],
    ['sector', 'string', 64, false],
    ['pilier', 'integer', null, false],
    ['is_active', 'boolean', null, true, true],
  ]);

  await createCollection('zones', 'Zones', [
    ['department_id', 'string', 64, true],
    ['name', 'string', 128, true],
    ['qr_code', 'string', 64, true],
    ['risk_level', 'enum', ['CRITIQUE', 'MAJEUR', 'MINEUR'], true],
    ['is_active', 'boolean', null, true, true],
  ], [['qr_code_unique', IndexType.Unique, ['qr_code']]]);

  await createCollection('profiles', 'Profiles', [
    ['user_id', 'string', 64, true],
    ['full_name', 'string', 128, true],
    ['role', 'enum', [
      'ADMIN', 'CHEF_SECTEUR', 'CHEF_DEPARTEMENT', 'CHEF_RAYON',
      'SUPERVISEUR', 'CHEF_SECURITE', 'ASJ', 'CHEF_CAISSE',
      'MAITRE_METIER', 'EMPLOYE',
    ], true],
    ['department_id', 'string', 64, false],
    ['sector', 'string', 64, false],
    ['badge_number', 'string', 32, false],
    ['is_active', 'boolean', null, true, true],
  ], [['user_id_unique', IndexType.Unique, ['user_id']]]);

  await createCollection('checklist_templates', 'ChecklistTemplates', [
    ['department_id', 'string', 64, true],
    ['name', 'string', 128, true],
    ['frequency', 'enum', ['QUOTIDIENNE', 'HEBDO', 'MENSUELLE', 'PONCTUELLE'], true],
    ['prp_ref', 'string', 64, false],
    ['circuit_number', 'integer', null, false],
    ['is_active', 'boolean', null, true, true],
  ]);

  await createCollection('task_templates', 'TaskTemplates', [
    ['checklist_id', 'string', 64, true],
    ['task_number', 'integer', null, true],
    ['label', 'string', 512, true],
    ['requires_photo', 'boolean', null, true, false],
    ['requires_temperature', 'boolean', null, true, false],
    ['default_gravite', 'enum', ['MINEURE', 'MAJEURE', 'CRITIQUE'], true],
    ['sort_order', 'integer', null, false],
    ['is_active', 'boolean', null, true, true],
  ], [['task_number_unique', IndexType.Unique, ['task_number']]]);

  await createCollection('task_executions', 'TaskExecutions', [
    ['zone_id', 'string', 64, true],
    ['task_id', 'string', 64, true],
    ['executed_by', 'string', 64, true],
    ['status', 'enum', ['FAIT', 'NON_FAIT', 'ECART', 'NON_APPLICABLE'], true],
    ['photo_before', 'string', 256, false],
    ['photo_after', 'string', 256, false],
    ['temperature', 'double', null, false],
    ['comment', 'string', 1024, false],
    ['executed_at', 'datetime', null, true],
    ['offline_id', 'string', 64, false],
  ], [['offline_id_unique', IndexType.Unique, ['offline_id']]]);

  await createCollection('non_conformites', 'NonConformites', [
    ['zone_id', 'string', 64, true],
    ['task_execution_id', 'string', 64, false],
    ['gravite', 'enum', ['MINEURE', 'MAJEURE', 'CRITIQUE'], true],
    ['cause', 'string', 512, false],
    ['action_immediate', 'string', 512, true],
    ['declared_by', 'string', 64, true],
    ['status', 'enum', ['OUVERTE', 'EN_COURS', 'CLOTUREE'], true],
    ['closed_at', 'datetime', null, false],
  ]);

  await createCollection('capa', 'CAPA', [
    ['non_conformite_id', 'string', 64, true],
    ['responsable_id', 'string', 64, true],
    ['echeance', 'datetime', null, true],
    ['preuve_correction', 'string', 256, false],
    ['verified_by', 'string', 64, false],
    ['verified_at', 'datetime', null, false],
  ], [['nc_id_unique', IndexType.Unique, ['non_conformite_id']]]);

  await createCollection('audit_log', 'AuditLog', [
    ['actor_id', 'string', 64, false],
    ['action', 'string', 128, true],
    ['entity_type', 'string', 64, true],
    ['entity_id', 'string', 64, true],
    ['payload', 'string', 4096, false],
  ], [], { appendOnly: true });

  console.log('✅ Provisioning terminé.');
}

async function createCollection(id, name, attrs, indexes = [], opts = {}) {
  console.log(`Collection: ${id}`);
  await databases.createCollection(
    DB_ID,
    id,
    name,
    [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      ...(opts.appendOnly ? [] : [Permission.update(Role.users())]),
    ],
    false
  ).catch(ignoreIfExists);

  for (const [key, type, size, required, defaultVal] of attrs) {
    await addAttribute(id, key, type, size, required, defaultVal);
  }
  // Petite pause pour laisser Appwrite indexer les attributs avant les index
  await new Promise((r) => setTimeout(r, 500));

  for (const [key, type, keys] of indexes) {
    await databases.createIndex(DB_ID, id, key, type, keys).catch(ignoreIfExists);
  }
}

async function addAttribute(collectionId, key, type, size, required, defaultVal) {
  const base = [DB_ID, collectionId, key];
  try {
    if (type === 'string') {
      await databases.createStringAttribute(...base, size, required, defaultVal);
    } else if (type === 'integer') {
      await databases.createIntegerAttribute(...base, required, undefined, undefined, defaultVal);
    } else if (type === 'double') {
      await databases.createFloatAttribute(...base, required, undefined, undefined, defaultVal);
    } else if (type === 'boolean') {
      await databases.createBooleanAttribute(...base, required, defaultVal);
    } else if (type === 'datetime') {
      await databases.createDatetimeAttribute(...base, required, defaultVal);
    } else if (type === 'enum') {
      await databases.createEnumAttribute(...base, size, required, defaultVal);
    }
  } catch (e) {
    ignoreIfExists(e);
  }
}

function ignoreIfExists(e) {
  if (e?.code !== 409) console.error(e.message || e);
}

run().catch(console.error);
