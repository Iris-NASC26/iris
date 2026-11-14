"use client";

/** Explanation/motion settings. Navida ThemeContext remains the sole theme owner. */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ExplanationLevel = 'explorer' | 'student' | 'scientist';
interface Preferences {
  level: ExplanationLevel;
  setLevel: (level: ExplanationLevel) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
}
const Context = createContext<Preferences | null>(null);

export function readPreference(key: string): string | null {
  try { return window.localStorage.getItem(`earth-trend.${key}`); }
  catch { return null; }
}

export function writePreference(key: string, value: string): void {
  try { window.localStorage.setItem(`earth-trend.${key}`, value); }
  catch { /* View preferences remain optional when storage is unavailable. */ }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<ExplanationLevel>('explorer');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readPreference('level');
    setLevel(saved === 'student' || saved === 'scientist' ? saved : 'explorer');
    setReducedMotion(readPreference('reduced-motion') === 'true');
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writePreference('level', level);
    writePreference('reduced-motion', String(reducedMotion));
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [level, reducedMotion, hydrated]);

  const value = useMemo(() => ({ level, setLevel, reducedMotion, setReducedMotion }), [level, reducedMotion]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePreferences(): Preferences {
  const value = useContext(Context);
  if (!value) throw new Error('PreferencesProvider required');
  return value;
}
