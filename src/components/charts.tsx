"use client";

import { useEffect, useRef, useState } from "react";
import { fmtDayHuman, parseDayStr, pad2 } from "@/lib/types";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(420);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.max(el.clientWidth || 420, 240));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

export function Ring({
  pct,
  size = 84,
  stroke = 9,
  label,
  sub,
}: {
  pct: number | null;
  size?: number;
  stroke?: number;
  label: string;
  sub: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = pct === null ? 0 : Math.max(0, Math.min(1, pct));
  const off = c * (1 - safe);
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-text" style={pct === null ? { fontSize: 12 } : undefined}>
        {label}
        <small>{sub}</small>
      </div>
    </div>
  );
}

interface Tip {
  x: number;
  y: number;
  html: string;
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: Math.min(Math.max(tip.x + 12, 4), (typeof window !== "undefined" ? window.innerWidth : 800) - 210),
        top: Math.max(tip.y - 12, 4),
        pointerEvents: "none",
        zIndex: 60,
        whiteSpace: "nowrap",
        background: "var(--shell)",
        color: "var(--on-shell)",
        borderRadius: 9,
        padding: "7px 11px",
        fontSize: 11.5,
        boxShadow: "0 8px 22px rgba(0,0,0,.35)",
      }}
    >
      {tip.html}
    </div>
  );
}

