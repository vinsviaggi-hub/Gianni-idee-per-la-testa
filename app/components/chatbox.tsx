"use client";

import React, { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Ciao! Sono l’assistente del laboratorio. Dimmi cosa ti serve: orari, ritiro/consegna, come prenotare scatole 50/100/200, info generali.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: next }),
      });

      const out = await res.json().catch(() => null);
      if (!res.ok || !out?.reply) {
        setMessages((m) => [...m, { role: "assistant", content: out?.error || "Errore. Riprova tra poco." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: out.reply }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Errore rete. Controlla connessione." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chatWrap">
      <div className="chatList" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="bubble assistant">Sto scrivendo…</div>}
      </div>

      <div className="chatBar">
        <input
          className="chatInput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi una domanda…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button className="chatSend" onClick={send} disabled={loading}>
          Invia
        </button>
      </div>
    </div>
  );
}