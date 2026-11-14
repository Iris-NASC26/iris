"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  dark: boolean;
  setDark: (value: boolean | ((prev: boolean) => boolean)) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("iris-theme");
      if (stored === "dark") {
        setDark(true);
      }
    } catch {
      // Ignore storage access errors
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("iris-theme", dark ? "dark" : "light");
    } catch {
      // Ignore storage access errors
    }
  }, [dark, hydrated]);

  const toggleTheme = useCallback(() => {
    setDark((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      dark,
      setDark,
      toggleTheme,
    }),
    [dark, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
