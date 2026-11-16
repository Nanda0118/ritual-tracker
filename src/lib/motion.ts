import type { Variants } from "framer-motion";

export const spring = { type: "spring", stiffness: 220, damping: 26, mass: 0.9 } as const;
export const expo = [0.16, 1, 0.3, 1] as const;

export const panelIn: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: expo } },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isSmallViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 760 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}
