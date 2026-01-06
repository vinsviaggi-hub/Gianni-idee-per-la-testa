// app/pannello/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pannello · Idee per la Testa",

  // ⚠️ cache bust: aumenta v=3 se non aggiorna ancora
  manifest: "/pannello/manifest.webmanifest?v=2",

  appleWebApp: {
    capable: true,
    title: "Pannello",
    statusBarStyle: "default",
  },

  // ✅ iOS usa soprattutto apple-touch-icon
  icons: {
    apple: "/pannello/icons/apple-touch-icon.png?v=2",
    icon: "/pannello/icons/icon-192.png?v=2",
  },
};

export default function PannelloLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}