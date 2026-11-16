"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";
type Mode = "auto" | Theme;

const Ctx = createContext<{ theme: Theme; mode: Mode; setMode: (m: Mode) => void }>(null!);

const autoTheme = (d = new Date()): Theme => (d.getHours() >= 7 && d.getHours() < 18 ? "light" : "dark");

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("auto");
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setModeState((localStorage.getItem("jv-mode") as Mode) || "auto");
  }, []);

  useEffect(() => {
    const resolve = () => setTheme(mode === "auto" ? autoTheme() : mode);
    resolve();
    if (mode === "auto") {
      const id = setInterval(resolve, 60_000);
      return () => clearInterval(id);
    }
  }, [mode]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    localStorage.setItem("jv-mode", m);
  }, []);

  return <Ctx.Provider value={{ theme, mode, setMode }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
