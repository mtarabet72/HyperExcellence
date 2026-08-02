// ============================================================
// HyperExcellence - Export Excel historique filtrable (Circuit 7)
// Migre vers le Design System (Phase 2 - finalisation)
// ============================================================
import { useState } from 'react';
import { generateExcelExport } from '../lib/excelExport';
import { DEPARTMENTS, GRAVITES, GRAVITE_LABELS, Gravite } from '../constants';
import { Button } from '../components/ui/Button';
import { Label, Input, Select } from '../components/ui/Field';

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
      setResultMessage("Erreur lors de la génération de l'export.");
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
              <Label>Date début</Label>
              <Input
                on="card"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input
                on="card"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Département (optionnel)</Label>
            <Select
              on="card"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">— Tous les départements —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Gravité NC (optionnel)</Label>
            <Select on="card" value={gravite} onChange={(e) => setGravite(e.target.value)}>
              <option value="">— Toutes les gravités —</option>
              {Object.values(GRAVITES).map((g) => (
                <option key={g} value={g}>
                  {GRAVITE_LABELS[g]}
                </option>
              ))}
            </Select>
          </div>

          {resultMessage && <p className="text-xs text-emerald-400">{resultMessage}</p>}

          <Button
            variant="success"
            size="md"
            fullWidth
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Génération...' : "📊 Générer l'export Excel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
