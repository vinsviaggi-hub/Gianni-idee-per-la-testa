import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Idee per la Testa · Prenota",
    short_name: "Prenota",
    description: "Prenotazioni Idee per la Testa",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#070b12",
    theme_color: "#0b1220",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}