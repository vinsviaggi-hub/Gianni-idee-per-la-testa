import { NextRequest, NextResponse } from "next/server";

type OrderPayload = {
  nome?: string;
  telefono?: string;
  data?: string; // YYYY-MM-DD
  ora?: string;  // HH:mm

  box50?: number;
  box100?: number;
  box200?: number;
  totPezzi?: number;

  note?: string;

  negozio?: string;
  canale?: string; // "APP"
  honeypot?: string;
};

function isValidDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isValidTime(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

export async function POST(req: NextRequest) {
  try {
    const ORDERS_WEBAPP_URL = process.env.ORDERS_WEBAPP_URL;

    if (!ORDERS_WEBAPP_URL) {
      return NextResponse.json(
        { error: "ORDERS_WEBAPP_URL mancante (configura su .env.local e su Vercel)." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as OrderPayload | null;

    // anti-spam
    if (body?.honeypot && String(body.honeypot).trim().length > 0) {
      return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    }

    const nome = (body?.nome ?? "").toString().trim();
    const telefono = (body?.telefono ?? "").toString().trim();
    const data = (body?.data ?? "").toString().trim();
    const ora = (body?.ora ?? "").toString().trim();

    const box50 = Number(body?.box50 ?? 0) || 0;
    const box100 = Number(body?.box100 ?? 0) || 0;
    const box200 = Number(body?.box200 ?? 0) || 0;

    const totPezzi = Number(body?.totPezzi ?? (box50 * 50 + box100 * 100 + box200 * 200)) || 0;

    const note = (body?.note ?? "").toString().trim();
    const negozio = (body?.negozio ?? "Arrosticini Abruzzesi").toString().trim();
    const canale = (body?.canale ?? "APP").toString().trim().toUpperCase();

    if (!nome || !telefono || !data || !ora) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti (nome, telefono, data, ora)." },
        { status: 400 }
      );
    }
    if (!isValidDate(data)) {
      return NextResponse.json({ error: "Formato data non valido (YYYY-MM-DD)." }, { status: 400 });
    }
    if (!isValidTime(ora)) {
      return NextResponse.json({ error: "Formato ora non valido (HH:mm)." }, { status: 400 });
    }
    if (totPezzi <= 0) {
      return NextResponse.json({ error: "Seleziona almeno 1 box (50/100/200)." }, { status: 400 });
    }

    const forward = {
      ts: new Date().toISOString(),
      negozio,
      nome,
      telefono,
      data,
      ora,
      box50,
      box100,
      box200,
      totPezzi,
      note,
      stato: "NUOVO",
      canale, // APP
    };

    const res = await fetch(ORDERS_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(forward),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return NextResponse.json(
        { error: `Errore pannello: ${res.status} ${res.statusText}`, details: text },
        { status: 502 }
      );
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {}

    return NextResponse.json({
      ok: true,
      message: "Ricevuto ✅",
      response: parsed ?? text,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Errore server /api/orders", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}