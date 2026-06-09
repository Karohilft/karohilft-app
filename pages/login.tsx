// pages/login.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function waitForSessionToken(timeoutMs = 2000, intervalMs = 200) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) return token;
      } catch {
        // ignore
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }

    const nextRaw = (router.query.next as string) || "/admin";
    let target: string;
    try {
      target = decodeURIComponent(nextRaw);
    } catch {
      target = nextRaw;
    }

    try {
      const isAbsolute = /^https?:\/\//i.test(target);
      if (isAbsolute) {
        await new Promise((r) => setTimeout(r, 250));
        window.location.href = target;
        return;
      }
    } catch {
      // ignore
    }

    if (!target.startsWith("/")) target = "/" + target;

    const token = await waitForSessionToken(2000, 200);
    if (token) {
      router.replace(target);
      setBusy(false);
      return;
    }

    try {
      window.location.href = target;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--kh-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 8px 32px rgba(160,96,74,.12)", padding: "36px 28px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <img src="/karohilft-logo.png" alt="Karohilft" style={{ width: 160, margin: "0 auto 8px" }} />
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: "var(--kh-heading)", textAlign: "center", margin: "0 0 24px" }}>
            Willkommen
          </h1>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <input
              placeholder="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: "13px 16px", border: "1.5px solid var(--kh-border)", borderRadius: 14, fontSize: 16, fontFamily: "inherit", color: "var(--kh-text)", background: "#fff", margin: 0 }}
            />
            <input
              placeholder="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: "13px 16px", border: "1.5px solid var(--kh-border)", borderRadius: 14, fontSize: 16, fontFamily: "inherit", color: "var(--kh-text)", background: "#fff", margin: 0 }}
            />
            {err && (
              <div style={{ color: "#C0392B", fontWeight: 600, fontSize: 14, textAlign: "center" }}>{err}</div>
            )}
            <button
              type="submit"
              disabled={busy}
              style={{ marginTop: 4, padding: "15px 20px", borderRadius: 100, border: "none", background: "var(--kh-primary)", color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "inherit", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, transition: "background .2s" }}
            >
              {busy ? "Einloggen…" : "Einloggen"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
