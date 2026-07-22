// ============================================================
// HyperExcellence - Ecran Checklist (multi-circuits, secteurs, offline, bilingue)
// Chargement des taches converti a TanStack Query (Phase 1)
// Migre vers le Design System (Phase 2)
// Gestion des shifts Matin/Soir (Phase 6)
// ============================================================
import { useEffect, useState, ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTasksForChecklist,
  submitTaskExecution,
  getExecutionsForShift,
  TaskTemplate,
} from '../lib/tasks';
import { createNonConformite } from '../lib/nonConformites';
import { uploadTaskPhoto } from '../lib/storage';
import { offlineDb, generateOfflineId } from '../lib/offlineDb';
import { syncPendingData, countPending } from '../lib/offlineSync';
import { getAppConfig, getCurrentShift, DEFAULT_CONFIG } from '../lib/settings';
import {
  TaskStatus,
  GRAVITE_COLORS,
  ROLES,
  ROLES_SECTOR_WIDE,
  SHIFT_LABELS,
  Shift,
  getSectorForDepartment,
} from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Label, Select, Textarea } from '../components/ui/Field';

interface CircuitOption {
  checklistId: string;
  zoneId: string;
  departmentId: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  transversal?: boolean;
}

const CIRCUITS: CircuitOption[] = [
  {
    checklistId: 'circuit-1-confort',
    zoneId: '6a561bea002454e03375',
    departmentId: 'confort_environnement',
    title: 'Circuit 1 — Confort & Environnement',
    titleAr: 'المسار 1 - الراحة والبيئة',
    subtitle: 'Parking & Entrée principale',
    subtitleAr: 'الموقف والمدخل الرئيسي',
  },
  {
    checklistId: 'circuit-3-pnd-haccp',
    zoneId: '6a56a89e0038906c0f21',
    departmentId: 'boucherie',
    title: 'Circuit 3 — PND HACCP',
    titleAr: 'المسار 3 - التنظيف والتطهير',
    subtitle: 'Nettoyage & Désinfection (rayons frais)',
    subtitleAr: 'التنظيف والتطهير (الأرفف الطازجة)',
    transversal: true,
  },
  {
    checklistId: 'circuit-2-boucherie',
    zoneId: '6a56b03900331e1574ac',
    departmentId: 'boucherie',
    title: 'Circuit 2 — Service SBAM Boucherie',
    titleAr: 'المسار 2 - خدمة اللحوم',
    subtitle: 'Rayon Boucherie / Volaille',
    subtitleAr: 'رف اللحوم / الدواجن',
  },
  {
    checklistId: 'circuit-2-fromage-charcuterie',
    zoneId: '6a56b4120021076ed72b',
    departmentId: 'fromage_charcuterie',
    title: 'Circuit 2 — Service SBAM Fromage/Charcuterie',
    titleAr: 'المسار 2 - خدمة الجبن والمقبلات',
    subtitle: 'Rayon Fromage / Charcuterie à la coupe',
    subtitleAr: 'رف الجبن والمقبلات بالقطع',
  },
  {
    checklistId: 'circuit-2-boulangerie',
    zoneId: '6a56b76b000f36d15a90',
    departmentId: 'boulangerie',
    title: 'Circuit 2 — Service SBAM Boulangerie',
    titleAr: 'المسار 2 - خدمة المخبزة',
    subtitle: 'Rayon Boulangerie / Pâtisserie',
    subtitleAr: 'رف المخبزة / الحلويات',
  },
  {
    checklistId: 'circuit-2-poissonnerie',
    zoneId: '6a56be96001436a1c2ee',
    departmentId: 'poissonnerie',
    title: 'Circuit 2 — Service SBAM Poissonnerie',
    titleAr: 'المسار 2 - خدمة السمك',
    subtitle: 'Rayon Poissonnerie',
    subtitleAr: 'رف السمك',
  },
  {
    checklistId: 'circuit-2-traiteur',
    zoneId: '6a57199f0029e2061a01',
    departmentId: 'traiteur',
    title: 'Circuit 2 — Service SBAM Traiteur',
    titleAr: 'المسار 2 - خدمة الطعام الجاهز',
    subtitle: 'Rayon Traiteur',
    subtitleAr: 'رف الطعام الجاهز',
  },
  {
    checklistId: 'circuit-2-fruits-legumes',
    zoneId: '6a571ca000276c6485cf',
    departmentId: 'fruits_legumes',
    title: 'Circuit 2 — Service SBAM Fruits et Légumes',
    titleAr: 'المسار 2 - خدمة الفواكه والخضر',
    subtitle: 'Rayon Fruits et Légumes',
    subtitleAr: 'رف الفواكه والخضر',
  },
  {
    checklistId: 'circuit-2-epices-vrac',
    zoneId: '6a57203200048282d2d1',
    departmentId: 'epices_vrac',
    title: 'Circuit 2 — Service SBAM Épices/Vrac',
    titleAr: 'المسار 2 - خدمة التوابل',
    subtitle: 'Rayon Épices / Olives / Vrac',
    subtitleAr: 'رف التوابل / الزيتون / السائب',
  },
  {
    checklistId: 'circuit-2-electromenager',
    zoneId: '6a575b18002dbaf4fd24',
    departmentId: 'electromenager',
    title: 'Circuit 2 — Service SBAM Electroménager',
    titleAr: 'المسار 2 - خدمة الأجهزة المنزلية',
    subtitle: 'Rayon Electroménager',
    subtitleAr: 'رف الأجهزة المنزلية',
  },
  {
    checklistId: 'circuit-2-textile-pgc',
    zoneId: '6a575d4f0019d803ff56',
    departmentId: 'textile_pgc',
    title: 'Circuit 2 — Service SBAM Textile/PGC',
    titleAr: 'المسار 2 - خدمة النسيج',
    subtitle: 'Rayon Textile / Literie / PGC',
    subtitleAr: 'رف النسيج / الفراش',
  },
  {
    checklistId: 'circuit-4-libre-service',
    zoneId: '6a569fc40029a16ed2b6',
    departmentId: 'apls_frais_ls',
    title: 'Circuit 4 — Libre Service & Ruptures',
    titleAr: 'المسار 4 - الخدمة الذاتية',
    subtitle: 'Libre Service Frais',
    subtitleAr: 'الخدمة الذاتية الطازجة',
  },
  {
    checklistId: 'circuit-5-caisses',
    zoneId: '6a565b970008bdf42a6b',
    departmentId: 'caisses',
    title: 'Circuit 5 — Caisses',
    titleAr: 'المسار 5 - الصناديق',
    subtitle: 'Ligne de caisses principale',
    subtitleAr: 'خط الصناديق الرئيسي',
  },
];

