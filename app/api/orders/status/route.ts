import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCookieName, verifySessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  id?: string;        // "telefono|YYYY-MM-DD|HH:mm"
  status?: string;    // NUOVA | CONFERMATA | ANNULLATA
};

const ALLOWED = new Set(["NUOVA", "CONFERMATA", "ANNULLATA"]);

function jsonNoStore(body: any, init?: { status?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const GOOGLE_SCRIPT_URL =
      process.env.GOOGLE_SCRIPT_URL || process.env.BOOKING_WEBAPP_URL || "";
    const GOOGLE_SCRIPT_SECRET = process.env.GOOGLE_SCRIPT_SECRET || "";
    const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";

    if (!GOOGLE_SCRIPT_URL) {
      return jsonNoStore(
        { ok: false, error: "GOOGLE_SCRIPT_URL (o BOOKING_WEBAPP_URL) mancante" },
        { status: 500 }
      );
    }
    if (!GOOGLE_SCRIPT_SECRET) {
      return jsonNoStore({ ok: false, error: "GOOGLE_SCRIPT_SECRET mancante" }, { status: 500 });
    }
    if (!ADMIN_SESSION_SECRET) {
      return jsonNoStore({ ok: false, error: "ADMIN_SESSION_SECRET mancante" }, { status: 500 });
    }

    // ✅ auth staff (cookie)
    const cookieStore = await cookies();
    const token = cookieStore.get(getCookieName())?.value;

    if (!verifySessionToken(token, ADMIN_SESSION_SECRET)) {
      return jsonNoStore({ ok: false, error: "Non autorizzato" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const id = String(body?.id || "").trim();
    const status = String(body?.status || "").trim().toUpperCase();

    if (!id) {
      return jsonNoStore({ ok: false, error: "Manca id" }, { status: 400 });
    }
    if (!status || !ALLOWED.has(status)) {
      return jsonNoStore({ ok: false, error: "Status non valido (NUOVA/CONFERMATA/ANNULLATA)" }, { status: 400 });
    }

    // ✅ chiama Apps Script (BARBIERE: admin_set_status)
    const r = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "admin_set_status",
        id,
        status,
        secret: GOOGLE_SCRIPT_SECRET,
      }),
      cache: "no-store",
    });

    const text = await r.text().catch(() => "");

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return jsonNoStore(
        { ok: false, error: "Risposta non JSON dal Google Script", raw: text },
        { status: 502 }
      );
    }

    // GAS spesso ritorna ok:false anche se HTTP 200
    if (data?.ok === false) {
      return jsonNoStore(
        { ok: false, error: data?.error || "Errore aggiornando stato", detail: data },
        { status: 502 }
      );
    }

    return jsonNoStore({ ok: true, result: data });
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/bookings/status", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}