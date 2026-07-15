// ============================================================
// HyperExcellence - Export Excel historique filtrable (Circuit 7)
// ============================================================
import { useState } from 'react';
import { generateExcelExport } from '../lib/excelExport';
import { DEPARTMENTS, GRAVITES, GRAVITE_LABELS, Gravite } from '../constants';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ExcelExportPage() {
  const [dateDebut, setDateDebut] = useState(daysAgoISO(7));
  const [dateFin, setDateFin] = useState(todayISO());
  const [departmentId, setDepartmentId] = useState('');
  const [gravite, setGravite] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function handleExport() {
    if (!dateDebut || !dateFin) {
      alert('Les deux dates sont requises.');
      return;
    }
    setIsExporting(true);
    setResultMessage(null);
    try {
      const result = await generateExcelExport({
        dateDebut,
        dateFin,
        departmentId: departmentId || undefined,
        gravite: (gravite as Gravite) || undefined,
      });
      setResultMessage(
        `Export généré : ${result.executionsCount} exécutions, ${result.ncCount} non conformités.`
      );
    } catch {
      setResultMessage('Erreur lors de la génération de l\'export.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Export Excel Historique</h1>
        <p className="text-sm text-slate-400">
          Génère un fichier .xlsx avec deux feuilles : Exécutions et Non Conformités, selon la
          période et les filtres choisis.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date début</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date fin</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Département (optionnel)
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            >
              <option value="">— Tous les départements —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Gravité NC (optionnel)
            </label>
            <select
              value={gravite}
              onChange={(e) => setGravite(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            >
              <option value="">— Toutes les gravités —</option>
              {Object.values(GRAVITES).map((g) => (
                <option key={g} value={g}>
                  {GRAVITE_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          {resultMessage && (
            <p className="text-xs text-emerald-400">{resultMessage}</p>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full rounded-lg bg-emerald-500 text-slate-950 font-semibold py-2.5 text-sm disabled:opacity-50"
          >
            {isExporting ? 'Génération...' : '📊 Générer l\'export Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
