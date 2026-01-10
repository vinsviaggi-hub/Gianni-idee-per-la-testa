"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./chatbox.module.css";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Ciao! 💈 Sono l’assistente del barber shop.\n\nPuoi chiedermi info su servizi, orari e disponibilità.\n\n⚠️ Per prenotare usa sempre il box “Prenotazione veloce” sotto la chat.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ scroll SOLO dentro la chat
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const scrollToBottom = (smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    const top = el.scrollHeight;

    // ⚠️ iOS + tastiera: "smooth" può fare saltelli → default auto
    const behavior: ScrollBehavior = smooth ? "smooth" : "auto";

    try {
      el.scrollTo({ top, behavior });
    } catch {
      el.scrollTop = top;
    }
  };

  const focusInputNoScroll = () => {
    try {
      // preventScroll non è supportato ovunque, ma quando c’è evita il “salto pagina”
      (inputRef.current as any)?.focus?.({ preventScroll: true });
    } catch {
      try {
        inputRef.current?.focus();
      } catch {}
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    // ✅ dopo render del messaggio utente, scroll solo lista
    requestAnimationFrame(() => scrollToBottom(false));

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ message: text }),
      });

      const data = await r.json().catch(() => null);
      const answer =
        (data && (data.reply || data.message || data.text)) ||
        (r.ok ? "Ok." : "Errore: risposta non valida.");

      setMessages((prev) => [...prev, { role: "assistant", content: String(answer) }]);

      // ✅ quando risponde l’assistente, possiamo fare smooth (se vuoi: io lo lascio OFF su iOS)
      requestAnimationFrame(() => scrollToBottom(false));
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Errore di rete. Riprova tra poco." }]);
      requestAnimationFrame(() => scrollToBottom(false));
    } finally {
      setLoading(false);

      // ✅ ri-focalizza SENZA scrollare la pagina
      window.setTimeout(() => focusInputNoScroll(), 60);
    }
  };

  // ✅ al mount: porta giù SOLO la lista (non la pagina)
  useEffect(() => {
    const t = window.setTimeout(() => scrollToBottom(false), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ quando cambiano messaggi/loading: resta in fondo (sempre auto per evitare “salti”)
  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.badge}>💬 Chat assistente virtuale</div>
        <div className={styles.sub}>
          Fai una domanda su servizi, orari o disponibilità. Per fissare un appuntamento usa sempre il box prenotazione
          sotto la chat.
        </div>
      </div>

      <div className={styles.box} aria-live="polite">
        <div className={styles.list} ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.user : styles.assistant}`}>
              <div className={styles.bubble}>
                {m.content.split("\n").map((line, idx) => (
                  <p key={idx} className={styles.line}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className={`${styles.msg} ${styles.assistant}`}>
              <div className={styles.bubble}>
                <p className={styles.line}>Sto scrivendo…</p>
              </div>
            </div>
          )}
        </div>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
        >
          <input
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi qui il tuo messaggio..."
            autoComplete="off"
            inputMode="text"
            disabled={loading}
            onFocus={() => {
              // ✅ quando si apre la tastiera, tieni la chat in fondo (solo lista)
              window.setTimeout(() => scrollToBottom(false), 120);
            }}
            onKeyDown={(e) => {
              // ✅ Invio: non far “saltare” la pagina, invia noi
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />

          <button className={styles.button} type="submit" disabled={!canSend}>
            {loading ? "..." : "Invia"}
          </button>
        </form>
      </div>
    </section>
  );
}