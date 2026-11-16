"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LineChart, MiniCalendar, StepGrid } from "@/components/charts";
import { HudFrame } from "@/components/hud/HudFrame";
import { Panel } from "@/components/hud/Panel";
import { RadialGauge } from "@/components/hud/RadialGauge";
import { BuddyOrb } from "@/components/assistant/BuddyOrb";
import {
  type Cycle,
  type DayRecord,
  type StepDef,
  type StepRecord,
  type StepStatus,
  elapsedMin,
  fmtClock,
  fmtDayHuman,
  normaliseStatus,
  pad2,
  parseDayStr,
  toDayStr,
  ts,
} from "@/lib/types";

const WINDOW_DAYS = 60;
const TARGET_MIN = 25;

type Tab = "today" | "progress" | "history";

function keyOf(day: string, step: string) {
  return `${day}|${step}`;
}

export default function TrackerApp({ userEmail, userId }: { userEmail: string; userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // computed after mount so server and client markup agree
  const [dayStr, setDayStr] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const [catalog, setCatalog] = useState<StepDef[]>([]);
  const [records, setRecords] = useState<Record<string, StepRecord>>({});
  const [days, setDays] = useState<Record<string, DayRecord>>({});
  const [cycle, setCycle] = useState<Cycle | null>(null);

  const [tab, setTab] = useState<Tab>("today");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [unsaved, setUnsaved] = useState<Record<string, true>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [openTimeEditor, setOpenTimeEditor] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<Record<string, string>>({});
  const noteTouched = useRef(false);

  const tomorrowStr = useMemo(() => {
    if (!dayStr) return null;
    const d = parseDayStr(dayStr);
    d.setDate(d.getDate() + 1);
    return toDayStr(d);
  }, [dayStr]);

  /* ---------------- day clock, re-checked rather than frozen ---------------- */
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      setDayStr((prev) => {
        const s = toDayStr(n);
        return prev === s ? prev : s;
      });
    };
    tick();
    const iv = setInterval(tick, 30000);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  /* ---------------- load ---------------- */
  const load = useCallback(async () => {
    if (!dayStr) return;
    const from = parseDayStr(dayStr);
    from.setDate(from.getDate() - WINDOW_DAYS);
    const fromStr = toDayStr(from);
    const toStr = tomorrowStr ?? dayStr;

    const [cat, steps, dayRows, cycles] = await Promise.all([
      supabase.from("step_catalog").select("*").eq("active", true).order("sort_order"),
      supabase.from("ritual_steps").select("*").gte("day", fromStr).lte("day", toStr),
      supabase.from("ritual_days").select("*").gte("day", fromStr).lte("day", toStr),
      supabase.from("cycles").select("*"),
    ]);

    const firstError = cat.error || steps.error || dayRows.error || cycles.error;
    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }
    setLoadError("");

    setCatalog((cat.data ?? []) as StepDef[]);

    const recMap: Record<string, StepRecord> = {};
    for (const r of (steps.data ?? []) as StepRecord[]) {
      recMap[keyOf(r.day, r.step_key)] = { ...r, status: normaliseStatus(r.status) };
    }
    setRecords((local) => {
      // never let a server row overwrite a tick that hasn't saved yet
      const merged = { ...recMap };
      for (const k of Object.keys(local)) {
        const [d] = k.split("|");
        if (unsaved[d]) merged[k] = local[k];
      }
      return merged;
    });

    const dayMap: Record<string, DayRecord> = {};
    for (const d of (dayRows.data ?? []) as DayRecord[]) dayMap[d.day] = d;
    setDays(dayMap);

    const cy = ((cycles.data ?? []) as Cycle[]).find((c) => c.step_key === "neem") ?? null;
    setCycle(cy);

    if (!noteTouched.current) setNoteDraft(dayMap[dayStr]?.note ?? "");
    setLoading(false);
  }, [supabase, dayStr, tomorrowStr, unsaved]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStr]);

  /* ---------------- derived ---------------- */
  const recOf = useCallback(
    (day: string, step: string): StepRecord | null => records[keyOf(day, step)] ?? null,
    [records]
  );
  const statusOf = useCallback(
    (day: string, step: string): StepStatus => normaliseStatus(recOf(day, step)?.status),
    [recOf]
  );
  const atOf = useCallback(
    (day: string, step: string): string | null => recOf(day, step)?.happened_at ?? null,
    [recOf]
  );

  const neemOn = useMemo(() => {
    if (!cycle || !dayStr) return true;
    if (cycle.phase !== "on") return false;
    const start = parseDayStr(cycle.start_date);
    const dayNum = Math.round((parseDayStr(dayStr).getTime() - start.getTime()) / 86400000) + 1;
    return dayNum >= 1 && dayNum <= cycle.length_days;
  }, [cycle, dayStr]);

  const cycleDay = useMemo(() => {
    if (!cycle || !dayStr) return null;
    const start = parseDayStr(cycle.start_date);
    return Math.round((parseDayStr(dayStr).getTime() - start.getTime()) / 86400000) + 1;
  }, [cycle, dayStr]);

  const visibleSteps = useMemo(
    () => catalog.filter((s) => !(s.cycled && !neemOn)),
    [catalog, neemOn]
  );

  // today is judged on the live cycle; a past day on what was recorded then,
  // so changing the cycle never re-scores days already in the book
  const countableFor = useCallback(
    (day: string) =>
      catalog.filter((s) => {
        if (s.kind !== "ritual") return false;
        if (!s.cycled) return true;
        if (day === dayStr) return neemOn;
        return !!recOf(day, s.step_key);
      }),
    [catalog, dayStr, neemOn, recOf]
  );

  const dueFor = useCallback(
    (day: string) => countableFor(day).filter((s) => statusOf(day, s.step_key) !== "skipped"),
    [countableFor, statusOf]
  );

  const lastNDays = useCallback(
    (n: number) => {
      if (!dayStr) return [];
      const out: string[] = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = parseDayStr(dayStr);
        d.setDate(d.getDate() - i);
        out.push(toDayStr(d));
      }
      return out;
    },
    [dayStr]
  );

  /* ---------------- writes ---------------- */
  const persist = useCallback(
    async (day: string, step: string, next: Partial<StepRecord> & { status: StepStatus }) => {
      const prev = recOf(day, step);
      const row: StepRecord = {
        day,
        step_key: step,
        status: next.status,
        happened_at: next.happened_at !== undefined ? next.happened_at : prev?.happened_at ?? null,
        logged_at: new Date().toISOString(),
        backfilled: next.backfilled !== undefined ? next.backfilled : prev?.backfilled ?? false,
        reason: next.reason !== undefined ? next.reason : prev?.reason ?? "",
      };

      setRecords((r) => ({ ...r, [keyOf(day, step)]: row }));
      setUnsaved((u) => ({ ...u, [day]: true }));

      const { error } = await supabase.from("ritual_steps").upsert(
        { user_id: userId, ...row },
        { onConflict: "user_id,day,step_key" }
      );

      if (error) {
        setLoadError(`Didn't save: ${error.message}`);
        return;
      }
      setUnsaved((u) => {
        const c = { ...u };
        delete c[day];
        return c;
      });
      setLoadError("");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    },
    [supabase, userId, recOf]
  );

  const toggleDone = useCallback(
    (day: string, step: string) => {
      const cur = statusOf(day, step);
      if (cur === "done") void persist(day, step, { status: "pending", happened_at: null, backfilled: false });
      else void persist(day, step, { status: "done", happened_at: new Date().toISOString(), backfilled: false });
    },
    [statusOf, persist]
  );

  const toggleSkip = useCallback(
    (day: string, step: string) => {
      const cur = statusOf(day, step);
      if (cur === "skipped") void persist(day, step, { status: "pending", happened_at: null });
      else void persist(day, step, { status: "skipped", happened_at: new Date().toISOString() });
    },
    [statusOf, persist]
  );

  // Non-toggling setter for voice: always lands on the requested status
  // rather than flipping an already-set step back to pending.
  const logStep = useCallback(
    (day: string, step: string, status: StepStatus) => {
      void persist(day, step, { status, happened_at: new Date().toISOString(), backfilled: false });
    },
    [persist]
  );

  const saveReason = useCallback(
    (day: string, step: string, text: string) => {
      const cur = recOf(day, step);
      if (!cur) return;
      const next = text.slice(0, 200);
      if (cur.reason === next) return;
      void persist(day, step, { status: cur.status, reason: next });
    },
    [recOf, persist]
  );

  /** Returns an error message, or null when the time is acceptable. */
  const applyTime = useCallback(
    (day: string, step: string, hhmm: string): string | null => {
      const cur = recOf(day, step);
      if (!cur) return "Nothing logged for that step yet.";
      const parts = hhmm.split(":");
      if (parts.length !== 2) return "That time didn't make sense.";
      const base = parseDayStr(day);
      base.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
      const t = base.getTime();
      if (Number.isNaN(t)) return "That time didn't make sense.";
      if (t > Date.now() + 60000) return "That's in the future.";

      if (step !== "wake") {
        const w = ts(atOf(day, "wake"));
        if (w !== null && t < w) return "That's before you woke up.";
      } else {
        let earliest: number | null = null;
        for (const s of catalog) {
          if (s.step_key === "wake") continue;
          const o = ts(atOf(day, s.step_key));
          if (o !== null && (earliest === null || o < earliest)) earliest = o;
        }
        if (earliest !== null && t > earliest) return "That's after a step you already logged.";
      }

      const wasJustNow = cur.happened_at ? Math.abs((ts(cur.happened_at) ?? 0) - Date.now()) < 120000 : false;
      void persist(day, step, {
        status: cur.status,
        happened_at: new Date(t).toISOString(),
        backfilled: !wasJustNow,
      });
      return null;
    },
    [recOf, atOf, catalog, persist]
  );

  const saveNote = useCallback(async () => {
    if (!dayStr) return;
    const { error } = await supabase
      .from("ritual_days")
      .upsert({ user_id: userId, day: dayStr, note: noteDraft.slice(0, 140) }, { onConflict: "user_id,day" });
    if (error) setLoadError(`Didn't save the note: ${error.message}`);
    else {
      noteTouched.current = false;
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setDays((d) => ({ ...d, [dayStr]: { day: dayStr, note: noteDraft.slice(0, 140) } }));
    }
  }, [supabase, userId, dayStr, noteDraft]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  /* ---------------- loading / empty shells ---------------- */
  if (!dayStr || !now) {
    return (
      <HudFrame>
        <div className="shell">
          <div className="canvas" style={{ marginTop: 40 }}>
            <div className="chart-empty font-mono">BOOTING…</div>
          </div>
        </div>
      </HudFrame>
    );
  }

  const wakeAt = atOf(dayStr, "wake");
  const readyAt = atOf(dayStr, "ready");
  const countable = countableFor(dayStr);
  const due = dueFor(dayStr);
  const doneCount = due.filter((s) => statusOf(dayStr, s.step_key) === "done").length;
  const skipCount = countable.filter((s) => statusOf(dayStr, s.step_key) === "skipped").length;
  const pct = due.length ? doneCount / due.length : null;

  const pending = visibleSteps.filter((s) => statusOf(dayStr, s.step_key) === "pending");
  const completed = visibleSteps.filter((s) => statusOf(dayStr, s.step_key) === "done");
  const skipped = visibleSteps.filter((s) => statusOf(dayStr, s.step_key) === "skipped");

  const closedMin = statusOf(dayStr, "ready") === "done" ? elapsedMin(wakeAt, readyAt) : null;
  const liveMin = wakeAt ? elapsedMin(wakeAt, now.toISOString()) : null;
  const shownMin = closedMin ?? liveMin;

  const hour = now.getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";
  const unsavedDays = Object.keys(unsaved);

  /* ---------------- step row ---------------- */
  function StepRow({ day, s, withReason }: { day: string; s: StepDef; withReason?: boolean }) {
    const st = statusOf(day, s.step_key);
    const r = recOf(day, s.step_key);
    const at = r?.happened_at ?? null;
    const offset = s.step_key !== "wake" && st === "done" ? elapsedMin(atOf(day, "wake"), at) : null;
    const editorKey = keyOf(day, s.step_key);

    return (
      <div className="step-shell">
        <div className={`step${st === "done" ? " done" : st === "skipped" ? " skipped" : ""}${s.kind === "anchor" ? " anchor" : ""}`}>
          <button
            type="button"
            className="tick"
            aria-label={`${st === "done" ? "Undo" : "Mark done"}: ${s.label}`}
            onClick={() => toggleDone(day, s.step_key)}
          >
            {st === "done" ? "✓" : st === "skipped" ? "–" : ""}
          </button>

          <div className="s-body">
            <div className="s-name">{s.label}</div>
            <div className="s-spec">{s.spec}</div>
            {(st === "done" || st === "skipped") && (
              <div className="s-time">
                {at ? (
                  <>
                    <span>
                      {st === "skipped" ? "skipped " : ""}
                      {fmtClock(at)}
                      {offset !== null ? ` · +${offset}m` : ""}
                    </span>
                    {r?.backfilled && <span className="flag">logged later</span>}
                  </>
                ) : (
                  <>
                    <span>{st === "skipped" ? "skipped" : "done"}</span>
                    <span className="flag warn">time missing</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="s-act">
            {s.kind !== "anchor" && (
              <button type="button" className="skip-btn" onClick={() => toggleSkip(day, s.step_key)}>
                {st === "skipped" ? "Unskip" : "Skip"}
              </button>
            )}
            {(st === "done" || st === "skipped") && (
              <button
                type="button"
                className="skip-btn"
                onClick={() => setOpenTimeEditor(openTimeEditor === editorKey ? null : editorKey)}
              >
                {at ? "Time" : "Set time"}
              </button>
            )}
          </div>
        </div>

        {openTimeEditor === editorKey && (
          <div className="time-edit">
            <input
              type="time"
              defaultValue={at ? fmtClock(at) : ""}
              onChange={(e) => {
                const err = applyTime(day, s.step_key, e.target.value);
                setTimeError((m) => ({ ...m, [editorKey]: err ?? "" }));
              }}
            />
            <span className={`te-msg${timeError[editorKey] ? " bad" : ""}`}>
              {timeError[editorKey] || "Set when it actually happened"}
            </span>
          </div>
        )}

        {withReason && st === "skipped" && (
          <div className="reason-row">
            <input
              type="text"
              maxLength={200}
              placeholder="why it was skipped — optional, fill in later"
              defaultValue={r?.reason ?? ""}
              onBlur={(e) => saveReason(day, s.step_key, e.target.value)}
            />
          </div>
        )}
      </div>
    );
  }

  /* ---------------- open reasons from earlier days ---------------- */
  const openReasons: { day: string; s: StepDef }[] = [];
  for (const k of Object.keys(records)) {
    const [d, sk] = k.split("|");
    if (d === dayStr) continue;
    const r = records[k];
    if (r.status === "skipped" && !r.reason) {
      const def = catalog.find((c) => c.step_key === sk);
      if (def) openReasons.push({ day: d, s: def });
    }
  }
  openReasons.sort((a, b) => (a.day < b.day ? 1 : -1));

  /* ---------------- progress figures ---------------- */
  const d14 = lastNDays(14);
  const d7 = lastNDays(7);
  const readyMinutes = (day: string) =>
    statusOf(day, "ready") === "done" ? elapsedMin(atOf(day, "wake"), atOf(day, "ready")) : null;

  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = parseDayStr(dayStr);
    d.setDate(d.getDate() - i);
    const ds = toDayStr(d);
    const dd = dueFor(ds);
    if (!dd.length) continue;
    const all = dd.every((s) => statusOf(ds, s.step_key) === "done");
    if (all) streak++;
    else if (i === 0) continue;
    else break;
  }

  const readies = d7.map(readyMinutes).filter((v): v is number => v !== null);
  const avgReady = readies.length ? Math.round((readies.reduce((a, b) => a + b, 0) / readies.length) * 10) / 10 : null;
  const skips14 = d14.reduce(
    (acc, ds) => acc + countableFor(ds).filter((s) => statusOf(ds, s.step_key) === "skipped").length,
    0
  );

  const levelFor = (ds: string) => {
    const dd = dueFor(ds);
    if (!dd.length) return 0;
    const done = dd.filter((s) => statusOf(ds, s.step_key) === "done").length;
    if (!done) return 0;
    const p = done / dd.length;
    return p >= 1 ? 3 : p >= 0.5 ? 2 : 1;
  };

  const loggedDays = Object.keys(records)
    .map((k) => k.split("|")[0])
    .filter((d, i, a) => a.indexOf(d) === i && records[keyOf(d, "wake")] !== undefined)
    .sort()
    .reverse()
    .slice(0, 14);

  const railIcon = (name: Tab) => {
    const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    if (name === "today")
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    if (name === "progress")
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 15l4-5 3 3 5-7" />
        </svg>
      );
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  };

  return (
    <HudFrame>
      <BuddyOrb progress={pct ?? 0} catalog={visibleSteps} dayStr={dayStr} tomorrowStr={tomorrowStr} onLog={logStep} />

      <div className="shell">
        <div className="topbar">
          <div className="tb-left">
            <div className="tb-greet">{greeting}, NANDA</div>
            <div className="tb-id font-mono">{fmtDayHuman(parseDayStr(dayStr))}</div>
          </div>
          <div className="tb-pill">
            {cycle && cycleDay !== null
              ? cycleDay < 1
                ? `NEEM CYCLE · STARTS ${cycle.start_date}`
                : cycleDay <= cycle.length_days
                  ? `NEEM CYCLE · DAY ${cycleDay} OF ${cycle.length_days}`
                  : `NEEM CYCLE · ${cycleDay - cycle.length_days}D PAST REVIEW`
              : "NO NEEM CYCLE SET"}
          </div>
          {unsavedDays.length > 0 && <div id="unsavedBadge">UNSAVED</div>}
          <button className="tb-round" type="button" onClick={signOut} title="Sign out" aria-label="Sign out">
            ⎋
          </button>
        </div>

        <div className="body-row">
          <nav className="rail" aria-label="Sections">
            {(["today", "progress", "history"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`rail-btn${tab === t ? " active" : ""}`}
                onClick={() => setTab(t)}
                title={t}
                aria-label={t}
              >
                {railIcon(t)}
              </button>
            ))}
          </nav>

          <main className="canvas">
            {loadError && <div className="alert bad">{loadError}</div>}
            {loading && <div className="chart-empty font-mono">LOADING…</div>}

            {!loading && tab === "today" && (
              <>
                <div className="panel-head">
                  <h2>Morning Ritual</h2>
                  <div className="ph-sub">{fmtDayHuman(parseDayStr(dayStr))}</div>
                </div>

                {statusOf(dayStr, "soak") === "pending" && hour < 12 && (
                  <div className="alert">
                    NO SOAK LOGGED FOR THIS MORNING. If the seeds weren&apos;t soaked overnight, give them
                    20–30 minutes in the water before drinking.
                  </div>
                )}

                <Panel className="hero">
                  <RadialGauge value={pct} label={pct === null ? "NONE DUE" : "DONE"} />
                  <div>
                    <div className="hero-label">Steps done</div>
                    <div className="hero-value">
                      {due.length ? `${doneCount} / ${due.length}` : "No steps due"}
                      {skipCount ? `  ·  ${skipCount} skipped` : ""}
                    </div>
                    <div className="hero-note font-mono">
                      {closedMin !== null
                        ? closedMin <= TARGET_MIN
                          ? "BLOCK CLOSED INSIDE TARGET"
                          : `BLOCK RAN ${closedMin - TARGET_MIN} MIN OVER TARGET`
                        : wakeAt
                          ? pending.length
                            ? `NEXT: ${pending[0].label.toUpperCase()}`
                            : "ALL STEPS SETTLED"
                          : 'TAP "WOKE UP" TO START THE CLOCK'}
                    </div>
                  </div>
                  <div className="hero-right">
                    <div className="hero-label">From wake</div>
                    <div className={`elapsed${shownMin !== null && shownMin > TARGET_MIN ? " over" : ""}`}>
                      {shownMin === null ? "—" : `${shownMin}m`}
                    </div>
                    <div className="hero-note font-mono">target {TARGET_MIN}m</div>
                  </div>
                </Panel>

                <div className="lists" style={{ marginTop: 12 }}>
                  <Panel title="Pending" sub={<span className="count">{pending.length}</span>}>
                    {pending.length ? (
                      pending.map((s) => <StepRow key={s.step_key} day={dayStr} s={s} />)
                    ) : (
                      <div className="empty-list">Nothing pending — block closed.</div>
                    )}
                  </Panel>
                  <Panel title="Completed" sub={<span className="count">{completed.length}</span>}>
                    {completed.length ? (
                      completed.map((s) => <StepRow key={s.step_key} day={dayStr} s={s} />)
                    ) : (
                      <div className="empty-list">Nothing ticked yet. Steps move here as you go.</div>
                    )}
                  </Panel>
                </div>

                {skipped.length > 0 && (
                  <Panel title="Skipped" sub={<span className="count">{skipped.length}</span>} style={{ marginTop: 12 }}>
                    {skipped.map((s) => (
                      <StepRow key={s.step_key} day={dayStr} s={s} withReason />
                    ))}
                    <div className="reason-hint">
                      Reasons are optional — leave them blank now and fill them in whenever you&apos;re free.
                    </div>
                  </Panel>
                )}

                {openReasons.length > 0 && (
                  <Panel title="Needs a reason" sub={<span className="count">{openReasons.length}</span>} style={{ marginTop: 12 }}>
                    {openReasons.slice(0, 20).map(({ day, s }) => (
                      <div className="or-row" key={keyOf(day, s.step_key)}>
                        <div className="or-head">
                          {fmtDayHuman(parseDayStr(day))} · {s.label}
                        </div>
                        <input
                          type="text"
                          maxLength={200}
                          placeholder="why — optional"
                          onBlur={(e) => saveReason(day, s.step_key, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="reason-hint">Skips from earlier days with no reason yet. Still optional.</div>
                  </Panel>
                )}

                {tomorrowStr && (
                  <Panel className="tonight" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="tick"
                      style={
                        statusOf(tomorrowStr, "soak") === "done"
                          ? { background: "var(--jv-gold)", borderColor: "var(--jv-gold)" }
                          : undefined
                      }
                      onClick={() => toggleDone(tomorrowStr, "soak")}
                      aria-label="Mark tomorrow's soak"
                    >
                      {statusOf(tomorrowStr, "soak") === "done" ? "✓" : ""}
                    </button>
                    <div className="t-body">
                      <div className="t-name">Tonight — soak for tomorrow</div>
                      <div className="t-spec">2 tsp sabja seeds in 1 litre water · leave overnight</div>
                    </div>
                    <button className="btn-primary" type="button" onClick={() => toggleDone(tomorrowStr, "soak")}>
                      {statusOf(tomorrowStr, "soak") === "done" ? "Soaked ✓" : "Mark soaked"}
                    </button>
                  </Panel>
                )}

                <Panel title="The 25-minute block" className="block-ref" style={{ marginTop: 12 }}>
                  <div className="br-row"><div className="br-time">05:00</div><div>Wake</div></div>
                  <div className="br-row"><div className="br-time">~05:02</div><div>Sabja water — drink the full litre</div></div>
                  <div className="br-row"><div className="br-time">~05:08</div><div>Bowel movement</div></div>
                  <div className="br-row"><div className="br-time">~05:18</div><div>Neem leaves, then garlic</div></div>
                  <div className="br-row"><div className="br-time">05:25</div><div>Dressed and ready for training</div></div>
                  <div className="muted" style={{ marginTop: 10 }}>
                    Inner times are a guide. The only fixed targets are the 05:00 start and the 25-minute finish.
                  </div>
                </Panel>

                <Panel style={{ marginTop: 12 }}>
                  <div className="f-label">Quick tag · optional</div>
                  <input
                    type="text"
                    maxLength={140}
                    placeholder="how it went — one line (journaling stays on paper)"
                    value={noteDraft}
                    onChange={(e) => {
                      noteTouched.current = true;
                      setNoteDraft(e.target.value);
                    }}
                  />
                  <div className="save-row">
                    <button className="btn-primary" type="button" onClick={() => void saveNote()}>
                      Save note
                    </button>
                    <span className="save-status font-mono">{savedAt ? `SAVED ${savedAt}` : ""}</span>
                  </div>
                </Panel>
              </>
            )}

            {!loading && tab === "progress" && (
              <>
                <div className="panel-head">
                  <h2>Progress</h2>
                  <div className="ph-sub">Last 14 days</div>
                </div>

                <div className="stat-grid">
                  <Panel>
                    <div className="s-label">Streak</div>
                    <div className="s-value">{streak}</div>
                    <div className="s-sub">full ritual days</div>
                  </Panel>
                  <Panel>
                    <div className="s-label">Wake → ready</div>
                    <div className="s-value">{avgReady ?? "—"}</div>
                    <div className="s-sub">avg min, last 7d</div>
                  </Panel>
                  <Panel>
                    <div className="s-label">Skips</div>
                    <div className="s-value">{skips14}</div>
                    <div className="s-sub">steps skipped, 14d</div>
                  </Panel>
                  <Panel>
                    <div className="s-label">Neem cycle</div>
                    <div className="s-value">{cycleDay !== null && cycleDay >= 1 ? cycleDay : "—"}</div>
                    <div className="s-sub">day of {cycle?.length_days ?? 90}</div>
                  </Panel>
                </div>

                <div className="charts-grid">
                  <Panel title="Wake to ready" className="chart-card">
                    <LineChart
                      days={d14}
                      values={d14.map(readyMinutes)}
                      target={TARGET_MIN}
                      format={(v) => `${Math.round(v)}m`}
                    />
                    <div className="legend-row">
                      <span className="legend-item">
                        <span className="legend-swatch" style={{ background: "var(--jv-cyan)" }} />
                        Minutes
                      </span>
                      <span className="legend-item">
                        <span className="legend-dash" />
                        {TARGET_MIN}-min target
                      </span>
                    </div>
                  </Panel>

                  <Panel title="Wake time" className="chart-card">
                    <LineChart
                      days={d14}
                      color="var(--jv-cyan-bright)"
                      values={d14.map((ds) => {
                        const t = ts(atOf(ds, "wake"));
                        if (t === null) return null;
                        const d = new Date(t);
                        return d.getHours() * 60 + d.getMinutes();
                      })}
                      format={(v) => {
                        const m = Math.round(v);
                        return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
                      }}
                    />
                    <div className="legend-row">
                      <span className="legend-item">
                        <span className="legend-swatch" style={{ background: "var(--jv-cyan-bright)" }} />
                        Clock time woken
                      </span>
                    </div>
                  </Panel>
                </div>

                <Panel title="Step completion" style={{ marginTop: 12 }}>
                  <StepGrid
                    days={d14}
                    rows={catalog.filter((s) => s.kind === "ritual")}
                    statusAt={(d, k) => statusOf(d, k)}
                    detailAt={(d, k) => {
                      const r = recOf(d, k);
                      if (!r || r.status === "pending") return "not logged";
                      if (r.status === "done") return r.happened_at ? `done ${fmtClock(r.happened_at)}` : "done · time missing";
                      return r.reason ? `skipped — ${r.reason}` : "skipped";
                    }}
                  />
                  <div className="legend-row">
                    <span className="legend-item">
                      <span className="legend-swatch" style={{ background: "var(--jv-gold)" }} />
                      Done
                    </span>
                    <span className="legend-item">
                      <span className="legend-swatch" style={{ background: "rgba(255,184,77,0.14)", border: "1px solid var(--jv-gold)" }} />
                      Skipped
                    </span>
                    <span className="legend-item">
                      <span className="legend-swatch" style={{ background: "rgba(23,42,74,0.3)", border: "1px solid var(--jv-cyan-deep)" }} />
                      Not logged
                    </span>
                  </div>
                </Panel>
              </>
            )}

            {!loading && tab === "history" && (
              <>
                <div className="panel-head">
                  <h2>{parseDayStr(dayStr).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
                  <div className="ph-sub">{loggedDays.length ? `${loggedDays.length} days logged` : "Nothing logged yet"}</div>
                </div>

                <Panel className="cal-card">
                  <MiniCalendar month={parseDayStr(dayStr)} today={dayStr} levelFor={levelFor} />
                  <div className="cal-legend">
                    <span>None</span>
                    <i style={{ background: "rgba(23,42,74,0.3)", border: "1px solid var(--jv-cyan-deep)" }} />
                    <i style={{ background: "rgba(34,211,238,0.14)" }} />
                    <i style={{ background: "rgba(34,211,238,0.32)" }} />
                    <i style={{ background: "var(--jv-gold)" }} />
                    <span>Full</span>
                  </div>
                </Panel>

                <Panel title="Recent days" style={{ marginTop: 12 }}>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Wake</th>
                          <th className="num">Ready in</th>
                          <th className="num">Done</th>
                          <th className="num">Skipped</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loggedDays.length ? (
                          loggedDays.map((ds) => {
                            const dd = dueFor(ds);
                            const dn = dd.filter((s) => statusOf(ds, s.step_key) === "done").length;
                            const sk = countableFor(ds).filter((s) => statusOf(ds, s.step_key) === "skipped").length;
                            const rm = readyMinutes(ds);
                            return (
                              <tr key={ds}>
                                <td>{fmtDayHuman(parseDayStr(ds))}</td>
                                <td>{atOf(ds, "wake") ? fmtClock(atOf(ds, "wake")) : "—"}</td>
                                <td className="num">{rm !== null ? `${rm} min` : "—"}</td>
                                <td className="num">{dd.length ? `${dn}/${dd.length}` : "—"}</td>
                                <td className="num">{sk || "—"}</td>
                                <td>{days[ds]?.note ?? ""}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="chart-empty">
                              No days logged yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </>
            )}
          </main>
        </div>

        <nav className="tabbar" aria-label="Sections">
          {(["today", "progress", "history"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button
            className="tab-plus"
            type="button"
            title="Tick next step"
            aria-label="Tick next step"
            onClick={() => {
              setTab("today");
              const next = visibleSteps.find((s) => statusOf(dayStr, s.step_key) === "pending");
              if (next) toggleDone(dayStr, next.step_key);
            }}
          >
            +
          </button>
        </nav>
      </div>
    </HudFrame>
  );
}
