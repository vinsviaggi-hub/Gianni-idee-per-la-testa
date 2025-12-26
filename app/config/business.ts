// app/config/business.ts

export type BusinessConfig = {
  slug: string;

  // Hero
  badgeTop: string;      // es: "GALAXBOT AI · BARBER SHOP"
  headline: string;      // es: "Idee per la Testa 💈"
  subheadline: string;   // frase sotto

  // Info box
  servicesShort: string; // es: "Taglio, barba, sfumature..."
  city: string;          // es: "Castelnuovo Vomano (TE)"
  phone: string;         // es: "333 123 4567"
};

const BUSINESS: BusinessConfig = {
  slug: "idee-per-la-testa",

  badgeTop: "GALAXBOT AI · BARBER SHOP",
  headline: "Idee per la Testa 💈",
  subheadline:
    "Un assistente virtuale che gestisce richieste, prenotazioni e cancellazioni per il tuo barber shop, 24 ore su 24.",

  servicesShort: "Taglio, barba, sfumature, styling, bimbi",
  city: "Castelnuovo Vomano (TE)",
  phone: "333 123 4567",
};

export function getBusinessConfig(): BusinessConfig {
  return BUSINESS;
}