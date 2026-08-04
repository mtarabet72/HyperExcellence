// ============================================================
// HyperExcellence - Ecran : mes taches de fonction (Phase 8)
// Affiche les taches liees au role du profil connecte, avec statut
// de validation pour la periode en cours.
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTasksForRole,
  getCompletionsForTasks,
  completeFunctionTask,
  FREQUENCY_LABELS,
} from '../lib/functionTasks';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Textarea } from '../components/ui/Field';

export default function MyFunctionTasksPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['function-tasks', profile?.role],
    queryFn: () => listTasksForRole(profile!.role),
    enabled: !!profile,
  });

  const { data: completions = {}, isLoading: loadingCompletions } = useQuery({
    queryKey: ['function-task-completions', tasks.map((t) => t.$id)],
    queryFn: () => getCompletionsForTasks(tasks),
    enabled: tasks.length > 0,
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note?: string }) =>
      completeFunctionTask(taskId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['function-task-completions'] });
      setCompletingId(null);
      setNote('');
    },
  });

  async function handleComplete(taskId: string) {
    try {
      await completeMutation.mutateAsync({ taskId, note: note.trim() || undefined });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la validation.');
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

  if (!profile) return null;

  const isLoading = loadingTasks || loadingCompletions;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Mes tâches de fonction</h1>
        <p className="text-sm text-slate-400">
          Tâches récurrentes liées à votre rôle. Une validation suffit pour toute l'équipe
          concernée.
        </p>

        {isLoading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune tâche de fonction pour votre rôle.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const completion = completions[task.$id];
              const isCompleting = completingId === task.$id;

              return (
                <Card key={task.$id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{task.label}</p>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <Badge>{FREQUENCY_LABELS[task.frequency]}</Badge>
                  </div>

                  {completion ? (
                    <div className="flex items-center gap-2">
                      <Badge tone="success">✓ Validée</Badge>
                      <span className="text-xs text-slate-500">
                        {formatDate(completion.completedAt)}
                      </span>
                    </div>
                  ) : isCompleting ? (
                    <div className="space-y-2">
                      <Textarea
                        on="card"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Note (optionnel)"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="success"
                          size="xs"
                          className="flex-1"
                          onClick={() => handleComplete(task.$id)}
                          disabled={completeMutation.isPending}
                        >
                          {completeMutation.isPending ? 'Validation...' : 'Confirmer'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setCompletingId(null);
                            setNote('');
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="success"
                      size="xs"
                      fullWidth
                      onClick={() => setCompletingId(task.$id)}
                    >
                      Valider
                    </Button>
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
