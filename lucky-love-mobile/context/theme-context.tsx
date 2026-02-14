import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

type ThemeOverrides = {
  light: Partial<typeof Colors.light>;
  dark: Partial<typeof Colors.dark>;
};

type ThemeContextValue = {
  overrides: ThemeOverrides;
  updateOverrides: (theme: 'light' | 'dark', values: Partial<typeof Colors.light>) => void;
  resetOverrides: () => void;
};

const emptyOverrides: ThemeOverrides = {
  light: {},
  dark: {},
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeOverridesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<ThemeOverrides>(emptyOverrides);
  const { state } = useAuth();

  useEffect(() => {
    const nextLight = state.profile?.themeLight ?? {};
    const nextDark = state.profile?.themeDark ?? {};

    setOverrides({
      light: nextLight,
      dark: nextDark,
    });
  }, [state.profile?.themeLight, state.profile?.themeDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      overrides,
      updateOverrides: (theme, values) =>
        setOverrides((prev) => ({
          ...prev,
          [theme]: {
            ...prev[theme],
            ...values,
          },
        })),
      resetOverrides: () => setOverrides(emptyOverrides),
    }),
    [overrides]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeOverrides() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeOverrides must be used within ThemeProvider');
  }

  return context;
}
