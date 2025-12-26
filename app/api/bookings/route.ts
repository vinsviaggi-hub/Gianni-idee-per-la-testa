import { NextResponse } from "next/server";

type ScriptOk = { ok: true; message?: string; [k: string]: any };
type ScriptErr = { ok: false; error?: string; conflict?: boolean; _status?: number; [k: string]: any };

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "";
const SECRET =
  process.env.GOOGLE_SCRIPT_SECRET ||
  process.env.API_SECRET || // fallback se l’hai chiamata così in .env.local
  "";

function normalizeIsoDate(input: string): string {
  const s = (input || "").trim();
  if (!s) return "";
  // già ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/mm/yyyy -> yyyy-mm-dd
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    const d = String(parseInt(dd, 10)).padStart(2, "0");
    const m = String(parseInt(mm, 10)).padStart(2, "0");
    return `${yyyy}-${m}-${d}`;
  }

  return s; // lascio com’è (meglio di niente)
}

function normalizeTime(input: string): string {
  const s = (input || "").trim().replace(".", ":").replace(",", ":");
  if (!s) return "";
  // 9:30 -> 09:30
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return s;
  const hh = String(parseInt(m[1], 10)).padStart(2, "0");
  return `${hh}:${m[2]}`;
}

async function callScript(payload: Record<string, any>) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = JSON.parse(text);
  } catch {
    return {
      status: 502,
      data: { ok: false, error: "Risposta non valida dal Google Script.", raw: text },
    };
  }

  // Apps Script spesso non può settare status HTTP: usiamo _status o regole
  const d = data as ScriptOk | ScriptErr;

  let status = 200;
  if (typeof (d as any)?._status === "number") status = (d as any)._status;
  else if ((d as any)?.ok === true) status = 200;
  else if ((d as any)?.conflict === true) status = 409;
  else if (((d as any)?.error || "").toLowerCase().includes("non autorizzato")) status = 401;
  else status = 400;

  return { status, data };
}

export async function POST(req: Request) {
  try {
    if (!SCRIPT_URL) {
      return NextResponse.json(
        { ok: false, error: "GOOGLE_SCRIPT_URL mancante in .env.local" },
        { status: 500 }
      );
    }
    if (!SECRET) {
      return NextResponse.json(
        { ok: false, error: "GOOGLE_SCRIPT_SECRET (o API_SECRET) mancante in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Body JSON mancante." }, { status: 400 });
    }

    const action = String(body.action || "").trim();

    // Qui è il punto chiave: bookings gestisce SOLO create/cancel
    if (action !== "create_booking" && action !== "cancel_booking") {
      return NextResponse.json(
        { ok: false, error: `Azione non valida per /api/bookings: ${action}` },
        { status: 400 }
      );
    }

    const payload = {
      action,
      secret: SECRET,

      // campi usati dallo script
      name: String(body.name || "").trim(),
      phone: String(body.phone || "").trim(),
      service: String(body.service || "").trim(),
      date: normalizeIsoDate(String(body.date || "")),
      time: normalizeTime(String(body.time || "")),
      notes: String(body.notes || "").trim(),
    };

    const { status, data } = await callScript(payload);

    // Se stai annullando ma torna conflict, vuol dire che da qualche parte sta ancora arrivando create_booking
    return NextResponse.json(data, { status });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Errore server /api/bookings", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}