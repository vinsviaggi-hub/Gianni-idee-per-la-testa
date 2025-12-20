"use client";

import React, { useMemo, useState, type FormEvent } from "react";
import ChatBox from "./components/chatbox";

type OrderType = "ASPORTO" | "CONSEGNA" | "TAVOLO";
type PayType = "CONTANTI" | "CARTA" | "SATISPAY";

const BUSINESS_NAME = "Pala Pizza";
const TAGLINE = "Pizzeria & Ristorante · Ordina o prenota in pochi secondi";
const ADDRESS = "Via delle Pizze 21, 00100 Roma (RM)";
const PHONE = "+39 000 000 0000";

const OPENING_HOURS = [
  { day: "Lun", hours: "12:00–14:30 · 18:30–22:30" },
  { day: "Mar", hours: "12:00–14:30 · 18:30–22:30" },
  { day: "Mer", hours: "12:00–14:30 · 18:30–22:30" },
  { day: "Gio", hours: "12:00–14:30 · 18:30–22:30" },
  { day: "Ven", hours: "12:00–14:30 · 18:30–23:00" },
  { day: "Sab", hours: "12:00–15:00 · 18:30–23:00" },
  { day: "Dom", hours: "18:30–22:30" },
];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}
function buildSlots(startHH: number, startMM: number, endHH: number, endMM: number, stepMin = 15) {
  const out: string[] = [];
  let t = startHH * 60 + startMM;
  const end = endHH * 60 + endMM;
  while (t <= end) {
    const hh = Math.floor(t / 60);
    const mm = t % 60;
    out.push(`${pad2(hh)}:${pad2(mm)}`);
    t += stepMin;
  }
  return out;
}

