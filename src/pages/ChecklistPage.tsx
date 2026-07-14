// ============================================================
// HyperExcellence - Écran Checklist : Circuit 1 (Confort/Parking)
// ============================================================
import { useEffect, useState } from 'react';
import { getTasksForChecklist, submitTaskExecution, TaskTemplate } from '../lib/tasks';
import { TASK_STATUS, TASK_STATUS_LABELS, TaskStatus, GRAVITE_COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const CHECKLIST_ID = 'circuit-1-confort';
const ZONE_ID = '6a561bea002454e03375';

export default function ChecklistPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<string, TaskStatus>>({});
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  useEffect(() => {
    getTasksForChecklist(CHECKLIST_ID).then((list) => {
      setTasks(list);
      setIsLoading(false);
    });
  }, []);

  async function handleStatus(task: TaskTemplate, status: TaskStatus) {
    if (!profile) return;
    setSavingTaskId(task.$id);
    try {
      await submitTaskExecution({
        zoneId: ZONE_ID,
        taskId: task.$id,
        executedBy: profile.$id,
        status,
      });
      setCompleted((prev) => ({ ...prev, [task.$id]: status }));
    } catch (e) {
      alert('Erreur lors de l\'enregistrement.');
    } finally {
      setSavingTaskId(null);
    }
  }

  const doneCount = Object.keys(completed).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Chargement des tâches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold">Circuit 1 — Confort & Environnement</h1>
          <p className="text-sm text-slate-400 mt-1">
            Parking & Entrée principale · {doneCount}/{tasks.length} tâches
          </p>
          <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${(doneCount / tasks.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => {
            const status = completed[task.$id];
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

                <div className="flex gap-2 mt-3">
                  {(['FAIT', 'NON_FAIT', 'ECART'] as TaskStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatus(task, s)}
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
