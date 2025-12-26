// app/api/admin/me/route.ts
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

export async function GET() {
  try {
    const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";
    if (!ADMIN_SESSION_SECRET) {
      return jsonNoStore({ ok: true, loggedIn: false });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(getCookieName())?.value || "";
    const loggedIn = verifySessionToken(token, ADMIN_SESSION_SECRET);

    return jsonNoStore({ ok: true, loggedIn });
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/admin/me", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}