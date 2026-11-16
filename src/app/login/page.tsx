"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Readout } from "@/components/hud/Readout";

const JarvisScene = dynamic(() => import("@/components/three/JarvisScene"), { ssr: false });

const BOOT_LINES = ["INITIALIZING BUDDY", "LINKING SUPABASE", "SYSTEMS ONLINE"];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bootLine, setBootLine] = useState(0);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (bootLine >= BOOT_LINES.length) {
      setBooted(true);
      return;
    }
    const t = setTimeout(() => setBootLine((n) => n + 1), 480);
    return () => clearTimeout(t);
  }, [bootLine]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setNotice("Account created. If email confirmation is on, check your inbox, then sign in.");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    }
    setBusy(false);
  }

  return (
    <div className="hud-frame">
      <JarvisScene progress={booted ? 1 : bootLine / BOOT_LINES.length} state={booted ? "idle" : "thinking"} />
      <div className="hud-vignette" />
      <div className="hud-scanlines" />
      <div className="login-wrap">
        <div className="panel login-card">
          <span className="jv-bracket jv-tl" />
          <span className="jv-bracket jv-tr" />
          <span className="jv-bracket jv-bl" />
          <span className="jv-bracket jv-br" />

          <h1>Morning Ritual // Buddy</h1>

          {!booted ? (
            <div className="boot-status">
              <Readout text={BOOT_LINES[Math.min(bootLine, BOOT_LINES.length - 1)]} />
            </div>
          ) : (
            <>
              <p className="sub">{mode === "signin" ? "Sign in to log your morning." : "Create your account."}</p>

              <form onSubmit={submit}>
                <label>
                  <div className="f-label">Email</div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                <label>
                  <div className="f-label">Password</div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                </label>

                <div className="save-row">
                  <button className="btn-primary" type="submit" disabled={busy}>
                    {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setError("");
                      setNotice("");
                    }}
                  >
                    {mode === "signin" ? "Create an account" : "I already have an account"}
                  </button>
                </div>
              </form>

              {error ? <div className="login-err">{error}</div> : null}
              {notice ? <div className="login-ok">{notice}</div> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
