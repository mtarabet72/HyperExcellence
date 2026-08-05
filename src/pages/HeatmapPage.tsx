// ============================================================
// HyperExcellence - Heatmap magasin par département (Circuit 7)
// + Heatmap taches de fonction par secteur, ecran partage en deux
// Migre vers le Design System (Phase 2 - finalisation)
// ============================================================
import { useEffect, useState } from 'react';
import { getHeatmapData, heatColor, DepartmentHeat } from '../lib/heatmap';
import { getFunctionTaskHeatmapData, FunctionTaskHeat } from '../lib/functionTasks';
import { DEPARTMENTS } from '../constants';

function functionHeatColor(taux: number): string {
  if (taux < 0) return '#334155';
  if (taux >= 90) return '#10b981';
  if (taux >= 60) return '#f97316';
  return '#ef4444';
}

export default function HeatmapPage() {
  const [circuitData, setCircuitData] = useState<DepartmentHeat[]>([]);
  const [functionData, setFunctionData] = useState<FunctionTaskHeat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const [circuit, functionHeat] = await Promise.all([
      getHeatmapData(),
      getFunctionTaskHeatmapData(),
    ]);
    setCircuitData(circuit);
    setFunctionData(functionHeat);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const dataByDept: Record<string, DepartmentHeat> = {};
  for (const d of circuitData) {
    dataByDept[d.departmentId] = d;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Chargement de la heatmap...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Heatmap Magasin</h1>
          <button onClick={load} className="text-xs text-slate-400">
            ↻ Actualiser
          </button>
        </div>

        {/* ========== Bloc 1 : Circuits terrain ========== */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Circuits (checklists terrain)</h2>
          <p className="text-xs text-slate-500 mb-2">
            Taux de conformité du jour par rayon · 🟢 ≥95% · 🟠 80-95% · 🔴 &lt;80% · ⬛ pas de
            donnée aujourd'hui
          </p>

          <div className="grid grid-cols-2 gap-2">
            {DEPARTMENTS.map((dept) => {
              const heat = dataByDept[dept.id];
              const taux = heat?.taux ?? -1;
              const color = heatColor(taux);

              return (
                <div
                  key={dept.id}
                  className="rounded-lg p-3 border"
                  style={{ backgroundColor: `${color}20`, borderColor: color }}
                >
                  <p className="text-xs font-medium text-slate-200 leading-tight">{dept.name}</p>
                  <p className="text-lg font-bold mt-1" style={{ color }}>
                    {taux >= 0 ? `${taux}%` : '—'}
                  </p>
                  {heat && (
                    <p className="text-xs text-slate-500">
                      {heat.fait}/{heat.total} tâches
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========== Bloc 2 : Taches de fonction ========== */}
        <div className="pt-2 border-t border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300 mb-1 mt-3">
            Tâches de fonction (Chefs, RH, Sécurité...)
          </h2>
          <p className="text-xs text-slate-500 mb-2">
            Validation sur la période en cours · 🟢 ≥90% · 🟠 60-90% · 🔴 &lt;60% · ⬛ aucune tâche
          </p>

          {functionData.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune tâche de fonction active.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {functionData.map((f) => {
                const color = functionHeatColor(f.taux);
                return (
                  <div
                    key={f.bucket}
                    className="rounded-lg p-3 border"
                    style={{ backgroundColor: `${color}20`, borderColor: color }}
                  >
                    <p className="text-xs font-medium text-slate-200 leading-tight">{f.label}</p>
                    <p className="text-lg font-bold mt-1" style={{ color }}>
                      {f.taux >= 0 ? `${f.taux}%` : '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {f.validated}/{f.total} validées
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
