"use client";

export function RadialGauge({
  value,
  label,
  size = 112,
  critical = false,
}: {
  value: number | null;
  label: string;
  size?: number;
  critical?: boolean;
}) {
  const v = value ?? 0;
  const r = (size / 112) * 42;
  const c = 2 * Math.PI * r;
  const done = v >= 1;
  const color = critical ? "var(--jv-red)" : done ? "var(--jv-gold)" : "var(--jv-cyan)";
  const half = size / 2;
  return (
    <div className="gauge-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={half} cy={half} r={r} fill="none" stroke="var(--jv-cyan-deep)" strokeWidth="3" opacity="0.3" />
        <circle
          cx={half}
          cy={half}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(Math.max(v, 0), 1))}
          style={{ filter: "drop-shadow(0 0 4px currentColor)", color, transition: "stroke-dashoffset .8s var(--ease-expo)" }}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div className="gauge-num">{value === null ? "—" : Math.round(v * 100)}</div>
        <div className="gauge-label">{label}</div>
      </div>
    </div>
  );
}
