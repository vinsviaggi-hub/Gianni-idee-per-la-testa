// app/pannello/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pannello · Idee per la Testa",
  manifest: "/pannello/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Pannello",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/pannello/icons/apple-touch-icon.png",
  },
};

export default function PannelloLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}