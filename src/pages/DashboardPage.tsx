// ============================================================
// HyperExcellence - Tableau de bord KPI Admin (Circuit 10)
// Converti a TanStack Query (Phase 1 - Performance)
// ============================================================
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { databases } from '../lib/appwrite';
import { getDashboardStats } from '../lib/kpi';
import { generateDailyAuditPDF } from '../lib/pdfExport';
import { listOverdueCapas } from '../lib/capa';
import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  GRAVITE_LABELS,
  GRAVITE_COLORS,
  CIRCUIT_TITLES,
} from '../constants';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchDashboardData(selectedDate: string) {
  const [dashboardStats, zonesResult, profilesResult, overdue] = await Promise.all([
    getDashboardStats(selectedDate),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
    databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(500)]),
    listOverdueCapas(),
  ]);

  const zoneNames: Record<string, string> = {};
  for (const zone of zonesResult.documents as any[]) {
    zoneNames[zone.$id] = zone.name;
  }

  const profileNames: Record<string, string> = {};
  for (const p of profilesResult.documents as any[]) {
    profileNames[p.$id] = p.full_name;
  }

  return { stats: dashboardStats, zoneNames, profileNames, overdueCapas: overdue };
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [isExporting, setIsExporting] = useState(false);

  const isToday = selectedDate === todayISO();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', selectedDate],
    queryFn: () => fetchDashboardData(selectedDate),
    staleTime: 60 * 1000, // 1 min : le dashboard bouge plus vite que le reste
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['dashboard', selectedDate] });
  }

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      await generateDailyAuditPDF(selectedDate);
    } catch {
      alert('Erreur lors de la generation du PDF.');
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Chargement des KPI...</p>
      </div>
    );
  }

  const { stats, zoneNames, profileNames, overdueCapas } = data;

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
          <button onClick={refresh} className="text-xs text-slate-400">
            Actualiser
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <label className="block text-xs text-slate-400 mb-1">
            Consulter la journee du
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              max={todayISO()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            />
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayISO())}
                className="text-xs text-amber-400 whitespace-nowrap"
              >
                Revenir a aujourd'hui
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="w-full rounded-lg bg-blue-500 text-slate-950 font-semibold py-2.5 text-sm disabled:opacity-50"
        >
          {isExporting
            ? 'Generation du PDF...'
            : `Exporter l'audit du ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR')} (PDF)`}
        </button>

        {isToday && overdueCapas.length > 0 && (
          <div className="bg-red-950/40 border border-red-800 rounded-lg p-3 space-y-2">
            <p className="text-sm font-semibold text-red-300">
              {overdueCapas.length} CAPA en retard — escalade requise
            </p>
            <div className="space-y-2">
              {overdueCapas.map((c) => (
                <div key={c.$id} className="bg-slate-950 border border-red-900 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${GRAVITE_COLORS[c.ncGravite as keyof typeof GRAVITE_COLORS]}20`,
                        color: GRAVITE_COLORS[c.ncGravite as keyof typeof GRAVITE_COLORS],
                      }}
                    >
                      {GRAVITE_LABELS[c.ncGravite as keyof typeof GRAVITE_LABELS]}
                    </span>
                    <span className="text-xs text-red-400">
                      Echeance : {c.echeance ? c.echeance.slice(0, 10) : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{c.ncActionImmediate}</p>
                  <p className="text-xs text-slate-500">
                    Responsable : {profileNames[c.responsable_id] || c.responsable_id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">
            Taux de conformite — {isToday ? "Aujourd'hui" : new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR')}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold" style={{ color: conformiteColor }}>
              {stats.tauxConformite}%
            </span>
            <span className="text-xs text-slate-500 mb-1">
              ({stats.faitToday}/{stats.totalExecutionsToday} taches, dedoublonne)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${stats.tauxConformite}%`, backgroundColor: conformiteColor }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">MTTR NC (30j)</p>
            <p className="text-xl font-bold text-blue-400">
              {stats.mttrHeures !== null ? `${stats.mttrHeures}h` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Temps moyen de cloture</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Taux rupture APLS</p>
            <p className="text-xl font-bold text-orange-400">
              {stats.tauxRuptureAPLS !== null ? `${stats.tauxRuptureAPLS}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Objectif moins de 5%</p>
          </div>
        </div>

        {stats.scoresSBAM.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">
              Classement SBAM {isToday ? 'du jour' : 'de la journee'}
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

        {stats.parCircuit.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">Detail par circuit</h2>
            <div className="space-y-2">
              {stats.parCircuit
                .slice()
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
            <p className="text-xs text-slate-500 mt-1">Ecart</p>
          </div>
        </div>

        {isToday && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">
              Non Conformites ouvertes
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
        )}

        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-2">
            Zones a risque (7 derniers jours)
          </h2>
          {stats.topZonesRisque.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune non conformite sur 7 jours.</p>
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
