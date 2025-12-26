"use client";

import React, { useEffect, useMemo, useState } from "react";

type ApiOk = { ok: true; message?: string };
type ApiErr = { ok: false; error?: string; conflict?: boolean; _status?: number };

const SERVICES = [
  "Taglio uomo",
  "Barba",
  "Taglio + barba",
  "Sfumatura",
  "Styling",
  "Bimbi",
];

export default function CancelBookingForm() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState(""); // non serve allo script, ma lo teniamo per chiarezza UI
  const [service, setService] = useState(""); // idem
  const [date, setDate] = useState<string>(""); // YYYY-MM-DD
  const [time, setTime] = useState<string>(""); // HH:mm

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // default: oggi
  useEffect(() => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    setDate(iso);
  }, []);

  const canSubmit = useMemo(() => {
    return phone.trim().length >= 4 && date && time;
  }, [phone, date, time]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!canSubmit) {
      setErr("Compila telefono, data e ora.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_booking",
          phone: phone.trim(),
          // lo script vuole ISO: YYYY-MM-DD
          date,
          // lo script vuole HH:mm
          time,
          // name/service sono solo UI (non fanno danni)
          name: name.trim(),
          service: service.trim(),
        }),
      });

      const data = (await res.json()) as ApiOk | ApiErr;

      if (!data || (data as any).ok !== true) {
        // Se vedi "conflict" qui, significa che STAI ANCORA chiamando create_booking da qualche parte
        const d = data as ApiErr;

        if (d?.conflict || res.status === 409) {
          setErr(
            "Stai tentando di CREARE una prenotazione (409). L'annullo sta chiamando l’azione sbagliata: controlla che l’azione sia 'cancel_booking'."
          );
          return;
        }

        setErr(d?.error || "Errore annullo. Controlla i dati (telefono, data, ora).");
        return;
      }

      setMsg((data as ApiOk).message || "Prenotazione annullata.");
    } catch (e: any) {
      setErr(e?.message || "Errore rete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}>Annulla prenotazione</h2>
          <span style={styles.x}>✕</span>
        </div>

        <p style={styles.sub}>
          Non puoi più venire? Inserisci i dati dell’appuntamento da annullare.
          <br />
          <b>Importante:</b> usa lo <b>stesso telefono</b> usato in prenotazione e seleziona <b>data + ora identiche</b>.
        </p>

        {msg ? <div style={{ ...styles.alert, ...styles.alertOk }}>{msg}</div> : null}
        {err ? <div style={{ ...styles.alert, ...styles.alertErr }}>{err}</div> : null}

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Telefono <span style={styles.req}>*</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Es. 3331234567"
              style={styles.input}
              inputMode="tel"
              autoComplete="tel"
            />
            <small style={styles.help}>Metti lo stesso numero usato per prenotare (anche senza spazi).</small>
          </label>

          <div style={styles.grid2}>
            <label style={styles.label}>
              Nome (facoltativo)
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Marco"
                style={styles.input}
                autoComplete="name"
              />
            </label>

            <label style={styles.label}>
              Servizio (facoltativo)
              <select value={service} onChange={(e) => setService(e.target.value)} style={styles.input}>
                <option value="">—</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={styles.grid2}>
            <label style={styles.label}>
              Data <span style={styles.req}>*</span>
              {/* type="date" => manda già YYYY-MM-DD */}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Ora prenotata <span style={styles.req}>*</span>
              {/* time => HH:mm */}
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={styles.input}
              />
            </label>
          </div>

          <button type="submit" disabled={!canSubmit || loading} style={styles.btn}>
            {loading ? "Annullamento..." : "Annulla prenotazione"}
          </button>

          <div style={styles.note}>
            Se ti dice “prenotazione non trovata”, quasi sempre è perché <b>telefono</b> o <b>data/ora</b> non coincidono
            con quelle salvate.
          </div>
        </form>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { width: "100%", display: "flex", justifyContent: "center" },
  card: {
    width: "100%",
    maxWidth: 860,
    borderRadius: 18,
    padding: 18,
    background: "rgba(10, 25, 60, 0.55)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
    color: "rgba(255,255,255,0.92)",
  },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: 0.2 },
  x: { opacity: 0.65, fontWeight: 800 },
  sub: { marginTop: 8, marginBottom: 14, opacity: 0.9, lineHeight: 1.35 },
  form: { display: "grid", gap: 12 },
  label: { display: "grid", gap: 6, fontWeight: 700 },
  req: { color: "rgba(255,90,90,0.95)" },
  input: {
    width: "100%",
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.95)",
    outline: "none",
    fontSize: 16,
  },
  help: { opacity: 0.75, fontWeight: 500 },
  grid2: { display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" },
  btn: {
    width: "100%",
    borderRadius: 14,
    padding: "14px 16px",
    border: "none",
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
    background: "linear-gradient(90deg, rgba(255,60,60,0.95), rgba(255,180,100,0.95))",
    color: "rgba(255,255,255,0.95)",
  },
  alert: {
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.18)",
    fontWeight: 700,
  },
  alertOk: { background: "rgba(0,200,120,0.14)" },
  alertErr: { background: "rgba(255,60,60,0.14)" },
  note: { opacity: 0.85, fontSize: 13, textAlign: "center", marginTop: 4 },
};