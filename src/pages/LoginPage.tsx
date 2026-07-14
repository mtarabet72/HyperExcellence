// ============================================================
// HyperExcellence - Écran de connexion Badge + PIN
// ============================================================
import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!badgeNumber.trim() || !pin.trim()) {
      setError('Numéro de badge et code PIN requis.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(badgeNumber, pin);
    } catch {
      setError('Badge ou code PIN incorrect.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">HyperExcellence</h1>
          <p className="text-slate-400 text-sm">Connexion agent</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="badge" className="block text-sm text-slate-300 mb-1">
              Numéro de badge
            </label>
            <input
              id="badge"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              value={badgeNumber}
              onChange={(e) => setBadgeNumber(e.target.value)}
              placeholder="B00123"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm text-slate-300 mb-1">
              Code PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-500 text-slate-950 font-semibold py-3 disabled:opacity-50"
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
