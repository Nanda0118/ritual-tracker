"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { cardIn, prefersReducedMotion } from "@/lib/motion";

export function Panel({
  title,
  sub,
  children,
  className = "",
  style,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(prefersReducedMotion()), []);

  return (
    <motion.div
      variants={reduced ? undefined : cardIn}
      initial={reduced ? false : "hidden"}
      animate={reduced ? false : "show"}
      className={`panel ${className}`.trim()}
      style={style}
    >
      {title && (
        <h3>
          <span>{title}</span>
          {sub}
        </h3>
      )}
      {children}
    </motion.div>
  );
}

// v2 name — same component, exported under the name the skill uses.
export const GlassCard = Panel;
