"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
        setNotice(
          "Account created. If this project has email confirmation on, check your inbox, then sign in."
        );
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
    <div className="login-wrap">
      <div className="card login-card">
        <h1>Morning Ritual</h1>
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
      </div>
    </div>
  );
}
