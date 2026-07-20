// ============================================================
// HyperExcellence - Ecran de connexion Badge + PIN (bilingue, securise)
// Migre vers le Design System (Phase 2)
// ============================================================
import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AccountLockedError } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Label, Input } from '../components/ui/Field';

export default function LoginPage() {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!badgeNumber.trim() || !pin.trim()) {
      setError(t('fieldsRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await login(badgeNumber, pin);
    } catch (err) {
      if (err instanceof AccountLockedError) {
        setError(
          language === 'ar'
            ? `الحساب محظور مؤقتا. حاولوا مرة أخرى بعد ${err.minutesLeft} دقيقة.`
            : `Compte temporairement bloqué. Réessayez dans ${err.minutesLeft} minute(s).`
        );
      } else {
        setError(t('loginError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setLanguage('fr')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              language === 'fr' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Français
          </button>
          <button
            onClick={() => setLanguage('ar')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              language === 'ar' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            العربية
          </button>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('appName')}</h1>
          <p className="text-slate-400 text-sm">{t('loginTitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label size="lg" htmlFor="badge">
              {t('badgeNumber')}
            </Label>
            <Input
              id="badge"
              size="lg"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              value={badgeNumber}
              onChange={(e) => setBadgeNumber(e.target.value)}
              placeholder="B00123"
              dir="ltr"
            />
          </div>

          <div>
            <Label size="lg" htmlFor="pin">
              {t('pinCode')}
            </Label>
            <Input
              id="pin"
              size="lg"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              dir="ltr"
              className="tracking-widest"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
            {isSubmitting ? t('loggingIn') : t('loginButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
