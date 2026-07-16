// ============================================================
// HyperExcellence - Ecran Admin : gestion des employes
// ============================================================
import { useEffect, useState, FormEvent } from 'react';
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

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const [badgeNumber, setBadgeNumber] = useState('');
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(ROLES.EMPLOYE);
  const [departmentId, setDepartmentId] = useState('');
  const [sector, setSector] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(ROLES.EMPLOYE);
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editSector, setEditSector] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isSectorRole = ROLES_SECTOR_WIDE.includes(role);
  const isEditSectorRole = ROLES_SECTOR_WIDE.includes(editRole);

  async function loadEmployees() {
    setIsLoadingList(true);
    const list = await listEmployees();
    setEmployees(list);
    setIsLoadingList(false);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!badgeNumber.trim() || !pin.trim() || !fullName.trim()) {
      setError('Badge, PIN et nom complet sont requis.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createEmployee({
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
      await loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation.');
    } finally {
      setIsSubmitting(false);
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
    setIsSavingEdit(true);
    try {
      const sectorRole = ROLES_SECTOR_WIDE.includes(editRole);
      await updateEmployee(profileId, {
        fullName: editFullName.trim(),
        role: editRole,
        departmentId: sectorRole ? null : editDepartmentId || null,
        sector: sectorRole ? editSector || null : null,
      });
      setEditingId(null);
      await loadEmployees();
    } catch {
      alert('Erreur lors de la modification.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function toggleActive(emp: Profile) {
    setTogglingId(emp.$id);
    try {
      if (emp.is_active) {
        await deactivateEmployee(emp.$id);
      } else {
        await reactivateEmployee(emp.$id);
      }
      await loadEmployees();
    } catch {
      alert('Erreur lors du changement de statut.');
    } finally {
      setTogglingId(null);
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

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-300">Nouvel employe</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Numero de badge</label>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="B00123"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Code PIN</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nom Prenom"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {isSectorRole ? (
                <>
                  <label className="block text-xs text-slate-400 mb-1">Secteur (plusieurs rayons)</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                  >
                    <option value="">— Selectionner —</option>
                    {Object.values(SECTORS).map((s) => (
                      <option key={s} value={s}>
                        {SECTOR_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="block text-xs text-slate-400 mb-1">Rayon / Departement</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                  >
                    <option value="">— Aucun —</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-500 text-slate-950 font-semibold py-2.5 text-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Creation...' : "Creer l'employe"}
          </button>
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

                return (
                  <div
                    key={emp.$id}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                  >
                    {!isEditing ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{emp.full_name}</p>
                          <p className="text-xs text-slate-400">
                            {ROLE_LABELS[emp.role]} · Badge {emp.badge_number || '—'} ·{' '}
                            {scopeLabel(emp)}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            emp.is_active
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {emp.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                          >
                            {Object.values(ROLES).map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          {isEditSectorRole ? (
                            <select
                              value={editSector}
                              onChange={(e) => setEditSector(e.target.value)}
                              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                            >
                              <option value="">— Secteur —</option>
                              {Object.values(SECTORS).map((s) => (
                                <option key={s} value={s}>
                                  {SECTOR_LABELS[s]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={editDepartmentId}
                              onChange={(e) => setEditDepartmentId(e.target.value)}
                              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                            >
                              <option value="">— Aucun —</option>
                              {DEPARTMENTS.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => startEdit(emp)}
                            className="flex-1 rounded-lg bg-slate-800 text-slate-200 py-1.5 text-xs"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => toggleActive(emp)}
                            disabled={togglingId === emp.$id}
                            className={`flex-1 rounded-lg py-1.5 text-xs ${
                              emp.is_active
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {togglingId === emp.$id
                              ? '...'
                              : emp.is_active
                              ? 'Desactiver'
                              : 'Reactiver'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => saveEdit(emp.$id)}
                            disabled={isSavingEdit}
                            className="flex-1 rounded-lg bg-amber-500 text-slate-950 font-medium py-1.5 text-xs"
                          >
                            {isSavingEdit ? 'Enregistrement...' : 'Enregistrer'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs"
                          >
                            Annuler
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
