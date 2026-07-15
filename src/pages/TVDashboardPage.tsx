// ============================================================
// HyperExcellence - Ecran TV/Bureau (Circuit 10, affichage continu)
// ============================================================
import { useEffect, useState } from 'react';
import { Query } from 'appwrite';
import { databases } from '../lib/appwrite';
import { getDashboardStats, DashboardStats } from '../lib/kpi';
import { getHeatmapData, heatColor, DepartmentHeat } from '../lib/heatmap';
import {
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  GRAVITE_LABELS,
  GRAVITE_COLORS,
  DEPARTMENTS,
  CIRCUIT_TITLES,
} from '../constants';

const REFRESH_INTERVAL_MS = 60000;

interface TVDashboardPageProps {
  onExit: () => void;
}

export default function TVDashboardPage(props: TVDashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [heatData, setHeatData] = useState<DepartmentHeat[]>([]);
  const [zoneNames, setZoneNames] = useState<Record<string, string>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [clock, setClock] = useState<Date>(new Date());

  async function load() {
    const dashboardStats = await getDashboardStats();
    const heat = await getHeatmapData();
    const zonesResult = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.ZONES,
      [Query.limit(200)]
    );

    setStats(dashboardStats);
    setHeatData(heat);

    const names: Record<string, string> = {};
    for (const zone of zonesResult.documents as any[]) {
      names[zone.$id] = zone.name;
    }
    setZoneNames(names);
    setLastUpdate(new Date());
  }

  useEffect(() => {
    load();
    const dataTimer = setInterval(load, REFRESH_INTERVAL_MS);
    const clockTimer = setInterval(function () {
      setClock(new Date());
    }, 1000);
    return function () {
      clearInterval(dataTimer);
      clearInterval(clockTimer);
    };
  }, []);

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-2xl text-slate-400">Chargement...</p>
      </div>
    );
  }

  const dataByDept: Record<string, DepartmentHeat> = {};
  for (const d of heatData) {
    dataByDept[d.departmentId] = d;
  }

  const conformiteColor =
    stats.tauxConformite >= 90 ? '#10b981' : stats.tauxConformite >= 80 ? '#f97316' : '#ef4444';

  const dateLabel = clock.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeLabel = clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const updateLabel = lastUpdate.toLocaleTimeString('fr-FR');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">HyperExcellence Pilotage Live</h1>
          <p className="text-slate-400 text-lg mt-1">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-mono font-bold">{timeLabel}</p>
          <button onClick={props.onExit} className="text-slate-500 text-sm mt-2">
            Quitter le mode ecran
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-lg mb-2">Taux de conformite global</p>
            <p className="text-7xl font-bold" style={{ color: conformiteColor }}>
              {stats.tauxConformite}%
            </p>
            <p className="text-slate-500 text-lg mt-2">
              {stats.faitToday}/{stats.totalExecutionsToday} taches
            </p>
            <div className="w-full h-3 bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: stats.tauxConformite + '%', backgroundColor: conformiteColor }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-4xl font-bold text-emerald-400">{stats.faitToday}</p>
              <p className="text-slate-500 text-sm mt-1">Fait</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-4xl font-bold text-red-400">{stats.nonFaitToday}</p>
              <p className="text-slate-500 text-sm mt-1">Non fait</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-4xl font-bold text-amber-400">{stats.ecartToday}</p>
              <p className="text-slate-500 text-sm mt-1">Ecart</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-lg mb-3">Non Conformites ouvertes</p>
            <div className="grid grid-cols-3 gap-3">
              {(['CRITIQUE', 'MAJEURE', 'MINEURE'] as const).map(function (g) {
                return (
                  <div key={g} className="text-center">
                    <p className="text-4xl font-bold" style={{ color: GRAVITE_COLORS[g] }}>
                      {stats.ncOuvertesParGravite[g]}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">{GRAVITE_LABELS[g]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">MTTR NC 30j</p>
              <p className="text-3xl font-bold text-blue-400">
                {stats.mttrHeures !== null ? stats.mttrHeures + 'h' : '-'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">Rupture APLS</p>
              <p className="text-3xl font-bold text-orange-400">
                {stats.tauxRuptureAPLS !== null ? stats.tauxRuptureAPLS + '%' : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full">
            <p className="text-slate-400 text-lg mb-4">Heatmap Magasin</p>
            <div className="grid grid-cols-2 gap-3">
              {DEPARTMENTS.map(function (dept) {
                const heat = dataByDept[dept.id];
                const taux = heat ? heat.taux : -1;
                const color = heatColor(taux);
                return (
                  <div
                    key={dept.id}
                    className="rounded-xl p-3"
                    style={{ backgroundColor: color + '25', border: '2px solid ' + color }}
                  >
                    <p className="text-sm font-medium text-slate-200 leading-tight">
                      {dept.name}
                    </p>
                    <p className="text-2xl font-bold mt-1" style={{ color: color }}>
                      {taux >= 0 ? taux + '%' : '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-lg mb-3">Detail par circuit</p>
            <div className="space-y-2 max-h-64 overflow-hidden">
              {stats.parCircuit
                .slice()
                .sort(function (a, b) {
                  return a.tauxConformite - b.tauxConformite;
                })
                .slice(0, 6)
                .map(function (c) {
                  const color =
                    c.tauxConformite >= 90 ? '#10b981' : c.tauxConformite >= 80 ? '#f97316' : '#ef4444';
                  return (
                    <div key={c.checklistId} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 truncate flex-1">
                        {CIRCUIT_TITLES[c.checklistId] || c.checklistId}
                      </span>
                      <span className="text-lg font-bold ml-2" style={{ color: color }}>
                        {c.tauxConformite}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-lg mb-3">Zones a risque 7j</p>
            {stats.topZonesRisque.length === 0 ? (
              <p className="text-slate-500">Aucune non conformite recente.</p>
            ) : (
              <div className="space-y-2">
                {stats.topZonesRisque.map(function (z, i) {
                  return (
                    <div key={z.zoneId} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">
                        #{i + 1} {zoneNames[z.zoneId] || z.zoneId}
                      </span>
                      <span className="text-red-400 font-bold">{z.count} NC</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-slate-600 text-sm mt-6">
        Derniere actualisation: {updateLabel} - Actualisation automatique toutes les 60s
      </p>
    </div>
  );
}
