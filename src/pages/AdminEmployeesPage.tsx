// ============================================================
// HyperExcellence - Ecran Admin : gestion des employes
// Converti a TanStack Query (Phase 1 - Performance)
// Migre vers le Design System (Phase 2)
// ============================================================
import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEmployee,
  listEmployees,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  Profile,
} from '../lib/employees';
import {
  ROLES,
  ROLE_LABELS,
  DEPARTMENTS,
  SECTORS,
  SECTOR_LABELS,
  ROLES_SECTOR_WIDE,
  UserRole,
} from '../constants';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Label, Input, Select } from '../components/ui/Field';

export default function AdminEmployeesPage() {
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['employees'],
    queryFn: listEmployees,
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ profileId, input }: { profileId: string; input: Parameters<typeof updateEmployee>[1] }) =>
      updateEmployee(profileId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (emp: Profile) =>
      emp.is_active ? deactivateEmployee(emp.$id) : reactivateEmployee(emp.$id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const [badgeNumber, setBadgeNumber] = useState('');
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(ROLES.EMPLOYE);
  const [departmentId, setDepartmentId] = useState('');
  const [sector, setSector] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(ROLES.EMPLOYE);
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editSector, setEditSector] = useState('');

  const isSectorRole = ROLES_SECTOR_WIDE.includes(role);
  const isEditSectorRole = ROLES_SECTOR_WIDE.includes(editRole);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!badgeNumber.trim() || !pin.trim() || !fullName.trim()) {
      setError('Badge, PIN et nom complet sont requis.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        badgeNumber,
        pin,
        fullName,
        role,
        departmentId: isSectorRole ? undefined : departmentId || undefined,
        sector: isSectorRole ? sector || undefined : undefined,
      });
      setSuccessMessage(`Employe "${fullName}" cree avec succes.`);
      setBadgeNumber('');
      setPin('');
      setFullName('');
      setRole(ROLES.EMPLOYE);
      setDepartmentId('');
      setSector('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation.');
    }
  }

  function startEdit(emp: Profile) {
    setEditingId(emp.$id);
    setEditFullName(emp.full_name);
    setEditRole(emp.role);
    setEditDepartmentId(emp.department_id || '');
    setEditSector(emp.sector || '');
  }

  async function saveEdit(profileId: string) {
    if (!editFullName.trim()) {
      alert('Le nom complet est requis.');
      return;
    }
    const sectorRole = ROLES_SECTOR_WIDE.includes(editRole);
    try {
      await updateMutation.mutateAsync({
        profileId,
        input: {
          fullName: editFullName.trim(),
          role: editRole,
          departmentId: sectorRole ? null : editDepartmentId || null,
          sector: sectorRole ? editSector || null : null,
        },
      });
      setEditingId(null);
    } catch {
      alert('Erreur lors de la modification.');
    }
  }

  async function toggleActive(emp: Profile) {
    try {
      await toggleMutation.mutateAsync(emp);
    } catch {
      alert('Erreur lors du changement de statut.');
    }
  }

  function scopeLabel(emp: Profile): string {
    if (ROLES_SECTOR_WIDE.includes(emp.role) && emp.sector) {
      return SECTOR_LABELS[emp.sector as keyof typeof SECTOR_LABELS] || emp.sector;
    }
    if (emp.department_id) {
      return DEPARTMENTS.find((d) => d.id === emp.department_id)?.name || emp.department_id;
    }
    return '—';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-xl font-bold">Gestion des employes</h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-slate-900 border border-slate-800 rounded-lg p-4"
        >
          <h2 className="text-sm font-semibold text-slate-300">Nouvel employe</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Numero de badge</Label>
              <Input
                on="card"
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="B00123"
              />
            </div>
            <div>
              <Label>Code PIN</Label>
              <Input
                on="card"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
              />
            </div>
          </div>

          <div>
            <Label>Nom complet</Label>
            <Input
              on="card"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nom Prenom"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select
                on="card"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              {isSectorRole ? (
                <>
                  <Label>Secteur (plusieurs rayons)</Label>
                  <Select
                    on="card"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                  >
                    <option value="">— Selectionner —</option>
                    {Object.values(SECTORS).map((s) => (
                      <option key={s} value={s}>
                        {SECTOR_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </>
              ) : (
                <>
                  <Label>Rayon / Departement</Label>
                  <Select
                    on="card"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="">— Aucun —</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </>
              )}
            </div>
          </div>

          {isSectorRole && (
            <p className="text-xs text-slate-500">
              Ce role verra automatiquement tous les circuits des rayons appartenant a ce secteur.
            </p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {successMessage && <p className="text-emerald-400 text-sm">{successMessage}</p>}

          <Button type="submit" size="md" fullWidth disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creation...' : "Creer l'employe"}
          </Button>
        </form>

        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Employes ({employees.length})
          </h2>
          {isLoadingList ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => {
                const isEditing = editingId === emp.$id;
                const isToggling =
                  toggleMutation.isPending && toggleMutation.variables?.$id === emp.$id;

                return (
                  <Card key={emp.$id}>
                    {!isEditing ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{emp.full_name}</p>
                          <p className="text-xs text-slate-400">
                            {ROLE_LABELS[emp.role]} · Badge {emp.badge_number || '—'} ·{' '}
                            {scopeLabel(emp)}
                          </p>
                        </div>
                        <Badge tone={emp.is_active ? 'success' : 'danger'}>
                          {emp.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          on="card"
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            on="card"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                          >
                            {Object.values(ROLES).map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </Select>
                          {isEditSectorRole ? (
                            <Select
                              on="card"
                              value={editSector}
                              onChange={(e) => setEditSector(e.target.value)}
                            >
                              <option value="">— Secteur —</option>
                              {Object.values(SECTORS).map((s) => (
                                <option key={s} value={s}>
                                  {SECTOR_LABELS[s]}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Select
                              on="card"
                              value={editDepartmentId}
                              onChange={(e) => setEditDepartmentId(e.target.value)}
                            >
                              <option value="">— Aucun —</option>
                              {DEPARTMENTS.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </Select>
                          )}
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
                            onClick={() => startEdit(emp)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant={emp.is_active ? 'dangerSoft' : 'successSoft'}
                            size="xs"
                            className="flex-1"
                            onClick={() => toggleActive(emp)}
                            disabled={isToggling}
                          >
                            {isToggling ? '...' : emp.is_active ? 'Desactiver' : 'Reactiver'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="xs"
                            className="flex-1"
                            onClick={() => saveEdit(emp.$id)}
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
