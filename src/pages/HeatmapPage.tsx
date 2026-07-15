// ============================================================
// HyperExcellence - Heatmap magasin par département (Circuit 7)
// ============================================================
import { useEffect, useState } from 'react';
import { getHeatmapData, heatColor, DepartmentHeat } from '../lib/heatmap';
import { DEPARTMENTS } from '../constants';

export default function HeatmapPage() {
  const [data, setData] = useState<DepartmentHeat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const result = await getHeatmapData();
    setData(result);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const dataByDept: Record<string, DepartmentHeat> = {};
  for (const d of data) {
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
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Heatmap Magasin</h1>
          <button onClick={load} className="text-xs text-slate-400">
            ↻ Actualiser
          </button>
        </div>
        <p className="text-xs text-slate-500">
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
                className="rounded-lg p-3 border border-slate-800"
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
    </div>
  );
}
