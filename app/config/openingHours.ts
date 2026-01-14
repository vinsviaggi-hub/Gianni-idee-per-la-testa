// app/config/openingHours.ts

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TimeRange = { from: string; to: string }; // "HH:mm"
export type WeeklyHours = Record<DayKey, TimeRange[]>;

// ESEMPIO: lun–sab 08:30–12:30 e 15:00–20:00, dom chiuso
export const weeklyHours: WeeklyHours = {
  mon: [
    { from: "08:30", to: "12:30" },
    { from: "15:00", to: "20:00" },
  ],
  tue: [
    { from: "08:30", to: "12:30" },
    { from: "15:00", to: "20:00" },
  ],
  wed: [
    { from: "08:30", to: "12:30" },
    { from: "15:00", to: "20:00" },
  ],
  thu: [
    { from: "08:30", to: "12:30" },
    { from: "15:00", to: "20:00" },
  ],
  fri: [
    { from: "08:30", to: "12:30" },
    { from: "15:00", to: "20:00" },
  ],
  sat: [
    { from: "08:30", to: "12:30" },
    { from: "15:00", to: "20:00" },
  ],
  sun: [],
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Accetta anche "8:3" o "8:30" e la normalizza in "08:30".
// Se non valida, ritorna null.
function normalizeHHMM(input: string): string | null {
  const s = String(input || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;

  const hh = Number(m[1]);
  const mm = Number(m[2]);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;

  return `${pad2(hh)}:${pad2(mm)}`;
}

function toMins(hhmm: string) {
  const norm = normalizeHHMM(hhmm);
  if (!norm) return NaN;
  const [h, m] = norm.split(":").map(Number);
  return h * 60 + m;
}

function dayKeyFromDate(d: Date): DayKey {
  // 0=dom ... 6=sab
  const map: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[d.getDay()];
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function cleanRanges(ranges: TimeRange[]): TimeRange[] {
  // Normalizza HH:mm e scarta range invalidi o invertiti
  const out: TimeRange[] = [];

  for (const r of ranges || []) {
    const from = normalizeHHMM(r?.from);
    const to = normalizeHHMM(r?.to);
    if (!from || !to) continue;

    const a = toMins(from);
    const b = toMins(to);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    // Se invertito (es: 20:00 -> 15:00) lo scarto.
    // Se un giorno vorrai range notturni, lo gestiamo a parte.
    if (b <= a) continue;

    out.push({ from, to });
  }

  // ordina per from
  out.sort((x, y) => toMins(x.from) - toMins(y.from));
  return out;
}

export type OpenStatus =
  | {
      open: true;
      dayKey: DayKey;
      closesAt: string; // "HH:mm"
    }
  | {
      open: false;
      dayKey: DayKey;
      // se oggi riapre più tardi
      opensAt?: string; // "HH:mm"
      // se oggi non riapre, prossima apertura nei prossimi giorni
      nextOpenDay?: DayKey;
      nextOpensAt?: string; // "HH:mm"
    };

// Ritorna open/closed + quando chiude / quando apre (oggi o prossimi giorni)
export function getOpenStatus(now = new Date()): OpenStatus {
  const key = dayKeyFromDate(now);
  const minsNow = now.getHours() * 60 + now.getMinutes();

  const todayRanges = cleanRanges(weeklyHours[key] || []);

  // 1) se siamo in un range -> OPEN
  for (const r of todayRanges) {
    const a = toMins(r.from);
    const b = toMins(r.to);
    if (minsNow >= a && minsNow < b) {
      return { open: true, dayKey: key, closesAt: r.to };
    }
  }

  // 2) chiuso: trova prossima apertura di oggi (se esiste)
  const nextToday = todayRanges.find((r) => toMins(r.from) > minsNow);
  if (nextToday) {
    return { open: false, dayKey: key, opensAt: nextToday.from };
  }

  // 3) chiuso e oggi non riapre: cerca nei prossimi 7 giorni
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, i);
    const dk = dayKeyFromDate(d);
    const ranges = cleanRanges(weeklyHours[dk] || []);
    if (ranges.length > 0) {
      return { open: false, dayKey: key, nextOpenDay: dk, nextOpensAt: ranges[0].from };
    }
  }

  // 4) nessuna apertura trovata (tutto chiuso tutta la settimana)
  return { open: false, dayKey: key };
}