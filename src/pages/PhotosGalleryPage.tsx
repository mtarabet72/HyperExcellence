// ============================================================
// HyperExcellence - Galerie photos preuves (Circuit 7)
// ============================================================
import { useEffect, useState } from 'react';
import { Query } from 'appwrite';
import { databases } from '../lib/appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, TASK_STATUS_LABELS } from '../constants';

interface PhotoItem {
  $id: string;
  taskLabel: string;
  zoneName: string;
  executedByName: string;
  status: string;
  executedAt: string;
  photoUrl: string;
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function PhotosGalleryPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  async function load() {
    setIsLoading(true);
    const [executionsResult, tasksResult, zonesResult, profilesResult] = await Promise.all([
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_EXECUTIONS, [
        Query.greaterThanEqual('executed_at', startOfToday()),
        Query.isNotNull('photo_after'),
        Query.orderDesc('executed_at'),
        Query.limit(200),
      ]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, [Query.limit(500)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.ZONES, [Query.limit(200)]),
      databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(500)]),
    ]);

    const taskLabels: Record<string, string> = {};
    for (const t of tasksResult.documents as any[]) {
      taskLabels[t.$id] = `${t.task_number}. ${t.label}`;
    }
    const zoneNames: Record<string, string> = {};
    for (const z of zonesResult.documents as any[]) {
      zoneNames[z.$id] = z.name;
    }
    const profileNames: Record<string, string> = {};
    for (const p of profilesResult.documents as any[]) {
      profileNames[p.$id] = p.full_name;
    }

    const items: PhotoItem[] = (executionsResult.documents as any[]).map((e) => ({
      $id: e.$id,
      taskLabel: taskLabels[e.task_id] || e.task_id,
      zoneName: zoneNames[e.zone_id] || e.zone_id,
      executedByName: profileNames[e.executed_by] || e.executed_by,
      status: e.status,
      executedAt: e.executed_at,
      photoUrl: e.photo_after,
    }));

    setPhotos(items);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Photos du jour</h1>
          <button onClick={load} className="text-xs text-slate-400">
            ↻ Actualiser
          </button>
        </div>

        {isLoading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : photos.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune photo prise aujourd'hui.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              <button
                key={p.$id}
                onClick={() => setSelectedPhoto(p)}
                className="text-left bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
              >
                <img
                  src={p.photoUrl}
                  alt={p.taskLabel}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs font-medium text-slate-200 line-clamp-2">
                    {p.taskLabel}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.zoneName} ·{' '}
                    {new Date(p.executedAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Aperçu plein écran ---------- */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-2xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.photoUrl}
              alt={selectedPhoto.taskLabel}
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />
            <div className="bg-slate-900 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium">{selectedPhoto.taskLabel}</p>
              <p className="text-slate-400 text-xs">
                {selectedPhoto.zoneName} · {selectedPhoto.executedByName} ·{' '}
                {TASK_STATUS_LABELS[selectedPhoto.status as keyof typeof TASK_STATUS_LABELS]}
              </p>
              <p className="text-slate-500 text-xs">
                {new Date(selectedPhoto.executedAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="w-full rounded-lg bg-slate-800 py-2 text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
