import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(body: any, init?: { status?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

// ✅ DATI BARBIERE (poi li modifichiamo quando ci dirà i dettagli)
const SHOP_NAME = "Idee per la Testa";
const SHOP_CITY = "Castelnuovo Vomano (TE)";
const SHOP_PHONE = "333 123 4567";
const SHOP_SERVICES = "taglio, barba, sfumature, styling, bimbi";
const SHOP_HOURS = "Lun–Sab: 8:30–12:30 e 15:00–20:00 | Dom: chiuso";

function systemPrompt() {
  return `
Sei l’assistente virtuale del barber shop "${SHOP_NAME}" (${SHOP_CITY}).
Parla in italiano, tono amichevole e professionale, frasi brevi e chiare.

REGOLE IMPORTANTI:
- NON prendere prenotazioni in chat.
- Se il cliente vuole prenotare: digli SEMPRE di usare il box "Prenotazione veloce" sotto la chat.
- Non inventare prezzi, sconti o promozioni.
- Se chiedono disponibilità: spiega che le disponibilità reali si vedono nel box prenotazione selezionando la data.
- Se chiedono annullamento: spiega di usare la sezione "Annulla prenotazione" nella pagina.
- Se chiedono cose fuori tema (medicina/legale ecc.), rifiuta gentilmente e reindirizza.

INFO (solo se richieste):
- Nome: ${SHOP_NAME}
- Città: ${SHOP_CITY}
- Telefono: ${SHOP_PHONE}
- Servizi: ${SHOP_SERVICES}
- Orari: ${SHOP_HOURS}

Esempi rapidi:
- "Voglio prenotare domani" -> "Certo! Usa il box Prenotazione veloce qui sotto e scegli data e orario."
- "Che orari fate?" -> dai orari e poi invitalo a prenotare col box.
`.trim();
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return jsonNoStore({ ok: false, error: "OPENAI_API_KEY mancante" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const userMessage = (body?.message ?? body?.text ?? "").toString().trim();

    if (!userMessage) {
      return jsonNoStore({ ok: false, error: "Messaggio mancante" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.55,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: userMessage },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Ok.";

    // ✅ ChatBox deve ricevere "reply"
    return jsonNoStore({ ok: true, reply });
  } catch (err: any) {
    return jsonNoStore(
      { ok: false, error: "Errore server /api/chat", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}