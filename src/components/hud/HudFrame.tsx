"use client";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/components/theme/ThemeProvider";

const JarvisBackdrop = dynamic(() => import("@/components/three/JarvisBackdrop"), { ssr: false });

export function HudFrame({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="hud-frame">
      <JarvisBackdrop theme={theme} />
      <div className="hud-scrim" />
      <div className="hud-content">{children}</div>
    </div>
  );
}