export function LineChart({
  days,
  values,
  color = "var(--accent)",
  target,
  format,
}: {
  days: string[];
  values: (number | null)[];
  color?: string;
  target?: number;
  format?: (v: number) => string;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);

  const usable = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!usable.length) {
    return (
      <div ref={ref}>
        <div className="chart-empty">Nothing logged yet</div>
      </div>
    );
  }

  const h = 160;
  const pad = { t: 16, r: 12, b: 24, l: 32 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const pool = target != null ? [...usable, target] : usable;
  const maxV = Math.max(...pool);
  const minV = Math.min(...pool);
  const span = Math.max(1, maxV - minV);
  let lo = Math.max(0, minV - span * 0.2);
  let hi = maxV + span * 0.2;
  if (!(hi > lo)) {
    lo = 0;
    hi = Math.max(1, maxV + 1);
  }
  const n = days.length;
  const xAt = (i: number) => pad.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => pad.t + plotH - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * plotH;
  const fmt = format ?? ((v: number) => String(Math.round(v)));

  const pts: [number, number, number][] = [];
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) return;
    pts.push([xAt(i), yAt(v), i]);
  });

  const gridVals = [0, 1, 2, 3].map((g) => lo + ((hi - lo) / 3) * g);

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
        {gridVals.map((gv, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={yAt(gv)} y2={yAt(gv)} stroke="var(--hairline)" strokeWidth={1} />
            <text x={2} y={yAt(gv) + 3} fontSize={9} fill="var(--text-muted)">
              {fmt(gv)}
            </text>
          </g>
        ))}
        <line
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + plotH}
          y2={pad.t + plotH}
          stroke="var(--baseline)"
          strokeWidth={1}
        />
        {target != null && (
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={yAt(target)}
            y2={yAt(target)}
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
        <path
          d={pts.map((p, k) => `${k ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p) => (
          <circle
            key={p[2]}
            cx={p[0].toFixed(1)}
            cy={p[1].toFixed(1)}
            r={4}
            fill={color}
            stroke="var(--card)"
            strokeWidth={1.5}
            style={{ cursor: "pointer" }}
            onMouseMove={(e) =>
              setTip({
                x: e.clientX,
                y: e.clientY,
                html: `${fmtDayHuman(parseDayStr(days[p[2]]))} · ${fmt(values[p[2]] as number)}`,
              })
            }
            onMouseLeave={() => setTip(null)}
          />
        ))}
        {pts.length > 0 && (
          <text
            x={pts[pts.length - 1][0] - 4}
            y={pts[pts.length - 1][1] - 10}
            fontSize={10.5}
            fontWeight={600}
            textAnchor="end"
            fill="var(--text-primary)"
          >
            {fmt(values[pts[pts.length - 1][2]] as number)}
          </text>
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

export function BarChart({
  labels,
  values,
  color = "var(--accent)",
  format,
  detail,
  horizontal = false,
}: {
  labels: string[];
  values: number[];
  color?: string;
  format?: (v: number) => string;
  detail?: (i: number) => string;
  horizontal?: boolean;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [active, setActive] = useState<number | null>(null);

  if (!values.length) {
    return (
      <div ref={ref}>
        <div className="chart-empty">Nothing logged yet</div>
      </div>
    );
  }

  const fmt = format ?? ((v: number) => String(Math.round(v)));
  const maxV = Math.max(1, ...values);

  if (horizontal) {
    const rowH = 28;
    const narrow = w < 360;
    const labelFs = narrow ? 9.5 : 10.5;
    const pad = { t: 4, r: narrow ? 30 : 40, b: 4, l: narrow ? 78 : 118 };
    const labelMaxChars = narrow ? 11 : 16;
    const h = pad.t + labels.length * rowH + pad.b;
    const plotW = w - pad.l - pad.r;
    return (
      <div ref={ref}>
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
          {labels.map((label, i) => {
            const v = values[i] ?? 0;
            const bw = Math.max(2, (v / maxV) * plotW);
            const cy = pad.t + i * rowH + rowH / 2;
            const isActive = active === i;
            const shownLabel =
              label.length > labelMaxChars ? `${label.slice(0, labelMaxChars - 1)}…` : label;
            return (
              <g key={label}>
                <text x={0} y={cy + 3.5} fontSize={labelFs} fill="var(--text-secondary)">
                  {shownLabel}
                </text>
                <rect
                  x={pad.l}
                  y={cy - 7}
                  width={plotW}
                  height={14}
                  rx={5}
                  fill="var(--hairline)"
                />
                <rect
                  x={pad.l}
                  y={cy - 7}
                  width={bw.toFixed(1)}
                  height={14}
                  rx={5}
                  fill={color}
                  opacity={isActive ? 1 : 0.85}
                  style={{ cursor: "pointer", transition: "width .4s var(--ease-expo, ease), opacity .15s" }}
                  onMouseMove={(e) => {
                    setActive(i);
                    setTip({ x: e.clientX, y: e.clientY, html: detail ? detail(i) : `${label} · ${fmt(v)}` });
                  }}
                  onMouseLeave={() => {
                    setActive(null);
                    setTip(null);
                  }}
                />
                <text x={pad.l + bw + 6} y={cy + 3.5} fontSize={narrow ? 9 : 10} fontWeight={600} fill="var(--text-primary)">
                  {fmt(v)}
                </text>
              </g>
            );
          })}
        </svg>
        <Tooltip tip={tip} />
      </div>
    );
  }

  const h = 160;
  const pad = { t: 16, r: 8, b: 24, l: 32 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const gap = 6;
  const bw = Math.max(4, plotW / values.length - gap);
  const gridVals = [0, 0.5, 1].map((g) => maxV * g);

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
        {gridVals.map((gv, i) => {
          const y = pad.t + plotH - (gv / maxV) * plotH;
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--hairline)" strokeWidth={1} />
              <text x={2} y={y + 3} fontSize={9} fill="var(--text-muted)">
                {fmt(gv)}
              </text>
            </g>
          );
        })}
        {values.map((v, i) => {
          const bh = Math.max(2, (v / maxV) * plotH);
          const x = pad.l + i * (plotW / values.length) + gap / 2;
          const y = pad.t + plotH - bh;
          const isActive = active === i;
          return (
            <g key={labels[i] ?? i}>
              <rect
                x={x.toFixed(1)}
                y={y.toFixed(1)}
                width={bw.toFixed(1)}
                height={bh.toFixed(1)}
                rx={4}
                fill={color}
                opacity={isActive ? 1 : 0.85}
                style={{ cursor: "pointer", transition: "height .4s var(--ease-expo, ease), y .4s var(--ease-expo, ease), opacity .15s" }}
                onMouseMove={(e) => {
                  setActive(i);
                  setTip({ x: e.clientX, y: e.clientY, html: detail ? detail(i) : `${labels[i]} · ${fmt(v)}` });
                }}
                onMouseLeave={() => {
                  setActive(null);
                  setTip(null);
                }}
              />
              <text
                x={(x + bw / 2).toFixed(1)}
                y={h - 6}
                fontSize={9}
                fill="var(--text-muted)"
                textAnchor="middle"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

export function StepGrid({
  days,
  rows,
  statusAt,
  detailAt,
}: {
  days: string[];
  rows: { step_key: string; label: string }[];
  statusAt: (day: string, key: string) => string;
  detailAt: (day: string, key: string) => string;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);

  const rowH = 26;
  const pad = { t: 6, r: 10, b: 22, l: 124 };
  const h = pad.t + rows.length * rowH + pad.b;
  const plotW = w - pad.l - pad.r;
  const cw = plotW / Math.max(1, days.length);
  const cell = Math.max(4, Math.min(rowH - 8, cw - 4));

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
        {rows.map((s, r) => {
          const cy = pad.t + r * rowH + rowH / 2;
          return (
            <g key={s.step_key}>
              <text x={0} y={cy + 3.5} fontSize={10.5} fill="var(--text-secondary)">
                {s.label}
              </text>
              {days.map((d, i) => {
                const st = statusAt(d, s.step_key);
                const fill =
                  st === "done" ? "var(--accent)" : st === "skipped" ? "var(--warn-soft)" : "var(--card-2)";
                const stroke =
                  st === "done" ? "transparent" : st === "skipped" ? "var(--warn-line)" : "var(--card-ring)";
                const cx = pad.l + i * cw + cw / 2;
                return (
                  <rect
                    key={d}
                    x={(cx - cell / 2).toFixed(1)}
                    y={(cy - cell / 2).toFixed(1)}
                    width={cell.toFixed(1)}
                    height={cell.toFixed(1)}
                    rx={3}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1}
                    onMouseMove={(e) =>
                      setTip({
                        x: e.clientX,
                        y: e.clientY,
                        html: `${fmtDayHuman(parseDayStr(d))} · ${s.label} · ${detailAt(d, s.step_key)}`,
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
            </g>
          );
        })}
        {days.map((d, i) =>
          i % 2 ? null : (
            <text
              key={d}
              x={(pad.l + i * cw + cw / 2).toFixed(1)}
              y={h - 6}
              fontSize={9}
              fill="var(--text-muted)"
              textAnchor="middle"
            >
              {parseDayStr(d).getDate()}
            </text>
          )
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

export function MiniCalendar({
  month,
  today,
  levelFor,
}: {
  month: Date;
  today: string;
  levelFor: (day: string) => number;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const offset = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const cells: React.ReactNode[] = [];

  ["S", "M", "T", "W", "T", "F", "S"].forEach((d, i) => {
    cells.push(
      <div className="cal-dow" key={`dow-${i}`}>
        {d}
      </div>
    );
  });
  for (let i = 0; i < offset; i++) cells.push(<div className="cal-cell blank" key={`b-${i}`} />);
  for (let day = 1; day <= dim; day++) {
    const ds = `${y}-${pad2(m + 1)}-${pad2(day)}`;
    const lvl = ds <= today ? levelFor(ds) : 0;
    cells.push(
      <div
        key={ds}
        className={`cal-cell${lvl ? ` lvl${lvl}` : ""}${ds === today ? " today" : ""}`}
        title={ds}
      >
        {day}
      </div>
    );
  }
  return <div className="cal-grid">{cells}</div>;
}
