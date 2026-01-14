import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(body: any, init?: { status?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

function badRequest(message: string) {
  return jsonNoStore({ ok: false, error: message }, { status: 400 });
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
    body: JSON.stringify({
      action: "get_availability",
      secret,
      date,
    }),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Apps Script non ha restituito JSON. Prima riga: " + text.slice(0, 160));
  }

  return json;
}

function normalizeFreeSlots(payload: any): string[] {
  const free =
    payload?.freeSlots ??
    payload?.slots ??
    payload?.availableSlots ??
    payload?.data?.freeSlots ??
    payload?.data?.slots;

  return Array.isArray(free) ? free.map(String) : [];
}

async function handle(req: Request) {
  let date = "";

  if (req.method === "GET") {
    const { searchParams } = new URL(req.url);
    date = (searchParams.get("date") || "").trim();
  } else {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return badRequest("Body non valido");
    }
    date = String(body?.date || "").trim();
  }

  if (!date) return badRequest("date mancante");
  if (!isIsoDate(date)) return badRequest("date non valida (usa YYYY-MM-DD)");

  try {
    const data = await callGoogleScript(date);

    // ✅ Se Apps Script dice ok:false, NON trasformare tutto in 502.
    // Propaga lo status (se lo script lo manda come _status).
    if (data?.ok === false) {
      const status =
        typeof data?._status === "number"
          ? data._status
          : /chiuse/i.test(String(data?.error || "")) // fallback: se contiene "chiuse"
          ? 403
          : 502;

      const { _status, ...rest } = data || {};
      return jsonNoStore(
        { ok: false, error: rest?.error || "Errore Apps Script" },
        { status }
      );
    }

    const freeSlots = normalizeFreeSlots(data);
    return jsonNoStore({ ok: true, freeSlots }, { status: 200 });
  } catch (e: any) {
    return jsonNoStore({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}