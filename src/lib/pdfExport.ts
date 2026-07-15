// ============================================================
// HyperExcellence - Export PDF d'audit journalier (Circuit 7)
// Dédoublonne, regroupe par Pilier, inclut les photos preuves.
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

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function dedupeLatestPerTask(executions: any[]): any[] {
  const latest: Record<string, any> = {};
  for (const e of executions) {
    const key = `${e.task_id}|${e.zone_id}`;
    if (!latest[key] || new Date(e.executed_at) > new Date(latest[key].executed_at)) {
      latest[key] = e;
    }
  }
  return Object.values(latest);
}

/**
 * Télécharge une image et la convertit en base64 pour insertion dans le PDF.
 * Retourne null si l'image ne peut pas être chargée (ne bloque pas le PDF).
 */
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

export async function generateDailyAuditPDF() {
  const [executionsResult, ncResult, tasksResult, checklistsResult, zonesResult, profilesResult] =
    await Promise.all([
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_EXECUTIONS, [
        Query.greaterThanEqual('executed_at', startOfToday()),
        Query.limit(1000),
      ]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.NON_CONFORMITES, [
        Query.greaterThanEqual('$createdAt', startOfToday()),
        Query.limit(1000),
      ]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, [Query.limit(500)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.CHECKLIST_TEMPLATES, [Query.limit(50)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(500)]),
    ]);

  const taskLabels: Record<string, string> = {};
  const taskToChecklist: Record<string, string> = {};
  for (const t of tasksResult.documents as any[]) {
    taskLabels[t.$id] = `${t.task_number}. ${t.label}`;
    taskToChecklist[t.$id] = t.checklist_id;
  }
  const checklistPilier: Record<string, number> = {};
  for (const c of checklistsResult.documents as any[]) {
    checklistPilier[c.$id] = c.circuit_number;
  }
  const zoneNames: Record<string, string> = {};
  for (const z of zonesResult.documents as any[]) {
    zoneNames[z.$id] = z.name;
  }
  const profileNames: Record<string, string> = {};
  for (const p of profilesResult.documents as any[]) {
    profileNames[p.$id] = p.full_name;
  }

  const executions = dedupeLatestPerTask(executionsResult.documents);
  const total = executions.length;
  const faitCount = executions.filter((e) => e.status === 'FAIT').length;
  const tauxConformite = total > 0 ? Math.round((faitCount / total) * 100) : 0;

  const byPilier: Record<number, any[]> = {};
  for (const e of executions) {
    const checklistId = taskToChecklist[e.task_id];
    const pilierNum = checklistPilier[checklistId] ?? 0;
    if (!byPilier[pilierNum]) byPilier[pilierNum] = [];
    byPilier[pilierNum].push(e);
  }

  // ---------- Pré-chargement des photos en base64 ----------
  const executionsWithPhoto = executions.filter((e: any) => e.photo_after);
  const photoCache: Record<string, string | null> = {};
  await Promise.all(
    executionsWithPhoto.map(async (e: any) => {
      photoCache[e.$id] = await fetchImageAsBase64(e.photo_after);
    })
  );

  // ---------- Construction du PDF ----------
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.setFontSize(18);
  doc.setTextColor(11, 61, 145);
  doc.text('HyperExcellence — Audit Journalier', 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(today, 14, 26);
  doc.text(
    `Taux de conformité global : ${tauxConformite}% (${faitCount}/${total} tâches, dédoublonné)`,
    14,
    33
  );

  let currentY = 40;

  const pilierNumbers = Object.keys(byPilier)
    .map(Number)
    .sort((a, b) => a - b);

  for (const pilierNum of pilierNumbers) {
    const items = byPilier[pilierNum];
    const pilierTitle = PILIER_LABELS_BY_CIRCUIT_NUMBER[pilierNum] || `Circuit ${pilierNum}`;
    const pilierFait = items.filter((e) => e.status === 'FAIT').length;
    const pilierTaux = items.length > 0 ? Math.round((pilierFait / items.length) * 100) : 0;

    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(11, 61, 145);
    doc.text(`${pilierTitle} — ${pilierTaux}% (${pilierFait}/${items.length})`, 14, currentY);
    currentY += 6;

    const rows = items.map((e) => [
      taskLabels[e.task_id] || e.task_id,
      zoneNames[e.zone_id] || e.zone_id,
      profileNames[e.executed_by] || e.executed_by,
      TASK_STATUS_LABELS[e.status as keyof typeof TASK_STATUS_LABELS] || e.status,
      new Date(e.executed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      e.photo_after ? 'Oui (voir p.suivantes)' : '—',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Tâche', 'Zone', 'Exécuté par', 'Statut', 'Heure', 'Photo']],
      body: rows,
      headStyles: { fillColor: [11, 61, 145] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 60 } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // ---------- Section Photos preuves ----------
  const validPhotos = executionsWithPhoto.filter((e: any) => photoCache[e.$id]);
  if (validPhotos.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(11, 61, 145);
    doc.text('Photos — Preuves terrain', 14, 18);

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
        // format non supporté, on ignore cette image
      }

      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      const label = taskLabels[e.task_id] || e.task_id;
      doc.text(label.slice(0, 40), px, py + imgSize + 4, { maxWidth: imgSize });

      px += imgSize + gap;
    }
  }

  // ---------- Section Non Conformités ----------
  const nc = ncResult.documents as any[];

  doc.addPage();
  let ncY = 20;

  doc.setFontSize(13);
  doc.setTextColor(220, 38, 38);
  doc.text('Non Conformités du jour', 14, ncY);
  ncY += 8;

  if (nc.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Aucune non conformité déclarée aujourd\'hui.', 14, ncY);
  } else {
    const ncRows = nc.map((n) => [
      zoneNames[n.zone_id] || n.zone_id,
      GRAVITE_LABELS[n.gravite as keyof typeof GRAVITE_LABELS] || n.gravite,
      n.action_immediate,
      n.status,
    ]);

    autoTable(doc, {
      startY: ncY,
      head: [['Zone', 'Gravité', 'Action immédiate', 'Statut']],
      body: ncRows,
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8, cellPadding: 2 },
    });
  }

  // ---------- Pied de page ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `HyperExcellence — Marjane Tanger Médina — Généré le ${new Date().toLocaleString('fr-FR')} — Page ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  const filename = `audit-hyperexcellence-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
