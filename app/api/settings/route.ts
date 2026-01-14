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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGoogleScriptOnce(payload: any, opts?: { timeoutMs?: number }) {
  const url = env("GOOGLE_SCRIPT_URL");
  const secret = env("GOOGLE_SCRIPT_SECRET");

  if (!url) throw new Error("GOOGLE_SCRIPT_URL mancante in .env.local");
  if (!secret) throw new Error("GOOGLE_SCRIPT_SECRET mancante in .env.local");

  const timeoutMs = opts?.timeoutMs ?? 9000;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, ...payload }),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Apps Script non ha restituito JSON. Prima riga: " + text.slice(0, 120));
    }

    // se Apps Script dice ok:false lo trattiamo come errore “logico”
    if (json?.ok === false) {
      const msg = json?.error || `Errore Apps Script (HTTP ${res.status})`;
      const err: any = new Error(msg);
      err._apps = { status: res.status, json };
      throw err;
    }

    // se HTTP non ok ma json ok:true (raro), lo lasciamo passare
    return json;
  } finally {
    clearTimeout(t);
  }
}

async function callGoogleScript(payload: any, opts?: { timeoutMs?: number; retries?: number }) {
  const retries = opts?.retries ?? 1;
  let lastErr: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callGoogleScriptOnce(payload, { timeoutMs: opts?.timeoutMs ?? 9000 });
    } catch (e: any) {
      lastErr = e;
      if (attempt < retries) await sleep(350 * (attempt + 1));
    }
  }

  throw lastErr || new Error("Errore sconosciuto callGoogleScript");
}

async function callWithFallback(payloads: any[]) {
  let lastErr: any = null;
  for (const p of payloads) {
    try {
      return await callGoogleScript(p, { timeoutMs: 9000, retries: 1 });
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Nessuna action disponibile in Apps Script.");
}

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "on" || s === "si";
}

function normalizeBookingsOpen(data: any): boolean {
  // formati possibili che arrivano dallo script
  if (typeof data?.bookings_open !== "undefined") return toBool(data.bookings_open);
  if (typeof data?.bookingsOpen !== "undefined") return toBool(data.bookingsOpen);
  if (typeof data?.value !== "undefined") return toBool(data.value);
  if (typeof data?.settings?.bookings_open !== "undefined") return toBool(data.settings.bookings_open);
  if (typeof data?.settings?.bookingsOpen !== "undefined") return toBool(data.settings.bookingsOpen);
  return false;
}

// GET /api/settings?key=bookings_open
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = (searchParams.get("key") || "bookings_open").trim();
  if (!key) return badRequest("key mancante");

  try {
    // 🔥 fallback coerente col tuo Apps Script attuale
    const data = await callWithFallback([
      // (se un giorno implementi get_setting nello script)
      { action: "get_setting", key },
      // il tuo script attuale supporta questi:
      { action: "get_settings" },
      { action: "admin_get_settings" },
    ]);

    if (key === "bookings_open") {
      const bookingsOpen = normalizeBookingsOpen(data);
      return jsonNoStore({ ok: true, key, bookingsOpen }, { status: 200 });
    }

    // altri key (se in futuro li userai)
    const value = data?.value ?? data?.[key] ?? data?.settings?.[key] ?? null;
    return jsonNoStore({ ok: true, key, value }, { status: 200 });
  } catch (e: any) {
    return jsonNoStore({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

// POST /api/settings body: { key:"bookings_open", value:true/false }
export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body non valido");
  }

  const key = String(body?.key || "bookings_open").trim();
  if (!key) return badRequest("key mancante");

  const hasValue = Object.prototype.hasOwnProperty.call(body ?? {}, "value");
  const value = hasValue ? body.value : undefined;

  if (key === "bookings_open") {
    if (!hasValue) return badRequest("value mancante per bookings_open (true/false)");

    const open = toBool(value);

    try {
      // 🔥 fallback coerente col tuo Apps Script attuale
      const data = await callWithFallback([
        // (se un giorno implementi set_setting nello script)
        { action: "set_setting", key, value: open },
        // il tuo script attuale supporta questi:
        { action: "set_bookings_open", bookings_open: open },
        { action: "set_bookings_open", open }, // compat
        { action: "admin_set_bookings_open", bookings_open: open },
        { action: "admin_set_bookings_open", open }, // compat
      ]);

      const bookingsOpen = normalizeBookingsOpen(data) || open; // se lo script non rimanda il valore, usiamo quello salvato
      return jsonNoStore({ ok: true, key, bookingsOpen }, { status: 200 });
    } catch (e: any) {
      return jsonNoStore({ ok: false, error: e?.message || String(e) }, { status: 500 });
    }
  }

  // altri key: fallback (se non hai set “generico” nello script, meglio bloccare)
  return jsonNoStore(
    { ok: false, error: "Questa API supporta solo key=bookings_open per ora." },
    { status: 400 }
  );
}