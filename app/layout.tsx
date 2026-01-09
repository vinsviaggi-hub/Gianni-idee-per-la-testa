import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Idee per la Testa",
  description: "Prenotazioni online",
  // ✅ manifest della HOME (Prenota) - cache bust
  manifest: "/manifest.webmanifest?v=1",
  // ✅ icone HOME
  icons: {
    apple: "/icons/apple-touch-icon.png?v=1",
    icon: "/icons/icon-192.png?v=1",
  },
  appleWebApp: {
    capable: true,
    title: "Prenota",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}