'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { ThemeContract } from './contract';
import { ThemeEventBus } from './hooks';

interface ThemeContextValue {
  theme: ThemeContract;
  eventBus: ThemeEventBus;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  theme,
  children,
}: {
  theme: ThemeContract;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ theme, eventBus: new ThemeEventBus() }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContract {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx.theme;
}

export function useThemeComponents(): ThemeContract['components'] {
  return useTheme().components;
}

export function useThemePalette(): ThemeContract['palette'] {
  return useTheme().palette;
}

export function useEventBus(): ThemeEventBus {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useEventBus must be used within a ThemeProvider');
  return ctx.eventBus;
}
