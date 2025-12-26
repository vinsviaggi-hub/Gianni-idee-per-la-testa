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

export async function GET(req: Request) {
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
    if (!ADMIN_SESSION_SECRET) {
      return jsonNoStore({ ok: false, error: "ADMIN_SESSION_SECRET mancante" }, { status: 500 });
    }

    // ✅ Auth via cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(getCookieName())?.value;

    if (!verifySessionToken(token, ADMIN_SESSION_SECRET)) {
      return jsonNoStore({ ok: false, error: "Non autorizzato" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 300), 1), 500);

    const url =
      `${GOOGLE_SCRIPT_URL}?action=list&sheet=Ordini&limit=${encodeURIComponent(String(limit))}` +
      (GOOGLE_SCRIPT_SECRET ? `&secret=${encodeURIComponent(GOOGLE_SCRIPT_SECRET)}` : "");

    const r = await fetch(url, { method: "GET", cache: "no-store" });
    const text = await r.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return jsonNoStore(
        { ok: false, error: "Risposta non JSON dal Google Script" },
        { status: 502 }
      );
    }

    if (!r.ok || data?.ok === false) {
      return jsonNoStore(
        { ok: false, error: data?.error || "Errore lista ordini", detail: data },
        { status: 502 }
      );
    }

    return jsonNoStore({ ok: true, rows: data.rows || [], count: data.count || 0 });
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/bookings", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}