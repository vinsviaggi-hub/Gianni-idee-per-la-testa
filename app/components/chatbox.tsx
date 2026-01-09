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

  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  // ✅ scroll giù quando arrivano messaggi nuovi
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Errore di rete. Riprova tra poco." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.badge}>💬 Chat assistente virtuale</div>
        <div className={styles.sub}>
          Fai una domanda su servizi, orari o disponibilità. Per fissare un appuntamento usa sempre il
          box prenotazione sotto la chat.
        </div>
      </div>

      {/* ✅ box a colonna: LISTA scrollabile + FORM fisso sotto */}
      <div className={styles.box} aria-live="polite">
        <div className={styles.list} ref={listRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`${styles.msg} ${m.role === "user" ? styles.user : styles.assistant}`}
            >
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
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi qui il tuo messaggio..."
            autoComplete="off"
            inputMode="text"
            disabled={loading}
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