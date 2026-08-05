// ============================================================
// HyperExcellence - Suivi des taches de fonction par secteur (Phase 8+)
// Ecran de supervision : filtre par role (Chef Secteur/Departement)
// et par secteur, montre le statut de validation de chaque tache.
// ============================================================
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTasksForRole, getCompletionsForTasks, FREQUENCY_LABELS } from '../lib/functionTasks';
import { listEmployees } from '../lib/employees';
import { ROLES, ROLES_SECTOR_WIDE, ROLE_LABELS, SECTORS, SECTOR_LABELS, UserRole } from '../constants';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Label, Select } from '../components/ui/Field';

const SECTOR_ROLES = ROLES_SECTOR_WIDE as UserRole[]; // [CHEF_DEPARTEMENT, CHEF_SECTEUR]

export default function AdminSectorTasksPage() {
  const [role, setRole] = useState<UserRole>(ROLES.CHEF_SECTEUR);
  const [sector, setSector] = useState<string>(SECTORS.FRAIS);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['sector-function-tasks', role, sector],
    queryFn: () => listTasksForRole(role, sector),
  });

  const { data: completions = {} } = useQuery({
    queryKey: ['sector-function-task-completions', tasks.map((t) => t.$id)],
    queryFn: () => getCompletionsForTasks(tasks),
    enabled: tasks.length > 0,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: listEmployees,
  });
  const nameById: Record<string, string> = {};
  for (const e of employees) nameById[e.$id] = e.full_name;

  // Qui occupe ce role dans ce secteur, pour afficher un contexte utile.
  const responsables = employees.filter((e) => e.role === role && e.sector === sector);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Suivi par secteur / département</h1>
        <p className="text-sm text-slate-400">
          Tâches de fonction assignées aux Chefs de Secteur/Département, filtrées par secteur.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Rôle</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {SECTOR_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Secteur</Label>
            <Select value={sector} onChange={(e) => setSector(e.target.value)}>
              {Object.values(SECTORS).map((s) => (
                <option key={s} value={s}>
                  {SECTOR_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Card className="text-xs text-slate-400">
          {responsables.length === 0
            ? 'Aucun employé avec ce rôle dans ce secteur.'
            : `Responsable(s) : ${responsables.map((r) => r.full_name).join(', ')}`}
        </Card>

        {isLoading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Aucune tâche de fonction pour ce rôle/secteur.
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const completion = completions[task.$id];
              return (
                <Card key={task.$id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium flex-1">{task.label}</p>
                    <Badge>{FREQUENCY_LABELS[task.frequency]}</Badge>
                  </div>
                  {completion ? (
                    <p className="text-xs text-emerald-400 mt-1">
                      ✓ Validée par {nameById[completion.completedBy] || '—'} le{' '}
                      {new Date(completion.completedAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-400 mt-1">
                      ⏳ Pas encore validée cette période
                    </p>
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
