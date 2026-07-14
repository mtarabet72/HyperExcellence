// ============================================================
// HyperExcellence - Écran Checklist (multi-circuits, filtré par rayon)
// ============================================================
import { useEffect, useState } from 'react';
import { getTasksForChecklist, submitTaskExecution, TaskTemplate } from '../lib/tasks';
import { createNonConformite } from '../lib/nonConformites';
import { TASK_STATUS_LABELS, TaskStatus, GRAVITE_COLORS, ROLES } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface CircuitOption {
  checklistId: string;
  zoneId: string;
  departmentId: string;
  title: string;
  subtitle: string;
  transversal?: boolean; // visible pour tous les rôles transversaux, indépendamment du rayon
}

const CIRCUITS: CircuitOption[] = [
  {
    checklistId: 'circuit-1-confort',
    zoneId: '6a561bea002454e03375',
    departmentId: 'confort_environnement',
    title: 'Circuit 1 — Confort & Environnement',
    subtitle: 'Parking & Entrée principale',
  },
  {
    checklistId: 'circuit-3-pnd-haccp',
    zoneId: '6a56a89e0038906c0f21',
    departmentId: 'boucherie',
    title: 'Circuit 3 — PND HACCP',
    subtitle: 'Nettoyage & Désinfection (rayons frais)',
    transversal: true,
  },
  {
    checklistId: 'circuit-2-boucherie',
    zoneId: '6a56b03900331e1574ac',
    departmentId: 'boucherie',
    title: 'Circuit 2 — Service SBAM Boucherie',
    subtitle: 'Rayon Boucherie / Volaille',
  },
  {
    checklistId: 'circuit-2-fromage-charcuterie',
    zoneId: '6a56b4120021076ed72b',
    departmentId: 'fromage_charcuterie',
    title: 'Circuit 2 — Service SBAM Fromage/Charcuterie',
    subtitle: 'Rayon Fromage / Charcuterie à la coupe',
  },
  {
    checklistId: 'circuit-2-boulangerie',
    zoneId: '6a56b76b000f36d15a90',
    departmentId: 'boulangerie',
    title: 'Circuit 2 — Service SBAM Boulangerie',
    subtitle: 'Rayon Boulangerie / Pâtisserie',
  },
  {
    checklistId: 'circuit-4-libre-service',
    zoneId: '6a569fc40029a16ed2b6',
    departmentId: 'apls_frais_ls',
    title: 'Circuit 4 — Libre Service & Ruptures',
    subtitle: 'Libre Service Frais',
  },
  {
    checklistId: 'circuit-5-caisses',
    zoneId: '6a565b970008bdf42a6b',
    departmentId: 'caisses',
    title: 'Circuit 5 — Caisses',
    subtitle: 'Ligne de caisses principale',
  },
];

// Rôles ayant accès à TOUS les circuits, quel que soit leur rayon
const ROLES_TRANSVERSAUX: string[] = [ROLES.ADMIN, ROLES.CHEF_SECTEUR];

// Rôles ayant accès aux circuits marqués "transversal", en plus de leur propre rayon
const ROLES_ACCES_TRANSVERSAL: string[] = [ROLES.MAITRE_METIER];

