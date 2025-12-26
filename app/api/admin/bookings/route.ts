// app/api/admin/bookings/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCookieName, verifySessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(body: any, init?: { status?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

async function requireAdminAuth() {
  const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";
  if (!ADMIN_SESSION_SECRET) {
    return {
      ok: false as const,
      res: jsonNoStore({ ok: false, error: "ADMIN_SESSION_SECRET mancante" }, { status: 500 }),
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value || "";

  if (!verifySessionToken(token, ADMIN_SESSION_SECRET)) {
    return {
      ok: false as const,
      res: jsonNoStore({ ok: false, error: "Non autorizzato" }, { status: 401 }),
    };
  }

  return { ok: true as const };
}

async function getScriptBase() {
  const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || process.env.BOOKING_WEBAPP_URL || "";
  const GOOGLE_SCRIPT_SECRET = process.env.GOOGLE_SCRIPT_SECRET || "";
  return { GOOGLE_SCRIPT_URL, GOOGLE_SCRIPT_SECRET };
}

async function safeJsonFromResponse(r: Response) {
  const text = await r.text().catch(() => "");
  try {
    return { ok: true as const, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: false as const, error: "Risposta non JSON dal Google Script", raw: text };
  }
}

/** ===========================
 *  GET /api/admin/bookings
 *  =========================== */
export async function GET(req: Request) {
  try {
    const auth = await requireAdminAuth();
    if (!auth.ok) return auth.res;

    const { GOOGLE_SCRIPT_URL, GOOGLE_SCRIPT_SECRET } = await getScriptBase();
    if (!GOOGLE_SCRIPT_URL) {
      return jsonNoStore({ ok: false, error: "GOOGLE_SCRIPT_URL mancante" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 300), 1), 800);

    // ✅ azione admin per lista prenotazioni
    const url =
      `${GOOGLE_SCRIPT_URL}?action=admin_list&limit=${encodeURIComponent(String(limit))}` +
      (GOOGLE_SCRIPT_SECRET ? `&secret=${encodeURIComponent(GOOGLE_SCRIPT_SECRET)}` : "");

    const r = await fetch(url, { method: "GET", cache: "no-store" });

    const parsed = await safeJsonFromResponse(r);
    if (!parsed.ok) {
      return jsonNoStore({ ok: false, error: parsed.error, details: parsed.raw }, { status: 502 });
    }

    const data: any = parsed.data;

    if (!r.ok || data?.ok === false) {
      return jsonNoStore(
        { ok: false, error: data?.error || `Errore admin_list (${r.status})`, details: data ?? parsed.raw },
        { status: 502 }
      );
    }

    return jsonNoStore({ ok: true, rows: data.rows || [], count: data.count || 0 });
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/admin/bookings", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/** ===========================
 *  POST /api/admin/bookings
 *  body: { id, status }
 *  =========================== */
type Body = { id?: string; status?: string };

const ALLOWED = new Set(["NUOVA", "CONFERMATA", "ANNULLATA"]);

export async function POST(req: Request) {
  try {
    const auth = await requireAdminAuth();
    if (!auth.ok) return auth.res;

    const { GOOGLE_SCRIPT_URL, GOOGLE_SCRIPT_SECRET } = await getScriptBase();
    if (!GOOGLE_SCRIPT_URL) {
      return jsonNoStore({ ok: false, error: "GOOGLE_SCRIPT_URL mancante" }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const id = String(body?.id || "").trim();
    const status = String(body?.status || "").trim().toUpperCase();

    if (!id) return jsonNoStore({ ok: false, error: "Manca id" }, { status: 400 });
    if (!ALLOWED.has(status)) return jsonNoStore({ ok: false, error: "Status non valido" }, { status: 400 });

    // ✅ azione admin per cambio stato
    // IMPORTANT: mando sia "status" che "stato" per compatibilità
    const r = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "admin_set_status",
        id,
        status,
        stato: status,
        secret: GOOGLE_SCRIPT_SECRET || undefined,
      }),
      cache: "no-store",
    });

    const parsed = await safeJsonFromResponse(r);
    if (!parsed.ok) {
      return jsonNoStore({ ok: false, error: parsed.error, details: parsed.raw }, { status: 502 });
    }

    const data: any = parsed.data;

    if (!r.ok || data?.ok === false) {
      return jsonNoStore(
        { ok: false, error: data?.error || `Errore admin_set_status (${r.status})`, details: data ?? parsed.raw },
        { status: 502 }
      );
    }

    return jsonNoStore({ ok: true, status, message: "Stato aggiornato" });
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/admin/bookings (POST)", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}