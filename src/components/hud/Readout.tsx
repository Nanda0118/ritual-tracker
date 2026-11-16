"use client";
import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const GLYPHS = "!<>-_\\/[]{}=+*^?#";

export function Readout({ text, speed = 28 }: { text: string; speed?: number }) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setOut(text);
      return;
    }
    let frame = 0;
    let raf = 0;
    const tick = () => {
      const revealed = Math.floor(frame / 2);
      setOut(
        text
          .split("")
          .map((ch, i) => (i < revealed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join("")
      );
      frame++;
      if (revealed <= text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span className="font-mono" style={{ color: "var(--jv-cyan-bright)" }}>
      {out}
    </span>
  );
}