export default function Page() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<OrderType>("ASPORTO");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState<PayType>("CONTANTI");
  const [address, setAddress] = useState("");
  const [people, setPeople] = useState("2");
  const [order, setOrder] = useState("");
  const [note, setNote] = useState("");

  const [glutenFree, setGlutenFree] = useState(false);
  const [lactoseFree, setLactoseFree] = useState(false);
  const [nutsAllergy, setNutsAllergy] = useState(false);
  const [otherAllergy, setOtherAllergy] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  const timeOptions = useMemo(() => {
    const lunch = buildSlots(12, 0, 14, 30, 15);
    const dinner = buildSlots(18, 30, 22, 30, 15);
    return ["— Pranzo —", ...lunch, "— Cena —", ...dinner];
  }, []);

  const needsAddress = type === "CONSEGNA";
  const needsPeople = type === "TAVOLO";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setStatus("loading");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanOrder = order.trim();

    if (!cleanName || !cleanPhone) return setStatus("err"), setMsg("Inserisci nome e telefono.");
    if (!date) return setStatus("err"), setMsg("Seleziona una data.");
    if (!time || time.startsWith("—")) return setStatus("err"), setMsg("Seleziona un orario.");
    if (needsAddress && !address.trim()) return setStatus("err"), setMsg("Per la consegna serve l’indirizzo.");
    if (needsPeople && (!people || Number(people) < 1)) return setStatus("err"), setMsg("Inserisci quante persone (min 1).");
    if (!cleanOrder && type !== "TAVOLO") return setStatus("err"), setMsg("Scrivi l’ordine (per tavolo puoi lasciare vuoto).");

    const allergies = [
      glutenFree ? "Senza glutine" : null,
      lactoseFree ? "Senza lattosio" : null,
      nutsAllergy ? "Allergia frutta secca" : null,
      otherAllergy.trim() ? `Altro: ${otherAllergy.trim()}` : null,
    ].filter(Boolean);

    const payload = {
      name: cleanName,
      phone: cleanPhone,
      type,
      date,
      time,
      payment,
      address: needsAddress ? address.trim() : "",
      people: needsPeople ? String(people) : "",
      order: cleanOrder,
      note: note.trim(),
      allergies,
      source: "web",
      business: BUSINESS_NAME,
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Errore invio");

      setStatus("ok");
      setMsg("Richiesta inviata ✅ Ti ricontattiamo a breve.");

      setOrder("");
      setNote("");
      setAddress("");
      setOtherAllergy("");
      setGlutenFree(false);
      setLactoseFree(false);
      setNutsAllergy(false);
    } catch {
      setStatus("err");
      setMsg("Errore invio. Se succede ancora, dimmi cosa esce in Vercel.");
    }
  }

  return (
    <div className="appShell">
      <div className="wrap">
        {/* HERO */}
        <header className="hero">
          <div className="heroLeft">
            <div className="brandPill">🍕 {BUSINESS_NAME}</div>
            <h1 className="heroTitle">{BUSINESS_NAME}</h1>
            <p className="heroSub">{TAGLINE}</p>

            <div className="heroInfo">
              <div className="infoChip">📍 {ADDRESS}</div>
              <a className="infoChip" href={`tel:${PHONE.replace(/\s/g, "")}`}>☎️ {PHONE}</a>

              <details className="infoChip infoDetails">
                <summary className="infoSummary">🕒 Orari di apertura</summary>
                <div className="infoPanel">
                  {OPENING_HOURS.map((x) => (
                    <div key={x.day} className="infoRow">
                      <b>{x.day}</b> <span>{x.hours}</span>
                    </div>
                  ))}
                  <div className="infoNote">* Festivi possono variare.</div>
                </div>
              </details>
            </div>
          </div>

          <div className="heroRight">
            <a className="cta ctaGreen" href={`tel:${PHONE.replace(/\s/g, "")}`}>📞 Chiama ora</a>
            <a
              className="cta"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${BUSINESS_NAME} ${ADDRESS}`)}`}
            >
              🧭 Indicazioni
            </a>
          </div>

          <div className="heroBar" />
        </header>

        {/* MAIN GRID */}
        <main className="mainGrid">
          {/* ORDER */}
          <section className="card orderCard">
            <div className="cardInner">
              <div className="sectionHead">
                <h2 className="sectionTitle">Ordina / Prenota</h2>
                <p className="sectionSub">
                  Consegna → indirizzo. Tavolo → persone. Compilazione veloce.
                </p>
              </div>

              <form onSubmit={onSubmit} className="formStack">
                <div className="formGrid">
                  <div className="field">
                    <div className="label">Nome</div>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Marco" />
                  </div>

                  <div className="field">
                    <div className="label">Telefono</div>
                    <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Es. 333 000 0000" inputMode="tel" />
                  </div>

                  <div className="field">
                    <div className="label">Tipo</div>
                    <select className="select" value={type} onChange={(e) => setType(e.target.value as OrderType)}>
                      <option value="ASPORTO">Asporto</option>
                      <option value="CONSEGNA">Consegna</option>
                      <option value="TAVOLO">Prenota tavolo</option>
                    </select>
                  </div>

                  <div className="field">
                    <div className="label">Pagamento (opzionale)</div>
                    <select className="select" value={payment} onChange={(e) => setPayment(e.target.value as PayType)}>
                      <option value="CONTANTI">Contanti</option>
                      <option value="CARTA">Carta</option>
                      <option value="SATISPAY">Satispay</option>
                    </select>
                  </div>

                  <div className="field">
                    <div className="label">Data</div>
                    <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>

                  <div className="field">
                    <div className="label">Orario (a tendina)</div>
                    <select className="select" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date}>
                      <option value="">{date ? "Seleziona un orario" : "Scegli prima la data"}</option>
                      {timeOptions.map((t) =>
                        t.startsWith("—") ? (
                          <option key={t} value={t} disabled>{t}</option>
                        ) : (
                          <option key={t} value={t}>{t}</option>
                        )
                      )}
                    </select>
                    <div className="hint">Se non trovi l’orario, scrivilo nelle note.</div>
                  </div>
                </div>

                {needsAddress && (
                  <div className="field">
                    <div className="label">Indirizzo consegna</div>
                    <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Via, numero civico, interno, citofono..." />
                  </div>
                )}

                {needsPeople && (
                  <div className="field">
                    <div className="label">Persone</div>
                    <select className="select" value={people} onChange={(e) => setPeople(e.target.value)}>
                      {["1","2","3","4","5","6","7","8","9","10"].map((n) => <option key={n} value={n}>{n}</option>)}
                      <option value="11">11+</option>
                    </select>
                  </div>
                )}

                <div className="checkRow">
                  <label className="check"><input type="checkbox" checked={glutenFree} onChange={(e) => setGlutenFree(e.target.checked)} />Senza glutine</label>
                  <label className="check"><input type="checkbox" checked={lactoseFree} onChange={(e) => setLactoseFree(e.target.checked)} />Senza lattosio</label>
                  <label className="check"><input type="checkbox" checked={nutsAllergy} onChange={(e) => setNutsAllergy(e.target.checked)} />Allergia frutta secca</label>
                </div>

                <div className="field">
                  <div className="label">Allergie / richieste extra (opzionale)</div>
                  <input className="input" value={otherAllergy} onChange={(e) => setOtherAllergy(e.target.value)} placeholder="Es. allergia crostacei, no cipolla, cottura ben cotta…" />
                </div>

                <div className="field">
                  <div className="label">Ordine</div>
                  <textarea className="textarea" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="Es. 2 Margherite + 1 Diavola + 1 coca (allergie?)" />
                </div>

                <div className="field">
                  <div className="label">Note (opzionale)</div>
                  <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. citofono, interno, impasto integrale, ecc." />
                </div>

                <div className="actions">
                  <button className="btnPrimary" disabled={status === "loading"}>
                    {status === "loading" ? "Invio..." : "Invia richiesta"}
                  </button>
                  <div className={`status ${status}`}>{msg || " "}</div>
                </div>
              </form>
            </div>
          </section>

          {/* CHAT */}
          <section className="card chatCard">
            <div className="cardInner">
              <div className="sectionHead">
                <h2 className="sectionTitle">Assistente</h2>
                <p className="sectionSub">Domande su menu, allergeni, senza glutine, tempi consegna.</p>
              </div>
              <ChatBox />
            </div>
          </section>
        </main>

        <footer className="footer">
          <b>{BUSINESS_NAME}</b> · {ADDRESS} · {PHONE}
        </footer>
      </div>
    </div>
  );
}