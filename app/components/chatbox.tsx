"use client";

import React, { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

  const scrollToBottom = (smooth: boolean) => {
    const el = listRef.current;
    if (!el) return;
    const top = el.scrollHeight;

    // ✅ su iOS "smooth" mentre la tastiera è su può fare saltelli:
    // lo usiamo solo quando risponde l’assistente
    try {
      el.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    } catch {
      el.scrollTop = top;
    }
  };

  // ✅ al mount: porta giù SOLO la lista (non la pagina)
  useEffect(() => {
    // micro-delay per layout stabile
    window.setTimeout(() => {
      scrollToBottom(false);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ quando arrivano messaggi: resta in fondo (smooth SOLO se ultimo è assistant)
  useEffect(() => {
    const last = messages[messages.length - 1];
    const smooth = last?.role === "assistant";
    scrollToBottom(smooth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    const text = input.trim();
    if (!text || loading) return;

    // ✅ aggiungo subito il messaggio utente e vado in fondo (senza smooth)
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    // piccolo tick per far renderizzare il messaggio e poi scrollare interno
    window.setTimeout(() => scrollToBottom(false), 0);

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
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Errore di rete. Riprova tra poco." }]);
    } finally {
      setLoading(false);

      // ✅ ri-focus (non forzo focus aggressivo, ma aiuta su mobile)
      window.setTimeout(() => {
        try {
          inputRef.current?.focus();
        } catch {}
      }, 60);
    }
  }

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

        <form className={styles.form} onSubmit={onSubmit}>
          <input
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi qui il tuo messaggio..."
            autoComplete="off"
            inputMode="text"
            disabled={loading}
            // ✅ INVIO su iPhone: blocca comportamento che può far “saltare” la pagina
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit(e as any);
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