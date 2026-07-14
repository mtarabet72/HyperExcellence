// ============================================================
// HyperExcellence - Écran suivi des Non Conformités (Circuit 6)
// ============================================================
import { useEffect, useState } from 'react';
import { listOpenNonConformites, closeNonConformite, NonConformite } from '../lib/nonConformites';
import { GRAVITE_LABELS, GRAVITE_COLORS, NC_STATUS_LABELS } from '../constants';

export default function NonConformitesPage() {
  const [ncList, setNcList] = useState<NonConformite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    const list = await listOpenNonConformites();
    setNcList(list);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleClose(nc: NonConformite) {
    setClosingId(nc.$id);
    try {
      await closeNonConformite(nc.$id);
      await load();
    } catch {
      alert('Erreur lors de la clôture.');
    } finally {
      setClosingId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Non Conformités ouvertes</h1>

        {isLoading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : ncList.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune non conformité ouverte. 🎉</p>
        ) : (
          <div className="space-y-2">
            {ncList.map((nc) => (
              <div
                key={nc.$id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${GRAVITE_COLORS[nc.gravite]}20`,
                      color: GRAVITE_COLORS[nc.gravite],
                    }}
                  >
                    {GRAVITE_LABELS[nc.gravite]}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(nc.$createdAt)}</span>
                </div>

                <p className="text-sm">{nc.action_immediate}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {NC_STATUS_LABELS[nc.status]}
                  </span>
                  <button
                    onClick={() => handleClose(nc)}
                    disabled={closingId === nc.$id}
                    className="rounded-lg bg-emerald-500/20 text-emerald-400 px-3 py-1.5 text-xs font-medium"
                  >
                    {closingId === nc.$id ? 'Clôture...' : 'Clôturer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
