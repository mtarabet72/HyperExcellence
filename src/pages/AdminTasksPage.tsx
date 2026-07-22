// ============================================================
// HyperExcellence - Ecran Admin : gestion des taches (Phase 6)
// CRUD via la Function serveur, `task_templates` reste en lecture
// seule cote client.
// ============================================================
import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAllTasksForChecklist,
  createTask,
  updateTask,
  toggleTask,
} from '../lib/taskAdmin';
import { TaskTemplate } from '../lib/tasks';
import { CIRCUIT_TITLES, GRAVITES, GRAVITE_LABELS, GRAVITE_COLORS, Gravite } from '../constants';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Label, Input, Select } from '../components/ui/Field';

const CIRCUIT_IDS = Object.keys(CIRCUIT_TITLES);

export default function AdminTasksPage() {
  const queryClient = useQueryClient();
  const [checklistId, setChecklistId] = useState(CIRCUIT_IDS[0]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['admin-tasks', checklistId],
    queryFn: () => listAllTasksForChecklist(checklistId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-tasks', checklistId] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] }); // rafraichit aussi le terrain
  }

  const createMutation = useMutation({ mutationFn: createTask, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updateTask, onSuccess: invalidate });
  const toggleMutation = useMutation({
    mutationFn: ({ taskId, isActive }: { taskId: string; isActive: boolean }) =>
      toggleTask(taskId, isActive),
    onSuccess: invalidate,
  });

  // ---------- Formulaire de creation ----------
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newLabelAr, setNewLabelAr] = useState('');
  const [newGravite, setNewGravite] = useState<Gravite>(GRAVITES.MINEURE);
  const [newTime, setNewTime] = useState('');
  const [newPhoto, setNewPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---------- Edition en ligne ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editLabelAr, setEditLabelAr] = useState('');
  const [editGravite, setEditGravite] = useState<Gravite>(GRAVITES.MINEURE);
  const [editTime, setEditTime] = useState('');
  const [editPhoto, setEditPhoto] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newLabel.trim() || !newNumber.trim()) {
      setError('Numéro et libellé sont requis.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        checklistId,
        taskNumber: Number(newNumber),
        label: newLabel.trim(),
        labelAr: newLabelAr.trim() || undefined,
        defaultGravite: newGravite,
        sortOrder: Number(newNumber),
        requiresPhoto: newPhoto,
        executionTime: newTime.trim() || undefined,
      });
      setSuccess(`Tâche "${newLabel.trim()}" créée.`);
      setNewNumber('');
      setNewLabel('');
      setNewLabelAr('');
      setNewGravite(GRAVITES.MINEURE);
      setNewTime('');
      setNewPhoto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    }
  }

  function startEdit(task: TaskTemplate) {
    setEditingId(task.$id);
    setEditLabel(task.label);
    setEditLabelAr(task.label_ar || '');
    setEditGravite(task.default_gravite);
    setEditTime(task.execution_time || '');
    setEditPhoto(!!task.requires_photo);
  }

  async function saveEdit(taskId: string) {
    if (!editLabel.trim()) {
      alert('Le libellé est requis.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        taskId,
        label: editLabel.trim(),
        labelAr: editLabelAr.trim(),
        defaultGravite: editGravite,
        requiresPhoto: editPhoto,
        executionTime: editTime.trim(), // chaîne vide = efface l'heure cible
      });
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la modification.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">Gestion des tâches</h1>

        <div>
          <Label>Circuit</Label>
          <Select value={checklistId} onChange={(e) => setChecklistId(e.target.value)}>
            {CIRCUIT_IDS.map((id) => (
              <option key={id} value={id}>
                {CIRCUIT_TITLES[id]}
              </option>
            ))}
          </Select>
        </div>

        {/* ---------- Création ---------- */}
        <form
          onSubmit={handleCreate}
          className="space-y-3 bg-slate-900 border border-slate-800 rounded-lg p-4"
        >
          <h2 className="text-sm font-semibold text-slate-300">Nouvelle tâche</h2>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>N°</Label>
              <Input
                on="card"
                type="number"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="164"
              />
            </div>
            <div className="col-span-2">
              <Label>Gravité par défaut</Label>
              <Select
                on="card"
                value={newGravite}
                onChange={(e) => setNewGravite(e.target.value as Gravite)}
              >
                {Object.values(GRAVITES).map((g) => (
                  <option key={g} value={g}>
                    {GRAVITE_LABELS[g]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>Libellé (français)</Label>
            <Input
              on="card"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Contrôle balisage — Zone Textile"
            />
          </div>

          <div>
            <Label>Libellé (arabe) — optionnel</Label>
            <Input
              on="card"
              type="text"
              dir="rtl"
              value={newLabelAr}
              onChange={(e) => setNewLabelAr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Heure cible (HH:MM) — optionnel</Label>
              <Input
                on="card"
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="09:00"
                maxLength={5}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 mt-5">
              <input
                type="checkbox"
                checked={newPhoto}
                onChange={(e) => setNewPhoto(e.target.checked)}
              />
              Photo obligatoire
            </label>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-emerald-400 text-sm">{success}</p>}

          <Button type="submit" size="md" fullWidth disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Création...' : 'Créer la tâche'}
          </Button>
        </form>

        {/* ---------- Liste ---------- */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Tâches du circuit ({tasks.length})
          </h2>

          {isLoading ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : tasks.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune tâche sur ce circuit.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isEditing = editingId === task.$id;
                const isToggling =
                  toggleMutation.isPending && toggleMutation.variables?.taskId === task.$id;

                return (
                  <Card key={task.$id} className={task.is_active ? '' : 'opacity-60'}>
                    {!isEditing ? (
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium flex-1">
                            {task.task_number}. {task.label}
                          </p>
                          <Badge color={GRAVITE_COLORS[task.default_gravite]}>
                            {GRAVITE_LABELS[task.default_gravite]}
                          </Badge>
                        </div>
                        {task.label_ar && (
                          <p className="text-xs text-slate-400" dir="rtl">
                            {task.label_ar}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {task.execution_time && (
                            <Badge>⏱ {task.execution_time}</Badge>
                          )}
                          {task.requires_photo && <Badge>📷 Photo</Badge>}
                          <Badge tone={task.is_active ? 'success' : 'danger'}>
                            {task.is_active ? 'Active' : 'Désactivée'}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          on="card"
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                        />
                        <Input
                          on="card"
                          type="text"
                          dir="rtl"
                          value={editLabelAr}
                          onChange={(e) => setEditLabelAr(e.target.value)}
                          placeholder="Libellé arabe"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            on="card"
                            value={editGravite}
                            onChange={(e) => setEditGravite(e.target.value as Gravite)}
                          >
                            {Object.values(GRAVITES).map((g) => (
                              <option key={g} value={g}>
                                {GRAVITE_LABELS[g]}
                              </option>
                            ))}
                          </Select>
                          <Input
                            on="card"
                            type="text"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            placeholder="HH:MM (vide = aucune)"
                            maxLength={5}
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={editPhoto}
                            onChange={(e) => setEditPhoto(e.target.checked)}
                          />
                          Photo obligatoire
                        </label>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      {!isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="flex-1"
                            onClick={() => startEdit(task)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant={task.is_active ? 'dangerSoft' : 'successSoft'}
                            size="xs"
                            className="flex-1"
                            onClick={() =>
                              toggleMutation.mutate({
                                taskId: task.$id,
                                isActive: !task.is_active,
                              })
                            }
                            disabled={isToggling}
                          >
                            {isToggling
                              ? '...'
                              : task.is_active
                                ? 'Désactiver'
                                : 'Réactiver'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="xs"
                            className="flex-1"
                            onClick={() => saveEdit(task.$id)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => setEditingId(null)}>
                            Annuler
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
