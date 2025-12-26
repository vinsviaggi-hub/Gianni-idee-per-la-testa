// app/api/admin/login/route.ts
import { NextResponse } from "next/server";
import { getCookieName, makeSessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(body: any, init?: { status?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const password = String(body?.password ?? "").trim();

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
    const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";

    if (!ADMIN_PASSWORD || !ADMIN_SESSION_SECRET) {
      return jsonNoStore(
        { ok: false, error: "ADMIN_PASSWORD o ADMIN_SESSION_SECRET mancanti" },
        { status: 500 }
      );
    }

    if (!password || password !== ADMIN_PASSWORD) {
      return jsonNoStore({ ok: false, error: "Password errata" }, { status: 401 });
    }

    const session = makeSessionToken(ADMIN_SESSION_SECRET);

    const res = jsonNoStore({ ok: true });

    res.cookies.set(getCookieName(), session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 giorni
    });

    return res;
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/admin/login", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}