// ============================================================
// HyperExcellence - Suivi NC + CAPA (Circuit 6, workflow complet)
// Converti a TanStack Query (Phase 1 - Performance)
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listOpenNonConformites, NonConformite } from '../lib/nonConformites';
import { qualifyAndCreateCapa, verifyAndCloseCapa, getCapaForNC, Capa } from '../lib/capa';
import { listEmployees } from '../lib/employees';
import {
  GRAVITE_LABELS,
  GRAVITE_COLORS,
  NC_STATUS_LABELS,
  ROLE_LABELS,
  canQualifyNC,
  canVerifyAndCloseNC,
} from '../constants';
import { useAuth } from '../contexts/AuthContext';

async function fetchNCData() {
  const [list, emps] = await Promise.all([listOpenNonConformites(), listEmployees()]);

  const capaByNC: Record<string, Capa> = {};
  for (const nc of list) {
    if (nc.status === 'EN_COURS') {
      const capa = await getCapaForNC(nc.$id);
      if (capa) capaByNC[nc.$id] = capa;
    }
  }

  return { ncList: list, employees: emps, capaByNC };
}

export default function NonConformitesPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['non-conformites'],
    queryFn: fetchNCData,
  });

  const ncList = data?.ncList || [];
  const employees = data?.employees || [];
  const capaByNC = data?.capaByNC || {};

  const qualifyMutation = useMutation({
    mutationFn: qualifyAndCreateCapa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['non-conformites'] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyAndCloseCapa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['non-conformites'] });
    },
  });

  const [qualifyingId, setQualifyingId] = useState<string | null>(null);
  const [causeRacine, setCauseRacine] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [echeance, setEcheance] = useState('');

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [preuveCorrection, setPreuveCorrection] = useState('');
  const [signatureName, setSignatureName] = useState('');

  async function handleQualify(nc: NonConformite) {
    if (!profile) return;
    if (!causeRacine.trim() || !responsableId || !echeance) {
      alert('Tous les champs sont requis.');
      return;
    }
    try {
      await qualifyMutation.mutateAsync({
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
    } catch {
      alert('Erreur lors de la qualification.');
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
    try {
      await verifyMutation.mutateAsync({
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
    } catch {
      alert('Erreur lors de la cloture.');
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
        <h1 className="text-xl font-bold">Non Conformites & CAPA</h1>

        {isLoading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : ncList.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune non conformite ouverte.</p>
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

                  {nc.status === 'OUVERTE' && !canQualify && (
                    <p className="text-xs text-slate-500 italic">
                      Qualification reservee a : {minRoleLabelFor(nc.gravite)} ou superieur.
                    </p>
                  )}

                  {nc.status === 'OUVERTE' && canQualify && qualifyingId !== nc.$id && (
                    <button
                      onClick={() => setQualifyingId(nc.$id)}
                      className="w-full rounded-lg bg-amber-500 text-slate-950 font-medium py-2 text-xs"
                    >
                      Qualifier & creer CAPA
                    </button>
                  )}

                  {nc.status === 'OUVERTE' && canQualify && qualifyingId === nc.$id && (
                    <div className="space-y-2 bg-slate-950 border border-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-medium">Cause racine (analyse 5M)</p>
                      <textarea
                        value={causeRacine}
                        onChange={(e) => setCauseRacine(e.target.value)}
                        placeholder="Ex: Main d'oeuvre - manque de formation SBAM"
                        rows={2}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-slate-400 font-medium">Responsable de l'action</p>
                      <select
                        value={responsableId}
                        onChange={(e) => setResponsableId(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                      >
                        <option value="">— Selectionner —</option>
                        {employees.map((emp) => (
                          <option key={emp.$id} value={emp.$id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-400 font-medium">Echeance</p>
                      <input
                        type="date"
                        value={echeance}
                        onChange={(e) => setEcheance(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleQualify(nc)}
                          disabled={qualifyMutation.isPending}
                          className="flex-1 rounded-lg bg-amber-500 text-slate-950 font-medium py-2 text-xs"
                        >
                          {qualifyMutation.isPending ? 'Enregistrement...' : 'Creer la CAPA'}
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

                  {nc.status === 'EN_COURS' && capaByNC[nc.$id] && (
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-slate-400">
                        Responsable :{' '}
                        {employees.find((e) => e.$id === capaByNC[nc.$id].responsable_id)
                          ?.full_name || '—'}
                        {' · '}Echeance : {capaByNC[nc.$id].echeance?.slice(0, 10)}
                      </p>

                      {!canVerify && (
                        <p className="text-xs text-slate-500 italic">
                          Verification et cloture reservees au QHSE (Admin).
                        </p>
                      )}

                      {canVerify && verifyingId !== nc.$id && (
                        <button
                          onClick={() => setVerifyingId(nc.$id)}
                          className="w-full rounded-lg bg-emerald-500 text-slate-950 font-medium py-2 text-xs"
                        >
                          Verifier & cloturer
                        </button>
                      )}

                      {canVerify && verifyingId === nc.$id && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-400 font-medium">Preuve de correction</p>
                          <textarea
                            value={preuveCorrection}
                            onChange={(e) => setPreuveCorrection(e.target.value)}
                            placeholder="Ex: Formation SBAM realisee le 15/07, controle terrain OK"
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
                            placeholder="Nom Prenom"
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerify(nc)}
                              disabled={verifyMutation.isPending}
                              className="flex-1 rounded-lg bg-emerald-500 text-slate-950 font-medium py-2 text-xs"
                            >
                              {verifyMutation.isPending ? 'Cloture...' : 'Confirmer la cloture'}
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
