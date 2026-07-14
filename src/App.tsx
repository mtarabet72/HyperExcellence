import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import { ROLE_LABELS } from './constants';

function App() {
  const { isLoading, isAuthenticated, profile, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">HyperExcellence</h1>
        <p className="text-slate-300">
          Bienvenue, <span className="font-semibold">{profile.full_name}</span>
        </p>
        <p className="text-slate-400 text-sm">{ROLE_LABELS[profile.role]}</p>
        <button
          onClick={() => logout()}
          className="mt-4 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-sm"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export default App;
