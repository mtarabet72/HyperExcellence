// ============================================================
// HyperExcellence - Ecran Checklist (multi-circuits, photos, offline, bilingue)
// ============================================================
import { useEffect, useState, ChangeEvent } from 'react';
import { getTasksForChecklist, submitTaskExecution, TaskTemplate } from '../lib/tasks';
import { createNonConformite } from '../lib/nonConformites';
import { uploadTaskPhoto } from '../lib/storage';
import { offlineDb, generateOfflineId } from '../lib/offlineDb';
import { syncPendingData, countPending } from '../lib/offlineSync';
import { TaskStatus, GRAVITE_COLORS, ROLES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface CircuitOption {
  checklistId: string;
  zoneId: string;
  departmentId: string;
  title: string;
  subtitle: string;
  transversal?: boolean;
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
    checklistId: 'circuit-2-poissonnerie',
    zoneId: '6a56be96001436a1c2ee',
    departmentId: 'poissonnerie',
    title: 'Circuit 2 — Service SBAM Poissonnerie',
    subtitle: 'Rayon Poissonnerie',
  },
  {
    checklistId: 'circuit-2-traiteur',
    zoneId: '6a57199f0029e2061a01',
    departmentId: 'traiteur',
    title: 'Circuit 2 — Service SBAM Traiteur',
    subtitle: 'Rayon Traiteur',
  },
  {
    checklistId: 'circuit-2-fruits-legumes',
    zoneId: '6a571ca000276c6485cf',
    departmentId: 'fruits_legumes',
    title: 'Circuit 2 — Service SBAM Fruits et Légumes',
    subtitle: 'Rayon Fruits et Légumes',
  },
  {
    checklistId: 'circuit-2-epices-vrac',
    zoneId: '6a57203200048282d2d1',
    departmentId: 'epices_vrac',
    title: 'Circuit 2 — Service SBAM Épices/Vrac',
    subtitle: 'Rayon Épices / Olives / Vrac',
  },
  {
    checklistId: 'circuit-2-electromenager',
    zoneId: '6a575b18002dbaf4fd24',
    departmentId: 'electromenager',
    title: 'Circuit 2 — Service SBAM Electroménager',
    subtitle: 'Rayon Electroménager',
  },
  {
    checklistId: 'circuit-2-textile-pgc',
    zoneId: '6a575d4f0019d803ff56',
    departmentId: 'textile_pgc',
    title: 'Circuit 2 — Service SBAM Textile/PGC',
    subtitle: 'Rayon Textile / Literie / PGC',
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

const ROLES_TRANSVERSAUX: string[] = [ROLES.ADMIN, ROLES.CHEF_SECTEUR];
const ROLES_ACCES_TRANSVERSAL: string[] = [ROLES.MAITRE_METIER];

export default function ChecklistPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();

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

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [photoBlobs, setPhotoBlobs] = useState<Record<string, Blob>>({});
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const statusLabels: Record<TaskStatus, string> = {
    FAIT: t('status_FAIT' as any),
    NON_FAIT: t('status_NON_FAIT' as any),
    ECART: t('status_ECART' as any),
    NON_APPLICABLE: t('status_NON_APPLICABLE' as any),
  };

  async function refreshPendingCount() {
    setPendingCount(await countPending());
  }

  async function handleSync() {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncPendingData();
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    refreshPendingCount();

    function onOnline() {
      setIsOnline(true);
      handleSync();
    }
    function onOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!selectedCircuit) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setCompleted({});
    setPhotoUrls({});
    setPhotoBlobs({});
    getTasksForChecklist(selectedCircuit.checklistId).then((list) => {
      setTasks(list);
      setIsLoading(false);
    });
  }, [selectedCircuit]);

  async function handlePhotoSelected(task: TaskTemplate, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (navigator.onLine) {
      setUploadingTaskId(task.$id);
      try {
        const url = await uploadTaskPhoto(file);
        setPhotoUrls((prev) => ({ ...prev, [task.$id]: url }));
      } catch {
        const localUrl = URL.createObjectURL(file);
        setPhotoUrls((prev) => ({ ...prev, [task.$id]: localUrl }));
        setPhotoBlobs((prev) => ({ ...prev, [task.$id]: file }));
      } finally {
        setUploadingTaskId(null);
      }
    } else {
      const localUrl = URL.createObjectURL(file);
      setPhotoUrls((prev) => ({ ...prev, [task.$id]: localUrl }));
      setPhotoBlobs((prev) => ({ ...prev, [task.$id]: file }));
    }
  }

  function handleStatusClick(task: TaskTemplate, status: TaskStatus) {
    if (task.requires_photo && !photoUrls[task.$id]) {
      alert(t('photoRequiredAlert' as any));
      return;
    }
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
      const photoBlob = photoBlobs[task.$id];
      const photoUrl = !photoBlob ? photoUrls[task.$id] : undefined;

      const result = await submitTaskExecution({
        zoneId: selectedCircuit.zoneId,
        taskId: task.$id,
        executedBy: profile.$id,
        status,
        photoAfterUrl: photoUrl,
        photoBlob,
      });

      if (status !== 'FAIT') {
        if (result.wasOffline) {
          await offlineDb.pendingNCs.add({
            offlineId: generateOfflineId(),
            zoneId: selectedCircuit.zoneId,
            taskExecutionOfflineId: result.offlineId!,
            gravite: task.default_gravite,
            actionImmediate: actionImmediate.trim() || 'Non précisé',
            declaredBy: profile.$id,
            createdLocallyAt: Date.now(),
          });
        } else {
          await createNonConformite({
            zoneId: selectedCircuit.zoneId,
            taskExecutionId: result.$id,
            gravite: task.default_gravite,
            actionImmediate: actionImmediate.trim() || 'Non précisé',
            declaredBy: profile.$id,
          });
        }
      }

      setCompleted((prev) => ({ ...prev, [task.$id]: status }));
      setNcTaskId(null);
      setNcStatus(null);
      setActionImmediate('');
      await refreshPendingCount();
    } catch {
      alert(t('saveErrorAlert' as any));
    } finally {
      setSavingTaskId(null);
    }
  }

  function confirmNC(task: TaskTemplate) {
    if (!actionImmediate.trim()) {
      alert(t('actionRequiredAlert' as any));
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
            {t('noCircuitAssigned' as any)}
            <br />
            {t('contactAdmin' as any)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
            isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          <span>{isOnline ? t('onlineStatus' as any) : t('offlineStatus' as any)}</span>
          {pendingCount > 0 && (
            <button
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              className="bg-slate-800 text-slate-200 px-2 py-1 rounded-full disabled:opacity-50"
            >
              {isSyncing ? t('syncing' as any) : `${pendingCount} ${t('pendingSync' as any)}`}
            </button>
          )}
        </div>

        {visibleCircuits.length > 1 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('circuitLabel' as any)}</label>
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
              {selectedCircuit.subtitle} · {doneCount}/{tasks.length} {t('tasksLabel' as any)}
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
          <p className="text-slate-400 text-sm">{t('loadingTasks' as any)}</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const status = completed[task.$id];
              const isAskingNC = ncTaskId === task.$id;
              const hasPhoto = !!photoUrls[task.$id];
              const isLocalPhoto = !!photoBlobs[task.$id];
              const isUploading = uploadingTaskId === task.$id;

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
                        {task.task_number}. {language === 'ar' && task.label_ar ? task.label_ar : task.label}
                      </p>
                      {task.requires_photo && !hasPhoto && (
                        <p className="text-xs text-amber-400 mt-0.5">
                          📷 {t('photoRequired' as any)}
                        </p>
                      )}
                    </div>
                  </div>

                  {task.requires_photo && (
                    <div className="mt-2">
                      {hasPhoto ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={photoUrls[task.$id]}
                            alt="Preuve"
                            className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                          />
                          <span className="text-xs text-emerald-400">
                            {isLocalPhoto
                              ? '✓ ' + t('photoLocalPending' as any)
                              : '✓ ' + t('photoAdded' as any)}
                          </span>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handlePhotoSelected(task, e)}
                            disabled={isUploading}
                          />
                          {isUploading ? t('uploading' as any) : '📷 ' + t('takePhoto' as any)}
                        </label>
                      )}
                    </div>
                  )}

                  {isAskingNC ? (
                    <div className="mt-3 space-y-2 bg-red-950/30 border border-red-900 rounded-lg p-3">
                      <p className="text-xs text-red-300 font-medium">
                        ⚠️ {t('ncFormTitle' as any)}
                      </p>
                      <textarea
                        value={actionImmediate}
                        onChange={(e) => setActionImmediate(e.target.value)}
                        placeholder={t('actionPlaceholder' as any)}
                        rows={2}
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmNC(task)}
                          disabled={savingTaskId === task.$id}
                          className="flex-1 rounded-lg bg-red-500 text-slate-950 font-medium py-2 text-xs"
                        >
                          {savingTaskId === task.$id ? t('savingLabel' as any) : t('confirmNCButton' as any)}
                        </button>
                        <button
                          onClick={() => setNcTaskId(null)}
                          className="rounded-lg bg-slate-800 px-3 py-2 text-xs"
                        >
                          {t('cancel')}
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
                          {statusLabels[s]}
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
