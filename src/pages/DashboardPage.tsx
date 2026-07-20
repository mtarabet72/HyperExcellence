// ============================================================
// HyperExcellence - Tableau de bord KPI Admin (Circuit 10)
// Converti a TanStack Query (Phase 1 - Performance)
// Migre vers le Design System (Phase 2)
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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Stat } from '../components/ui/Stat';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Label, Input } from '../components/ui/Field';
import { COLORS, conformiteColor } from '../components/ui/tokens';

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

  const tauxColor = conformiteColor(stats.tauxConformite);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Tableau de bord</h1>
          <button onClick={refresh} className="text-xs text-slate-400">
            Actualiser
          </button>
        </div>

        <Card>
          <Label>Consulter la journee du</Label>
          <div className="flex items-center gap-2">
            <Input
              on="card"
              type="date"
              value={selectedDate}
              max={todayISO()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1"
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
        </Card>

        <Button
          variant="info"
          size="md"
          fullWidth
          onClick={handleExportPDF}
          disabled={isExporting}
        >
          {isExporting
            ? 'Generation du PDF...'
            : `Exporter l'audit du ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR')} (PDF)`}
        </Button>

        {isToday && overdueCapas.length > 0 && (
          <Card tone="danger" className="space-y-2">
            <p className="text-sm font-semibold text-red-300">
              {overdueCapas.length} CAPA en retard — escalade requise
            </p>
            <div className="space-y-2">
              {overdueCapas.map((c) => (
                <div key={c.$id} className="bg-slate-950 border border-red-900 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <Badge color={GRAVITE_COLORS[c.ncGravite as keyof typeof GRAVITE_COLORS]}>
                      {GRAVITE_LABELS[c.ncGravite as keyof typeof GRAVITE_LABELS]}
                    </Badge>
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
          </Card>
        )}

        <Card padding="md">
          <p className="text-xs text-slate-400 mb-2">
            Taux de conformite —{' '}
            {isToday
              ? "Aujourd'hui"
              : new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR')}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold" style={{ color: tauxColor }}>
              {stats.tauxConformite}%
            </span>
            <span className="text-xs text-slate-500 mb-1">
              ({stats.faitToday}/{stats.totalExecutionsToday} taches, dedoublonne)
            </span>
          </div>
          <ProgressBar value={stats.tauxConformite} color={tauxColor} className="mt-3" />
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Stat
            align="left"
            label="MTTR NC (30j)"
            value={stats.mttrHeures !== null ? `${stats.mttrHeures}h` : '—'}
            color={COLORS.info}
            hint="Temps moyen de cloture"
          />
          <Stat
            align="left"
            label="Taux rupture APLS"
            value={stats.tauxRuptureAPLS !== null ? `${stats.tauxRuptureAPLS}%` : '—'}
            color={COLORS.orange}
            hint="Objectif moins de 5%"
          />
        </div>

        {stats.scoresSBAM.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">
              Classement SBAM {isToday ? 'du jour' : 'de la journee'}
            </h2>
            <div className="space-y-2">
              {stats.scoresSBAM.map((v, i) => (
                <Card key={v.profileId} className="flex items-center justify-between">
                  <span className="text-sm">
                    #{i + 1} {profileNames[v.profileId] || v.profileId}
                  </span>
                  <Badge tone="success">
                    {v.score}% ({v.fait}/{v.total})
                  </Badge>
                </Card>
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
                  const color = conformiteColor(c.tauxConformite);
                  return (
                    <Card key={c.checklistId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">
                          {CIRCUIT_TITLES[c.checklistId] || c.checklistId}
                        </span>
                        <span className="text-xs font-semibold" style={{ color }}>
                          {c.tauxConformite}% ({c.fait}/{c.total})
                        </span>
                      </div>
                      <ProgressBar value={c.tauxConformite} color={color} size="sm" />
                    </Card>
                  );
                })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Stat value={stats.faitToday} label="Fait" color={COLORS.success} />
          <Stat value={stats.nonFaitToday} label="Non fait" color={COLORS.danger} />
          <Stat value={stats.ecartToday} label="Ecart" color={COLORS.warning} />
        </div>

        {isToday && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">
              Non Conformites ouvertes
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {(['CRITIQUE', 'MAJEURE', 'MINEURE'] as const).map((g) => (
                <Stat
                  key={g}
                  value={stats.ncOuvertesParGravite[g]}
                  label={GRAVITE_LABELS[g]}
                  color={GRAVITE_COLORS[g]}
                />
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
                <Card key={z.zoneId} className="flex items-center justify-between">
                  <span className="text-sm">
                    #{i + 1} {zoneNames[z.zoneId] || z.zoneId}
                  </span>
                  <Badge tone="danger">{z.count} NC</Badge>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
