import type { ReactNode } from "react";

export function HudFrame({ children }: { children: ReactNode }) {
  return (
    <div className="hud-frame">
      <div className="hud-vignette" />
      <div className="hud-scanlines" />
      <div className="hud-content">{children}</div>
    </div>
  );
}
