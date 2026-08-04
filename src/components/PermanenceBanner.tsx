// ============================================================
// HyperExcellence - Banniere "de permanence aujourd'hui" (Phase 7)
// Employe normal : ne voit que son propre creneau (Option A, vie privee).
// ADMIN : voit et peut modifier tous les creneaux, pour supervision.
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayPermanenceSummary, updateHandoverNote, PermanenceSlot } from '../lib/permanence';
import { listPermanenceEligible } from '../lib/employees';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
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

  const { data: summary, isLoading } = useQuery({
    queryKey: ['permanence-today'],
    queryFn: () => getTodayPermanenceSummary(),
    staleTime: 60 * 1000,
  });

  // Seul l'ADMIN a besoin des noms de tous les responsables (supervision).
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
      setEditingSlot(null);
    },
  });

  if (isLoading || !summary || !profile) return null;

  const slots: PermanenceSlot[] = ['matin', 'soir', 'tranche'];
  const activeSlots = slots.filter((s) => summary[s].userId);

  if (activeSlots.length === 0) return null;

  function startEdit(slot: PermanenceSlot) {
    setEditingSlot(slot);
    setNoteDraft(summary![slot].note);
  }

  async function saveNote(slot: PermanenceSlot) {
    try {
      await noteMutation.mutateAsync({ date: summary![slot].date, slot, note: noteDraft });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    }
  }

  return (
    <Card className="space-y-2 text-left">
      <p className="text-xs font-semibold text-slate-300">
        {isAdmin ? 'Permanence en cours (supervision)' : 'Permanence en cours'}
      </p>
      {activeSlots.map((slot) => {
        const info = summary[slot];
        const isMine = info.userId === profile.$id;
        const isEditing = editingSlot === slot;
        // ADMIN voit/modifie tout ; un employe normal ne voit que son propre creneau.
        const canView = isAdmin || isMine;
        const canEdit = isAdmin || isMine;
        const displayName = isAdmin
          ? nameById[info.userId!] || '—'
          : isMine
            ? 'Vous'
            : '—';

        return (
          <div key={slot} className="border-t border-slate-800 pt-2 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                <span className="text-slate-400">{SLOT_LABELS[slot]} : </span>
                <span className="font-medium">{displayName}</span>
              </span>
              {canEdit && !isEditing && (
                <Button variant="ghost" size="xs" onClick={() => startEdit(slot)}>
                  {info.note ? 'Modifier la note' : 'Ajouter une note'}
                </Button>
              )}
            </div>

            {!isEditing && canView && info.note && (
              <p className="text-xs text-slate-500 mt-1">{info.note}</p>
            )}

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
                    onClick={() => saveNote(slot)}
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
