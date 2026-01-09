import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pannello · Idee per la Testa",

  // ✅ usa il manifest generato da app/pannello/manifest.ts
  // (v=4 va bene per “bucare” cache)
  manifest: "/pannello/manifest.webmanifest?v=4",

  appleWebApp: {
    capable: true,
    title: "Pannello",
    statusBarStyle: "default",
  },

  // ✅ icone del pannello = P
  // meglio dare anche 512 così Android/Chrome non sbaglia
  icons: {
    apple: [{ url: "/pannello/icons/apple-touch-icon.png?v=4" }],
    icon: [
      { url: "/pannello/icons/icon-192.png?v=4", sizes: "192x192", type: "image/png" },
      { url: "/pannello/icons/icon-512.png?v=4", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function PannelloLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}