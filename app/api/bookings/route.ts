import { NextResponse } from "next/server";

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ ok: false, error: "Body JSON mancante." }, { status: 400 });
    }

    // Anti-spam: se honeypot è pieno, fingiamo OK ma non salviamo
    if (typeof body.honeypot === "string" && body.honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!GOOGLE_SCRIPT_URL) {
      return NextResponse.json(
        { ok: false, error: "GOOGLE_SCRIPT_URL mancante in .env.local" },
        { status: 500 }
      );
    }

    // Timeout per evitare richieste bloccate
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const r = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const text = await r.text();

    // Google Script di solito risponde JSON; se non lo è lo metto in raw
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // Se Apps Script risponde ok:false o HTTP non ok => errore
    if (!r.ok || data?.ok === false) {
      return NextResponse.json(
        { ok: false, error: data?.error || "Errore dal Google Script", detail: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "Timeout: il Google Script non risponde."
        : err?.message || "Errore server";

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// opzionale: evitare cache in edge/hosting
export const dynamic = "force-dynamic";