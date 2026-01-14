"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ChatBox from "./components/chatbox";
import FastBookingForm from "./components/FastBookingForm";
import CancelBookingForm from "./components/CancelBookingForm";
import { getBusinessConfig } from "./config/business";

type SettingsResponse =
  | { ok: true; bookings_open?: boolean; bookingsOpen?: boolean; value?: any; key?: string }
  | { ok: false; error?: string; details?: any };

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "Risposta non valida dal server.", details: text };
  }
}

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "on" || s === "si";
}

export default function HomePage() {
  const biz = useMemo(() => {
    try {
      return getBusinessConfig() as any;
    } catch {
      return {} as any;
    }
  }, []);

  // ✅ piccola ottimizzazione tablet: blur più leggero
  const lowPower = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return /iPad|Android/i.test(ua);
  }, []);

  // ✅ mobile detection (serve per overlay chat su iPhone)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    try {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    } catch {
      mq.addListener(sync);
      return () => mq.removeListener(sync);
    }
  }, []);

  // Fallback (se config manca qualcosa)
  const brandTop = biz?.labelTop ?? "GALAXBOT AI · BARBER SHOP";
  const title = biz?.title ?? "Idee per la Testa";

  const services = biz?.servicesShort ?? "Taglio, barba, sfumature, styling, bimbi";
  const city = biz?.city ?? "Castelnuovo Vomano (TE)";
  const phone = biz?.phone ?? "333 123 4567";

  const openHoursTitle = biz?.hoursTitle ?? "Orari di apertura";
  const openHoursLines: string[] =
    biz?.hoursLines ?? ["Lunedì–Sabato: 8:30–12:30 e 15:00–20:00", "Domenica: chiuso"];

  const [showHelp, setShowHelp] = useState(false);

  const refBook = useRef<HTMLDivElement>(null!);
  const refCancel = useRef<HTMLDivElement>(null!);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ✅ iPhone: quando chat aperta su mobile blocco scroll sotto
  useEffect(() => {
    if (!isMobile) return;
    if (!showHelp) return;

    const scrollY = window.scrollY;

    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevLeft = document.body.style.left;
    const prevRight = document.body.style.right;
    const prevWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.left = prevLeft;
      document.body.style.right = prevRight;
      document.body.style.width = prevWidth;

      window.scrollTo(0, scrollY);
    };
  }, [showHelp, isMobile]);

  // ✅ PRENOTAZIONI APERTE/CHIUSE (stato pubblico)
  const [bookingsOpen, setBookingsOpen] = useState<boolean | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadSettings = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setSettingsLoading(true);
    try {
      // ✅ esplicito: chiediamo proprio bookings_open
      const res = await fetch("/api/settings?key=bookings_open", { cache: "no-store" });
      const data: SettingsResponse = await safeJson(res);

      if (!(data as any)?.ok) {
        setBookingsOpen(null);
        return;
      }

      // ✅ accetta tutti i formati possibili
      const v =
        (data as any).bookings_open ??
        (data as any).bookingsOpen ??
        (data as any).value;

      if (typeof v === "undefined") {
        setBookingsOpen(null);
        return;
      }

      setBookingsOpen(toBool(v));
    } catch {
      setBookingsOpen(null);
    } finally {
      if (!opts?.silent) setSettingsLoading(false);
      else setSettingsLoading(false); // tienilo semplice: fine sempre
    }
  };

  useEffect(() => {
    void loadSettings({ silent: true });

    const id = window.setInterval(() => void loadSettings({ silent: true }), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const bookingsLabel = bookingsOpen === null ? "—" : bookingsOpen ? "APERTE" : "CHIUSE";

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(900px 600px at 18% 10%, rgba(120,170,255,0.35), transparent 55%), radial-gradient(900px 600px at 80% 20%, rgba(255,90,90,0.28), transparent 55%), linear-gradient(180deg, #061a3a 0%, #062a6a 55%, #041534 100%)",
      color: "rgba(255,255,255,0.92)",
      padding: "clamp(18px, 3.2vw, 26px) clamp(12px, 2.4vw, 14px) 40px",
    },
    shell: { maxWidth: 980, margin: "0 auto" },
    topPill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "7px 12px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.14)",
      backdropFilter: lowPower ? undefined : "blur(10px)",
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      justifyContent: "center",
      width: "100%",
      textAlign: "center",
    },

    statusPill: {
      marginTop: 10,
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      borderRadius: 999,
      fontWeight: 950,
      fontSize: 12,
      letterSpacing: 0.7,
      textTransform: "uppercase",
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.10)",
      backdropFilter: lowPower ? undefined : "blur(10px)",
    },

    hero: { marginTop: 12, padding: "14px 2px 10px", textAlign: "center" },

    h1: {
      fontSize: "clamp(32px, 6vw, 44px)",
      lineHeight: 1.05,
      margin: "8px 0 10px",
      fontWeight: 900,
      textAlign: "center",
      wordBreak: "break-word",
      textShadow: "0 2px 10px rgba(0,0,0,0.22)",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      textRendering: "geometricPrecision",
    },

    actionsRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 14,
      justifyContent: "center",
    },
    btn: {
      cursor: "pointer",
      padding: "11px 14px",
      borderRadius: 12,
      fontWeight: 800,
      fontSize: 14,
      color: "rgba(255,255,255,0.95)",
      background: "rgba(255,255,255,0.14)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderLeft: "1px solid rgba(255,255,255,0.10)",
      transition: "transform .08s ease, filter .08s ease",
      minHeight: 44,
      flex: "1 1 140px",
      maxWidth: 260,
    },
    btnPrimary: {
      background: "linear-gradient(90deg, #ff4b4b 0%, #ff7a3d 55%, #ffcc5c 120%)",
      color: "#07142a",
    },
    btnBlue: {
      background: "linear-gradient(90deg, #2f7dff 0%, #49c6ff 120%)",
      color: "#061a3a",
    },
    btnDisabled: {
      opacity: 0.55,
      filter: "grayscale(0.3)",
      cursor: "not-allowed",
      pointerEvents: "none",
    },

    smallHint: { marginTop: 12, fontSize: 13, opacity: 0.85, textAlign: "center", lineHeight: 1.4 },
    grid: {
      marginTop: 18,
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 16,
    },
    card: {
      borderRadius: 18,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow: lowPower ? "0 10px 28px rgba(0,0,0,0.22)" : "0 18px 55px rgba(0,0,0,0.28)",
      overflow: "hidden",
    },
    cardInner: { padding: "clamp(14px, 2.3vw, 16px) clamp(14px, 2.3vw, 16px) 14px" },
    cardTitle: {
      fontSize: 18,
      fontWeight: 800,
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    cardSub: { marginTop: 6, fontSize: 13, opacity: 0.86, lineHeight: 1.45 },
    list: { marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.6 },
    divider: { height: 1, background: "rgba(255,255,255,0.10)" },
    helpTop: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
    },
    helpBtn: {
      cursor: "pointer",
      padding: "11px 14px",
      borderRadius: 12,
      fontWeight: 900,
      fontSize: 14,
      border: "0",
      background: showHelp
        ? "rgba(255,255,255,0.14)"
        : "linear-gradient(90deg, #2f7dff 0%, #49c6ff 120%)",
      color: showHelp ? "rgba(255,255,255,0.95)" : "#061a3a",
      minHeight: 44,
    },
    footer: {
      marginTop: 18,
      textAlign: "center",
      opacity: 0.75,
      fontSize: 12,
      padding: "10px 0 2px",
    },

    closedBox: {
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.18)",
      background: "linear-gradient(180deg, rgba(255,75,75,0.18), rgba(255,255,255,0.08))",
      padding: 14,
      color: "rgba(255,255,255,0.92)",
    },
    closedTitle: { fontWeight: 950, fontSize: 16, margin: 0 },
    closedSub: { marginTop: 6, opacity: 0.9, lineHeight: 1.4, fontSize: 13 },
    reloadLink: {
      marginTop: 10,
      display: "inline-flex",
      gap: 8,
      alignItems: "center",
      cursor: "pointer",
      fontWeight: 950,
      textDecoration: "underline",
      opacity: 0.95,
    },
  };

  const bookingDisabled = bookingsOpen === false;

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topPill}>
          <span>{brandTop}</span>
        </div>

        <header style={styles.hero}>
          <h1 style={styles.h1}>
            {title} <span aria-hidden>💈</span>
          </h1>

          <div
            style={{
              ...styles.statusPill,
              border:
                bookingsOpen === null
                  ? "1px solid rgba(255,255,255,0.16)"
                  : bookingsOpen
                  ? "1px solid rgba(34,197,94,0.35)"
                  : "1px solid rgba(255,75,75,0.35)",
              background:
                bookingsOpen === null
                  ? "rgba(255,255,255,0.10)"
                  : bookingsOpen
                  ? "rgba(34,197,94,0.16)"
                  : "rgba(255,75,75,0.16)",
            }}
            title="Stato prenotazioni"
          >
            {settingsLoading ? "⏳" : bookingsOpen ? "✅" : bookingsOpen === false ? "⛔️" : "ℹ️"} Prenotazioni:{" "}
            {bookingsLabel}
          </div>

          <div style={styles.actionsRow}>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary, ...(bookingDisabled ? styles.btnDisabled : {}) }}
              onClick={() => scrollTo(refBook)}
              title={bookingDisabled ? "Prenotazioni chiuse" : "Vai alla prenotazione"}
            >
              Prenota ora
            </button>

            <button style={{ ...styles.btn, ...styles.btnBlue }} onClick={() => scrollTo(refCancel)}>
              Annulla
            </button>

            <button style={styles.btn} onClick={() => setShowHelp(true)}>
              Assistenza
            </button>
          </div>

          <div style={styles.smallHint}>
            Prenoti in pochi secondi: scegli data + ora disponibile. Se ti serve, annulli con gli stessi dati.
          </div>
        </header>

        <section style={styles.grid} className="mm-home-grid">
          <div style={styles.card} className="mm-card mm-info">
            <div style={styles.cardInner}>
              <h2 style={styles.cardTitle}>Informazioni principali</h2>
              <ul style={styles.list}>
                <li>
                  <b>Servizi:</b> {services}
                </li>
                <li>
                  <b>Dove:</b> {city}
                </li>
                <li>
                  <b>Telefono:</b>{" "}
                  <a
                    href={`tel:${String(phone).replace(/\s/g, "")}`}
                    style={{ color: "rgba(255,255,255,0.95)", textDecoration: "underline" }}
                  >
                    {phone}
                  </a>
                </li>
              </ul>
            </div>
            <div style={styles.divider} />
            <div style={styles.cardInner}>
              <h3 style={{ ...styles.cardTitle, fontSize: 16, marginTop: 0 }}>{openHoursTitle}</h3>
              <ul style={styles.list}>
                {openHoursLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={styles.card} className="mm-card mm-help">
            <div style={{ ...styles.cardInner, paddingBottom: 10 }}>
              <div style={styles.helpTop}>
                <div>
                  <h2 style={styles.cardTitle}>
                    Assistenza <span aria-hidden>💬</span>
                  </h2>
                  <div style={styles.cardSub}>
                    Domande su servizi, orari o info generali. Per prenotare usa sempre il box “Prenota adesso”.
                  </div>
                </div>

                <button style={styles.helpBtn} onClick={() => setShowHelp(true)}>
                  Apri chat
                </button>
              </div>
            </div>

            {!isMobile && showHelp ? (
              <>
                <div style={styles.divider} />
                <div style={styles.cardInner}>
                  <ChatBox />
                  <div style={{ marginTop: 10 }}>
                    <button style={styles.helpBtn as any} onClick={() => setShowHelp(false)}>
                      Chiudi
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ ...styles.cardInner, paddingTop: 0 }}>
                <div style={{ ...styles.cardSub, marginTop: 0 }}>
                  Premi <b>“Apri chat”</b> se ti serve aiuto.
                </div>
              </div>
            )}
          </div>

          <div ref={refBook} style={styles.card} className="mm-card mm-span2">
            <div style={styles.cardInner}>
              {bookingsOpen === false ? (
                <div style={styles.closedBox}>
                  <p style={styles.closedTitle}>⛔️ Prenotazioni momentaneamente chiuse</p>
                  <div style={styles.closedSub}>In questo momento non è possibile prenotare</div>

                  <div
                    style={styles.reloadLink}
                    onClick={() => void loadSettings()}
                    role="button"
                    title="Ricarica stato prenotazioni"
                  >
                    🔄 Ricarica stato
                  </div>
                </div>
              ) : (
                <FastBookingForm />
              )}
            </div>
          </div>

          <div ref={refCancel} style={styles.card} className="mm-card mm-span2">
            <div style={styles.cardInner}>
              <CancelBookingForm />
            </div>
          </div>
        </section>

        <footer style={styles.footer}>Powered by GalaxBot AI</footer>
      </div>

      {isMobile && showHelp ? (
        <div className="mm-helpModal" role="dialog" aria-modal="true">
          <div className="mm-helpSheet">
            <div className="mm-helpTopbar">
              <div className="mm-helpTitle">Assistenza 💬</div>
              <button className="mm-helpClose" onClick={() => setShowHelp(false)}>
                Chiudi
              </button>
            </div>

            <div className="mm-helpBody">
              <ChatBox />
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea { max-width: 100%; }
        input[type="date"], select { width: 100%; }
        .mm-row, .mm-grid, .mm-col { min-width: 0; }

        @media (min-width: 900px) {
          .mm-home-grid {
            grid-template-columns: 1fr 1fr !important;
            align-items: start;
          }
          .mm-span2 {
            grid-column: 1 / -1;
          }
        }

        .mm-helpModal{
          position: fixed;
          inset: 0;
          z-index: 9999;
          padding: 14px 12px calc(14px + env(safe-area-inset-bottom));
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overscroll-behavior: contain;
        }

        .mm-helpSheet{
          width: 100%;
          max-width: 980px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(6, 18, 42, 0.92);
          box-shadow: 0 18px 60px rgba(0,0,0,0.45);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: calc(100dvh - 28px - env(safe-area-inset-bottom));
        }

        .mm-helpTopbar{
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(90deg, rgba(47,125,255,0.20), rgba(255,75,75,0.14));
          flex: 0 0 auto;
        }

        .mm-helpTitle{
          font-weight: 950;
          color: rgba(255,255,255,0.92);
        }

        .mm-helpClose{
          cursor: pointer;
          border: 0;
          padding: 10px 12px;
          border-radius: 12px;
          font-weight: 950;
          background: rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.92);
        }

        .mm-helpBody{
          padding: 14px;
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </main>
  );
}