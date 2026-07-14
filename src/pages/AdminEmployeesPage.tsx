// ============================================================
// HyperExcellence - Écran Admin : gestion des employés
// ============================================================
import { useEffect, useState, FormEvent } from 'react';
import { createEmployee, listEmployees, Profile } from '../lib/employees';
import { ROLES, ROLE_LABELS, DEPARTMENTS, UserRole } from '../constants';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const [badgeNumber, setBadgeNumber] = useState('');
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(ROLES.EMPLOYE);
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
              {employees.map((emp) => (
                <div
                  key={emp.$id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{emp.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {ROLE_LABELS[emp.role]} · Badge {emp.badge_number || '—'}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
