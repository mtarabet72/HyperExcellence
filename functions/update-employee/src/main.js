// ============================================================
// HyperExcellence - Appwrite Function : modification d'employe
// + Garde-fou de connexion + Escalade automatique CAPA (Cron)
// + Creation NC / Qualification CAPA / Verification CAPA
// + CRUD des taches (Phase 6)
// Fusionne pour rester sous la limite de 2 Functions du plan gratuit.
// ============================================================
import { Client, Databases, Users, Query, ID, Permission, Role } from 'node-appwrite';

const DB_ID = 'hyperclean_pro';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function findProfileByBadge(databases, badgeNumber, log) {
  const all = await databases.listDocuments(DB_ID, 'profiles', [Query.limit(500)]);
  const target = badgeNumber.trim().toLowerCase();
  return all.documents.find(
    (p) => (p.badge_number || '').trim().toLowerCase() === target
  );
}

function labelForRole(role) {
  if (role === 'ADMIN') return 'admin';
  const supervisorRoles = [
    'CHEF_SECTEUR',
    'CHEF_DEPARTEMENT',
    'CHEF_RAYON',
    'CHEF_SECURITE',
    'CHEF_CAISSE',
    'MAITRE_METIER',
  ];
  if (supervisorRoles.includes(role)) return 'supervisor';
  return null;
}

