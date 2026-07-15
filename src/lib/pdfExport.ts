// ============================================================
// HyperExcellence - Export PDF d'audit journalier (Circuit 7)
// Dédoublonne, regroupe par Pilier, inclut les photos preuves.
// Accepte une date cible pour consulter l'historique.
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Query } from 'appwrite';
import { databases } from './appwrite';
import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  TASK_STATUS_LABELS,
  GRAVITE_LABELS,
  PILIER_LABELS_BY_CIRCUIT_NUMBER,
} from '../constants';

function startOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function dedupeLatestPerTask(executions) {
  const latest = {};
  for (const e of executions) {
    const key = e.task_id + '|' + e.zone_id;
    if (!latest[key] || new Date(e.executed_at) > new Date(latest[key].executed_at)) {
      latest[key] = e;
    }
  }
  return Object.values(latest);
}

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateDailyAuditPDF(dateStr) {
  const rangeStart = startOfDay(dateStr);
  const rangeEnd = endOfDay(dateStr);

  const results = await Promise.all([
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_EXECUTIONS, [
      Query.greaterThanEqual('executed_at', rangeStart),
      Query.lessThanEqual('executed_at', rangeEnd),
      Query.limit(1000),
    ]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.NON_CONFORMITES, [
      Query.greaterThanEqual('$createdAt', rangeStart),
      Query.lessThanEqual('$createdAt', rangeEnd),
      Query.limit(1000),
    ]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, [Query.limit(500)]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.CHECKLIST_TEMPLATES, [Query.limit(50)]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(500)]),
  ]);

  const executionsResult = results[0];
  const ncResult = results[1];
  const tasksResult = results[2];
  const checklistsResult = results[3];
  const zonesResult = results[4];
  const profilesResult = results[5];

  const taskLabels = {};
  const taskToChecklist = {};
  for (const t of tasksResult.documents) {
    taskLabels[t.$id] = t.task_number + '. ' + t.label;
    taskToChecklist[t.$id] = t.checklist_id;
  }
  const checklistPilier = {};
  for (const c of checklistsResult.documents) {
    checklistPilier[c.$id] = c.circuit_number;
  }
  const zoneNames = {};
  for (const z of zonesResult.documents) {
    zoneNames[z.$id] = z.name;
  }
  const profileNames = {};
  for (const p of profilesResult.documents) {
    profileNames[p.$id] = p.full_name;
  }

  const executions = dedupeLatestPerTask(executionsResult.documents);
  const total = executions.length;
  const faitCount = executions.filter(function (e) { return e.status === 'FAIT'; }).length;
  const tauxConformite = total > 0 ? Math.round((faitCount / total) * 100) : 0;

  const byPilier = {};
  for (const e of executions) {
    const checklistId = taskToChecklist[e.task_id];
    const pilierNum = checklistPilier[checklistId] || 0;
    if (!byPilier[pilierNum]) byPilier[pilierNum] = [];
    byPilier[pilierNum].push(e);
  }

  const executionsWithPhoto = executions.filter(function (e) { return e.photo_after; });
  const photoCache = {};
  await Promise.all(
    executionsWithPhoto.map(async function (e) {
      photoCache[e.$id] = await fetchImageAsBase64(e.photo_after);
    })
  );

  const doc = new jsPDF();
  const targetDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const formattedDate = targetDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.setFontSize(18);
  doc.setTextColor(11, 61, 145);
  doc.text('HyperExcellence - Audit Journalier', 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(formattedDate, 14, 26);
  doc.text(
    'Taux de conformite global : ' + tauxConformite + '% (' + faitCount + '/' + total + ' taches, dedoublonne)',
    14,
    33
  );

  let currentY = 40;

  const pilierNumbers = Object.keys(byPilier)
    .map(Number)
    .sort(function (a, b) { return a - b; });

  if (pilierNumbers.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(150, 150, 150);
    doc.text('Aucune activite enregistree a cette date.', 14, currentY);
  }

  for (const pilierNum of pilierNumbers) {
    const items = byPilier[pilierNum];
    const pilierTitle = PILIER_LABELS_BY_CIRCUIT_NUMBER[pilierNum] || ('Circuit ' + pilierNum);
    const pilierFait = items.filter(function (e) { return e.status === 'FAIT'; }).length;
    const pilierTaux = items.length > 0 ? Math.round((pilierFait / items.length) * 100) : 0;

    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(11, 61, 145);
    doc.text(pilierTitle + ' - ' + pilierTaux + '% (' + pilierFait + '/' + items.length + ')', 14, currentY);
    currentY += 6;

    const rows = items.map(function (e) {
      return [
        taskLabels[e.task_id] || e.task_id,
        zoneNames[e.zone_id] || e.zone_id,
        profileNames[e.executed_by] || e.executed_by,
        TASK_STATUS_LABELS[e.status] || e.status,
        new Date(e.executed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        e.photo_after ? 'Oui' : '-',
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Tache', 'Zone', 'Execute par', 'Statut', 'Heure', 'Photo']],
      body: rows,
      headStyles: { fillColor: [11, 61, 145] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 60 } },
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  const validPhotos = executionsWithPhoto.filter(function (e) { return photoCache[e.$id]; });
  if (validPhotos.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(11, 61, 145);
    doc.text('Photos - Preuves terrain', 14, 18);

    let px = 14;
    let py = 26;
    const imgSize = 55;
    const gap = 8;

    for (const e of validPhotos) {
      const base64 = photoCache[e.$id];
      if (!base64) continue;

      if (px + imgSize > 196) {
        px = 14;
        py += imgSize + 16;
      }
      if (py + imgSize > 280) {
        doc.addPage();
        px = 14;
        py = 20;
      }

      try {
        doc.addImage(base64, 'JPEG', px, py, imgSize, imgSize);
      } catch (err) {
        // format non supporte
      }

      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      const label = (taskLabels[e.task_id] || e.task_id).slice(0, 40);
      doc.text(label, px, py + imgSize + 4, { maxWidth: imgSize });

      px += imgSize + gap;
    }
  }

  const nc = ncResult.documents;

  doc.addPage();
  let ncY = 20;

  doc.setFontSize(13);
  doc.setTextColor(220, 38, 38);
  doc.text('Non Conformites du jour', 14, ncY);
  ncY += 8;

  if (nc.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Aucune non conformite declaree a cette date.', 14, ncY);
  } else {
    const ncRows = nc.map(function (n) {
      return [
        zoneNames[n.zone_id] || n.zone_id,
        GRAVITE_LABELS[n.gravite] || n.gravite,
        n.action_immediate,
        n.status,
      ];
    });

    autoTable(doc, {
      startY: ncY,
      head: [['Zone', 'Gravite', 'Action immediate', 'Statut']],
      body: ncRows,
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8, cellPadding: 2 },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'HyperExcellence - Marjane Tanger Medina - Genere le ' + new Date().toLocaleString('fr-FR') + ' - Page ' + i + '/' + pageCount,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  const targetDateStr = dateStr || new Date().toISOString().slice(0, 10);
  const filename = 'audit-hyperexcellence-' + targetDateStr + '.pdf';
  doc.save(filename);
}
