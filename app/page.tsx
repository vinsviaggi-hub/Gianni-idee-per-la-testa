// app/page.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import ChatBox from "./components/chatbox";
import FastBookingForm from "./components/FastBookingForm";
import CancelBookingForm from "./components/CancelBookingForm";
import { getBusinessConfig } from "./config/business";

export default function HomePage() {
  const biz = useMemo(() => {
    try {
      return getBusinessConfig() as any;
    } catch {
      return {} as any;
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

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(900px 600px at 18% 10%, rgba(120,170,255,0.35), transparent 55%), radial-gradient(900px 600px at 80% 20%, rgba(255,90,90,0.28), transparent 55%), linear-gradient(180deg, #061a3a 0%, #062a6a 55%, #041534 100%)",
      color: "rgba(255,255,255,0.92)",
      padding: "26px 14px 40px",
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
      backdropFilter: "blur(10px)",
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      justifyContent: "center",
      width: "100%",
    },
    hero: { marginTop: 12, padding: "14px 2px 10px", textAlign: "center" },
    h1: {
      fontSize: 44,
      lineHeight: 1.05,
      margin: "8px 0 10px",
      fontWeight: 800,
      textShadow: "0 12px 40px rgba(0,0,0,0.35)",
      textAlign: "center",
    },
    actionsRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14, justifyContent: "center" },
    btn: {
      cursor: "pointer",
      padding: "10px 14px",
      borderRadius: 12,
      fontWeight: 700,
      fontSize: 14,
      color: "rgba(255,255,255,0.95)",
      background: "rgba(255,255,255,0.14)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderLeft: "1px solid rgba(255,255,255,0.10)",
      transition: "transform .08s ease, filter .08s ease",
    },
    btnPrimary: {
      background: "linear-gradient(90deg, #ff4b4b 0%, #ff7a3d 55%, #ffcc5c 120%)",
      color: "#07142a",
    },
    btnBlue: {
      background: "linear-gradient(90deg, #2f7dff 0%, #49c6ff 120%)",
      color: "#061a3a",
    },
    smallHint: { marginTop: 12, fontSize: 13, opacity: 0.85, textAlign: "center" },
    grid: { marginTop: 18, display: "grid", gridTemplateColumns: "1fr", gap: 16 },
    card: {
      borderRadius: 18,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
      overflow: "hidden",
    },
    cardInner: { padding: "16px 16px 14px" },
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
    },
    helpBtn: {
      cursor: "pointer",
      padding: "10px 14px",
      borderRadius: 12,
      fontWeight: 800,
      fontSize: 14,
      border: "0",
      background: showHelp
        ? "rgba(255,255,255,0.14)"
        : "linear-gradient(90deg, #2f7dff 0%, #49c6ff 120%)",
      color: showHelp ? "rgba(255,255,255,0.95)" : "#061a3a",
    },
    footer: {
      marginTop: 18,
      textAlign: "center",
      opacity: 0.75,
      fontSize: 12,
      padding: "10px 0 2px",
    },
  };

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

          <div style={styles.actionsRow}>
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => scrollTo(refBook)}>
              Prenota ora
            </button>
            <button style={{ ...styles.btn, ...styles.btnBlue }} onClick={() => scrollTo(refCancel)}>
              Annulla
            </button>
            <button style={styles.btn} onClick={() => setShowHelp((v) => !v)}>
              {showHelp ? "Chiudi assistenza" : "Assistenza"}
            </button>
          </div>

          <div style={styles.smallHint}>
            Prenoti in pochi secondi: scegli data + ora disponibile. Se ti serve, annulli con gli stessi dati.
          </div>
        </header>

        <section style={styles.grid}>
          {/* INFO */}
          <div style={styles.card}>
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

          {/* ASSISTENZA */}
          <div style={styles.card}>
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

                <button style={styles.helpBtn} onClick={() => setShowHelp((v) => !v)}>
                  {showHelp ? "Nascondi" : "Apri chat"}
                </button>
              </div>
            </div>

            {showHelp ? (
              <>
                <div style={styles.divider} />
                <div style={styles.cardInner}>
                  <ChatBox />
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

          {/* PRENOTA */}
          <div ref={refBook} style={styles.card}>
            <div style={styles.cardInner}>
              <FastBookingForm />
            </div>
          </div>

          {/* ANNULLA */}
          <div ref={refCancel} style={styles.card}>
            <div style={styles.cardInner}>
              <CancelBookingForm />
            </div>
          </div>
        </section>

        <footer style={styles.footer}>Powered by GalaxBot AI</footer>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea { max-width: 100%; }
        input[type="date"], select { width: 100%; }
        .mm-row, .mm-grid, .mm-col { min-width: 0; }
      `}</style>
    </main>
  );
}