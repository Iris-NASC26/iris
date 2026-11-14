/** Adapted from Navida Jayaweera's ThemeContext at cabc793. View preferences only. */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ExplanationLevel = 'explorer' | 'student' | 'scientist';
type Theme = 'dark' | 'light';
interface Preferences {
  theme: Theme;
  toggleTheme: () => void;
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
  catch { /* View preferences remain usable when browser storage is unavailable. */ }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readPreference('theme') === 'light' ? 'light' : 'dark');
  const [level, setLevel] = useState<ExplanationLevel>(() => {
    const stored = readPreference('level');
    return stored === 'student' || stored === 'scientist' ? stored : 'explorer';
  });
  const [reducedMotion, setReducedMotion] = useState(() => readPreference('reduced-motion') === 'true');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writePreference('theme', theme);
  }, [theme]);
  useEffect(() => { writePreference('level', level); }, [level]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
    writePreference('reduced-motion', String(reducedMotion));
  }, [reducedMotion]);
  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
    level, setLevel, reducedMotion, setReducedMotion }), [theme, level, reducedMotion]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePreferences(): Preferences {
  const value = useContext(Context);
  if (!value) throw new Error('Workspace preferences require their provider.');
  return value;
}
