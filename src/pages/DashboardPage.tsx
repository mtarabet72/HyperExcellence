// ============================================================
// HyperExcellence - Tableau de bord KPI Admin (Circuit 10)
// ============================================================
import { useEffect, useState } from 'react';
import { Query } from 'appwrite';
import { databases } from '../lib/appwrite';
import { getDashboardStats, DashboardStats } from '../lib/kpi';
import { generateDailyAuditPDF } from '../lib/pdfExport';
import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  GRAVITE_LABELS,
  GRAVITE_COLORS,
  CIRCUIT_TITLES,
} from '../constants';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [zoneNames, setZoneNames] = useState<Record<string, string>>({});
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  async function load() {
    setIsLoading(true);
    const [dashboardStats, zonesResult, profilesResult] = await Promise.all([
      getDashboardStats(),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(500)]),
    ]);
    setStats(dashboardStats);

    const zNames: Record<string, string> = {};
    for (const zone of zonesResult.documents as any[]) {
      zNames[zone.$id] = zone.name;
    }
    setZoneNames(zNames);

    const pNames: Record<string, string> = {};
    for (const p of profilesResult.documents as any[]) {
      pNames[p.$id] = p.full_name;
    }
    setProfileNames(pNames);

    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      await generateDailyAuditPDF();
    } catch {
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Chargement des KPI...</p>
      </div>
    );
  }

  const conformiteColor =
    stats.tauxConformite >= 90
      ? '#10b981'
      : stats.tauxConformite >= 80
      ? '#f97316'
      : '#ef4444';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Tableau de bord</h1>
          <button onClick={load} className="text-xs text-slate-400">
            ↻ Actualiser
          </button>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="w-full rounded-lg bg-blue-500 text-slate-950 font-semibold py-2.5 text-sm disabled:opacity-50"
        >
          {isExporting ? 'Génération du PDF...' : '📄 Exporter l\'audit du jour (PDF)'}
        </button>

        {/* ---------- Taux de conformité global ---------- */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">Taux de conformité global — Aujourd'hui</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold" style={{ color: conformiteColor }}>
              {stats.tauxConformite}%
            </span>
            <span className="text-xs text-slate-500 mb-1">
              ({stats.faitToday}/{stats.totalExecutionsToday} tâches, dédoublonné)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${stats.tauxConformite}%`, backgroundColor: conformiteColor }}
            />
          </div>
        </div>

        {/* ---------- MTTR + Taux rupture APLS ---------- */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">MTTR NC (30j)</p>
            <p className="text-xl font-bold text-blue-400">
              {stats.mttrHeures !== null ? `${stats.mttrHeures}h` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Temps moyen de clôture</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Taux rupture APLS</p>
            <p className="text-xl font-bold text-orange-400">
              {stats.tauxRuptureAPLS !== null ? `${stats.tauxRuptureAPLS}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Objectif &lt;5%</p>
          </div>
        </div>

        {/* ---------- Score SBAM par vendeur ---------- */}
        {stats.scoresSBAM.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">
              Classement SBAM du jour
            </h2>
            <div className="space-y-2">
              {stats.scoresSBAM.map((v, i) => (
                <div
                  key={v.profileId}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                >
                  <span className="text-sm">
                    #{i + 1} {profileNames[v.profileId] || v.profileId}
                  </span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                    {v.score}% ({v.fait}/{v.total})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------- Répartition par circuit ---------- */}
        {stats.parCircuit.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">Détail par circuit</h2>
            <div className="space-y-2">
              {stats.parCircuit
                .sort((a, b) => a.tauxConformite - b.tauxConformite)
                .map((c) => {
                  const color =
                    c.tauxConformite >= 90
                      ? '#10b981'
                      : c.tauxConformite >= 80
                      ? '#f97316'
                      : '#ef4444';
                  return (
                    <div
                      key={c.checklistId}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">
                          {CIRCUIT_TITLES[c.checklistId] || c.checklistId}
                        </span>
                        <span className="text-xs font-semibold" style={{ color }}>
                          {c.tauxConformite}% ({c.fait}/{c.total})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${c.tauxConformite}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ---------- Répartition statuts du jour ---------- */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.faitToday}</p>
            <p className="text-xs text-slate-500 mt-1">Fait</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.nonFaitToday}</p>
            <p className="text-xs text-slate-500 mt-1">Non fait</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.ecartToday}</p>
            <p className="text-xs text-slate-500 mt-1">Écart</p>
          </div>
        </div>

        {/* ---------- NC ouvertes par gravité ---------- */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-2">
            Non Conformités ouvertes
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {(['CRITIQUE', 'MAJEURE', 'MINEURE'] as const).map((g) => (
              <div
                key={g}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center"
              >
                <p className="text-2xl font-bold" style={{ color: GRAVITE_COLORS[g] }}>
                  {stats.ncOuvertesParGravite[g]}
                </p>
                <p className="text-xs text-slate-500 mt-1">{GRAVITE_LABELS[g]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Top zones à risque ---------- */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-2">
            Zones à risque (7 derniers jours)
          </h2>
          {stats.topZonesRisque.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune non conformité sur 7 jours. 🎉</p>
          ) : (
            <div className="space-y-2">
              {stats.topZonesRisque.map((z, i) => (
                <div
                  key={z.zoneId}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                >
                  <span className="text-sm">
                    #{i + 1} {zoneNames[z.zoneId] || z.zoneId}
                  </span>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                    {z.count} NC
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
