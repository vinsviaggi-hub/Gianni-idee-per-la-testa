import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function env(name: string) {
  return (process.env[name] || "").trim();
}

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function callGoogleScript(date: string) {
  const url = env("GOOGLE_SCRIPT_URL");
  const secret = env("GOOGLE_SCRIPT_SECRET");

  if (!url) throw new Error("GOOGLE_SCRIPT_URL mancante in .env.local");
  if (!secret) throw new Error("GOOGLE_SCRIPT_SECRET mancante in .env.local");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Apps Script router: action + secret + date
    body: JSON.stringify({
      action: "get_availability",
      secret,
      date,
    }),
  });

  const text = await res.text();

  // Se Apps Script risponde HTML (capita quando deploy/permessi non ok), qui lo vedi subito
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      "Apps Script non ha restituito JSON. Prima riga risposta: " +
        text.slice(0, 120)
    );
  }

  return json;
}

function normalizeFreeSlots(payload: any): string[] {
  // accetta vari formati possibili
  const free =
    payload?.freeSlots ??
    payload?.slots ??
    payload?.availableSlots ??
    payload?.data?.freeSlots;

  return Array.isArray(free) ? free.map(String) : [];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = (searchParams.get("date") || "").trim();

  if (!date) return badRequest("date mancante");
  if (!isIsoDate(date)) return badRequest("date non valida (usa YYYY-MM-DD)");

  try {
    const data = await callGoogleScript(date);

    // se lo script usa { ok: false, error: ... }
    if (data?.ok === false) {
      return NextResponse.json(
        { ok: false, error: data?.error || "Errore Apps Script" },
        { status: 502 }
      );
    }

    const freeSlots = normalizeFreeSlots(data);
    return NextResponse.json({ ok: true, freeSlots }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body non valido");
  }

  const date = String(body?.date || "").trim();
  if (!date) return badRequest("date mancante");
  if (!isIsoDate(date)) return badRequest("date non valida (usa YYYY-MM-DD)");

  try {
    const data = await callGoogleScript(date);

    if (data?.ok === false) {
      return NextResponse.json(
        { ok: false, error: data?.error || "Errore Apps Script" },
        { status: 502 }
      );
    }

    const freeSlots = normalizeFreeSlots(data);
    return NextResponse.json({ ok: true, freeSlots }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}