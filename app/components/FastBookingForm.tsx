"use client";

import React, { useEffect, useMemo, useState } from "react";

type AvailabilityOk = { ok: true; freeSlots: string[] };
type AvailabilityErr = { ok: false; error: string };
type AvailabilityResponse = AvailabilityOk | AvailabilityErr;

type CreateOk = { ok: true; message?: string };
type CreateErr = { ok: false; error: string; conflict?: boolean };
type CreateResponse = CreateOk | CreateErr;

const SERVICES = ["Taglio uomo", "Barba", "Taglio + barba", "Sfumatura", "Bimbo", "Styling"];

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prettyDate(iso: string) {
  // iso: YYYY-MM-DD -> DD/MM/YYYY
  if (!iso || iso.length !== 10) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function FastBookingForm() {
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState(SERVICES[0]);
  const [dateISO, setDateISO] = useState(todayISO);
  const [time, setTime] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsMsg, setSlotsMsg] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string>("");
  const [resultType, setResultType] = useState<"ok" | "warn" | "err" | "">("");

  async function loadAvailability(nextDateISO: string) {
    setLoadingSlots(true);
    setSlots([]);
    setTime("");
    setSlotsMsg("");

    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: nextDateISO }),
      });

      const data = (await res.json().catch(() => null)) as AvailabilityResponse | null;

      if (!data || typeof data !== "object" || !("ok" in data)) {
        setSlotsMsg("Risposta non valida dal server (availability).");
        setLoadingSlots(false);
        return;
      }

      if (!data.ok) {
        setSlotsMsg(data.error || "Errore nel recupero disponibilità.");
        setLoadingSlots(false);
        return;
      }

      const free = Array.isArray(data.freeSlots) ? data.freeSlots : [];
      setSlots(free);

      if (free.length === 0) {
        setSlotsMsg("Nessun orario disponibile per questa data.");
      } else {
        setSlotsMsg("");
        setTime(free[0]); // seleziona il primo automaticamente
      }
    } catch {
      setSlotsMsg("Errore di rete (availability).");
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    loadAvailability(dateISO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultMsg("");
    setResultType("");

    const n = name.trim();
    const p = phone.trim();

    if (!n || !p || !service || !dateISO || !time) {
      setResultType("warn");
      setResultMsg("Compila tutti i campi obbligatori (nome, telefono, servizio, data, ora).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_booking",
          name: n,
          phone: p,
          service,
          date: dateISO,
          time,
          // ✅ NOTE RIMOSSE (non mandiamo nulla)
        }),
      });

      const data = (await res.json().catch(() => null)) as CreateResponse | null;

      if (!data || typeof data !== "object" || !("ok" in data)) {
        setResultType("err");
        setResultMsg("Risposta non valida dal server (booking).");
        return;
      }

      if (!data.ok) {
        setResultType(data.conflict ? "warn" : "err");
        setResultMsg(data.error || "Errore durante la prenotazione.");
        if (data.conflict) {
          await loadAvailability(dateISO);
        }
        return;
      }

      setResultType("ok");
      setResultMsg("✅ Prenotazione inviata! Ti aspettiamo in barberia.");

      // reset leggero (lascia data/servizio)
      setName("");
      setPhone("");

      // ricarica disponibilità: lo slot appena preso deve sparire
      await loadAvailability(dateISO);
    } catch {
      setResultType("err");
      setResultMsg("Errore di rete (booking).");
    } finally {
      setSubmitting(false);
    }
  }

  const styles: Record<string, React.CSSProperties> = {
    card: {
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "linear-gradient(180deg, rgba(11,28,68,0.72), rgba(11,28,68,0.45))",
      padding: 16,
      boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      overflow: "hidden",
    },
    title: { fontSize: 22, fontWeight: 900, margin: 0, color: "rgba(255,255,255,0.92)" },
    subtitle: { marginTop: 4, marginBottom: 14, color: "rgba(255,255,255,0.75)" },
    grid: { display: "grid", gap: 12 },
    label: { fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.86)" },
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(0,0,0,0.20)",
      color: "rgba(255,255,255,0.92)",
      outline: "none",
      fontSize: 16, // evita zoom iOS
      boxSizing: "border-box",
      maxWidth: "100%",
    },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    row1: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
    btn: {
      width: "100%",
      border: "0",
      borderRadius: 16,
      padding: "14px 14px",
      fontWeight: 900,
      cursor: "pointer",
      color: "rgba(255,255,255,0.95)",
      background: "linear-gradient(90deg, #3aa0ff, #ff3b3b)",
      boxShadow: "0 14px 30px rgba(0,0,0,0.28)",
    },
    msgOk: {
      marginTop: 10,
      padding: "10px 12px",
      borderRadius: 12,
      background: "rgba(0, 200, 120, 0.16)",
      border: "1px solid rgba(255,255,255,0.16)",
      color: "rgba(255,255,255,0.92)",
      fontSize: 13,
      fontWeight: 700,
    },
    msgWarn: {
      marginTop: 10,
      padding: "10px 12px",
      borderRadius: 12,
      background: "rgba(255, 190, 0, 0.16)",
      border: "1px solid rgba(255,255,255,0.16)",
      color: "rgba(255,255,255,0.92)",
      fontSize: 13,
      fontWeight: 700,
    },
    msgErr: {
      marginTop: 10,
      padding: "10px 12px",
      borderRadius: 12,
      background: "rgba(255, 59, 59, 0.16)",
      border: "1px solid rgba(255,255,255,0.16)",
      color: "rgba(255,255,255,0.92)",
      fontSize: 13,
      fontWeight: 700,
    },
    helper: { marginTop: 6, color: "rgba(255,255,255,0.70)", fontSize: 12 },
  };

  return (
    <section style={styles.card}>
      <h2 style={styles.title}>Prenota adesso ✅</h2>
      <div style={styles.subtitle}>
        Scegli una data: ti mostriamo solo gli orari disponibili. Se trovi pieno, cambia data.
      </div>

      <form onSubmit={onSubmit} style={styles.grid}>
        <div>
          <div style={styles.label}>Nome *</div>
          <input
            style={styles.input}
            placeholder="Es. Marco"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <div style={styles.label}>Telefono *</div>
          <input
            style={styles.input}
            placeholder="Es. 333 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>

        <div style={styles.row2}>
          <div>
            <div style={styles.label}>Servizio *</div>
            <select style={styles.input} value={service} onChange={(e) => setService(e.target.value)}>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={styles.label}>Data *</div>
            <input
              style={styles.input}
              type="date"
              value={dateISO}
              onChange={(e) => {
                const v = e.target.value;
                setDateISO(v);
                loadAvailability(v);
              }}
              min={todayISO}
            />
            <div style={styles.helper}>Selezionata: {prettyDate(dateISO)}</div>
          </div>
        </div>

        {/* ✅ ORA in riga singola (niente Note) */}
        <div style={styles.row1}>
          <div>
            <div style={styles.label}>Ora disponibile *</div>
            <select
              style={styles.input}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={loadingSlots || slots.length === 0}
            >
              {loadingSlots ? (
                <option value="">Caricamento…</option>
              ) : slots.length === 0 ? (
                <option value="">{slotsMsg || "Nessun orario disponibile"}</option>
              ) : (
                slots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))
              )}
            </select>
            {slotsMsg ? <div style={styles.helper}>{slotsMsg}</div> : null}
          </div>
        </div>

        <button type="submit" style={styles.btn} disabled={submitting}>
          {submitting ? "Invio in corso…" : "Conferma prenotazione"}
        </button>

        {resultMsg ? (
          <div style={resultType === "ok" ? styles.msgOk : resultType === "warn" ? styles.msgWarn : styles.msgErr}>
            {resultMsg}
          </div>
        ) : null}
      </form>

      <style>{`
        * { box-sizing: border-box; }
        input, select { max-width: 100%; }
        @media (max-width: 760px) {
          /* se in futuro rimetti 2 colonne, su mobile torna a 1 */
          form > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}