"use client";
import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";
import { panelIn } from "@/lib/motion";

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
  return (
    <motion.div
      variants={panelIn}
      initial="hidden"
      animate="show"
      className={`panel ${className}`.trim()}
      style={style}
    >
      <span className="jv-bracket jv-tl" />
      <span className="jv-bracket jv-tr" />
      <span className="jv-bracket jv-bl" />
      <span className="jv-bracket jv-br" />
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
