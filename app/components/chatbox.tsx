"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; ts: number };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function clampText(s: string, max = 260) {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return { short: clean, long: "", clamped: false };
  return { short: clean.slice(0, max) + "…", long: clean, clamped: true };
}

function Bubble({ role, content }: { role: Role; content: string }) {
  const { short, long, clamped } = useMemo(() => clampText(content, 320), [content]);
  const [open, setOpen] = useState(false);
  const shown = clamped ? (open ? long : short) : content;

  return (
    <div className={`mrow ${role}`}>
      <div className={`mbubble ${role}`}>
        <div className="mtext">{shown}</div>
        {clamped && (
          <button type="button" className="mtoggle" onClick={() => setOpen((v) => !v)}>
            {open ? "Mostra meno" : "Mostra di più"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid(),
      role: "assistant",
      ts: Date.now(),
      content:
        "Ciao! Sono l’assistente di Pala Pizza 🍕\n\nDimmi cosa ti serve: menu, ingredienti/allergeni, senza glutine, tempi consegna, prenotazione tavolo.\n\n👉 Per ORDINI/PRENOTAZIONI usa il modulo a sinistra (così arriva diretto).",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const quick = useMemo(
    () => ["Menu pizze", "Senza glutine?", "Allergeni margherita", "Tempi consegna", "Bevande/dolci", "Prenotare tavolo"],
    []
  );

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;

    setErr("");
    setLoading(true);

    const userMsg: Msg = { id: uid(), role: "user", content: t, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t }),
      });

      if (!res.ok) throw new Error("Errore server");

      const data = (await res.json().catch(() => null)) as any;
      const answer =
        (data?.reply ?? data?.message ?? data?.text ?? "").toString().trim() ||
        "Ok! Dimmi pure 😊";

      setMessages((m) => [...m, { id: uid(), role: "assistant", content: answer, ts: Date.now() }]);
    } catch {
      setErr("Errore chat: riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chatShell">
      <div className="quickRow">
        {quick.map((q) => (
          <button key={q} type="button" className="qbtn" onClick={() => send(q)} disabled={loading}>
            {q}
          </button>
        ))}
      </div>

      <div className="chatScroll" ref={scrollerRef}>
        {messages.map((m) => (
          <div key={m.id} className="mwrap">
            <Bubble role={m.role} content={m.content} />
            <div className={`mtime ${m.role}`}>{formatTime(m.ts)}</div>
          </div>
        ))}

        {loading && (
          <div className="mrow assistant">
            <div className="mbubble assistant typing">
              <span className="tdots"><i></i><i></i><i></i></span>
              <span className="tlabel">Sto scrivendo…</span>
            </div>
          </div>
        )}
      </div>

      {err && <div className="chatErr">{err}</div>}

      <div className="composer">
        <textarea
          className="cinput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi qui… (Invio per inviare, Shift+Invio per andare a capo)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="csend" type="button" onClick={() => send(input)} disabled={loading || !input.trim()}>
          Invia
        </button>
      </div>
    </div>
  );
}