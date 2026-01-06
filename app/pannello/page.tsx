// app/pannello/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type BookingStatus = "NUOVA" | "CONFERMATA" | "ANNULLATA" | string;

type AdminRow = {
  id: string;
  rowNumber?: number;
  timestamp?: string;

  nome?: string;
  telefono?: string;
  servizio?: string;

  dataISO?: string; // yyyy-mm-dd
  ora?: string; // HH:mm

  note?: string;
  stato?: BookingStatus;
  canale?: string;
};

type MeResponse =
  | { ok: true; loggedIn?: boolean; isLoggedIn?: boolean; authenticated?: boolean }
  | { ok: false; error?: string; details?: any };

type ListResponse =
  | { ok: true; rows: AdminRow[]; count?: number }
  | { ok: false; error?: string; details?: any };

type UpdateResponse =
  | { ok: true; status?: string; message?: string }
  | { ok: false; error?: string; conflict?: boolean; details?: any };

type AvailabilityOk = { ok: true; freeSlots: string[] };
type AvailabilityErr = { ok: false; error?: string; details?: any };
type AvailabilityResponse = AvailabilityOk | AvailabilityErr;

function normStatus(s?: string): BookingStatus {
  const up = (s || "").toUpperCase().trim();
  if (up === "CONFERMATA" || up === "ANNULLATA" || up === "NUOVA") return up;
  return up || "NUOVA";
}

function safeTel(t?: string) {
  return String(t || "").replace(/[^\d]/g, "");
}

function toITDate(iso?: string) {
  const s = String(iso || "").trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s || "—";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "Risposta non valida dal server.", details: text };
  }
}

function toastStyle(type: "ok" | "err"): CSSProperties {
  return {
    pointerEvents: "none",
    padding: "10px 12px",
    borderRadius: 14,
    border: type === "ok" ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(239,68,68,0.35)",
    background: type === "ok" ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    boxShadow: "0 18px 55px rgba(0,0,0,0.45)",
    maxWidth: 860,
    width: "100%",
    textAlign: "center",
    backdropFilter: "blur(10px)",
  };
}

function waLink(phone: string, text: string) {
  const p = safeTel(phone);
  const msg = encodeURIComponent(text);
  return `https://wa.me/${p}?text=${msg}`;
}

function buildConfirmMsg(r: AdminRow) {
  const nome = (r.nome || "").trim();
  const data = toITDate(r.dataISO);
  const ora = r.ora || "—";
  const serv = (r.servizio || "appuntamento").toString();
  return `Ciao${nome ? " " + nome : ""}! ✅ Il tuo appuntamento è CONFERMATO per ${data} alle ${ora} (${serv}). A presto!`;
}

function buildCancelMsg(r: AdminRow) {
  const nome = (r.nome || "").trim();
  const data = toITDate(r.dataISO);
  const ora = r.ora || "—";
  const serv = (r.servizio || "appuntamento").toString();
  return `Ciao${nome ? " " + nome : ""}. ❌ Il tuo appuntamento è ANNULLATO (${serv}) del ${data} alle ${ora}. Se vuoi riprenotare, scrivimi qui.`;
}

/** Badge nome “wow” (barbiere) */
function nameBadgeStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(239,68,68,0.82))",
    color: "white",
    fontWeight: 1000,
    letterSpacing: 0.2,
    boxShadow: "0 14px 30px rgba(0,0,0,0.30)",
  };
}

function statusPillStyle(st: BookingStatus): CSSProperties {
  const s = normStatus(st);
  if (s === "CONFERMATA") {
    return {
      background: "rgba(34,197,94,0.14)",
      border: "1px solid rgba(34,197,94,0.35)",
      color: "rgba(255,255,255,0.92)",
    };
  }
  if (s === "ANNULLATA") {
    return {
      background: "rgba(239,68,68,0.14)",
      border: "1px solid rgba(239,68,68,0.35)",
      color: "rgba(255,255,255,0.92)",
    };
  }
  return {
    background: "rgba(245,158,11,0.14)",
    border: "1px solid rgba(245,158,11,0.35)",
    color: "rgba(255,255,255,0.92)",
  };
}

