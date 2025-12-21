import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

const client = new OpenAI({
  apiKey: apiKey ?? "",
});

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY non configurata sul server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const userMessage = body?.message?.toString().trim();

    if (!userMessage) {
      return NextResponse.json({ error: "Messaggio mancante." }, { status: 400 });
    }

    // ✅ Regole bot: informativo + redirect al modulo prenotazione
    const systemPrompt = `
Sei l'assistente virtuale di "Arrosticini Abruzzesi" (laboratorio).
Obiettivo: dare informazioni chiare e veloci (ritiro/consegna, orari indicativi, come funziona, scatole 50/100/200, tempi medi, dove ritirare, cosa serve per la consegna).

REGOLE IMPORTANTI:
1) NON prendere prenotazioni in chat e NON chiedere tutti i dati uno per uno.
2) Se l'utente vuole prenotare/ordinare (parole tipo: prenoto, ordino, vorrei, mi servono, scatole, 50/100/200, ritiro, consegna, data, orario),
   rispondi SEMPRE così (anche se fai 1 riga di info prima):
   "Per prenotare compila il modulo nella sezione **Prenota** (a sinistra su PC / tab **Prenota** su telefono)."
3) Se l’utente chiede prezzi: dì che "i prezzi verranno inseriti a breve" (demo) e invita a prenotare dal modulo.
4) Tono: amichevole, diretto, senza papiri. Massimo 6-7 righe.
5) Se manca un’informazione, fai AL MASSIMO 1 domanda.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Ok! Dimmi pure cosa ti serve 🙂";

    return NextResponse.json({ ok: true, reply });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Errore server chat.", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}