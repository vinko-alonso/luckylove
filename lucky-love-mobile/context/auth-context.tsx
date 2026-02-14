import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Profile = {
  userId: string;
  email: string;
  alias?: string | null;
  coupleId?: string | null;
  photoUrl?: string | null;
  photoPath?: string | null;
  themeLight?: Record<string, string> | null;
  themeDark?: Record<string, string> | null;
  termsAcceptedAt?: string | null;
  birthday?: string | null;
  favoriteFood?: string | null;
  personalityType?: string | null;
  whatsappUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  linkedinUrl?: string | null;
};

type Couple = {
  id: string;
  code?: string;
  memberCount?: number;
  relationshipStartDate?: string | null;
  meetDate?: string | null;
};

type AuthState = {
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  profile: Profile | null;
  couple: Couple | null;
};

type AuthContextValue = {
  state: AuthState;
  setAuth: (next: AuthState) => void;
  clearAuth: () => void;
  updateProfile: (profile: Profile) => void;
  updateCouple: (couple: Couple | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const emptyState: AuthState = {
  userId: null,
  email: null,
  accessToken: null,
  profile: null,
  couple: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(emptyState);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      setAuth: setState,
      clearAuth: () => setState(emptyState),
      updateProfile: (profile) =>
        setState((prev) => ({
          ...prev,
          userId: profile.userId,
          email: profile.email,
          profile,
        })),
      updateCouple: (couple) =>
        setState((prev) => ({
          ...prev,
          couple,
          profile: prev.profile
            ? { ...prev.profile, coupleId: couple?.id ?? null }
            : prev.profile,
        })),
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