const ROLES_FULLY_TRANSVERSAL: string[] = [ROLES.ADMIN];
const ROLES_ACCES_TRANSVERSAL: string[] = [ROLES.MAITRE_METIER];

/** Variante de bouton selon le statut choisi (design system). */
const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'primary'> = {
  FAIT: 'success',
  NON_FAIT: 'danger',
  ECART: 'primary',
};

export default function ChecklistPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const visibleCircuits = (() => {
    if (!profile) return [];
    if (ROLES_FULLY_TRANSVERSAL.includes(profile.role)) return CIRCUITS;
    if (ROLES_SECTOR_WIDE.includes(profile.role as any) && profile.sector) {
      return CIRCUITS.filter((c) => getSectorForDepartment(c.departmentId) === profile.sector);
    }
    return CIRCUITS.filter(
      (c) =>
        c.departmentId === profile.department_id ||
        (c.transversal && ROLES_ACCES_TRANSVERSAL.includes(profile.role))
    );
  })();

  const [selectedCircuit, setSelectedCircuit] = useState<CircuitOption | null>(
    visibleCircuits[0] || null
  );

  // ---------- Configuration (shifts, politique de retard) ----------
  const { data: config = DEFAULT_CONFIG } = useQuery({
    queryKey: ['app-config'],
    queryFn: getAppConfig,
    staleTime: 10 * 60 * 1000, // 10 min : la config bouge rarement
  });

  const currentShift: Shift = getCurrentShift(config);
  const [viewMode, setViewMode] = useState<'shift' | 'day'>('shift');
  const viewShift = viewMode === 'shift' ? currentShift : null;

  // ---------- Chargement des taches via TanStack Query ----------
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', selectedCircuit?.checklistId],
    queryFn: () => getTasksForChecklist(selectedCircuit!.checklistId),
    enabled: !!selectedCircuit,
    staleTime: 5 * 60 * 1000, // 5 min : les taches d'un circuit changent rarement
  });

  // ---------- Executions deja enregistrees (shift courant ou journee) ----------
  const { data: serverExecutions = {} } = useQuery({
    queryKey: ['executions', selectedCircuit?.zoneId, viewShift],
    queryFn: () => getExecutionsForShift(selectedCircuit!.zoneId, viewShift),
    enabled: !!selectedCircuit,
    staleTime: 30 * 1000,
  });

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

  /** Statut affiche : etat local (juste enregistre) sinon etat serveur. */
  function statusFor(taskId: string): TaskStatus | undefined {
    return completed[taskId] || (serverExecutions[taskId]?.status as TaskStatus | undefined);
  }

  function circuitTitle(c: CircuitOption) {
    return language === 'ar' ? c.titleAr : c.title;
  }
  function circuitSubtitle(c: CircuitOption) {
    return language === 'ar' ? c.subtitleAr : c.subtitle;
  }

  async function refreshPendingCount() {
    setPendingCount(await countPending());
  }

  async function handleSync() {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncPendingData();
      await refreshPendingCount();
      queryClient.invalidateQueries({ queryKey: ['executions'] });
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

  // Reinitialise l'etat local (coche/photos) a chaque changement de circuit ou de vue
  useEffect(() => {
    setCompleted({});
    setPhotoUrls({});
    setPhotoBlobs({});
  }, [selectedCircuit?.checklistId, viewMode]);

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
        shift: currentShift, // toujours le shift reel, meme en vue "journee"
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
      queryClient.invalidateQueries({ queryKey: ['executions'] });
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

  const doneCount = tasks.filter((tk) => !!statusFor(tk.$id)).length;

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

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Tranche en cours</p>
            <p className="text-sm font-semibold">
              {SHIFT_LABELS[currentShift]}{' '}
              <span className="text-xs font-normal text-slate-500">
                (
                {currentShift === 'MATIN'
                  ? `${config.shift_matin_debut}–${config.shift_matin_fin}`
                  : `${config.shift_soir_debut}–${config.shift_soir_fin}`}
                )
              </span>
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'shift' ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setViewMode('shift')}
            >
              Ce shift
            </Button>
            <Button
              variant={viewMode === 'day' ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setViewMode('day')}
            >
              Journée
            </Button>
          </div>
        </Card>

        {visibleCircuits.length > 1 && (
          <div>
            <Label>{t('circuitLabel' as any)}</Label>
            <Select
              value={selectedCircuit?.checklistId}
              onChange={(e) =>
                setSelectedCircuit(
                  visibleCircuits.find((c) => c.checklistId === e.target.value)!
                )
              }
            >
              {visibleCircuits.map((c) => (
                <option key={c.checklistId} value={c.checklistId}>
                  {circuitTitle(c)}
                </option>
              ))}
            </Select>
          </div>
        )}

        {selectedCircuit && (
          <div>
            <h1 className="text-xl font-bold">{circuitTitle(selectedCircuit)}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {circuitSubtitle(selectedCircuit)} · {doneCount}/{tasks.length}{' '}
              {t('tasksLabel' as any)}
            </p>
            <ProgressBar
              value={tasks.length ? (doneCount / tasks.length) * 100 : 0}
              color="#f59e0b"
              className="mt-2"
            />
          </div>
        )}

        {isLoading ? (
          <p className="text-slate-400 text-sm">{t('loadingTasks' as any)}</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const status = statusFor(task.$id);
              const execInfo = serverExecutions[task.$id];
              const isAskingNC = ncTaskId === task.$id;
              const hasPhoto = !!photoUrls[task.$id];
              const isLocalPhoto = !!photoBlobs[task.$id];
              const isUploading = uploadingTaskId === task.$id;
              const displayLabel =
                language === 'ar' && task.label_ar ? task.label_ar : task.label;

              return (
                <Card key={task.$id}>
                  <div className="flex items-start gap-2">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: GRAVITE_COLORS[task.default_gravite] }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {task.task_number}. {displayLabel}
                      </p>
                      {task.requires_photo && !hasPhoto && (
                        <p className="text-xs text-amber-400 mt-0.5">
                          📷 {t('photoRequired' as any)}
                        </p>
                      )}
                      {viewMode === 'day' && execInfo?.shift && (
                        <div className="mt-1">
                          <Badge>
                            Exécutée · {SHIFT_LABELS[execInfo.shift as Shift] || execInfo.shift}
                          </Badge>
                        </div>
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
                    <Card tone="danger" className="mt-3 space-y-2">
                      <p className="text-xs text-red-300 font-medium">
                        ⚠️ {t('ncFormTitle' as any)}
                      </p>
                      <Textarea
                        on="card"
                        value={actionImmediate}
                        onChange={(e) => setActionImmediate(e.target.value)}
                        placeholder={t('actionPlaceholder' as any)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          className="flex-1"
                          onClick={() => confirmNC(task)}
                          disabled={savingTaskId === task.$id}
                        >
                          {savingTaskId === task.$id
                            ? t('savingLabel' as any)
                            : t('confirmNCButton' as any)}
                        </Button>
                        <Button variant="ghost" onClick={() => setNcTaskId(null)}>
                          {t('cancel')}
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      {(['FAIT', 'NON_FAIT', 'ECART'] as TaskStatus[]).map((s) => (
                        <Button
                          key={s}
                          variant={status === s ? STATUS_VARIANT[s] : 'ghost'}
                          className="flex-1 transition-colors"
                          onClick={() => handleStatusClick(task, s)}
                          disabled={savingTaskId === task.$id}
                        >
                          {statusLabels[s]}
                        </Button>
                      ))}
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