export default function ChecklistPage() {
  const { profile } = useAuth();

  const visibleCircuits = !profile
    ? []
    : ROLES_TRANSVERSAUX.includes(profile.role)
    ? CIRCUITS
    : CIRCUITS.filter(
        (c) =>
          c.departmentId === profile.department_id ||
          (c.transversal && ROLES_ACCES_TRANSVERSAL.includes(profile.role))
      );

  const [selectedCircuit, setSelectedCircuit] = useState<CircuitOption | null>(
    visibleCircuits[0] || null
  );
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<string, TaskStatus>>({});
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const [ncTaskId, setNcTaskId] = useState<string | null>(null);
  const [ncStatus, setNcStatus] = useState<TaskStatus | null>(null);
  const [actionImmediate, setActionImmediate] = useState('');

  useEffect(() => {
    if (!selectedCircuit) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setCompleted({});
    getTasksForChecklist(selectedCircuit.checklistId).then((list) => {
      setTasks(list);
      setIsLoading(false);
    });
  }, [selectedCircuit]);

  function handleStatusClick(task: TaskTemplate, status: TaskStatus) {
    if (status === 'FAIT') {
      saveExecution(task, status);
    } else {
      setNcTaskId(task.$id);
      setNcStatus(status);
      setActionImmediate('');
    }
  }

  async function saveExecution(task: TaskTemplate, status: TaskStatus) {
    if (!profile || !selectedCircuit) return;
    setSavingTaskId(task.$id);
    try {
      const execution = await submitTaskExecution({
        zoneId: selectedCircuit.zoneId,
        taskId: task.$id,
        executedBy: profile.$id,
        status,
      });

      if (status !== 'FAIT') {
        await createNonConformite({
          zoneId: selectedCircuit.zoneId,
          taskExecutionId: execution.$id,
          gravite: task.default_gravite,
          actionImmediate: actionImmediate.trim() || 'Non précisé',
          declaredBy: profile.$id,
        });
      }

      setCompleted((prev) => ({ ...prev, [task.$id]: status }));
      setNcTaskId(null);
      setNcStatus(null);
      setActionImmediate('');
    } catch {
      alert('Erreur lors de l\'enregistrement.');
    } finally {
      setSavingTaskId(null);
    }
  }

  function confirmNC(task: TaskTemplate) {
    if (!actionImmediate.trim()) {
      alert('L\'action immédiate est obligatoire.');
      return;
    }
    saveExecution(task, ncStatus!);
  }

  const doneCount = Object.keys(completed).length;

  if (visibleCircuits.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
        <div className="max-w-xl mx-auto text-center mt-10">
          <p className="text-slate-400 text-sm">
            Aucun circuit n'est associé à votre rayon pour le moment.
            <br />
            Contactez votre administrateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        {visibleCircuits.length > 1 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Circuit</label>
            <select
              value={selectedCircuit?.checklistId}
              onChange={(e) =>
                setSelectedCircuit(
                  visibleCircuits.find((c) => c.checklistId === e.target.value)!
                )
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
            >
              {visibleCircuits.map((c) => (
                <option key={c.checklistId} value={c.checklistId}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedCircuit && (
          <div>
            <h1 className="text-xl font-bold">{selectedCircuit.title}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {selectedCircuit.subtitle} · {doneCount}/{tasks.length} tâches
            </p>
            <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: tasks.length ? `${(doneCount / tasks.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-slate-400 text-sm">Chargement des tâches...</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const status = completed[task.$id];
              const isAskingNC = ncTaskId === task.$id;

              return (
                <div
                  key={task.$id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: GRAVITE_COLORS[task.default_gravite] }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {task.task_number}. {task.label}
                      </p>
                      {task.requires_photo && (
                        <p className="text-xs text-slate-500 mt-0.5">📷 Photo requise</p>
                      )}
                    </div>
                  </div>

                  {isAskingNC ? (
                    <div className="mt-3 space-y-2 bg-red-950/30 border border-red-900 rounded-lg p-3">
                      <p className="text-xs text-red-300 font-medium">
                        ⚠️ Non conformité — Action immédiate obligatoire
                      </p>
                      <textarea
                        value={actionImmediate}
                        onChange={(e) => setActionImmediate(e.target.value)}
                        placeholder="Ex: nettoyage effectué, produit retiré..."
                        rows={2}
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmNC(task)}
                          disabled={savingTaskId === task.$id}
                          className="flex-1 rounded-lg bg-red-500 text-slate-950 font-medium py-2 text-xs"
                        >
                          {savingTaskId === task.$id ? 'Enregistrement...' : 'Confirmer la NC'}
                        </button>
                        <button
                          onClick={() => setNcTaskId(null)}
                          className="rounded-lg bg-slate-800 px-3 py-2 text-xs"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      {(['FAIT', 'NON_FAIT', 'ECART'] as TaskStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusClick(task, s)}
                          disabled={savingTaskId === task.$id}
                          className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                            status === s
                              ? s === 'FAIT'
                                ? 'bg-emerald-500 text-slate-950'
                                : s === 'NON_FAIT'
                                ? 'bg-red-500 text-slate-950'
                                : 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {TASK_STATUS_LABELS[s]}
                        </button>
                      ))}
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
