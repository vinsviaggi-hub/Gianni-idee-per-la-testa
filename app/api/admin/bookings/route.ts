// app/api/admin/bookings/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCookieName, verifySessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(body: any, init?: { status?: number; retryAfter?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  // ✅ se vogliamo far capire al client che deve riprovare
  if (typeof init?.retryAfter === "number") {
    res.headers.set("Retry-After", String(init.retryAfter));
  }

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

/**
 * Apps Script spesso non può impostare status HTTP reali.
 * Qui proviamo a dedurre lo status:
 * - se data._status esiste → usalo
 * - se conflict true → 409
 * - se error contiene "non autorizzato" → 401
 * - se error contiene "sistema occupato" o simili → 429
 */
function deriveStatusFromData(data: any, fallbackStatus: number) {
  const d = data || {};
  if (typeof d._status === "number") return d._status;

  if (d.conflict === true) return 409;

  const err = String(d.error || "").toLowerCase();
  if (err.includes("non autorizzato") || err.includes("unauthorized")) return 401;

  // ✅ lock/busy
  if (
    err.includes("sistema occupato") ||
    err.includes("riprova tra pochi secondi") ||
    err.includes("too many requests") ||
    err.includes("rate") ||
    err.includes("busy")
  ) {
    return 429;
  }

  return fallbackStatus;
}

async function fetchScriptGet(
  baseUrl: string,
  params: Record<string, string>,
  secret?: string
): Promise<
  { httpOk: boolean; data: any; raw: string; status: number } | { httpOk: false; data: null; raw: string; status: number; parseError: string }