async function escalateOverdueCapas(databases, log) {
  const today = new Date().toISOString().slice(0, 10);
  const capasResult = await databases.listDocuments(DB_ID, 'capa', [
    Query.lessThan('echeance', today),
    Query.isNull('verified_at'),
    Query.limit(200),
  ]);

  let escalatedCount = 0;

  for (const capa of capasResult.documents) {
    if (capa.escalated) continue;

    try {
      const nc = await databases.getDocument(DB_ID, 'non_conformites', capa.non_conformite_id);
      if (nc.status === 'CLOTUREE') continue;

      await databases.updateDocument(DB_ID, 'capa', capa.$id, { escalated: true });

      await databases.createDocument(DB_ID, 'audit_log', ID.unique(), {
        actor_id: null,
        action: 'ESCALADE_AUTOMATIQUE_CAPA',
        entity_type: 'capa',
        entity_id: capa.$id,
        payload: JSON.stringify({
          non_conformite_id: capa.non_conformite_id,
          responsable_id: capa.responsable_id,
          echeance: capa.echeance,
          declenche_le: new Date().toISOString(),
        }),
      });

      escalatedCount++;
      log('CAPA escaladee: ' + capa.$id);
    } catch (e) {
      log('Erreur escalade CAPA ' + capa.$id + ': ' + (e.message || e));
    }
  }

  log('Escalade terminee: ' + escalatedCount + ' CAPA escaladees.');
  return escalatedCount;
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const databases = new Databases(client);
  const users = new Users(client);

  try {
    // ---------- Branche escalade automatique (Cron) ----------
    const trigger = req.headers['x-appwrite-trigger'];
    log('TRIGGER DETECTE: [' + trigger + '] - Tous les headers: ' + JSON.stringify(req.headers));
    if (trigger === 'schedule') {
      log('Declenchement programme detecte, lancement de l\'escalade CAPA...');
      const count = await escalateOverdueCapas(databases, log);
      return res.json({ success: true, escalatedCount: count });
    }

    const body = JSON.parse(req.bodyRaw || '{}');
    log('BODY RECU: ' + JSON.stringify(body));

    // ---------- Branche garde-fou PIN (pas d'auth requise) ----------
    if (body.action === 'check' || body.action === 'fail' || body.action === 'reset') {
      const { badgeNumber, action } = body;
      if (!badgeNumber) {
        return res.json({ error: 'badgeNumber manquant.' }, 400);
      }

      const profile = await findProfileByBadge(databases, badgeNumber, log);

      if (!profile) {
        return res.json({ allowed: true });
      }

      if (action === 'check') {
        const now = new Date();
        if (profile.locked_until && new Date(profile.locked_until) > now) {
          const minutesLeft = Math.ceil((new Date(profile.locked_until) - now) / 60000);
          return res.json({ allowed: false, minutesLeft });
        }
        return res.json({ allowed: true });
      }

      if (action === 'fail') {
        const attempts = (profile.failed_attempts || 0) + 1;
        const payload = { failed_attempts: attempts };
        if (attempts >= MAX_ATTEMPTS) {
          payload.locked_until = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
          payload.failed_attempts = 0;
        }
        await databases.updateDocument(DB_ID, 'profiles', profile.$id, payload);
        log('Echec enregistre pour badge ' + badgeNumber + ' (' + attempts + '/' + MAX_ATTEMPTS + ')');
        return res.json({ recorded: true, attempts, locked: attempts >= MAX_ATTEMPTS });
      }

      if (action === 'reset') {
        await databases.updateDocument(DB_ID, 'profiles', profile.$id, {
          failed_attempts: 0,
          locked_until: null,
        });
        return res.json({ reset: true });
      }
    }

    // ---------- Branche creation NC (tout employe authentifie) ----------
    if (body.action === 'create_nc') {
      const callerUserId = req.headers['x-appwrite-user-id'];
      if (!callerUserId) {
        return res.json({ error: 'Non authentifie.' }, 401);
      }

      const callerProfiles = await databases.listDocuments(DB_ID, 'profiles', [
        Query.equal('user_id', callerUserId),
      ]);
      const callerProfile = callerProfiles.documents[0];
      if (!callerProfile) {
        return res.json({ error: 'Profil introuvable.' }, 403);
      }

      const { zoneId, taskExecutionId, gravite, actionImmediate } = body;
      if (!zoneId || !gravite || !actionImmediate) {
        return res.json({ error: 'Champs requis manquants.' }, 400);
      }

      const nc = await databases.createDocument(
        DB_ID,
        'non_conformites',
        ID.unique(),
        {
          zone_id: zoneId,
          task_execution_id: taskExecutionId || null,
          gravite,
          cause: null,
          action_immediate: actionImmediate,
          declared_by: callerProfile.$id,
          status: 'OUVERTE',
          closed_at: null,
        },
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(callerUserId)),
          Permission.update(Role.label('admin')),
          Permission.update(Role.label('supervisor')),
        ]
      );

      log('NC creee via Function: ' + nc.$id);
      return res.json({ success: true, ncId: nc.$id });
    }

    // ---------- Branche qualification NC + creation CAPA ----------
    if (body.action === 'qualify_capa') {
      const callerUserId = req.headers['x-appwrite-user-id'];
      if (!callerUserId) {
        return res.json({ error: 'Non authentifie.' }, 401);
      }

      const callerProfiles = await databases.listDocuments(DB_ID, 'profiles', [
        Query.equal('user_id', callerUserId),
      ]);
      const callerProfile = callerProfiles.documents[0];
      if (!callerProfile) {
        return res.json({ error: 'Profil introuvable.' }, 403);
      }

      const { ncId, causeRacine, responsableId, echeance } = body;
      if (!ncId || !causeRacine || !responsableId || !echeance) {
        return res.json({ error: 'Champs requis manquants.' }, 400);
      }

      const nc = await databases.getDocument(DB_ID, 'non_conformites', ncId);

      const ROLE_RANK = {
        EMPLOYE: 0, ASJ: 0, SUPERVISEUR: 0,
        CHEF_CAISSE: 1, CHEF_SECURITE: 1, MAITRE_METIER: 1, CHEF_RAYON: 1,
        CHEF_DEPARTEMENT: 2, CHEF_SECTEUR: 3, ADMIN: 4,
      };
      const GRAVITE_MIN_RANK = { MINEURE: 1, MAJEURE: 2, CRITIQUE: 4 };

      const rank = ROLE_RANK[callerProfile.role] ?? -1;
      const canQualify =
        callerProfile.role !== 'SUPERVISEUR' &&
        rank >= (GRAVITE_MIN_RANK[nc.gravite] ?? 99);

      if (!canQualify) {
        return res.json({ error: 'Role insuffisant pour qualifier cette NC.' }, 403);
      }

      await databases.updateDocument(DB_ID, 'non_conformites', ncId, {
        status: 'EN_COURS',
        cause: causeRacine,
      });

      const responsableProfile = await databases.getDocument(DB_ID, 'profiles', responsableId);

      const capa = await databases.createDocument(
        DB_ID,
        'capa',
        ID.unique(),
        {
          non_conformite_id: ncId,
          responsable_id: responsableId,
          echeance,
          preuve_correction: null,
          verified_by: null,
          verified_at: null,
        },
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(responsableProfile.user_id)),
          Permission.update(Role.label('admin')),
          Permission.update(Role.label('supervisor')),
        ]
      );

      await databases.createDocument(DB_ID, 'audit_log', ID.unique(), {
        actor_id: callerProfile.$id,
        action: 'QUALIFICATION_CAPA_CREEE',
        entity_type: 'non_conformite',
        entity_id: ncId,
        payload: JSON.stringify({ causeRacine, responsableId, echeance }),
      });

      log('CAPA creee via Function: ' + capa.$id);
      return res.json({ success: true, capaId: capa.$id });
    }

    // ---------- Branche verification + cloture CAPA (ADMIN uniquement) ----------
    if (body.action === 'verify_capa') {
      const callerUserId = req.headers['x-appwrite-user-id'];
      if (!callerUserId) {
        return res.json({ error: 'Non authentifie.' }, 401);
      }

      const callerProfiles = await databases.listDocuments(DB_ID, 'profiles', [
        Query.equal('user_id', callerUserId),
      ]);
      const callerProfile = callerProfiles.documents[0];
      if (!callerProfile || callerProfile.role !== 'ADMIN') {
        return res.json({ error: 'Reserve aux administrateurs.' }, 403);
      }

      const { capaId, ncId, preuveCorrection, signatureName } = body;
      if (!capaId || !ncId || !preuveCorrection || !signatureName) {
        return res.json({ error: 'Champs requis manquants.' }, 400);
      }

      const now = new Date().toISOString();

      await databases.updateDocument(DB_ID, 'capa', capaId, {
        preuve_correction: preuveCorrection,
        verified_by: callerProfile.$id,
        verified_at: now,
      });

      await databases.updateDocument(DB_ID, 'non_conformites', ncId, {
        status: 'CLOTUREE',
        closed_at: now,
      });

      await databases.createDocument(DB_ID, 'audit_log', ID.unique(), {
        actor_id: callerProfile.$id,
        action: 'CAPA_VERIFIEE_CLOTUREE',
        entity_type: 'non_conformite',
        entity_id: ncId,
        payload: JSON.stringify({ preuveCorrection, signature: signatureName, verifiedAt: now }),
      });

      log('CAPA verifiee et cloturee via Function: ' + capaId);
      return res.json({ success: true });
    }

    // ---------- Branche cloture directe NC (ADMIN uniquement) ----------
    if (body.action === 'close_nc') {
      const callerUserId = req.headers['x-appwrite-user-id'];
      if (!callerUserId) {
        return res.json({ error: 'Non authentifie.' }, 401);
      }

      const callerProfiles = await databases.listDocuments(DB_ID, 'profiles', [
        Query.equal('user_id', callerUserId),
      ]);
      const callerProfile = callerProfiles.documents[0];
      if (!callerProfile || callerProfile.role !== 'ADMIN') {
        return res.json({ error: 'Reserve aux administrateurs.' }, 403);
      }

      const { ncId } = body;
      if (!ncId) {
        return res.json({ error: 'ncId manquant.' }, 400);
      }

      const now = new Date().toISOString();

      await databases.updateDocument(DB_ID, 'non_conformites', ncId, {
        status: 'CLOTUREE',
        closed_at: now,
      });

      await databases.createDocument(DB_ID, 'audit_log', ID.unique(), {
        actor_id: callerProfile.$id,
        action: 'NC_CLOTUREE_DIRECTEMENT',
        entity_type: 'non_conformite',
        entity_id: ncId,
        payload: JSON.stringify({ cloture_le: now }),
      });

      log('NC cloturee directement via Function: ' + ncId);
      return res.json({ success: true });
    }

    // ---------- Branche CRUD taches (ADMIN uniquement) ----------
    if (
      body.action === 'create_task' ||
      body.action === 'update_task' ||
      body.action === 'toggle_task'
    ) {
      const callerUserId = req.headers['x-appwrite-user-id'];
      if (!callerUserId) {
        return res.json({ error: 'Non authentifie.' }, 401);
      }

      const callerProfiles = await databases.listDocuments(DB_ID, 'profiles', [
        Query.equal('user_id', callerUserId),
      ]);
      const callerProfile = callerProfiles.documents[0];
      if (!callerProfile || callerProfile.role !== 'ADMIN') {
        return res.json({ error: 'Reserve aux administrateurs.' }, 403);
      }

      const GRAVITES_VALIDES = ['MINEURE', 'MAJEURE', 'CRITIQUE'];

      // Verifie le format "HH:MM" d'une heure cible.
      function heureValide(v) {
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
      }

      // ----- Creation -----
      if (body.action === 'create_task') {
        const {
          checklistId,
          taskNumber,
          label,
          labelAr,
          defaultGravite,
          sortOrder,
          requiresPhoto,
          requiresTemperature,
          executionTime,
        } = body;

        if (!checklistId || !label || taskNumber === undefined) {
          return res.json({ error: 'Champs requis manquants.' }, 400);
        }
        if (!GRAVITES_VALIDES.includes(defaultGravite)) {
          return res.json({ error: 'Gravite invalide.' }, 400);
        }
        if (executionTime && !heureValide(executionTime)) {
          return res.json({ error: 'Heure cible invalide (format HH:MM).' }, 400);
        }

        const task = await databases.createDocument(DB_ID, 'task_templates', ID.unique(), {
          checklist_id: checklistId,
          task_number: Number(taskNumber),
          label,
          label_ar: labelAr || null,
          requires_photo: !!requiresPhoto,
          requires_temperature: !!requiresTemperature,
          default_gravite: defaultGravite,
          sort_order: sortOrder !== undefined ? Number(sortOrder) : Number(taskNumber),
          is_active: true,
          execution_time: executionTime || null,
        });

        await databases.createDocument(DB_ID, 'audit_log', ID.unique(), {
          actor_id: callerProfile.$id,
          action: 'TACHE_CREEE',
          entity_type: 'task_template',
          entity_id: task.$id,
          payload: JSON.stringify({ checklistId, taskNumber, label }),
        });

        log('Tache creee: ' + task.$id);
        return res.json({ success: true, taskId: task.$id });
      }

      // ----- Modification -----
      if (body.action === 'update_task') {
        const {
          taskId,
          label,
          labelAr,
          defaultGravite,
          taskNumber,
          sortOrder,
          requiresPhoto,
          requiresTemperature,
          executionTime,
        } = body;

        if (!taskId) {
          return res.json({ error: 'taskId manquant.' }, 400);
        }
        if (defaultGravite !== undefined && !GRAVITES_VALIDES.includes(defaultGravite)) {
          return res.json({ error: 'Gravite invalide.' }, 400);
        }
        if (executionTime && !heureValide(executionTime)) {
          return res.json({ error: 'Heure cible invalide (format HH:MM).' }, 400);
        }

        const payload = {};
        if (label !== undefined) payload.label = label;
        if (labelAr !== undefined) payload.label_ar = labelAr || null;
        if (defaultGravite !== undefined) payload.default_gravite = defaultGravite;
        if (taskNumber !== undefined) payload.task_number = Number(taskNumber);
        if (sortOrder !== undefined) payload.sort_order = Number(sortOrder);
        if (requiresPhoto !== undefined) payload.requires_photo = !!requiresPhoto;
        if (requiresTemperature !== undefined)
          payload.requires_temperature = !!requiresTemperature;
        // chaine vide = on efface l'heure cible
        if (executionTime !== undefined) payload.execution_time = executionTime || null;

        await databases.updateDocument(DB_ID, 'task_templates', taskId, payload);

        await databases.createDocument(DB_ID, 'audit_log', ID.unique(), {
          actor_id: callerProfile.$id,
          action: 'TACHE_MODIFIEE',
          entity_type: 'task_template',
          entity_id: taskId,
          payload: JSON.stringify(payload),
        });

        log('Tache modifiee: ' + taskId);
        return res.json({ success: true, taskId });
      }

      // ----- Activation / desactivation -----
      if (body.action === 'toggle_task') {
        const { taskId, isActive } = body;
        if (!taskId || isActive === undefined) {
          return res.json({ error: 'taskId ou isActive manquant.' }, 400);
        }

        await databases.updateDocument(DB_ID, 'task_templates', taskId, {
          is_active: !!isActive,
        });

        await databases.createDocument(DB_ID, 'audit_log', ID.unique(), {
          actor_id: callerProfile.$id,
          action: isActive ? 'TACHE_REACTIVEE' : 'TACHE_DESACTIVEE',
          entity_type: 'task_template',
          entity_id: taskId,
          payload: JSON.stringify({ isActive: !!isActive }),
        });

        log('Tache ' + (isActive ? 'reactivee' : 'desactivee') + ': ' + taskId);
        return res.json({ success: true, taskId });
      }
    }

    // ---------- Branche modification employe (ADMIN requis) ----------
    const callerUserId = req.headers['x-appwrite-user-id'];
    if (!callerUserId) {
      return res.json({ error: 'Non authentifie.' }, 401);
    }

    const callerProfiles = await databases.listDocuments(DB_ID, 'profiles', [
      Query.equal('user_id', callerUserId),
    ]);
    const callerProfile = callerProfiles.documents[0];
    if (!callerProfile || callerProfile.role !== 'ADMIN') {
      return res.json({ error: 'Reserve aux administrateurs.' }, 403);
    }

    const { profileId, fullName, role, departmentId, sector, isActive } = body;
    if (!profileId) {
      return res.json({ error: 'profileId manquant.' }, 400);
    }

    const payload = {};
    if (fullName !== undefined) payload.full_name = fullName;
    if (role !== undefined) payload.role = role;
    if (departmentId !== undefined) payload.department_id = departmentId || null;
    if (sector !== undefined) payload.sector = sector || null;
    if (isActive !== undefined) payload.is_active = isActive;

    const updated = await databases.updateDocument(DB_ID, 'profiles', profileId, payload);
    log('Profil modifie: ' + profileId);

    if (role !== undefined && updated.user_id) {
      try {
        const label = labelForRole(role);
        await users.updateLabels(updated.user_id, label ? [label] : []);
        log('Label synchronise pour ' + updated.user_id + ': ' + (label || 'aucun'));
      } catch (labelErr) {
        log('Erreur synchro label (non bloquant): ' + (labelErr.message || labelErr));
      }
    }

    return res.json({ success: true, profileId: updated.$id });
  } catch (e) {
    error(e.message || String(e));
    return res.json({ error: e.message || 'Erreur inconnue.' }, 500);
  }
};
