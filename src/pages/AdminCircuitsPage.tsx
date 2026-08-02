// ============================================================
// HyperExcellence - Ecran Admin : gestion des circuits (Phase 6, etape E)
// CRUD via la Function serveur. `checklist_templates` en lecture seule client.
// ============================================================
import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAllCircuits,
  createCircuit,
  updateCircuit,
  toggleCircuit,
  Circuit,
} from '../lib/circuitAdmin';
import { listZones } from '../lib/circuits';
import { DEPARTMENTS } from '../constants';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Label, Input, Select } from '../components/ui/Field';

export default function AdminCircuitsPage() {
  const queryClient = useQueryClient();

  const { data: circuits = [], isLoading } = useQuery({
    queryKey: ['admin-circuits'],
    queryFn: listAllCircuits,
  });

  const { data: zones = [] } = useQuery({ queryKey: ['zones'], queryFn: listZones });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-circuits'] });
    queryClient.invalidateQueries({ queryKey: ['circuits'] }); // rafraichit le terrain
  }

  const createMutation = useMutation({ mutationFn: createCircuit, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updateCircuit, onSuccess: invalidate });
  const toggleMutation = useMutation({
    mutationFn: ({ circuitId, isActive }: { circuitId: string; isActive: boolean }) =>
      toggleCircuit(circuitId, isActive),
    onSuccess: invalidate,
  });

  // ---------- Formulaire de creation ----------
  const [cId, setCId] = useState('');
  const [cName, setCName] = useState('');
  const [cNameAr, setCNameAr] = useState('');
  const [cSubtitle, setCSubtitle] = useState('');
  const [cSubtitleAr, setCSubtitleAr] = useState('');
  const [cDept, setCDept] = useState(DEPARTMENTS[0].id);
  const [cZone, setCZone] = useState('');
  const [cNumber, setCNumber] = useState('');
  const [cSort, setCSort] = useState('');
  const [cTransversal, setCTransversal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---------- Edition en ligne ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eName, setEName] = useState('');
  const [eNameAr, setENameAr] = useState('');
  const [eSubtitle, setESubtitle] = useState('');
  const [eSubtitleAr, setESubtitleAr] = useState('');
  const [eDept, setEDept] = useState('');
  const [eZone, setEZone] = useState('');
  const [eSort, setESort] = useState('');
  const [eTransversal, setETransversal] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!cId.trim() || !cName.trim() || !cZone) {
      setError('Identifiant, nom et zone sont requis.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        circuitId: cId.trim(),
        name: cName.trim(),
        nameAr: cNameAr.trim() || undefined,
        subtitle: cSubtitle.trim() || undefined,
        subtitleAr: cSubtitleAr.trim() || undefined,
        departmentId: cDept,
        zoneId: cZone,
        circuitNumber: cNumber ? Number(cNumber) : undefined,
        sortOrder: cSort ? Number(cSort) : undefined,
        transversal: cTransversal,
      });
      setSuccess(`Circuit "${cName.trim()}" créé.`);
      setCId('');
      setCName('');
      setCNameAr('');
      setCSubtitle('');
      setCSubtitleAr('');
      setCNumber('');
      setCSort('');
      setCTransversal(false);
      setCZone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    }
  }

  function startEdit(c: Circuit) {
    setEditingId(c.checklistId);
    setEName(c.title);
    setENameAr(c.titleAr);
    setESubtitle(c.subtitle);
    setESubtitleAr(c.subtitleAr);
    setEDept(c.departmentId);
    setEZone(c.zoneId);
    setESort(String(c.sortOrder));
    setETransversal(c.transversal);
  }

  async function saveEdit(circuitId: string) {
    if (!eName.trim()) {
      alert('Le nom est requis.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        circuitId,
        name: eName.trim(),
        nameAr: eNameAr.trim(),
        subtitle: eSubtitle.trim(),
        subtitleAr: eSubtitleAr.trim(),
        departmentId: eDept,
        zoneId: eZone,
        sortOrder: eSort ? Number(eSort) : undefined,
        transversal: eTransversal,
      });
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la modification.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">Gestion des circuits</h1>

        {/* ---------- Création ---------- */}
        <form
          onSubmit={handleCreate}
          className="space-y-3 bg-slate-900 border border-slate-800 rounded-lg p-4"
        >
          <h2 className="text-sm font-semibold text-slate-300">Nouveau circuit</h2>

          <div>
            <Label>Identifiant (slug unique)</Label>
            <Input
              on="card"
              type="text"
              value={cId}
              onChange={(e) => setCId(e.target.value)}
              placeholder="circuit-6-surgeles"
            />
            <p className="text-xs text-slate-500 mt-1">
              Minuscules, chiffres et tirets. Non modifiable après création.
            </p>
          </div>

          <div>
            <Label>Nom (français)</Label>
            <Input
              on="card"
              type="text"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Circuit 6 — Surgelés"
            />
          </div>

          <div>
            <Label>Nom (arabe) — optionnel</Label>
            <Input
              on="card"
              type="text"
              dir="rtl"
              value={cNameAr}
              onChange={(e) => setCNameAr(e.target.value)}
            />
          </div>

          <div>
            <Label>Sous-titre (français) — optionnel</Label>
            <Input
              on="card"
              type="text"
              value={cSubtitle}
              onChange={(e) => setCSubtitle(e.target.value)}
              placeholder="Rayon Surgelés"
            />
          </div>

          <div>
            <Label>Sous-titre (arabe) — optionnel</Label>
            <Input
              on="card"
              type="text"
              dir="rtl"
              value={cSubtitleAr}
              onChange={(e) => setCSubtitleAr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rayon</Label>
              <Select on="card" value={cDept} onChange={(e) => setCDept(e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Zone</Label>
              <Select on="card" value={cZone} onChange={(e) => setCZone(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>N° pilier</Label>
              <Input
                on="card"
                type="number"
                value={cNumber}
                onChange={(e) => setCNumber(e.target.value)}
                placeholder="6"
              />
            </div>
            <div>
              <Label>Ordre</Label>
              <Input
                on="card"
                type="number"
                value={cSort}
                onChange={(e) => setCSort(e.target.value)}
                placeholder="14"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 mt-6">
              <input
                type="checkbox"
                checked={cTransversal}
                onChange={(e) => setCTransversal(e.target.checked)}
              />
              Transversal
            </label>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-emerald-400 text-sm">{success}</p>}

          <Button type="submit" size="md" fullWidth disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Création...' : 'Créer le circuit'}
          </Button>
        </form>

        {/* ---------- Liste ---------- */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Circuits ({circuits.length})
          </h2>

          {isLoading ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : (
            <div className="space-y-2">
              {circuits.map((c) => {
                const isEditing = editingId === c.checklistId;
                const isToggling =
                  toggleMutation.isPending &&
                  toggleMutation.variables?.circuitId === c.checklistId;

                return (
                  <Card key={c.checklistId} className={c.isActive ? '' : 'opacity-60'}>
                    {!isEditing ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-slate-500">{c.checklistId}</p>
                        {c.subtitle && (
                          <p className="text-xs text-slate-400">{c.subtitle}</p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge>#{c.sortOrder}</Badge>
                          {c.transversal && <Badge>Transversal</Badge>}
                          <Badge tone={c.isActive ? 'success' : 'danger'}>
                            {c.isActive ? 'Actif' : 'Désactivé'}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          on="card"
                          type="text"
                          value={eName}
                          onChange={(e) => setEName(e.target.value)}
                          placeholder="Nom FR"
                        />
                        <Input
                          on="card"
                          type="text"
                          dir="rtl"
                          value={eNameAr}
                          onChange={(e) => setENameAr(e.target.value)}
                          placeholder="Nom AR"
                        />
                        <Input
                          on="card"
                          type="text"
                          value={eSubtitle}
                          onChange={(e) => setESubtitle(e.target.value)}
                          placeholder="Sous-titre FR"
                        />
                        <Input
                          on="card"
                          type="text"
                          dir="rtl"
                          value={eSubtitleAr}
                          onChange={(e) => setESubtitleAr(e.target.value)}
                          placeholder="Sous-titre AR"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            on="card"
                            value={eDept}
                            onChange={(e) => setEDept(e.target.value)}
                          >
                            {DEPARTMENTS.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </Select>
                          <Select
                            on="card"
                            value={eZone}
                            onChange={(e) => setEZone(e.target.value)}
                          >
                            <option value="">— Zone —</option>
                            {zones.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            on="card"
                            type="number"
                            value={eSort}
                            onChange={(e) => setESort(e.target.value)}
                            placeholder="Ordre"
                          />
                          <label className="flex items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={eTransversal}
                              onChange={(e) => setETransversal(e.target.checked)}
                            />
                            Transversal
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      {!isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="flex-1"
                            onClick={() => startEdit(c)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant={c.isActive ? 'dangerSoft' : 'successSoft'}
                            size="xs"
                            className="flex-1"
                            onClick={() =>
                              toggleMutation.mutate({
                                circuitId: c.checklistId,
                                isActive: !c.isActive,
                              })
                            }
                            disabled={isToggling}
                          >
                            {isToggling
                              ? '...'
                              : c.isActive
                                ? 'Désactiver'
                                : 'Réactiver'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="xs"
                            className="flex-1"
                            onClick={() => saveEdit(c.checklistId)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setEditingId(null)}
                          >
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