/** Striscia “barber pole” laterale sulle card */
function accentForIndex(i: number) {
  const isBlue = i % 2 === 0;
  const bar: CSSProperties = {
    position: "absolute",
    inset: "0 auto 0 0",
    width: 10,
    background: isBlue
      ? "linear-gradient(180deg, rgba(37,99,235,0.85), rgba(37,99,235,0.18))"
      : "linear-gradient(180deg, rgba(239,68,68,0.85), rgba(239,68,68,0.18))",
  };
  const borderGlow: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: isBlue ? "0 14px 40px rgba(37,99,235,0.10)" : "0 14px 40px rgba(239,68,68,0.08)",
  };
  return { bar, borderGlow };
}

/** ✅ Notifiche: beep + voce (solo se attivi) */
function playBeepSafe() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.12;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    window.setTimeout(() => {
      try {
        o.stop();
        ctx.close?.();
      } catch {}
    }, 140);
  } catch {}
}

function speakIt(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT";
    u.rate = 0.9; // ✅ più lento
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.cancel(); // evita sovrapposizioni
    window.speechSynthesis.speak(u);
  } catch {}
}

function buildVoiceText(newOnes: AdminRow[]) {
  if (newOnes.length === 1) {
    const r = newOnes[0];
    const nome = (r.nome || "cliente").toString().trim();
    const data = toITDate(r.dataISO);
    const ora = r.ora || "";
    return `Nuova prenotazione: ${nome}, ${data} alle ${ora}.`;
  }
  return `Arrivate ${newOnes.length} nuove prenotazioni.`;
}

