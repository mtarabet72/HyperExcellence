// ============================================================
// HyperExcellence - Écran Admin : gestion des employés
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
import { ROLES, ROLE_LABELS, DEPARTMENTS, UserRole } from '../constants';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // ---------- Formulaire de création ----------
  const [badgeNumber, setBadgeNumber] = useState('');
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(ROLES.EMPLOYE);
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------- Édition inline ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(ROLES.EMPLOYE);
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
        departmentId: departmentId || undefined,
      });
      setSuccessMessage(`Employé "${fullName}" créé avec succès.`);
      setBadgeNumber('');
      setPin('');
      setFullName('');
      setRole(ROLES.EMPLOYE);
      setDepartmentId('');
      await loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(emp: Profile) {
    setEditingId(emp.$id);
    setEditFullName(emp.full_name);
    setEditRole(emp.role);
    setEditDepartmentId(emp.department_id || '');
  }

  async function saveEdit(profileId: string) {
    if (!editFullName.trim()) {
      alert('Le nom complet est requis.');
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateEmployee(profileId, {
        fullName: editFullName.trim(),
        role: editRole,
        departmentId: editDepartmentId || null,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-xl font-bold">Gestion des employés</h1>

        {/* ---------- Formulaire de création ---------- */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-300">Nouvel employé</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Numéro de badge</label>
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
              placeholder="Nom Prénom"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rôle</label>
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
              <label className="block text-xs text-slate-400 mb-1">Rayon / Département</label>
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
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {successMessage && <p className="text-emerald-400 text-sm">{successMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-500 text-slate-950 font-semibold py-2.5 text-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Création...' : 'Créer l\'employé'}
          </button>
        </form>

        {/* ---------- Liste des employés ---------- */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Employés ({employees.length})
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
                            {ROLE_LABELS[emp.role]} · Badge {emp.badge_number || '—'}
                            {emp.department_id && (
                              <>
                                {' · '}
                                {DEPARTMENTS.find((d) => d.id === emp.department_id)?.name ||
                                  emp.department_id}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
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
                              ? 'Désactiver'
                              : 'Réactiver'}
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
