// ============================================================
// HyperExcellence - Export PDF d'audit journalier (Circuit 7)
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Query } from 'appwrite';
import { databases } from './appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, TASK_STATUS_LABELS, GRAVITE_LABELS } from '../constants';

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function generateDailyAuditPDF() {
  // ---------- Récupération des données du jour ----------
  const [executionsResult, ncResult, tasksResult, zonesResult, profilesResult] = await Promise.all([
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_EXECUTIONS, [
      Query.greaterThanEqual('executed_at', startOfToday()),
      Query.limit(1000),
    ]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.NON_CONFORMITES, [
      Query.greaterThanEqual('$createdAt', startOfToday()),
      Query.limit(1000),
    ]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, [Query.limit(500)]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(500)]),
  ]);

  const taskLabels: Record<string, string> = {};
  for (const t of tasksResult.documents as any[]) {
    taskLabels[t.$id] = `${t.task_number}. ${t.label}`;
  }
  const zoneNames: Record<string, string> = {};
  for (const z of zonesResult.documents as any[]) {
    zoneNames[z.$id] = z.name;
  }
  const profileNames: Record<string, string> = {};
  for (const p of profilesResult.documents as any[]) {
    profileNames[p.$id] = p.full_name;
  }

  const executions = executionsResult.documents as any[];
  const total = executions.length;
  const faitCount = executions.filter((e) => e.status === 'FAIT').length;
  const tauxConformite = total > 0 ? Math.round((faitCount / total) * 100) : 0;

  // ---------- Construction du PDF ----------
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.setFontSize(18);
  doc.setTextColor(11, 61, 145); // navy Marjane
  doc.text('HyperExcellence — Audit Journalier', 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(today, 14, 26);
  doc.text(`Taux de conformité global : ${tauxConformite}% (${faitCount}/${total} tâches)`, 14, 33);

  // ---------- Tableau des exécutions ----------
  const executionRows = executions.map((e) => [
    taskLabels[e.task_id] || e.task_id,
    zoneNames[e.zone_id] || e.zone_id,
    profileNames[e.executed_by] || e.executed_by,
    TASK_STATUS_LABELS[e.status as keyof typeof TASK_STATUS_LABELS] || e.status,
    new Date(e.executed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Tâche', 'Zone', 'Exécuté par', 'Statut', 'Heure']],
    body: executionRows,
    headStyles: { fillColor: [11, 61, 145] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 70 } },
  });

  // ---------- Section Non Conformités ----------
  const nc = ncResult.documents as any[];
  const finalY = (doc as any).lastAutoTable.finalY || 40;

  doc.setFontSize(13);
  doc.setTextColor(11, 61, 145);
  doc.text('Non Conformités du jour', 14, finalY + 12);

  if (nc.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Aucune non conformité déclarée aujourd\'hui.', 14, finalY + 20);
  } else {
    const ncRows = nc.map((n) => [
      zoneNames[n.zone_id] || n.zone_id,
      GRAVITE_LABELS[n.gravite as keyof typeof GRAVITE_LABELS] || n.gravite,
      n.action_immediate,
      n.status,
    ]);

    autoTable(doc, {
      startY: finalY + 16,
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

  // ---------- Téléchargement ----------
  const filename = `audit-hyperexcellence-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
