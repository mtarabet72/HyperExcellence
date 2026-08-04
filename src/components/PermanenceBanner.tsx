// ============================================================
// HyperExcellence - Banniere "de permanence aujourd'hui" (Phase 7)
// Employe normal : ne voit que son propre creneau actif (Option A).
// ADMIN : voit le planning complet du jour (3 creneaux), actif ou non,
// avec indication du creneau en cours, pour supervision.
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTodayPermanenceSummary,
  getPermanenceForDate,
  getLocalDateKey,
  updateHandoverNote,
  PermanenceSlot,
} from '../lib/permanence';
import { listPermanenceEligible } from '../lib/employees';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Textarea } from './ui/Field';

const SLOT_LABELS: Record<PermanenceSlot, string> = {
  matin: 'Matin',
  soir: 'Soir',
  tranche: 'Tranche',
};

export function PermanenceBanner() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [editingSlot, setEditingSlot] = useState<PermanenceSlot | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const isAdmin = profile?.role === ROLES.ADMIN;
  const todayKey = getLocalDateKey();

  // Employe normal : uniquement le creneau actif en ce moment.
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['permanence-today'],
    queryFn: () => getTodayPermanenceSummary(),
    staleTime: 60 * 1000,
    enabled: !isAdmin,
  });

  // ADMIN : planning complet du jour, actif ou non.
  const { data: dayPlan, isLoading: loadingDay } = useQuery({
    queryKey: ['permanence-day', todayKey],
    queryFn: () => getPermanenceForDate(todayKey),
    staleTime: 60 * 1000,
    enabled: isAdmin,
  });

  const { data: eligible = [] } = useQuery({
    queryKey: ['permanence-eligible'],
    queryFn: listPermanenceEligible,
    enabled: isAdmin,
  });
  const nameById: Record<string, string> = {};
  for (const e of eligible) nameById[e.$id] = e.full_name;

  const noteMutation = useMutation({
    mutationFn: ({ date, slot, note }: { date: string; slot: PermanenceSlot; note: string }) =>
      updateHandoverNote(date, slot, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permanence-today'] });
      queryClient.invalidateQueries({ queryKey: ['permanence-day', todayKey] });
      setEditingSlot(null);
    },
  });

  if (!profile) return null;

  async function saveNote(slot: PermanenceSlot, date: string) {
    try {
      await noteMutation.mutateAsync({ date, slot, note: noteDraft });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  }

  // ---------- Vue ADMIN : planning complet du jour ----------
  if (isAdmin) {
    if (loadingDay || !dayPlan) return null;

    const activeSlotNow = summary
      ? (['matin', 'soir', 'tranche'] as PermanenceSlot[]).find((s) => summary[s].userId)
      : null;

    const rows: {
      slot: PermanenceSlot;
      userId: string | null;
      note: string;
      debut: string | null;
      fin: string | null;
    }[] = [
      { slot: 'matin', userId: dayPlan.matinUserId, note: dayPlan.matinNote, debut: dayPlan.matinHeureDebut, fin: dayPlan.matinHeureFin },
      { slot: 'soir', userId: dayPlan.soirUserId, note: dayPlan.soirNote, debut: dayPlan.soirHeureDebut, fin: dayPlan.soirHeureFin },
      { slot: 'tranche', userId: dayPlan.trancheUserId, note: dayPlan.trancheNote, debut: dayPlan.trancheHeureDebut, fin: dayPlan.trancheHeureFin },
    ];

    const planned = rows.filter((r) => r.userId);
    if (planned.length === 0) return null;

    return (
      <Card className="space-y-2 text-left">
        <p className="text-xs font-semibold text-slate-300">Permanence du jour (supervision)</p>
        {planned.map((row) => {
          const isEditing = editingSlot === row.slot;
          const isActiveNow = activeSlotNow === row.slot;
          const horaire = row.debut && row.fin ? `${row.debut}-${row.fin}` : '';

          return (
            <div key={row.slot} className="border-t border-slate-800 pt-2 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="text-slate-400">{SLOT_LABELS[row.slot]} : </span>
                  <span className="font-medium">{nameById[row.userId!] || '—'}</span>
                  {horaire && <span className="text-xs text-slate-500 ml-1">({horaire})</span>}
                </span>
                <div className="flex items-center gap-2">
                  {isActiveNow && <Badge tone="success">En cours</Badge>}
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setEditingSlot(row.slot);
                        setNoteDraft(row.note);
                      }}
                    >
                      Note
                    </Button>
                  )}
                </div>
              </div>

              {!isEditing && row.note && <p className="text-xs text-slate-500 mt-1">{row.note}</p>}

              {isEditing && (
                <div className="space-y-2 mt-2">
                  <Textarea
                    on="nested"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Note de passation..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      className="flex-1"
                      onClick={() => saveNote(row.slot, todayKey)}
                      disabled={noteMutation.isPending}
                    >
                      {noteMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => setEditingSlot(null)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    );
  }

  // ---------- Vue employe normal : uniquement son creneau actif (Option A) ----------
  if (loadingSummary || !summary) return null;

  const slots: PermanenceSlot[] = ['matin', 'soir', 'tranche'];
  const mySlot = slots.find((s) => summary[s].userId === profile.$id);
  if (!mySlot) return null;

  const info = summary[mySlot];
  const isEditing = editingSlot === mySlot;

  return (
    <Card className="space-y-2 text-left">
      <p className="text-xs font-semibold text-slate-300">Permanence en cours</p>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm">
            <span className="text-slate-400">{SLOT_LABELS[mySlot]} : </span>
            <span className="font-medium">Vous</span>
          </span>
          {!isEditing && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setEditingSlot(mySlot);
                setNoteDraft(info.note);
              }}
            >
              {info.note ? 'Modifier la note' : 'Ajouter une note'}
            </Button>
          )}
        </div>

        {!isEditing && info.note && <p className="text-xs text-slate-500 mt-1">{info.note}</p>}

        {isEditing && (
          <div className="space-y-2 mt-2">
            <Textarea
              on="nested"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Note de passation pour le prochain responsable..."
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="xs"
                className="flex-1"
                onClick={() => saveNote(mySlot, info.date)}
                disabled={noteMutation.isPending}
              >
                {noteMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setEditingSlot(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