export default function PannelloAdmin() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [dayMode, setDayMode] = useState<"TUTTO" | "OGGI" | "DOMANI" | "7" | "DATA">("TUTTO");
  const [pickDate, setPickDate] = useState<string>(todayISO());

  const [statusFilter, setStatusFilter] = useState<"TUTTE" | "NUOVA" | "CONFERMATA" | "ANNULLATA">("TUTTE");

  // ✅ Disponibilità (orari liberi per una data)
  const [availDate, setAvailDate] = useState<string>(todayISO());
  const [availLoading, setAvailLoading] = useState(false);
  const [availSlots, setAvailSlots] = useState<string[]>([]);
  const [availMsg, setAvailMsg] = useState<string>("");

  // ✅ Suono/Voce
  const [soundOn, setSoundOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstRowsLoadDoneRef = useRef(false);

  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2400);
  };

  // ✅ carica/salva preferenze suono/voce
  useEffect(() => {
    try {
      const s = window.localStorage.getItem("mm_admin_sound");
      const v = window.localStorage.getItem("mm_admin_voice");
      if (s !== null) setSoundOn(s === "1");
      if (v !== null) setVoiceOn(v === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("mm_admin_sound", soundOn ? "1" : "0");
      window.localStorage.setItem("mm_admin_voice", voiceOn ? "1" : "0");
    } catch {}
  }, [soundOn, voiceOn]);

  const counts = useMemo(() => {
    const c = { NUOVA: 0, CONFERMATA: 0, ANNULLATA: 0 };
    rows.forEach((r) => {
      const s = normStatus(r.stato);
      if (s === "NUOVA") c.NUOVA++;
      if (s === "CONFERMATA") c.CONFERMATA++;
      if (s === "ANNULLATA") c.ANNULLATA++;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const t = todayISO();
    let fromISO: string | null = null;
    let toISO: string | null = null;

    if (dayMode === "OGGI") {
      fromISO = t;
      toISO = t;
    } else if (dayMode === "DOMANI") {
      fromISO = addDaysISO(t, 1);
      toISO = fromISO;
    } else if (dayMode === "7") {
      fromISO = t;
      toISO = addDaysISO(t, 7);
    } else if (dayMode === "DATA") {
      fromISO = pickDate;
      toISO = pickDate;
    }

    return rows
      .filter((r) => {
        if (!fromISO || !toISO) return true;
        const d = String(r.dataISO || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return true;
        return d >= fromISO && d <= toISO;
      })
      .filter((r) => {
        if (statusFilter === "TUTTE") return true;
        return normStatus(r.stato) === statusFilter;
      })
      .sort((a, b) => {
        const da = String(a.dataISO || "");
        const db = String(b.dataISO || "");
        if (da !== db) return da.localeCompare(db);
        const ta = String(a.ora || "");
        const tb = String(b.ora || "");
        return ta.localeCompare(tb);
      });
  }, [rows, dayMode, pickDate, statusFilter]);

  const checkMe = async () => {
    setChecking(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/me", { credentials: "include" });
      const data: MeResponse = await safeJson(res);
      const ok = (data as any)?.ok === true;
      const li = Boolean((data as any)?.loggedIn ?? (data as any)?.isLoggedIn ?? (data as any)?.authenticated);
      setLoggedIn(ok && li);
    } catch {
      setLoggedIn(false);
    } finally {
      setChecking(false);
    }
  };

  const maybeNotifyNewRows = (normalized: AdminRow[]) => {
    // prima load: non notificare
    if (!firstRowsLoadDoneRef.current) {
      firstRowsLoadDoneRef.current = true;
      seenIdsRef.current = new Set(normalized.map((x) => x.id));
      return;
    }

    const seen = seenIdsRef.current;
    const newOnes = normalized.filter((x) => !seen.has(x.id));

    // aggiorna set
    normalized.forEach((x) => seen.add(x.id));

    if (newOnes.length === 0) return;

    // solo se pagina visibile (evita spam quando tab in background)
    if (document.hidden) return;

    if (soundOn) playBeepSafe();
    if (voiceOn) speakIt(buildVoiceText(newOnes));
  };

  const loadRows = async () => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const res = await fetch("/api/admin/bookings?limit=800", { credentials: "include" });
      const data: ListResponse = await safeJson(res);

      if (!(data as any)?.ok) {
        setRowsError((data as any)?.error || "Errore nel caricamento prenotazioni.");
        setRows([]);
        return;
      }

      const list = Array.isArray((data as any).rows) ? (data as any).rows : [];
      const normalized: AdminRow[] = list
        .map((r: any) => ({
          id: String(r?.id ?? ""),
          rowNumber: r?.rowNumber,
          timestamp: r?.timestamp,
          nome: r?.nome ?? r?.name,
          telefono: r?.telefono ?? r?.phone,
          servizio: r?.servizio ?? r?.service,
          dataISO: r?.dataISO ?? r?.dateISO ?? r?.date,
          ora: r?.ora ?? r?.time,
          note: r?.note ?? r?.notes,
          stato: normStatus(r?.stato ?? r?.status),
          canale: r?.canale ?? r?.channel,
        }))
        .filter((x: AdminRow) => x.id);

      setRows(normalized);
      maybeNotifyNewRows(normalized);
    } catch {
      setRowsError("Errore rete nel caricamento prenotazioni.");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  };

  const loadAvailability = async (isoDate: string) => {
    setAvailLoading(true);
    setAvailMsg("");
    setAvailSlots([]);

    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: isoDate }),
      });

      const data: AvailabilityResponse = await safeJson(res);

      if (!(data as any)?.ok) {
        setAvailMsg((data as any)?.error || "Errore nel recupero disponibilità.");
        return;
      }

      const free = Array.isArray((data as any)?.freeSlots) ? (data as any).freeSlots : [];
      setAvailSlots(free);

      if (free.length === 0) setAvailMsg("Nessun orario libero per questa data.");
    } catch {
      setAvailMsg("Errore di rete (disponibilità).");
    } finally {
      setAvailLoading(false);
    }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const pw = password.trim();
    if (!pw) {
      setAuthError("Inserisci la password.");
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      const data = await safeJson(res);
      if (!(data as any)?.ok) {
        setAuthError((data as any)?.error || "Password errata.");
        return;
      }

      setPassword("");
      setLoggedIn(true);
      showToast("ok", "Accesso effettuato.");

      // ✅ prima load dopo login: NON notificare
      firstRowsLoadDoneRef.current = false;
      seenIdsRef.current = new Set();

      await loadRows();
      await loadAvailability(availDate);
    } catch {
      setAuthError("Errore rete durante il login.");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } catch {}
    setLoggedIn(false);
    setRows([]);
    setAvailSlots([]);
    setAvailMsg("");
    showToast("ok", "Logout effettuato.");
  };

  const setStatus = async (id: string, status: BookingStatus) => {
    const next = normStatus(status);

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stato: next } : r)));

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });

      const data: UpdateResponse = await safeJson(res);
      if (!(data as any)?.ok) {
        showToast("err", (data as any)?.error || "Aggiornamento stato fallito.");
        await loadRows();
        return;
      }

      showToast("ok", `Stato aggiornato: ${next}`);
      await loadRows();
      await loadAvailability(availDate);
    } catch {
      showToast("err", "Errore rete: stato non aggiornato.");
      await loadRows();
    }
  };

  function openWhatsApp(phone: string, message: string) {
    const p = safeTel(phone);
    if (!p) {
      showToast("err", "Telefono mancante: non posso aprire WhatsApp.");
      return;
    }
    window.open(waLink(p, message), "_blank", "noopener,noreferrer");
  }

  const confirmWhatsApp = (r: AdminRow) => {
    openWhatsApp(r.telefono || "", buildConfirmMsg(r));
    void setStatus(r.id, "CONFERMATA");
  };

  const cancelWhatsApp = (r: AdminRow) => {
    openWhatsApp(r.telefono || "", buildCancelMsg(r));
    void setStatus(r.id, "ANNULLATA");
  };

  useEffect(() => {
    checkMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loggedIn) {
      // ✅ prima load quando già loggato: NON notificare
      firstRowsLoadDoneRef.current = false;
      seenIdsRef.current = new Set();

      void loadRows();
      void loadAvailability(availDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // ✅ AUTO-AGGIORNAMENTO ogni 60 secondi (solo quando sei loggato)
  useEffect(() => {
    if (!loggedIn) return;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      void loadRows();
    }, 60_000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // ✅ Se cambi data disponibilità, aggiorna subito
  useEffect(() => {
    if (!loggedIn) return;
    void loadAvailability(availDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availDate, loggedIn]);

  // =======================
  //  STILE “BARBIERE WOW”
  // =======================
  const styles: Record<string, CSSProperties> = {
    page: {
      minHeight: "100vh",
      padding: "18px 12px 36px",
      background:
        "radial-gradient(1100px 640px at 12% 0%, rgba(37,99,235,0.16), transparent 60%)," +
        "radial-gradient(1100px 640px at 88% 10%, rgba(239,68,68,0.16), transparent 60%)," +
        "radial-gradient(1000px 620px at 50% 100%, rgba(245,158,11,0.12), transparent 62%)," +
        "linear-gradient(180deg, #070b12 0%, #0b1220 55%, #070b12 100%)",
      color: "rgba(255,255,255,0.92)",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    },
    container: { maxWidth: 1120, margin: "0 auto" },

    header: {
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "linear-gradient(135deg, rgba(10,14,24,0.92), rgba(10,14,24,0.72))",
      boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
      overflow: "hidden",
      position: "relative",
    },
    headerStripe: {
      position: "absolute",
      inset: "0 0 auto 0",
      height: 6,
      background:
        "linear-gradient(90deg, rgba(37,99,235,0.95), rgba(255,255,255,0.85), rgba(239,68,68,0.95), rgba(245,158,11,0.85))",
      opacity: 0.85,
    },
    headerInner: { padding: "16px 16px 14px", position: "relative" },

    topRow: {
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
      justifyContent: "space-between",
      flexWrap: "wrap",
    },

    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      fontSize: 12,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      fontWeight: 950,
      color: "rgba(255,255,255,0.92)",
    },

    titleRow: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
    h1: {
      margin: "8px 0 2px",
      fontSize: 30,
      fontWeight: 1100,
      letterSpacing: -0.6,
      color: "rgba(255,255,255,0.96)",
    },
    scissors: {
      fontSize: 22,
      opacity: 0.95,
      transform: "translateY(-1px)",
      filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.30))",
    },
    sub: { margin: 0, opacity: 0.82, fontSize: 14, lineHeight: 1.35 },

    chipsRow: { marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
    chip: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 11px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      fontWeight: 950,
      fontSize: 13,
      color: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)",
    },
    chipBtn: {
      cursor: "pointer",
      userSelect: "none",
    },

    btnRow: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
    btn: {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.92)",
      padding: "10px 12px",
      borderRadius: 14,
      cursor: "pointer",
      fontWeight: 950,
      backdropFilter: "blur(8px)",
    },
    btnPrimary: {
      border: "1px solid rgba(245,158,11,0.35)",
      background: "linear-gradient(90deg, rgba(239,68,68,0.95), rgba(245,158,11,0.85))",
      color: "rgba(10,14,24,0.98)",
      padding: "10px 12px",
      borderRadius: 14,
      cursor: "pointer",
      fontWeight: 1100,
      boxShadow: "0 16px 40px rgba(239,68,68,0.18)",
    },
    btnDanger: {
      border: "1px solid rgba(239,68,68,0.35)",
      background: "rgba(239,68,68,0.10)",
      color: "rgba(255,255,255,0.92)",
      padding: "10px 12px",
      borderRadius: 14,
      cursor: "pointer",
      fontWeight: 1100,
    },

    panel: {
      marginTop: 12,
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(10,14,24,0.72)",
      boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
      overflow: "hidden",
      backdropFilter: "blur(10px)",
    },
    panelHeader: {
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      borderBottom: "1px solid rgba(255,255,255,0.10)",
      background:
        "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(37,99,235,0.10), rgba(239,68,68,0.08))",
      flexWrap: "wrap",
      color: "rgba(255,255,255,0.92)",
    },
    panelTitle: { fontWeight: 1100, letterSpacing: 0.2 },
    body: { padding: 14 },

    loginBox: {
      maxWidth: 520,
      margin: "10px auto 0",
      padding: 14,
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(10px)",
    },
    label: { fontWeight: 1000, opacity: 0.92, display: "block", marginBottom: 8 },
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.92)",
      outline: "none",
      fontSize: 16, // evita zoom iOS
      fontWeight: 900,
    },
    helperSmall: { marginTop: 8, opacity: 0.8, fontSize: 12, lineHeight: 1.3 },
    error: {
      marginTop: 10,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(239,68,68,0.35)",
      background: "rgba(239,68,68,0.12)",
      color: "rgba(255,255,255,0.92)",
      fontWeight: 950,
      fontSize: 13,
    },
    ok: {
      marginTop: 10,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(34,197,94,0.30)",
      background: "rgba(34,197,94,0.12)",
      color: "rgba(255,255,255,0.92)",
      fontWeight: 950,
      fontSize: 13,
    },

    tools: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 12,
    },

    pillRow: { display: "flex", gap: 8, flexWrap: "wrap" },
    pill: {
      padding: "9px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      cursor: "pointer",
      fontWeight: 1000,
      fontSize: 12,
      userSelect: "none",
      color: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)",
    },
    pillActive: {
      background:
        "linear-gradient(90deg, rgba(37,99,235,0.18), rgba(239,68,68,0.14), rgba(245,158,11,0.14))",
      border: "1px solid rgba(255,255,255,0.18)",
    },

    // ✅ box disponibilità
    availBox: {
      width: "100%",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      padding: 12,
      boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
    },
    availTopRow: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
    },
    availTitle: { fontWeight: 1100, letterSpacing: 0.2, display: "inline-flex", gap: 8, alignItems: "center" },
    slotsWrap: { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" },
    slotChip: {
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      fontWeight: 1000,
      fontSize: 12,
      color: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)",
    },

    list: { display: "grid", gap: 12 },

    card: {
      borderRadius: 18,
      background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.06))",
      padding: 12,
      position: "relative",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "0 18px 50px rgba(0,0,0,0.30)",
      backdropFilter: "blur(10px)",
    },

    cardTop: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 10,
      paddingLeft: 12,
    },
    rightStatus: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      borderRadius: 999,
      fontWeight: 1000,
      fontSize: 12,
    },

    grid: {
      display: "grid",
      gap: 10,
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      paddingLeft: 12,
    },
    box: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.06)",
      padding: "10px 10px",
    },
    boxLabel: { fontSize: 11, fontWeight: 1000, opacity: 0.75, letterSpacing: 0.6 },
    boxValue: { marginTop: 4, fontSize: 15, fontWeight: 1100, color: "rgba(255,255,255,0.92)" },

    actions: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 10,
      paddingLeft: 12,
      alignItems: "center",
    },
    miniBtn: {
      padding: "9px 10px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.92)",
      cursor: "pointer",
      fontWeight: 1000,
      fontSize: 12,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      textDecoration: "none",
      backdropFilter: "blur(8px)",
    },
    miniGreen: { border: "1px solid rgba(34,197,94,0.30)", background: "rgba(34,197,94,0.12)" },
    miniRed: { border: "1px solid rgba(239,68,68,0.30)", background: "rgba(239,68,68,0.12)" },
    miniBlue: { border: "1px solid rgba(37,99,235,0.28)", background: "rgba(37,99,235,0.10)" },

    footer: { marginTop: 14, opacity: 0.7, fontSize: 12, textAlign: "center" },

    toastWrap: {
      position: "fixed",
      top: 16,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: 60,
      padding: "0 10px",
    },
  };

  const soundChipStyle = (on: boolean): CSSProperties => ({
    ...styles.chip,
    ...styles.chipBtn,
    border: on ? "1px solid rgba(34,197,94,0.30)" : "1px solid rgba(255,255,255,0.12)",
    background: on ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.06)",
    opacity: on ? 1 : 0.75,
  });

  const voiceChipStyle = (on: boolean): CSSProperties => ({
    ...styles.chip,
    ...styles.chipBtn,
    border: on ? "1px solid rgba(37,99,235,0.28)" : "1px solid rgba(255,255,255,0.12)",
    background: on ? "rgba(37,99,235,0.10)" : "rgba(255,255,255,0.06)",
    opacity: on ? 1 : 0.75,
  });

  return (
    <div style={styles.page}>
      {toast && (
        <div style={styles.toastWrap}>
          <div style={toastStyle(toast.type)}>{toast.msg}</div>
        </div>
      )}

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerStripe} />
          <div style={styles.headerInner}>
            <div style={styles.topRow}>
              <div>
                <div style={styles.badge}>GALAXBOT AI • BARBER SHOP</div>

                <div style={styles.titleRow}>
                  <span style={styles.scissors} aria-hidden>
                    ✂️
                  </span>
                  <h1 style={styles.h1}>Prenotazioni · Idee per la Testa</h1>
                </div>

                <p style={styles.sub}>Pannello prenotazioni</p>

                {loggedIn && (
                  <div style={styles.chipsRow}>
                    <div style={styles.chip}>🟡 Nuove: {counts.NUOVA}</div>
                    <div style={styles.chip}>✅ Confermate: {counts.CONFERMATA}</div>
                    <div style={styles.chip}>❌ Annullate: {counts.ANNULLATA}</div>

                    {/* ✅ SOLO AGGIUNTA: SUONO / VOCE */}
                    <div
                      style={soundChipStyle(soundOn)}
                      onClick={() => {
                        // (tap = user gesture) utile per sbloccare audio su alcuni browser
                        if (!soundOn) {
                          try {
                            playBeepSafe();
                          } catch {}
                        }
                        setSoundOn((v) => !v);
                      }}
                      role="button"
                      aria-label="Toggle suono"
                      title="Suono notifica nuove prenotazioni"
                    >
                      🔔 Suono: {soundOn ? "ON" : "OFF"}
                    </div>

                    <div
                      style={voiceChipStyle(voiceOn)}
                      onClick={() => {
                        if (!voiceOn) {
                          try {
                            speakIt("Voce attivata.");
                          } catch {}
                        }
                        setVoiceOn((v) => !v);
                      }}
                      role="button"
                      aria-label="Toggle voce"
                      title="Voce notifica nuove prenotazioni"
                    >
                      🗣️ Voce: {voiceOn ? "ON" : "OFF"}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.btnRow}>
                {loggedIn ? (
                  <>
                    <button style={styles.btnPrimary} onClick={loadRows} disabled={loadingRows}>
                      {loadingRows ? "Aggiorno…" : "Aggiorna"}
                    </button>
                    <button style={styles.btnDanger} onClick={logout}>
                      Esci
                    </button>
                  </>
                ) : (
                  <span style={{ opacity: 0.8, fontSize: 12 }}>Accesso richiesto</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}>{loggedIn ? "Prenotazioni" : "Login"}</div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>
              {loggedIn ? "Conferma/Annulla → apre WhatsApp con messaggio pronto" : ""}
            </div>
          </div>

          <div style={styles.body}>
            {checking ? (
              <div style={{ opacity: 0.8 }}>Controllo sessione…</div>
            ) : !loggedIn ? (
              <div style={styles.loginBox}>
                <form onSubmit={login}>
                  <label style={styles.label}>Password</label>
                  <input
                    style={styles.input}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Inserisci password"
                    autoComplete="current-password"
                  />

                  <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                    <button type="submit" style={styles.btnPrimary}>
                      Entra
                    </button>
                  </div>

                  {authError && <div style={styles.error}>{authError}</div>}
                </form>
              </div>
            ) : (
              <>
                {/* ✅ DISPONIBILITÀ */}
                <div style={{ marginBottom: 12 }}>
                  <div style={styles.availBox}>
                    <div style={styles.availTopRow}>
                      <div style={styles.availTitle}>🕒 Disponibilità (orari liberi)</div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                          style={{ ...styles.input, width: 170 }}
                          type="date"
                          value={availDate}
                          onChange={(e) => setAvailDate(e.target.value)}
                          aria-label="Scegli data disponibilità"
                        />

                        <button style={styles.btn} onClick={() => loadAvailability(availDate)} disabled={availLoading}>
                          {availLoading ? "Carico…" : "Aggiorna disponibilità"}
                        </button>
                      </div>
                    </div>

                    {availSlots.length > 0 ? (
                      <div style={styles.slotsWrap}>
                        {availSlots.map((s) => (
                          <div key={s} style={styles.slotChip}>
                            {s}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {availMsg ? <div style={styles.helperSmall}>{availMsg}</div> : null}
                    {!availMsg && availSlots.length === 0 && !availLoading ? (
                      <div style={styles.helperSmall}>Seleziona una data per vedere gli orari disponibili.</div>
                    ) : null}
                  </div>
                </div>

                <div style={styles.tools}>
                  <div style={{ display: "grid", gap: 8, width: "100%" }}>
                    <div style={styles.pillRow}>
                      {[
                        { k: "TUTTO", label: "Tutto" },
                        { k: "OGGI", label: "Oggi" },
                        { k: "DOMANI", label: "Domani" },
                        { k: "7", label: "7 giorni" },
                        { k: "DATA", label: "Data" },
                      ].map((x) => (
                        <div
                          key={x.k}
                          style={{ ...styles.pill, ...(dayMode === (x.k as any) ? styles.pillActive : {}) }}
                          onClick={() => setDayMode(x.k as any)}
                          role="button"
                        >
                          {x.label}
                        </div>
                      ))}

                      {dayMode === "DATA" && (
                        <input
                          style={{ ...styles.input, width: 170 }}
                          type="date"
                          value={pickDate}
                          onChange={(e) => setPickDate(e.target.value)}
                          aria-label="Scegli data filtro"
                        />
                      )}
                    </div>

                    <div style={styles.pillRow}>
                      {(["TUTTE", "NUOVA", "CONFERMATA", "ANNULLATA"] as const).map((s) => (
                        <div
                          key={s}
                          style={{ ...styles.pill, ...(statusFilter === s ? styles.pillActive : {}) }}
                          onClick={() => setStatusFilter(s)}
                          role="button"
                        >
                          {s === "TUTTE" ? "Tutte" : s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {rowsError && <div style={styles.error}>{rowsError}</div>}
                {!rowsError && loadingRows && <div style={{ opacity: 0.8 }}>Carico prenotazioni…</div>}

                {!loadingRows && !rowsError && filtered.length === 0 ? (
                  <div style={styles.ok}>Nessuna prenotazione da mostrare.</div>
                ) : (
                  <div style={styles.list}>
                    {filtered.map((r, idx) => {
                      const st = normStatus(r.stato);
                      const nome = (r.nome || "Cliente").toString();
                      const tel = r.telefono || "";
                      const dateIT = toITDate(r.dataISO);
                      const ora = r.ora || "—";
                      const serv = (r.servizio || "—").toString();

                      const callHref = tel ? `tel:${safeTel(tel)}` : "#";
                      const waGeneric = tel ? waLink(tel, `Ciao ${nome}!`) : "#";

                      const accent = accentForIndex(idx);

                      return (
                        <div key={r.id} style={{ ...styles.card, ...accent.borderGlow }}>
                          <div style={accent.bar} />

                          <div style={styles.cardTop}>
                            <span style={nameBadgeStyle()}>{nome}</span>
                            <div style={{ ...styles.rightStatus, ...statusPillStyle(st) }}>{st}</div>
                          </div>

                          <div className="mm-grid" style={styles.grid}>
                            <div style={styles.box}>
                              <div style={styles.boxLabel}>TELEFONO</div>
                              <div style={styles.boxValue}>{tel || "—"}</div>
                            </div>

                            <div style={styles.box}>
                              <div style={styles.boxLabel}>SERVIZIO</div>
                              <div style={styles.boxValue}>{serv}</div>
                            </div>

                            <div style={styles.box}>
                              <div style={styles.boxLabel}>DATA</div>
                              <div style={styles.boxValue}>{dateIT}</div>
                            </div>

                            <div style={styles.box}>
                              <div style={styles.boxLabel}>ORA</div>
                              <div style={styles.boxValue}>{ora}</div>
                            </div>
                          </div>

                          {r.note ? (
                            <div style={{ ...styles.box, marginTop: 10, marginLeft: 12 }}>
                              <div style={styles.boxLabel}>NOTE</div>
                              <div style={{ ...styles.boxValue, fontWeight: 900, whiteSpace: "pre-wrap" }}>{r.note}</div>
                            </div>
                          ) : null}

                          <div style={styles.actions}>
                            <a
                              style={{
                                ...styles.miniBtn,
                                ...styles.miniBlue,
                                opacity: tel ? 1 : 0.5,
                                pointerEvents: tel ? "auto" : "none",
                              }}
                              href={callHref}
                              title="Chiama"
                            >
                              📞 Chiama
                            </a>

                            <a
                              style={{
                                ...styles.miniBtn,
                                ...styles.miniBlue,
                                opacity: tel ? 1 : 0.5,
                                pointerEvents: tel ? "auto" : "none",
                              }}
                              href={waGeneric}
                              target="_blank"
                              rel="noreferrer"
                              title="Apri WhatsApp"
                            >
                              💬 WhatsApp
                            </a>

                            <button style={{ ...styles.miniBtn, ...styles.miniGreen }} onClick={() => confirmWhatsApp(r)}>
                              ✅ Conferma (WhatsApp)
                            </button>

                            <button style={{ ...styles.miniBtn, ...styles.miniRed }} onClick={() => cancelWhatsApp(r)}>
                              ❌ Annulla (WhatsApp)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={styles.footer}>GalaxBot AI • Pannello prenotazioni</div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .mm-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}