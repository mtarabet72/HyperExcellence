// ============================================================
// HyperExcellence - Export PDF d'audit journalier (Circuit 7)
// + Rapports periodiques Semaine/Mois/Trimestre/Semestre/Annee
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
  SECTOR_LABELS,
  ROLE_LABELS,
} from '../constants';
import { getLocalDateKey, getPermanenceForDate } from './permanence';
import { listAllFunctionTasks, getPeriodKey } from './functionTasks';

function startOfDay(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function dedupeLatestPerTask(executions: any[]): any[] {
  const latest: any = {};
  for (const e of executions) {
    const key = e.task_id + '|' + e.zone_id;
    if (!latest[key] || new Date(e.executed_at) > new Date(latest[key].executed_at)) {
      latest[key] = e;
    }
  }
  return Object.values(latest);
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateDailyAuditPDF(dateStr?: string) {
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

  const executionsResult: any = results[0];
  const ncResult: any = results[1];
  const tasksResult: any = results[2];
  const checklistsResult: any = results[3];
  const zonesResult: any = results[4];
  const profilesResult: any = results[5];

  const taskLabels: any = {};
  const taskToChecklist: any = {};
  for (const t of tasksResult.documents as any[]) {
    taskLabels[t.$id] = t.task_number + '. ' + t.label;
    taskToChecklist[t.$id] = t.checklist_id;
  }
  const checklistPilier: any = {};
  for (const c of checklistsResult.documents as any[]) {
    checklistPilier[c.$id] = c.circuit_number;
  }
  const zoneNames: any = {};
  for (const z of zonesResult.documents as any[]) {
    zoneNames[z.$id] = z.name;
  }
  const profileNames: any = {};
  for (const p of profilesResult.documents as any[]) {
    profileNames[p.$id] = p.full_name;
  }

  const executions = dedupeLatestPerTask(executionsResult.documents);
  const total = executions.length;
  const faitCount = executions.filter((e: any) => e.status === 'FAIT').length;
  const tauxConformite = total > 0 ? Math.round((faitCount / total) * 100) : 0;

  const byPilier: any = {};
  for (const e of executions as any[]) {
    const checklistId = taskToChecklist[e.task_id];
    const pilierNum = checklistPilier[checklistId] || 0;
    if (!byPilier[pilierNum]) byPilier[pilierNum] = [];
    byPilier[pilierNum].push(e);
  }

  const executionsWithPhoto = (executions as any[]).filter((e: any) => e.photo_after);
  const photoCache: any = {};
  await Promise.all(
    executionsWithPhoto.map(async (e: any) => {
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
    .sort((a: number, b: number) => a - b);

  if (pilierNumbers.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(150, 150, 150);
    doc.text('Aucune activite enregistree a cette date.', 14, currentY);
  }

  for (const pilierNum of pilierNumbers) {
    const items = byPilier[pilierNum];
    const pilierTitle = PILIER_LABELS_BY_CIRCUIT_NUMBER[pilierNum] || ('Circuit ' + pilierNum);
    const pilierFait = items.filter((e: any) => e.status === 'FAIT').length;
    const pilierTaux = items.length > 0 ? Math.round((pilierFait / items.length) * 100) : 0;

    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(11, 61, 145);
    doc.text(pilierTitle + ' - ' + pilierTaux + '% (' + pilierFait + '/' + items.length + ')', 14, currentY);
    currentY += 6;

    const rows = items.map((e: any) => [
      taskLabels[e.task_id] || e.task_id,
      zoneNames[e.zone_id] || e.zone_id,
      profileNames[e.executed_by] || e.executed_by,
      TASK_STATUS_LABELS[e.status as keyof typeof TASK_STATUS_LABELS] || e.status,
      new Date(e.executed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      e.photo_after ? 'Oui' : '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Tache', 'Zone', 'Execute par', 'Statut', 'Heure', 'Photo']],
      body: rows,
      headStyles: { fillColor: [11, 61, 145] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 60 } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  const validPhotos = executionsWithPhoto.filter((e: any) => photoCache[e.$id]);
  if (validPhotos.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(11, 61, 145);
    doc.text('Photos - Preuves terrain', 14, 18);

    let px = 14;
    let py = 26;
    const imgSize = 55;
    const gap = 8;

    for (const e of validPhotos as any[]) {
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
      } catch {
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
    const ncRows = (nc as any[]).map((n: any) => [
      zoneNames[n.zone_id] || n.zone_id,
      GRAVITE_LABELS[n.gravite as keyof typeof GRAVITE_LABELS] || n.gravite,
      n.action_immediate,
      n.status,
    ]);

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

// ============================================================
// Rapports periodiques (Semaine/Mois/Trimestre/Semestre/Annee)
// Complement au rapport journalier ci-dessus. Contenu allege pour
// rester lisible sur une longue periode (pas de tableau ligne-par-ligne,
// pas de photos). Inclut aussi Permanence et Taches de fonction.
// ============================================================

export type PeriodType = 'SEMAINE' | 'MOIS' | 'TRIMESTRE' | 'SEMESTRE' | 'ANNEE';

const PERIOD_LABELS: Record<PeriodType, string> = {
  SEMAINE: 'Hebdomadaire',
  MOIS: 'Mensuel',
  TRIMESTRE: 'Trimestriel',
  SEMESTRE: 'Semestriel',
  ANNEE: 'Annuel',
};

function getPeriodDateRange(
  periodType: PeriodType,
  referenceDateStr?: string
): { start: Date; end: Date; label: string } {
  const ref = referenceDateStr ? new Date(referenceDateStr + 'T00:00:00') : new Date();
  let start: Date;
  let end: Date;

  if (periodType === 'SEMAINE') {
    const day = ref.getDay() || 7; // lundi=1 ... dimanche=7
    start = new Date(ref);
    start.setDate(ref.getDate() - day + 1);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (periodType === 'MOIS') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  } else if (periodType === 'TRIMESTRE') {
    const q = Math.floor(ref.getMonth() / 3);
    start = new Date(ref.getFullYear(), q * 3, 1);
    end = new Date(ref.getFullYear(), q * 3 + 3, 0);
  } else if (periodType === 'SEMESTRE') {
    const h = ref.getMonth() < 6 ? 0 : 6;
    start = new Date(ref.getFullYear(), h, 1);
    end = new Date(ref.getFullYear(), h + 6, 0);
  } else {
    start = new Date(ref.getFullYear(), 0, 1);
    end = new Date(ref.getFullYear(), 11, 31);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { start, end, label: fmt(start) + ' au ' + fmt(end) };
}

/** Toutes les cles de date locale (YYYY-MM-DD) entre deux dates, incluses. Plafonne a 400 jours par securite. */
function enumerateDateKeys(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(getLocalDateKey(cur));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
}

function dedupeLatestPerTaskPerDay(executions: any[]): any[] {
  const latest: Record<string, any> = {};
  for (const e of executions) {
    const day = (e.executed_at || '').slice(0, 10);
    const key = e.task_id + '|' + e.zone_id + '|' + day;
    if (!latest[key] || new Date(e.executed_at) > new Date(latest[key].executed_at)) {
      latest[key] = e;
    }
  }
  return Object.values(latest);
}

export async function generatePeriodAuditPDF(periodType: PeriodType, referenceDateStr?: string) {
  const { start, end, label } = getPeriodDateRange(periodType, referenceDateStr);
  const rangeStart = start.toISOString();
  const rangeEnd = end.toISOString();

  const [executionsResult, ncResult, tasksResult, checklistsResult, zonesResult, profilesResult] =
    await Promise.all([
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

  const taskToChecklist: any = {};
  for (const t of tasksResult.documents as any[]) {
    taskToChecklist[t.$id] = t.checklist_id;
  }
  const checklistPilier: any = {};
  for (const c of checklistsResult.documents as any[]) {
    checklistPilier[c.$id] = c.circuit_number;
  }
  const zoneNames: any = {};
  for (const z of zonesResult.documents as any[]) {
    zoneNames[z.$id] = z.name;
  }
  const profileNames: any = {};
  for (const p of profilesResult.documents as any[]) {
    profileNames[p.$id] = p.full_name;
  }

  // ---------- Agregation circuits, dedoublonnee par jour ----------
  const executions = dedupeLatestPerTaskPerDay(executionsResult.documents);
  const totalExec = executions.length;
  const faitExec = executions.filter((e: any) => e.status === 'FAIT').length;
  const tauxGlobal = totalExec > 0 ? Math.round((faitExec / totalExec) * 100) : 0;

  const byPilier: Record<string, { fait: number; total: number; nom: string }> = {};
  for (const e of executions as any[]) {
    const checklistId = taskToChecklist[e.task_id];
    const pilierNum = checklistPilier[checklistId] || 0;
    const key = String(pilierNum);
    if (!byPilier[key]) {
      byPilier[key] = {
        fait: 0,
        total: 0,
        nom: PILIER_LABELS_BY_CIRCUIT_NUMBER[pilierNum] || 'Circuit ' + pilierNum,
      };
    }
    byPilier[key].total++;
    if (e.status === 'FAIT') byPilier[key].fait++;
  }

  // ---------- Agregation NC ----------
  const ncDocs = ncResult.documents as any[];
  const ncByGravite: Record<string, number> = { MINEURE: 0, MAJEURE: 0, CRITIQUE: 0 };
  const ncClosed = ncDocs.filter((n) => n.status === 'CLOTUREE').length;
  const zoneRiskCount: Record<string, number> = {};
  for (const n of ncDocs) {
    ncByGravite[n.gravite] = (ncByGravite[n.gravite] || 0) + 1;
    zoneRiskCount[n.zone_id] = (zoneRiskCount[n.zone_id] || 0) + 1;
  }
  const topZones = Object.entries(zoneRiskCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ---------- Permanence : couverture par responsable, jours non couverts ----------
  const dateKeys = enumerateDateKeys(start, end);
  const permDays = await Promise.all(dateKeys.map((d) => getPermanenceForDate(d)));
  const permByResponsable: Record<string, { matin: number; soir: number; tranche: number }> = {};
  let joursNonCouverts = 0;
  for (const day of permDays) {
    let covered = false;
    if (day.matinUserId) {
      covered = true;
      permByResponsable[day.matinUserId] = permByResponsable[day.matinUserId] || {
        matin: 0,
        soir: 0,
        tranche: 0,
      };
      permByResponsable[day.matinUserId].matin++;
    }
    if (day.soirUserId) {
      covered = true;
      permByResponsable[day.soirUserId] = permByResponsable[day.soirUserId] || {
        matin: 0,
        soir: 0,
        tranche: 0,
      };
      permByResponsable[day.soirUserId].soir++;
    }
    if (day.trancheUserId) {
      covered = true;
      permByResponsable[day.trancheUserId] = permByResponsable[day.trancheUserId] || {
        matin: 0,
        soir: 0,
        tranche: 0,
      };
      permByResponsable[day.trancheUserId].tranche++;
    }
    if (!covered) joursNonCouverts++;
  }

  // ---------- Taches de fonction : validees / attendues sur la periode ----------
  const allFunctionTasks = await listAllFunctionTasks();
  const activeFunctionTasks = allFunctionTasks.filter((t) => t.isActive);
  const functionRows: string[][] = [];
  for (const task of activeFunctionTasks) {
    const expectedKeys = new Set(
      dateKeys.map((d) => getPeriodKey(task.frequency, new Date(d + 'T00:00:00')))
    );
    const completionsResult = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      'functiontaskcompletions',
      [Query.equal('task_id', task.$id), Query.limit(1000)]
    );
    const validatedKeys = new Set(
      (completionsResult.documents as any[])
        .map((c) => c.period_key)
        .filter((k) => expectedKeys.has(k))
    );
    const sectorLabel = task.sector
      ? SECTOR_LABELS[task.sector as keyof typeof SECTOR_LABELS]
      : '';
    functionRows.push([
      task.label + (sectorLabel ? ' (' + sectorLabel + ')' : ''),
      ROLE_LABELS[task.role] || task.role,
      validatedKeys.size + ' / ' + expectedKeys.size,
    ]);
  }

  // ---------- Construction du PDF ----------
  const doc = new jsPDF();
  const periodTitle = PERIOD_LABELS[periodType];

  doc.setFontSize(18);
  doc.setTextColor(11, 61, 145);
  doc.text('HyperExcellence - Rapport ' + periodTitle, 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('Periode : ' + label, 14, 26);
  doc.text(
    'Taux de conformite global : ' +
      tauxGlobal +
      '% (' +
      faitExec +
      '/' +
      totalExec +
      ' taches, dedoublonne/jour)',
    14,
    33
  );

  let y = 42;

  // ---- Circuits, par pilier ----
  doc.setFontSize(13);
  doc.setTextColor(11, 61, 145);
  doc.text('Conformite par pilier', 14, y);
  y += 6;

  const pilierRows = Object.values(byPilier).map((p) => [
    p.nom,
    p.total > 0 ? Math.round((p.fait / p.total) * 100) + '%' : '—',
    p.fait + ' / ' + p.total,
  ]);
  if (pilierRows.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Aucune activite enregistree sur cette periode.', 14, y);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Pilier', 'Taux', 'Fait / Total']],
      body: pilierRows,
      headStyles: { fillColor: [11, 61, 145] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ---- NC ----
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(13);
  doc.setTextColor(220, 38, 38);
  doc.text('Non Conformites de la periode', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Gravite', 'Nombre']],
    body: [
      ['Mineure', String(ncByGravite.MINEURE || 0)],
      ['Majeure', String(ncByGravite.MAJEURE || 0)],
      ['Critique', String(ncByGravite.CRITIQUE || 0)],
      ['Total (' + ncClosed + ' cloturees)', String(ncDocs.length)],
    ],
    headStyles: { fillColor: [220, 38, 38] },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (topZones.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text('Zones les plus a risque', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Zone', 'Nombre de NC']],
      body: topZones.map(([zoneId, count]) => [zoneNames[zoneId] || zoneId, String(count)]),
      headStyles: { fillColor: [150, 60, 60] },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ---- Permanence ----
  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(13);
  doc.setTextColor(11, 61, 145);
  doc.text('Permanence Magasin', 14, y);
  y += 6;

  const permRows = Object.entries(permByResponsable).map(([userId, counts]) => [
    profileNames[userId] || userId,
    String(counts.matin),
    String(counts.soir),
    String(counts.tranche),
  ]);
  autoTable(doc, {
    startY: y,
    head: [['Responsable', 'Matin', 'Soir', 'Tranche']],
    body: permRows.length > 0 ? permRows : [['Aucune affectation sur cette periode', '-', '-', '-']],
    headStyles: { fillColor: [11, 61, 145] },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(9);
  doc.setTextColor(150, 100, 20);
  doc.text('Jours sans aucune permanence assignee : ' + joursNonCouverts + ' / ' + dateKeys.length, 14, y);
  y += 12;

  // ---- Taches de fonction ----
  if (functionRows.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(13);
    doc.setTextColor(11, 61, 145);
    doc.text('Taches de fonction', 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Tache', 'Role', 'Validees / Attendues']],
      body: functionRows,
      headStyles: { fillColor: [11, 61, 145] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // ---- Pied de page ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'HyperExcellence - Marjane Tanger Medina - Genere le ' +
        new Date().toLocaleString('fr-FR') +
        ' - Page ' +
        i +
        '/' +
        pageCount,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  const refKey = referenceDateStr || new Date().toISOString().slice(0, 10);
  const filename = 'rapport-' + periodType.toLowerCase() + '-hyperexcellence-' + refKey + '.pdf';
  doc.save(filename);
}
