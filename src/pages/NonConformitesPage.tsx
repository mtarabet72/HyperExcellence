// ============================================================
// HyperExcellence - Suivi NC + CAPA (Circuit 6, workflow complet)
// Validation hiérarchique par palier (Circuit 9)
// ============================================================
import { useEffect, useState } from 'react';
import { listOpenNonConformites, NonConformite } from '../lib/nonConformites';
import { qualifyAndCreateCapa, verifyAndCloseCapa, getCapaForNC, Capa } from '../lib/capa';
import { listEmployees, Profile } from '../lib/employees';
import {
  GRAVITE_LABELS,
  GRAVITE_COLORS,
  NC_STATUS_LABELS,
  ROLE_LABELS,
  canQualifyNC,
  canVerifyAndCloseNC,
} from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function NonConformitesPage() {
  const { profile } = useAuth();
  const [ncList, setNcList] = useState<NonConformite[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [capaByNC, setCapaByNC] = useState<Record<string, Capa>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [qualifyingId, setQualifyingId] = useState<string | null>(null);
  const [causeRacine, setCauseRacine] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [echeance, setEcheance] = useState('');

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [preuveCorrection, setPreuveCorrection] = useState('');
  const [signatureName, setSignatureName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    const [list, emps] = await Promise.all([listOpenNonConformites(), listEmployees()]);
    setNcList(list);
    setEmployees(emps);

    const capaEntries: Record<string, Capa> = {};
    for (const nc of list) {
      if (nc.status === 'EN_COURS') {
        const capa = await getCapaForNC(nc.$id);
        if (capa) capaEntries[nc.$id] = capa;
      }
    }
    setCapaByNC(capaEntries);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleQualify(nc: NonConformite) {
    if (!profile) return;
    if (!causeRacine.trim() || !responsableId || !echeance) {
      alert('Tous les champs sont requis.');
      return;
    }
    setIsSubmitting(true);
    try {
      await qualifyAndCreateCapa({
        ncId: nc.$id,
        causeRacine: causeRacine.trim(),
        responsableId,
        echeance,
        actorId: profile.$id,
      });
      setQualifyingId(null);
      setCauseRacine('');
      setResponsableId('');
      setEcheance('');
      await load();
    } catch {
      alert('Erreur lors de la qualification.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(nc: NonConformite) {
    if (!profile) return;
    const capa = capaByNC[nc.$id];
    if (!capa) return;
    if (!preuveCorrection.trim() || !signatureName.trim()) {
      alert('Preuve de correction et signature requises.');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyAndCloseCapa({
        capaId: capa.$id,
        ncId: nc.$id,
        preuveCorrection: preuveCorrection.trim(),
        verifiedBy: profile.$id,
        signatureName: signatureName.trim(),
        actorId: profile.$id,
      });
      setVerifyingId(null);
      setPreuveCorrection('');
      setSignatureName('');
      await load();
    } catch {
      alert('Erreur lors de la clôture.');
    } finally {
      setIsSubmitting(false);
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

  function minRoleLabelFor(gravite: NonConformite['gravite']) {
    const map: Record<string, string> = {
      MINEURE: ROLE_LABELS.CHEF_RAYON,
      MAJEURE: ROLE_LABELS.CHEF_DEPARTEMENT,
      CRITIQUE: ROLE_LABELS.ADMIN,
    };
    return map[gravite] || '—';
  }
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Non Conformités & CAPA</h1>

        {isLoading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : ncList.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune non conformité ouverte. 🎉</p>
        ) : (
          <div className="space-y-3">
            {ncList.map((nc) => {
              const canQualify = canQualifyNC(profile.role, nc.gravite);
              const canVerify = canVerifyAndCloseNC(profile.role);

              return (
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

                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full">
                      {NC_STATUS_LABELS[nc.status]}
                    </span>
                  </div>

                  {/* ---------- NC OUVERTE ---------- */}
                  {nc.status === 'OUVERTE' && !canQualify && (
                    <p className="text-xs text-slate-500 italic">
                      🔒 Qualification réservée à : {minRoleLabelFor(nc.gravite)} ou supérieur.
                    </p>
                  )}

                  {nc.status === 'OUVERTE' && canQualify && qualifyingId !== nc.$id && (
                    <button
                      onClick={() => setQualifyingId(nc.$id)}
                      className="w-full rounded-lg bg-amber-500 text-slate-950 font-medium py-2 text-xs"
                    >
                      Qualifier & créer CAPA
                    </button>
                  )}

                  {nc.status === 'OUVERTE' && canQualify && qualifyingId === nc.$id && (
                    <div className="space-y-2 bg-slate-950 border border-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-medium">Cause racine (analyse 5M)</p>
                      <textarea
                        value={causeRacine}
                        onChange={(e) => setCauseRacine(e.target.value)}
                        placeholder="Ex: Main d'œuvre — manque de formation SBAM"
                        rows={2}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-slate-400 font-medium">Responsable de l'action</p>
                      <select
                        value={responsableId}
                        onChange={(e) => setResponsableId(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                      >
                        <option value="">— Sélectionner —</option>
                        {employees.map((emp) => (
                          <option key={emp.$id} value={emp.$id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-400 font-medium">Échéance</p>
                      <input
                        type="date"
                        value={echeance}
                        onChange={(e) => setEcheance(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleQualify(nc)}
                          disabled={isSubmitting}
                          className="flex-1 rounded-lg bg-amber-500 text-slate-950 font-medium py-2 text-xs"
                        >
                          {isSubmitting ? 'Enregistrement...' : 'Créer la CAPA'}
                        </button>
                        <button
                          onClick={() => setQualifyingId(null)}
                          className="rounded-lg bg-slate-800 px-3 py-2 text-xs"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---------- NC EN_COURS ---------- */}
                  {nc.status === 'EN_COURS' && capaByNC[nc.$id] && (
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-slate-400">
                        Responsable :{' '}
                        {employees.find((e) => e.$id === capaByNC[nc.$id].responsable_id)
                          ?.full_name || '—'}
                        {' · '}Échéance : {capaByNC[nc.$id].echeance?.slice(0, 10)}
                      </p>

                      {!canVerify && (
                        <p className="text-xs text-slate-500 italic">
                          🔒 Vérification et clôture réservées au QHSE (Admin).
                        </p>
                      )}

                      {canVerify && verifyingId !== nc.$id && (
                        <button
                          onClick={() => setVerifyingId(nc.$id)}
                          className="w-full rounded-lg bg-emerald-500 text-slate-950 font-medium py-2 text-xs"
                        >
                          Vérifier & clôturer
                        </button>
                      )}

                      {canVerify && verifyingId === nc.$id && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-400 font-medium">Preuve de correction</p>
                          <textarea
                            value={preuveCorrection}
                            onChange={(e) => setPreuveCorrection(e.target.value)}
                            placeholder="Ex: Formation SBAM réalisée le 15/07, contrôle terrain OK"
                            rows={2}
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                          />
                          <p className="text-xs text-slate-400 font-medium">
                            Signature (tapez votre nom complet)
                          </p>
                          <input
                            type="text"
                            value={signatureName}
                            onChange={(e) => setSignatureName(e.target.value)}
                            placeholder="Nom Prénom"
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerify(nc)}
                              disabled={isSubmitting}
                              className="flex-1 rounded-lg bg-emerald-500 text-slate-950 font-medium py-2 text-xs"
                            >
                              {isSubmitting ? 'Clôture...' : 'Confirmer la clôture'}
                            </button>
                            <button
                              onClick={() => setVerifyingId(null)}
                              className="rounded-lg bg-slate-800 px-3 py-2 text-xs"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
