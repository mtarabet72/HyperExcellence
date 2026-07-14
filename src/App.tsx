import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminEmployeesPage from './pages/AdminEmployeesPage';
import ChecklistPage from './pages/ChecklistPage';
import { ROLE_LABELS, ROLES } from './constants';

type View = 'home' | 'employees' | 'checklist';

function App() {
  const { isLoading, isAuthenticated, profile, logout } = useAuth();
  const [view, setView] = useState<View>('home');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Chargement...</p>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <LoginPage />;
  }

  const isAdmin = profile.role === ROLES.ADMIN;

  if (view !== 'home') {
    return (
      <div>
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setView('home')} className="text-sm text-slate-400">
            ← Retour
          </button>
          <button onClick={() => logout()} className="text-sm text-slate-400">
            Déconnexion
          </button>
        </div>
        {view === 'employees' && <AdminEmployeesPage />}
        {view === 'checklist' && <ChecklistPage />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">HyperExcellence</h1>
        <p className="text-slate-300">
          Bienvenue, <span className="font-semibold">{profile.full_name}</span>
        </p>
        <p className="text-slate-400 text-sm">{ROLE_LABELS[profile.role]}</p>

        <div className="space-y-2">
          <button
            onClick={() => setView('checklist')}
            className="rounded-lg bg-amber-500 text-slate-950 font-semibold px-4 py-2 text-sm block mx-auto w-56"
          >
            Circuit 1 — Confort
          </button>

          {isAdmin && (
            <button
              onClick={() => setView('employees')}
              className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-sm block mx-auto w-56"
            >
              Gérer les employés
            </button>
          )}
        </div>

        <button
          onClick={() => logout()}
          className="mt-2 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-sm"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export default App;
