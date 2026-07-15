import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminEmployeesPage from './pages/AdminEmployeesPage';
import ChecklistPage from './pages/ChecklistPage';
import NonConformitesPage from './pages/NonConformitesPage';
import DashboardPage from './pages/DashboardPage';
import ExcelExportPage from './pages/ExcelExportPage';
import HeatmapPage from './pages/HeatmapPage';
import PhotosGalleryPage from './pages/PhotosGalleryPage';
import { ROLE_LABELS, ROLES } from './constants';

type View =
  | 'home'
  | 'employees'
  | 'checklist'
  | 'nonconformites'
  | 'dashboard'
  | 'excel'
  | 'heatmap'
  | 'photos';

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
  const canSeeHeatmap = profile.role === ROLES.ADMIN || profile.role === ROLES.CHEF_SECTEUR;

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
        {view === 'nonconformites' && <NonConformitesPage />}
        {view === 'dashboard' && <DashboardPage />}
        {view === 'excel' && <ExcelExportPage />}
        {view === 'heatmap' && <HeatmapPage />}
        {view === 'photos' && <PhotosGalleryPage />}
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
          {isAdmin && (
            <button
              onClick={() => setView('dashboard')}
              className="rounded-lg bg-blue-500 text-slate-950 font-semibold px-4 py-2 text-sm block mx-auto w-56"
            >
              Tableau de bord
            </button>
          )}

          {canSeeHeatmap && (
            <button
              onClick={() => setView('heatmap')}
              className="rounded-lg bg-purple-500/20 text-purple-300 border border-purple-900 px-4 py-2 text-sm block mx-auto w-56"
            >
              Heatmap Magasin
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setView('photos')}
              className="rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-900 px-4 py-2 text-sm block mx-auto w-56"
            >
              Photos du jour
            </button>
          )}

          <button
            onClick={() => setView('checklist')}
            className="rounded-lg bg-amber-500 text-slate-950 font-semibold px-4 py-2 text-sm block mx-auto w-56"
          >
            Checklists
          </button>

          <button
            onClick={() => setView('nonconformites')}
            className="rounded-lg bg-red-500/20 text-red-400 border border-red-900 px-4 py-2 text-sm block mx-auto w-56"
          >
            Non Conformités
          </button>

          {isAdmin && (
            <button
              onClick={() => setView('excel')}
              className="rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-900 px-4 py-2 text-sm block mx-auto w-56"
            >
              Export Excel
            </button>
          )}

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
