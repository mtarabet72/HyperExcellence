// ============================================================
// HyperExcellence - Ecran Admin : planning de permanence (Phase 7)
// CRUD via la Function serveur. Ecriture reservee a l'ADMIN.
// Horaires personnalisables sur les 3 creneaux (Matin/Soir/Tranche).
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPermanenceForMonth,
  assignPermanence,
  PermanenceDay,
} from '../lib/permanence';
import { getAppConfig, DEFAULT_CONFIG } from '../lib/settings';
import { listPermanenceEligible } from '../lib/employees';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Label, Input, Select } from '../components/ui/Field';

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminPermanencePage() {
  const queryClient = useQueryClient();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const { data: days = [], isLoading } = useQuery({
    queryKey: ['permanence-month', yearMonth],
    queryFn: () => getPermanenceForMonth(yearMonth),
  });

  const { data: eligible = [] } = useQuery({
    queryKey: ['permanence-eligible'],
    queryFn: listPermanenceEligible,
  });

  const { data: config = DEFAULT_CONFIG } = useQuery({
    queryKey: ['app-config'],
    queryFn: getAppConfig,
    staleTime: 10 * 60 * 1000,
  });

  const nameById: Record<string, string> = {};
  for (const e of eligible) nameById[e.$id] = e.full_name;

  const assignMutation = useMutation({
    mutationFn: assignPermanence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permanence-month', yearMonth] });
      setEditingDate(null);
    },
  });

  // ---------- Edition d'un jour ----------
  const [eMatin, setEMatin] = useState('');
  const [eMatinDebut, setEMatinDebut] = useState('');
  const [eMatinFin, setEMatinFin] = useState('');
  const [eSoir, setESoir] = useState('');
  const [eSoirDebut, setESoirDebut] = useState('');
  const [eSoirFin, setESoirFin] = useState('');
  const [eTranche, setETranche] = useState('');
  const [eTDebut, setETDebut] = useState('');
  const [eTFin, setETFin] = useState('');

  function startEdit(day: PermanenceDay) {
    setEditingDate(day.date);
    setEMatin(day.matinUserId || '');
    setEMatinDebut(day.matinHeureDebut || '');
    setEMatinFin(day.matinHeureFin || '');
    setESoir(day.soirUserId || '');
    setESoirDebut(day.soirHeureDebut || '');
    setESoirFin(day.soirHeureFin || '');
    setETranche(day.trancheUserId || '');
    setETDebut(day.trancheHeureDebut || '');
    setETFin(day.trancheHeureFin || '');
  }

  async function saveDay(date: string) {
    if (eTranche && (!eTDebut || !eTFin)) {
      alert('Heure de début et de fin requises pour le créneau Tranche.');
      return;
    }
    try {
      await assignMutation.mutateAsync({
        date,
        matinUserId: eMatin || undefined,
        matinHeureDebut: eMatin ? eMatinDebut || undefined : undefined,
        matinHeureFin: eMatin ? eMatinFin || undefined : undefined,
        soirUserId: eSoir || undefined,
        soirHeureDebut: eSoir ? eSoirDebut || undefined : undefined,
        soirHeureFin: eSoir ? eSoirFin || undefined : undefined,
        trancheUserId: eTranche || undefined,
        trancheHeureDebut: eTranche ? eTDebut : undefined,
        trancheHeureFin: eTranche ? eTFin : undefined,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'affectation.");
    }
  }

  function formatDayLabel(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  function slotSummary(userId: string | null, debut: string | null, fin: string | null, defaultDebut: string, defaultFin: string) {
    if (!userId) return null;
    const h = debut && fin ? `${debut}-${fin}` : `${defaultDebut}-${defaultFin}`;
    return `${nameById[userId] || '—'} (${h})`;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Planning de permanence</h1>
        <p className="text-sm text-slate-400">
          Affectez le responsable Matin / Soir / Tranche pour chaque jour, avec horaires
          personnalisables. Seuls les ADMIN et Responsables RH sont sélectionnables.
        </p>

        <div>
          <Label>Mois</Label>
          <Input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {days.map((day) => {
              const isEditing = editingDate === day.date;
              const matinLabel = slotSummary(
                day.matinUserId,
                day.matinHeureDebut,
                day.matinHeureFin,
                config.shift_matin_debut,
                config.shift_matin_fin
              );
              const soirLabel = slotSummary(
                day.soirUserId,
                day.soirHeureDebut,
                day.soirHeureFin,
                config.shift_soir_debut,
                config.shift_soir_fin
              );
              const trancheLabel =
                day.trancheUserId && day.trancheHeureDebut && day.trancheHeureFin
                  ? `${nameById[day.trancheUserId] || '—'} (${day.trancheHeureDebut}-${day.trancheHeureFin})`
                  : null;
              const hasAny = matinLabel || soirLabel || trancheLabel;

              return (
                <Card key={day.date}>
                  {!isEditing ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {formatDayLabel(day.date)}
                        </p>
                        {hasAny ? (
                          <div className="text-xs text-slate-400 mt-0.5 space-y-0.5">
                            {matinLabel && <p>Matin : {matinLabel}</p>}
                            {soirLabel && <p>Soir : {soirLabel}</p>}
                            {trancheLabel && <p>Tranche : {trancheLabel}</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 mt-0.5">Non planifié</p>
                        )}
                      </div>
                      <Button variant="ghost" size="xs" onClick={() => startEdit(day)}>
                        Modifier
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium capitalize">
                        {formatDayLabel(day.date)}
                      </p>

                      {/* ---------- Matin ---------- */}
                      <div className="space-y-1">
                        <Label>Matin</Label>
                        <Select on="card" value={eMatin} onChange={(e) => setEMatin(e.target.value)}>
                          <option value="">— Aucun —</option>
                          {eligible.map((e) => (
                            <option key={e.$id} value={e.$id}>
                              {e.full_name}
                            </option>
                          ))}
                        </Select>
                        {eMatin && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              on="card"
                              type="text"
                              value={eMatinDebut}
                              onChange={(e) => setEMatinDebut(e.target.value)}
                              placeholder={`Début (${config.shift_matin_debut})`}
                              maxLength={5}
                            />
                            <Input
                              on="card"
                              type="text"
                              value={eMatinFin}
                              onChange={(e) => setEMatinFin(e.target.value)}
                              placeholder={`Fin (${config.shift_matin_fin})`}
                              maxLength={5}
                            />
                          </div>
                        )}
                      </div>

                      {/* ---------- Soir ---------- */}
                      <div className="space-y-1">
                        <Label>Soir</Label>
                        <Select on="card" value={eSoir} onChange={(e) => setESoir(e.target.value)}>
                          <option value="">— Aucun —</option>
                          {eligible.map((e) => (
                            <option key={e.$id} value={e.$id}>
                              {e.full_name}
                            </option>
                          ))}
                        </Select>
                        {eSoir && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              on="card"
                              type="text"
                              value={eSoirDebut}
                              onChange={(e) => setESoirDebut(e.target.value)}
                              placeholder={`Début (${config.shift_soir_debut})`}
                              maxLength={5}
                            />
                            <Input
                              on="card"
                              type="text"
                              value={eSoirFin}
                              onChange={(e) => setESoirFin(e.target.value)}
                              placeholder={`Fin (${config.shift_soir_fin})`}
                              maxLength={5}
                            />
                          </div>
                        )}
                      </div>

                      {/* ---------- Tranche ---------- */}
                      <div className="space-y-1">
                        <Label>Tranche (horaire libre)</Label>
                        <Select
                          on="card"
                          value={eTranche}
                          onChange={(e) => setETranche(e.target.value)}
                        >
                          <option value="">— Aucun —</option>
                          {eligible.map((e) => (
                            <option key={e.$id} value={e.$id}>
                              {e.full_name}
                            </option>
                          ))}
                        </Select>
                        {eTranche && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              on="card"
                              type="text"
                              value={eTDebut}
                              onChange={(e) => setETDebut(e.target.value)}
                              placeholder="Début HH:MM"
                              maxLength={5}
                            />
                            <Input
                              on="card"
                              type="text"
                              value={eTFin}
                              onChange={(e) => setETFin(e.target.value)}
                              placeholder="Fin HH:MM"
                              maxLength={5}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          className="flex-1"
                          onClick={() => saveDay(day.date)}
                          disabled={assignMutation.isPending}
                        >
                          {assignMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setEditingDate(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
