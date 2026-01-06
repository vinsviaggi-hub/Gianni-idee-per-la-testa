// app/pannello/manifest.webmanifest/route.ts
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
        src: "/pannello/icons/icon-192.png?v=2",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pannello/icons/icon-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
      },
      // opzionale: alcuni browser gradiscono "any"
      {
        src: "/pannello/icons/icon-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
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