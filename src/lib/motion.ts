import type { Variants } from "framer-motion";

export const spring = { type: "spring", stiffness: 210, damping: 26, mass: 0.9 } as const;
export const expo = [0.16, 1, 0.3, 1] as const;

export const cardIn: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: expo } },
};

// Back-compat alias for any earlier v1 imports.
export const panelIn = cardIn;

export const grid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const stagger = grid;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isSmallViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 760 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}
