import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminEmployeesPage from './pages/AdminEmployeesPage';
import { ROLE_LABELS, ROLES } from './constants';

function App() {
  const { isLoading, isAuthenticated, profile, logout } = useAuth();
  const [showEmployees, setShowEmployees] = useState(false);

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

  if (isAdmin && showEmployees) {
    return (
      <div>
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setShowEmployees(false)}
            className="text-sm text-slate-400"
          >
            ← Retour
          </button>
          <button onClick={() => logout()} className="text-sm text-slate-400">
            Déconnexion
          </button>
        </div>
        <AdminEmployeesPage />
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

        {isAdmin && (
          <button
            onClick={() => setShowEmployees(true)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-sm block mx-auto"
          >
            Gérer les employés
          </button>
        )}

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
