"use client";
import { useEffect, useRef } from "react";

export function Waveform({ active, bars = 32 }: { active: boolean; bars?: number }) {
  const ref = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      const children = ref.current?.children;
      if (children) {
        for (let i = 0; i < children.length; i++) {
          const el = children[i] as HTMLElement;
          const h = active ? 6 + Math.abs(Math.sin(t * 6 + i * 0.4)) * 28 * Math.random() : 3;
          el.style.height = `${h}px`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 3, height: 36 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 2,
            borderRadius: 2,
            height: 3,
            background: "var(--jv-cyan-bright)",
            boxShadow: "var(--jv-glow-sm)",
            transition: "height .08s linear",
            display: "block",
          }}
        />
      ))}
    </div>
  );
}
