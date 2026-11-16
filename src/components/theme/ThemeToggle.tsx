"use client";
import { Sun, Moon, Clock } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const NEXT = { auto: "dark", dark: "light", light: "auto" } as const;

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const Icon = mode === "auto" ? Clock : mode === "dark" ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={() => setMode(NEXT[mode])}
      aria-label={`theme: ${mode}`}
      title={`theme: ${mode}`}
      className="tb-round"
    >
      <Icon size={16} />
    </button>
  );
}
