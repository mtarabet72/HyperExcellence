// ============================================================
// HyperExcellence - Ecran Admin : planning de permanence (Phase 7)
// CRUD via la Function serveur. Ecriture reservee a l'ADMIN.
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPermanenceForMonth,
  assignPermanence,
  PermanenceDay,
} from '../lib/permanence';
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
  const [eSoir, setESoir] = useState('');
  const [eTranche, setETranche] = useState('');
  const [eTDebut, setETDebut] = useState('');
  const [eTFin, setETFin] = useState('');

  function startEdit(day: PermanenceDay) {
    setEditingDate(day.date);
    setEMatin(day.matinUserId || '');
    setESoir(day.soirUserId || '');
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
        soirUserId: eSoir || undefined,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Planning de permanence</h1>
        <p className="text-sm text-slate-400">
          Affectez le responsable Matin / Soir / Tranche pour chaque jour. Seuls les ADMIN et
          Responsables RH sont sélectionnables.
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
              const hasAny = day.matinUserId || day.soirUserId || day.trancheUserId;

              return (
                <Card key={day.date}>
                  {!isEditing ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {formatDayLabel(day.date)}
                        </p>
                        {hasAny ? (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {day.matinUserId && `Matin: ${nameById[day.matinUserId] || '—'}`}
                            {day.matinUserId && (day.soirUserId || day.trancheUserId) && ' · '}
                            {day.soirUserId && `Soir: ${nameById[day.soirUserId] || '—'}`}
                            {day.soirUserId && day.trancheUserId && ' · '}
                            {day.trancheUserId &&
                              `Tranche (${day.trancheHeureDebut}-${day.trancheHeureFin}): ${
                                nameById[day.trancheUserId] || '—'
                              }`}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600 mt-0.5">Non planifié</p>
                        )}
                      </div>
                      <Button variant="ghost" size="xs" onClick={() => startEdit(day)}>
                        Modifier
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium capitalize">
                        {formatDayLabel(day.date)}
                      </p>
                      <div>
                        <Label>Matin</Label>
                        <Select on="card" value={eMatin} onChange={(e) => setEMatin(e.target.value)}>
                          <option value="">— Aucun —</option>
                          {eligible.map((e) => (
                            <option key={e.$id} value={e.$id}>
                              {e.full_name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>Soir</Label>
                        <Select on="card" value={eSoir} onChange={(e) => setESoir(e.target.value)}>
                          <option value="">— Aucun —</option>
                          {eligible.map((e) => (
                            <option key={e.$id} value={e.$id}>
                              {e.full_name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
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
                      </div>
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
