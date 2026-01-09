export const runtime = "nodejs";

export function GET() {
  const manifest = {
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
        purpose: "any",
      },
      {
        src: "/pannello/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // opzionale ma consigliato per Android/PWA
      {
        src: "/pannello/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}