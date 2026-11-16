"use client";
import { useCallback, useState } from "react";

export type JarvisState = "idle" | "listening" | "thinking" | "speaking";

export function useJarvisState(initial: JarvisState = "idle") {
  const [state, setState] = useState<JarvisState>(initial);
  const to = useCallback((s: JarvisState) => setState(s), []);
  return { state, to };
}