> {
  const url = new URL(baseUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (secret) url.searchParams.set("secret", secret);

  const r = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const parsed = await safeJsonFromResponse(r);
  if (!parsed.ok) {
    return { httpOk: false, data: null, raw: parsed.raw, status: r.status, parseError: parsed.error };
  }

  const derived = deriveStatusFromData(parsed.data, r.status || (r.ok ? 200 : 400));
  return { httpOk: r.ok && derived < 400, data: parsed.data, raw: parsed.raw, status: derived };
}

async function fetchScriptPost(
  baseUrl: string,
  body: any
): Promise<
  { httpOk: boolean; data: any; raw: string; status: number } | { httpOk: false; data: null; raw: string; status: number; parseError: string }
> {
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

  const derived = deriveStatusFromData(parsed.data, r.status || (r.ok ? 200 : 400));
  return { httpOk: r.ok && derived < 400, data: parsed.data, raw: parsed.raw, status: derived };
}

function looksOk(data: any) {
  return data && (data.ok === true || data.ok === "true");
}

function isBusyStatus(status: number, data?: any) {
  if (status === 429) return true;
  const err = String(data?.error || "").toLowerCase();
  return err.includes("sistema occupato") || err.includes("riprova tra pochi secondi") || err.includes("busy");
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
      const first = await fetchScriptGet(GOOGLE_SCRIPT_URL, { action: "admin_get_settings" }, GOOGLE_SCRIPT_SECRET || undefined);
      if ("parseError" in first) {
        return jsonNoStore({ ok: false, error: first.parseError, details: first.raw }, { status: 502 });
      }

      // ✅ busy: ritorna 429 (così il pannello può riprovare)
      if (isBusyStatus(first.status, first.data)) {
        return jsonNoStore({ ok: false, error: first.data?.error || "Sistema occupato, riprova." }, { status: 429, retryAfter: 3 });
      }

      if (first.status < 400 && looksOk(first.data)) {
        return jsonNoStore({ ok: true, bookings_open: Boolean(first.data.bookings_open) });
      }

      const second = await fetchScriptGet(GOOGLE_SCRIPT_URL, { action: "get_settings" }, GOOGLE_SCRIPT_SECRET || undefined);
      if ("parseError" in second) {
        return jsonNoStore({ ok: false, error: second.parseError, details: second.raw }, { status: 502 });
      }

      if (isBusyStatus(second.status, second.data)) {
        return jsonNoStore({ ok: false, error: second.data?.error || "Sistema occupato, riprova." }, { status: 429, retryAfter: 3 });
      }

      if (second.status < 400 && looksOk(second.data)) {
        return jsonNoStore({ ok: true, bookings_open: Boolean(second.data.bookings_open) });
      }

      const status = second.status || first.status || 502;
      return jsonNoStore(
        {
          ok: false,
          error: (second.data?.error || first.data?.error || "Errore leggendo settings") as string,
          details: second.data ?? first.data,
        },
        { status: status >= 400 ? status : 502 }
      );
    }

    // ========= LIST =========
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 300), 1), 800);

    const first = await fetchScriptGet(
      GOOGLE_SCRIPT_URL,
      { action: "admin_list", limit: String(limit) },
      GOOGLE_SCRIPT_SECRET || undefined
    );

    if ("parseError" in first) {
      return jsonNoStore({ ok: false, error: first.parseError, details: first.raw }, { status: 502 });
    }

    if (isBusyStatus(first.status, first.data)) {
      return jsonNoStore({ ok: false, error: first.data?.error || "Sistema occupato, riprova." }, { status: 429, retryAfter: 3 });
    }

    if (first.status < 400 && looksOk(first.data)) {
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

    if (isBusyStatus(second.status, second.data)) {
      return jsonNoStore({ ok: false, error: second.data?.error || "Sistema occupato, riprova." }, { status: 429, retryAfter: 3 });
    }

    if (second.status < 400 && looksOk(second.data)) {
      return jsonNoStore({ ok: true, rows: second.data.rows || [], count: second.data.count || 0 });
    }

    const status = second.status || first.status || 502;

    return jsonNoStore(
      {
        ok: false,
        error: second.data?.error || first.data?.error || `Errore lista (${status})`,
        details: second.data ?? first.data,
      },
      { status: status >= 400 ? status : 502 }
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

      const first = await fetchScriptPost(GOOGLE_SCRIPT_URL, {
        action: "admin_set_bookings_open",
        bookings_open: open,
        open,
        secret: GOOGLE_SCRIPT_SECRET || undefined,
      });

      if ("parseError" in first) {
        return jsonNoStore({ ok: false, error: first.parseError, details: first.raw }, { status: 502 });
      }

      if (isBusyStatus(first.status, first.data)) {
        return jsonNoStore({ ok: false, error: first.data?.error || "Sistema occupato, riprova." }, { status: 429, retryAfter: 3 });
      }

      if (first.status < 400 && looksOk(first.data)) {
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

      if (isBusyStatus(second.status, second.data)) {
        return jsonNoStore({ ok: false, error: second.data?.error || "Sistema occupato, riprova." }, { status: 429, retryAfter: 3 });
      }

      if (second.status < 400 && looksOk(second.data)) {
        return jsonNoStore({ ok: true, bookings_open: open, message: "Impostazione salvata" });
      }

      const status = second.status || first.status || 502;

      return jsonNoStore(
        {
          ok: false,
          error: second.data?.error || first.data?.error || "Errore salvando impostazione",
          details: second.data ?? first.data,
        },
        { status: status >= 400 ? status : 502 }
      );
    }

    // ========= UPDATE STATUS =========
    const id = String(body?.id || "").trim();
    const status = String(body?.status || body?.stato || "").trim().toUpperCase();

    if (!status) return jsonNoStore({ ok: false, error: "Manca status/stato" }, { status: 400 });
    if (!ALLOWED.has(status)) return jsonNoStore({ ok: false, error: "Status non valido" }, { status: 400 });

    const first = await fetchScriptPost(GOOGLE_SCRIPT_URL, {
      action: "admin_set_status",
      id: id || undefined,
      status,
      stato: status,
      timestampISO: body?.timestampISO,
      telefono: body?.telefono,
      dataISO: body?.dataISO,
      ora: body?.ora,
      secret: GOOGLE_SCRIPT_SECRET || undefined,
    });

    if ("parseError" in first) {
      return jsonNoStore({ ok: false, error: first.parseError, details: first.raw }, { status: 502 });
    }

    if (isBusyStatus(first.status, first.data)) {
      return jsonNoStore({ ok: false, error: first.data?.error || "Sistema occupato, riprova." }, { status: 429, retryAfter: 3 });
    }

    if (first.status < 400 && looksOk(first.data)) {
      return jsonNoStore({ ok: true, status, message: "Stato aggiornato" });
    }

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

    if (isBusyStatus(second.status, second.data)) {
      return jsonNoStore({ ok: false, error: second.data?.error || "Sistema occupato, riprova." }, { status: 429, retryAfter: 3 });
    }

    if (second.status < 400 && looksOk(second.data)) {
      return jsonNoStore({ ok: true, status, message: "Stato aggiornato" });
    }

    const httpStatus = second.status || first.status || 502;

    return jsonNoStore(
      {
        ok: false,
        error: second.data?.error || first.data?.error || `Errore update status`,
        details: second.data ?? first.data,
      },
      { status: httpStatus >= 400 ? httpStatus : 502 }
    );
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/admin/bookings (POST)", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}