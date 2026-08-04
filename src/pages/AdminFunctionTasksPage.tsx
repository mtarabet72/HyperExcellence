// ============================================================
// HyperExcellence - Ecran Admin : gestion des taches de fonction (Phase 8)
// CRUD via la Function serveur. Filtre optionnel par secteur pour les
// roles a portee sectorielle (CHEF_SECTEUR, CHEF_DEPARTEMENT).
// Suivi des validations (qui, quand) pour supervision ADMIN.
// ============================================================
import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAllFunctionTasks,
  createFunctionTask,
  updateFunctionTask,
  toggleFunctionTask,
  getCompletionsForTasks,
  FREQUENCIES,
  FREQUENCY_LABELS,
  FunctionTask,
  Frequency,
} from '../lib/functionTasks';
import { listEmployees } from '../lib/employees';
import {
  ROLES,
  ROLE_LABELS,
  ROLES_SECTOR_WIDE,
  SECTORS,
  SECTOR_LABELS,
  UserRole,
} from '../constants';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Label, Input, Select, Textarea } from '../components/ui/Field';

export default function AdminFunctionTasksPage() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['admin-function-tasks'],
    queryFn: listAllFunctionTasks,
  });

  const { data: completions = {} } = useQuery({
    queryKey: ['admin-function-task-completions', tasks.map((t) => t.$id)],
    queryFn: () => getCompletionsForTasks(tasks.filter((t) => t.isActive)),
    enabled: tasks.length > 0,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: listEmployees,
  });
  const nameById: Record<string, string> = {};
  for (const e of employees) nameById[e.$id] = e.full_name;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-function-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['function-tasks'] }); // rafraichit cote employe
    queryClient.invalidateQueries({ queryKey: ['admin-function-task-completions'] });
  }

  const createMutation = useMutation({ mutationFn: createFunctionTask, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updateFunctionTask, onSuccess: invalidate });
  const toggleMutation = useMutation({
    mutationFn: ({ taskId, isActive }: { taskId: string; isActive: boolean }) =>
      toggleFunctionTask(taskId, isActive),
    onSuccess: invalidate,
  });

  // ---------- Creation ----------
  const [cRole, setCRole] = useState<UserRole>(ROLES.CHEF_SECURITE);
  const [cSector, setCSector] = useState('');
  const [cLabel, setCLabel] = useState('');
  const [cLabelAr, setCLabelAr] = useState('');
  const [cFrequency, setCFrequency] = useState<Frequency>(FREQUENCIES.QUOTIDIEN);
  const [cDescription, setCDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---------- Edition ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eRole, setERole] = useState<UserRole>(ROLES.CHEF_SECURITE);
  const [eSector, setESector] = useState('');
  const [eLabel, setELabel] = useState('');
  const [eLabelAr, setELabelAr] = useState('');
  const [eFrequency, setEFrequency] = useState<Frequency>(FREQUENCIES.QUOTIDIEN);
  const [eDescription, setEDescription] = useState('');

  const cIsSectorRole = ROLES_SECTOR_WIDE.includes(cRole);
  const eIsSectorRole = ROLES_SECTOR_WIDE.includes(eRole);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!cLabel.trim()) {
      setError('Le libellé est requis.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        role: cRole,
        label: cLabel.trim(),
        labelAr: cLabelAr.trim() || undefined,
        frequency: cFrequency,
        description: cDescription.trim() || undefined,
        sector: cIsSectorRole ? cSector || undefined : undefined,
      });
      setSuccess(`Tâche "${cLabel.trim()}" créée.`);
      setCLabel('');
      setCLabelAr('');
      setCDescription('');
      setCSector('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    }
  }

  function startEdit(task: FunctionTask) {
    setEditingId(task.$id);
    setERole(task.role);
    setESector(task.sector || '');
    setELabel(task.label);
    setELabelAr(task.labelAr);
    setEFrequency(task.frequency);
    setEDescription(task.description);
  }

  async function saveEdit(taskId: string) {
    if (!eLabel.trim()) {
      alert('Le libellé est requis.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        taskId,
        role: eRole,
        label: eLabel.trim(),
        labelAr: eLabelAr.trim(),
        frequency: eFrequency,
        description: eDescription.trim(),
        sector: eIsSectorRole ? eSector : '',
      });
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la modification.');
    }
  }

  function sectorLabel(task: FunctionTask) {
    if (!task.sector) return null;
    return SECTOR_LABELS[task.sector as keyof typeof SECTOR_LABELS] || task.sector;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">Tâches de fonction</h1>
        <p className="text-sm text-slate-400">
          Tâches récurrentes rattachées à un rôle (pas à un rayon). Une validation suffit pour
          toute l'équipe ayant ce rôle. Pour les rôles à portée sectorielle (Chef Secteur, Chef
          Département), tu peux restreindre la tâche à un secteur précis.
        </p>

        {/* ---------- Création ---------- */}
        <form
          onSubmit={handleCreate}
          className="space-y-3 bg-slate-900 border border-slate-800 rounded-lg p-4"
        >
          <h2 className="text-sm font-semibold text-slate-300">Nouvelle tâche</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rôle concerné</Label>
              <Select
                on="card"
                value={cRole}
                onChange={(e) => {
                  setCRole(e.target.value as UserRole);
                  setCSector('');
                }}
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Fréquence</Label>
              <Select
                on="card"
                value={cFrequency}
                onChange={(e) => setCFrequency(e.target.value as Frequency)}
              >
                {Object.values(FREQUENCIES).map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {cIsSectorRole && (
            <div>
              <Label>Secteur (optionnel — laisser vide = tous les secteurs)</Label>
              <Select on="card" value={cSector} onChange={(e) => setCSector(e.target.value)}>
                <option value="">— Tous les secteurs —</option>
                {Object.values(SECTORS).map((s) => (
                  <option key={s} value={s}>
                    {SECTOR_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <Label>Libellé (français)</Label>
            <Input
              on="card"
              type="text"
              value={cLabel}
              onChange={(e) => setCLabel(e.target.value)}
              placeholder="Ex: Vérification des issues de secours"
            />
          </div>

          <div>
            <Label>Libellé (arabe) — optionnel</Label>
            <Input
              on="card"
              type="text"
              dir="rtl"
              value={cLabelAr}
              onChange={(e) => setCLabelAr(e.target.value)}
            />
          </div>

          <div>
            <Label>Description — optionnel</Label>
            <Textarea
              on="card"
              value={cDescription}
              onChange={(e) => setCDescription(e.target.value)}
              rows={2}
            />
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
            Tâches ({tasks.length})
          </h2>

          {isLoading ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : tasks.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune tâche de fonction créée.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isEditing = editingId === task.$id;
                const isToggling =
                  toggleMutation.isPending && toggleMutation.variables?.taskId === task.$id;
                const sLabel = sectorLabel(task);

                return (
                  <Card key={task.$id} className={task.isActive ? '' : 'opacity-60'}>
                    {!isEditing ? (
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium flex-1">{task.label}</p>
                          <Badge>{FREQUENCY_LABELS[task.frequency]}</Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {ROLE_LABELS[task.role]}
                          {sLabel && ` · ${sLabel}`}
                        </p>
                        {task.description && (
                          <p className="text-xs text-slate-500">{task.description}</p>
                        )}
                        <Badge tone={task.isActive ? 'success' : 'danger'}>
                          {task.isActive ? 'Active' : 'Désactivée'}
                        </Badge>

                        {task.isActive && (
                          <div className="pt-1">
                            {completions[task.$id] ? (
                              <p className="text-xs text-emerald-400">
                                ✓ Validée par {nameById[completions[task.$id].completedBy] || '—'}{' '}
                                le{' '}
                                {new Date(completions[task.$id].completedAt).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {completions[task.$id].note && (
                                  <span className="block text-slate-500 mt-0.5">
                                    Note : {completions[task.$id].note}
                                  </span>
                                )}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-400">
                                ⏳ Pas encore validée cette période
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            on="card"
                            value={eRole}
                            onChange={(e) => {
                              setERole(e.target.value as UserRole);
                              setESector('');
                            }}
                          >
                            {Object.values(ROLES).map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </Select>
                          <Select
                            on="card"
                            value={eFrequency}
                            onChange={(e) => setEFrequency(e.target.value as Frequency)}
                          >
                            {Object.values(FREQUENCIES).map((f) => (
                              <option key={f} value={f}>
                                {FREQUENCY_LABELS[f]}
                              </option>
                            ))}
                          </Select>
                        </div>
                        {eIsSectorRole && (
                          <Select on="card" value={eSector} onChange={(e) => setESector(e.target.value)}>
                            <option value="">— Tous les secteurs —</option>
                            {Object.values(SECTORS).map((s) => (
                              <option key={s} value={s}>
                                {SECTOR_LABELS[s]}
                              </option>
                            ))}
                          </Select>
                        )}
                        <Input
                          on="card"
                          type="text"
                          value={eLabel}
                          onChange={(e) => setELabel(e.target.value)}
                          placeholder="Libellé FR"
                        />
                        <Input
                          on="card"
                          type="text"
                          dir="rtl"
                          value={eLabelAr}
                          onChange={(e) => setELabelAr(e.target.value)}
                          placeholder="Libellé AR"
                        />
                        <Textarea
                          on="card"
                          value={eDescription}
                          onChange={(e) => setEDescription(e.target.value)}
                          rows={2}
                          placeholder="Description"
                        />
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
                            variant={task.isActive ? 'dangerSoft' : 'successSoft'}
                            size="xs"
                            className="flex-1"
                            onClick={() =>
                              toggleMutation.mutate({
                                taskId: task.$id,
                                isActive: !task.isActive,
                              })
                            }
                            disabled={isToggling}
                          >
                            {isToggling ? '...' : task.isActive ? 'Désactiver' : 'Réactiver'}
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
