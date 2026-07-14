// ============================================================
// HyperExcellence - Contexte d'authentification global
// Combine session Appwrite (account) + profil métier (profiles)
// ============================================================
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Query } from 'appwrite';
import { databases } from '../lib/appwrite';
import { getCurrentUser, loginWithBadge, logout as doLogout } from '../lib/auth';
import { APPWRITE_DATABASE_ID, COLLECTIONS, UserRole } from '../constants';

interface Profile {
  $id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  sector: string | null;
  badge_number: string | null;
  is_active: boolean;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  profile: Profile | null;
  login: (badgeNumber: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(userId: string) {
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal('user_id', userId)]
    );
    if (result.documents.length > 0) {
      setProfile(result.documents[0] as unknown as Profile);
    } else {
      setProfile(null);
    }
  }

  async function refreshSession() {
    setIsLoading(true);
    const user = await getCurrentUser();
    if (user) {
      await loadProfile(user.$id);
    } else {
      setProfile(null);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    refreshSession();
  }, []);

  async function login(badgeNumber: string, pin: string) {
    await loginWithBadge(badgeNumber, pin);
    await refreshSession();
  }

  async function logout() {
    await doLogout();
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: profile !== null,
        profile,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
