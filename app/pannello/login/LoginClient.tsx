"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Cambia qui i testi (solo label)
  const BRAND_TOP = "GALAXBOT AI • BARBIERE";
  const SHOP_NAME = "Idee per la Testa";
  const SUBTITLE = "Pannello prenotazioni";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const p = password.trim();
    if (!p) {
      setMsg("Inserisci la password.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include", // ✅ cookie sessione
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: p }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || data?.ok === false || data?.error) {
        setMsg(data?.error || "Login fallito.");
        return;
      }

      router.push("/pannello");
      router.refresh();
    } catch {
      setMsg("Errore rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.brandTop}>{BRAND_TOP}</div>

          <div className={styles.brandRow}>
            <div className={styles.logoPole} aria-hidden />
            <div className={styles.brandText}>
              <div className={styles.brand}>{SHOP_NAME}</div>
              <div className={styles.sub}>{SUBTITLE}</div>
            </div>
          </div>

          <h1 className={styles.title}>Accesso</h1>

          <form onSubmit={onSubmit} className={styles.form} autoComplete="off">
            {/* honey pot */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              tabIndex={-1}
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            <label className={styles.label} htmlFor="adminPassword">
              Password
            </label>

            <input
              id="adminPassword"
              name="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />

            {msg ? <div className={styles.error}>{msg}</div> : null}

            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Accesso..." : "Entra nel pannello"}
            </button>
          </form>

          <div className={styles.footer}>GalaxBot AI</div>
        </div>
      </div>
    </div>
  );
}