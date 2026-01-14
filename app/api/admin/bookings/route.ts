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

async function fetchScriptGet(
  baseUrl: string,
  params: Record<string, string>,
  secret?: string
): Promise<{ httpOk: boolean; data: any; raw: string; status: number } | { httpOk: false; data: null; raw: string; status: number; parseError: string }> {
  const url = new URL(baseUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (secret) url.searchParams.set("secret", secret);

  const r = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const parsed = await safeJsonFromResponse(r);
  if (!parsed.ok) {
    return { httpOk: false, data: null, raw: parsed.raw, status: r.status, parseError: parsed.error };
  }
  return { httpOk: r.ok, data: parsed.data, raw: parsed.raw, status: r.status };
}

async function fetchScriptPost(
  baseUrl: string,
  body: any
): Promise<{ httpOk: boolean; data: any; raw: string; status: number } | { httpOk: false; data: null; raw: string; status: number; parseError: string }> {
  const r = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const parsed = await safeJsonFromResponse(r);
  if (!parsed.ok) {
    return { httpOk: false, data: null, raw: parsed.raw, status: r.status, parseError: parsed.error };
  }
  return { httpOk: r.ok, data: parsed.data, raw: parsed.raw, status: r.status };
}

function looksOk(data: any) {
  return data && (data.ok === true || data.ok === "true");
}

/** ===========================
 *  GET /api/admin/bookings
 *  - default: lista prenotazioni
 *  - ?action=settings : legge bookings_open
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
    const action = String(searchParams.get("action") || "").toLowerCase();

    // ========= SETTINGS =========
    if (action === "settings") {
      // Provo prima azione "admin_get_settings", poi fallback "get_settings"
      const first = await fetchScriptGet(GOOGLE_SCRIPT_URL, { action: "admin_get_settings" }, GOOGLE_SCRIPT_SECRET || undefined);
      if ("parseError" in first) {
        return jsonNoStore({ ok: false, error: first.parseError, details: first.raw }, { status: 502 });
      }
      if (first.httpOk && looksOk(first.data)) {
        return jsonNoStore({ ok: true, bookings_open: Boolean(first.data.bookings_open) });
      }

      const second = await fetchScriptGet(GOOGLE_SCRIPT_URL, { action: "get_settings" }, GOOGLE_SCRIPT_SECRET || undefined);
      if ("parseError" in second) {
        return jsonNoStore({ ok: false, error: second.parseError, details: second.raw }, { status: 502 });
      }
      if (second.httpOk && looksOk(second.data)) {
        return jsonNoStore({ ok: true, bookings_open: Boolean(second.data.bookings_open) });
      }

      return jsonNoStore(
        {
          ok: false,
          error: (second.data?.error || first.data?.error || "Errore leggendo settings") as string,
          details: second.data ?? first.data,
        },
        { status: 502 }
      );
    }

    // ========= LIST =========
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 300), 1), 800);

    // Provo prima "admin_list", fallback "list"
    const first = await fetchScriptGet(
      GOOGLE_SCRIPT_URL,
      { action: "admin_list", limit: String(limit) },
      GOOGLE_SCRIPT_SECRET || undefined
    );

    if ("parseError" in first) {
      return jsonNoStore({ ok: false, error: first.parseError, details: first.raw }, { status: 502 });
    }

    if (first.httpOk && looksOk(first.data)) {
      return jsonNoStore({ ok: true, rows: first.data.rows || [], count: first.data.count || 0 });
    }

    const second = await fetchScriptGet(
      GOOGLE_SCRIPT_URL,
      { action: "list", limit: String(limit) },
      GOOGLE_SCRIPT_SECRET || undefined
    );

    if ("parseError" in second) {
      return jsonNoStore({ ok: false, error: second.parseError, details: second.raw }, { status: 502 });
    }

    if (second.httpOk && looksOk(second.data)) {
      return jsonNoStore({ ok: true, rows: second.data.rows || [], count: second.data.count || 0 });
    }

    return jsonNoStore(
      {
        ok: false,
        error: second.data?.error || first.data?.error || `Errore lista (${second.status || first.status})`,
        details: second.data ?? first.data,
      },
      { status: 502 }
    );
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/admin/bookings", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/** ===========================
 *  POST /api/admin/bookings
 *  - set status
 *  - set bookings_open
 *  =========================== */
type Body = {
  action?: string;

  // status update (versione "id/status" stile barbiere)
  id?: string;
  status?: string;
  stato?: string;

  // status update (versione arrosticini)
  timestampISO?: string;
  telefono?: string;
  dataISO?: string;
  ora?: string;

  // settings
  bookings_open?: boolean;
  open?: boolean;
};

const ALLOWED = new Set(["NUOVA", "CONFERMATA", "CONSEGNATA", "ANNULLATA"]);

export async function POST(req: Request) {
  try {
    const auth = await requireAdminAuth();
    if (!auth.ok) return auth.res;

    const { GOOGLE_SCRIPT_URL, GOOGLE_SCRIPT_SECRET } = await getScriptBase();
    if (!GOOGLE_SCRIPT_URL) {
      return jsonNoStore({ ok: false, error: "GOOGLE_SCRIPT_URL mancante" }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const action = String(body?.action || "").trim().toLowerCase();

    // ========= SET BOOKINGS OPEN/CLOSED =========
    if (action === "setbookingsopen" || action === "admin_set_bookings_open" || action === "set_bookings_open") {
      const open = Boolean(body?.bookings_open ?? body?.open);

      // Provo prima "admin_set_bookings_open", fallback "set_bookings_open"
      const first = await fetchScriptPost(GOOGLE_SCRIPT_URL, {
        action: "admin_set_bookings_open",
        bookings_open: open,
        open,
        secret: GOOGLE_SCRIPT_SECRET || undefined,
      });

      if ("parseError" in first) {
        return jsonNoStore({ ok: false, error: first.parseError, details: first.raw }, { status: 502 });
      }
      if (first.httpOk && looksOk(first.data)) {
        return jsonNoStore({ ok: true, bookings_open: open, message: "Impostazione salvata" });
      }

      const second = await fetchScriptPost(GOOGLE_SCRIPT_URL, {
        action: "set_bookings_open",
        bookings_open: open,
        open,
        secret: GOOGLE_SCRIPT_SECRET || undefined,
      });

      if ("parseError" in second) {
        return jsonNoStore({ ok: false, error: second.parseError, details: second.raw }, { status: 502 });
      }
      if (second.httpOk && looksOk(second.data)) {
        return jsonNoStore({ ok: true, bookings_open: open, message: "Impostazione salvata" });
      }

      return jsonNoStore(
        {
          ok: false,
          error: second.data?.error || first.data?.error || "Errore salvando impostazione",
          details: second.data ?? first.data,
        },
        { status: 502 }
      );
    }

    // ========= UPDATE STATUS =========
    const id = String(body?.id || "").trim();
    const status = String(body?.status || body?.stato || "").trim().toUpperCase();

    // Validazioni solo se mi stai chiedendo update status
    if (!status) return jsonNoStore({ ok: false, error: "Manca status/stato" }, { status: 400 });
    if (!ALLOWED.has(status)) return jsonNoStore({ ok: false, error: "Status non valido" }, { status: 400 });

    // Prima provo stile "admin_set_status"
    const first = await fetchScriptPost(GOOGLE_SCRIPT_URL, {
      action: "admin_set_status",
      id: id || undefined,
      status,
      stato: status,
      // compat arrosticini:
      timestampISO: body?.timestampISO,
      telefono: body?.telefono,
      dataISO: body?.dataISO,
      ora: body?.ora,
      secret: GOOGLE_SCRIPT_SECRET || undefined,
    });

    if ("parseError" in first) {
      return jsonNoStore({ ok: false, error: first.parseError, details: first.raw }, { status: 502 });
    }
    if (first.httpOk && looksOk(first.data)) {
      return jsonNoStore({ ok: true, status, message: "Stato aggiornato" });
    }

    // Fallback stile "updateStatus" (Apps Script arrosticini)
    const second = await fetchScriptPost(GOOGLE_SCRIPT_URL, {
      action: "updateStatus",
      id: id || undefined,
      status,
      stato: status,
      timestampISO: body?.timestampISO,
      telefono: body?.telefono,
      dataISO: body?.dataISO,
      ora: body?.ora,
      secret: GOOGLE_SCRIPT_SECRET || undefined,
    });

    if ("parseError" in second) {
      return jsonNoStore({ ok: false, error: second.parseError, details: second.raw }, { status: 502 });
    }
    if (second.httpOk && looksOk(second.data)) {
      return jsonNoStore({ ok: true, status, message: "Stato aggiornato" });
    }

    return jsonNoStore(
      {
        ok: false,
        error: second.data?.error || first.data?.error || `Errore update status`,
        details: second.data ?? first.data,
      },
      { status: 502 }
    );
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/admin/bookings (POST)", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}