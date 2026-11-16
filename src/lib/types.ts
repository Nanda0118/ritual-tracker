export type StepStatus = "pending" | "done" | "skipped";

export interface StepDef {
  step_key: string;
  label: string;
  spec: string;
  sort_order: number;
  kind: "ritual" | "anchor";
  cycled: boolean;
  active: boolean;
}

export interface StepRecord {
  day: string;
  step_key: string;
  status: StepStatus;
  happened_at: string | null;
  logged_at: string | null;
  backfilled: boolean;
  reason: string;
}

export interface DayRecord {
  day: string;
  note: string;
}

export interface Cycle {
  step_key: string;
  start_date: string;
  length_days: number;
  phase: string;
}

/** Anything unrecognised resolves to "pending" — a status the UI can always draw. */
export function normaliseStatus(v: unknown): StepStatus {
  return v === "done" || v === "skipped" ? v : "pending";
}

/** Parses a timestamp, returning null rather than NaN for anything unusable. */
export function ts(v: string | null | undefined): number | null {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/** Whole minutes between two timestamps, or null if either is unusable. */
export function minutesBetween(a: string | null, b: string | null): number | null {
  const A = ts(a);
  const B = ts(b);
  if (A === null || B === null) return null;
  return Math.round((B - A) / 60000);
}

/** Elapsed minutes, but only when the result makes sense (non-negative). */
export function elapsedMin(from: string | null, to: string | null): number | null {
  const m = minutesBetween(from, to);
  return m === null || m < 0 ? null : m;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDayStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDayStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtClock(iso: string | null): string {
  const t = ts(iso);
  if (t === null) return "";
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fmtDayHuman(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
