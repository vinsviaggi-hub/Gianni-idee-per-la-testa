import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Idee per la Testa · Pannello",
    short_name: "Pannello",
    description: "Pannello prenotazioni (admin)",
    start_url: "/pannello",
    scope: "/pannello",
    display: "standalone",
    background_color: "#070b12",
    theme_color: "#0b1220",
    icons: [
      {
        src: "/pannello/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pannello/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}