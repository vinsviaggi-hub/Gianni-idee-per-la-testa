// app/config/business.ts

export const businessConfig = {
  labelTop: "GALAXBOT AI · BARBER SHOP",
  title: "Idee per la Testa",

  servicesShort: "Taglio, barba, sfumature, styling, bimbi",
  city: "Castelnuovo Vomano (TE)",
  phone: "333 123 4567",

  hoursTitle: "Orari di apertura",
  // queste sono SOLO le righe che mostri in home
  hoursLines: ["Lunedì–Sabato: 8:30–12:30 e 15:00–20:00", "Domenica: chiuso"],
} as const;

export function getBusinessConfig() {
  return businessConfig;
}