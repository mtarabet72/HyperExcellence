// ============================================================
// HyperExcellence - Ecran Checklist (multi-circuits, secteurs, offline, bilingue)
// Chargement des taches converti a TanStack Query (Phase 1)
// Migre vers le Design System (Phase 2)
// Shifts Matin/Soir + heure cible (Phase 6)
// Circuits lus depuis la base (Phase 6, etape E)
// ============================================================
import { useEffect, useState, ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTasksForChecklist,
  submitTaskExecution,
  getExecutionsForShift,
  TaskTemplate,
} from '../lib/tasks';
import { listCircuits, Circuit } from '../lib/circuits';
import { createNonConformite } from '../lib/nonConformites';
import { uploadTaskPhoto } from '../lib/storage';
import { offlineDb, generateOfflineId } from '../lib/offlineDb';
import { syncPendingData, countPending } from '../lib/offlineSync';
import {
  getAppConfig,
  getCurrentShift,
  isPastExecutionTime,
  DEFAULT_CONFIG,
} from '../lib/settings';
import {
  TaskStatus,
  GRAVITE_COLORS,
  ROLES,
  ROLES_SECTOR_WIDE,
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
import { PolicyBlockedError } from '../lib/tasks';

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

  // ---------- Circuits (depuis la base) ----------
  const { data: allCircuits = [], isLoading: circuitsLoading } = useQuery({
    queryKey: ['circuits'],
    queryFn: listCircuits,
    staleTime: 10 * 60 * 1000,
  });

  const visibleCircuits = (() => {
    if (!profile) return [];
    if (ROLES_FULLY_TRANSVERSAL.includes(profile.role)) return allCircuits;
    if (ROLES_SECTOR_WIDE.includes(profile.role as any) && profile.sector) {
      return allCircuits.filter(
        (c) => getSectorForDepartment(c.departmentId) === profile.sector
      );
    }
    return allCircuits.filter(
      (c) =>
        c.departmentId === profile.department_id ||
        (c.transversal && ROLES_ACCES_TRANSVERSAL.includes(profile.role))
    );
  })();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Selectionne le premier circuit visible une fois la liste chargee
  useEffect(() => {
    if (!selectedId && visibleCircuits.length > 0) {
      setSelectedId(visibleCircuits[0].checklistId);
    }
  }, [visibleCircuits, selectedId]);

  const selectedCircuit: Circuit | null =
    visibleCircuits.find((c) => c.checklistId === selectedId) || null;

  // ---------- Configuration (shifts, politique de retard) ----------
  const { data: config = DEFAULT_CONFIG } = useQuery({
    queryKey: ['app-config'],
    queryFn: getAppConfig,
    staleTime: 10 * 60 * 1000,
  });

  const currentShift: Shift = getCurrentShift(config);
  const [viewMode, setViewMode] = useState<'shift' | 'day'>('shift');
  const viewShift = viewMode === 'shift' ? currentShift : null;

  // ---------- Chargement des taches ----------
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', selectedCircuit?.checklistId],
    queryFn: () => getTasksForChecklist(selectedCircuit!.checklistId),
    enabled: !!selectedCircuit,
    staleTime: 5 * 60 * 1000,
  });

  // ---------- Executions deja enregistrees ----------
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

  function statusFor(taskId: string): TaskStatus | undefined {
    return completed[taskId] || (serverExecutions[taskId]?.status as TaskStatus | undefined);
  }

  function circuitTitle(c: Circuit) {
    return language === 'ar' ? c.titleAr : c.title;
  }
  function circuitSubtitle(c: Circuit) {
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
      const isLate = isPastExecutionTime(task.execution_time || null);

      const result = await submitTaskExecution({
        zoneId: selectedCircuit.zoneId,
        taskId: task.$id,
        executedBy: profile.$id,
        status,
        photoAfterUrl: photoUrl,
        photoBlob,
        shift: currentShift,
        enRetard: isLate,
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
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        alert(err.message);
      } else {
        alert(t('saveErrorAlert' as any));
      }
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

  if (circuitsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
        <div className="max-w-xl mx-auto">
          <p className="text-slate-400 text-sm">{t('loadingTasks' as any)}</p>
        </div>
      </div>
    );
  }

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
            <p className="text-xs text-slate-400">{t('currentShift' as any)}</p>
            <p className="text-sm font-semibold">
              {t(`shift_${currentShift}` as any)}{' '}
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
              {t('viewThisShift' as any)}
            </Button>
            <Button
              variant={viewMode === 'day' ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setViewMode('day')}
            >
              {t('viewFullDay' as any)}
            </Button>
          </div>
        </Card>

        {visibleCircuits.length > 1 && (
          <div>
            <Label>{t('circuitLabel' as any)}</Label>
            <Select
              value={selectedCircuit?.checklistId}
              onChange={(e) => setSelectedId(e.target.value)}
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

              const targetTime = task.execution_time || null;
              const isLate = isPastExecutionTime(targetTime);
              const policy = config.politique_retard;
              const isBlocked = isLate && policy === 'BLOCAGE' && !status;
              const forbidFait = isLate && policy === 'NON_FAIT_AUTO' && !status;

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
                      {targetTime && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          ⏱ {t('targetTime' as any)} : {targetTime}
                        </p>
                      )}
                      {isLate && !status && (
                        <p className="text-xs text-red-400 mt-0.5">
                          {policy === 'BLOCAGE'
                            ? t('blockedPastTime' as any)
                            : policy === 'NON_FAIT_AUTO'
                              ? t('mustReportLate' as any)
                              : t('lateBadge' as any)}
                        </p>
                      )}
                      {execInfo?.enRetard && (
                        <div className="mt-1">
                          <Badge tone="danger">{t('lateBadge' as any)}</Badge>
                        </div>
                      )}
                      {task.requires_photo && !hasPhoto && (
                        <p className="text-xs text-amber-400 mt-0.5">
                          📷 {t('photoRequired' as any)}
                        </p>
                      )}
                      {viewMode === 'day' && execInfo?.shift && (
                        <div className="mt-1">
                          <Badge>
                            {t('executedLabel' as any)} ·{' '}
                            {t(`shift_${execInfo.shift}` as any)}
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
                          disabled={
                            savingTaskId === task.$id ||
                            isBlocked ||
                            (forbidFait && s === 'FAIT')
                          }
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
