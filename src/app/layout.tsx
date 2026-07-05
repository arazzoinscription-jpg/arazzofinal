import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { validateEnv } from "@/lib/security/env";
import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { RecoveryRedirect } from "@/components/auth/recovery-redirect";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { PwaRegister } from "@/components/pwa/pwa-register";

// Polices auto-hébergées via next/font (non bloquant, sans requête externe à Google).
// `display: swap` + `variable` exposé en CSS (voir globals.css / tailwind.config.ts).
const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-playfair",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm",
});

// Vérifie les variables d'environnement critiques au démarrage (server-only).
validateEnv();

export const metadata: Metadata = {
  title: "Arazzo Formation — Le fil de votre talent",
  description:
    "Plateforme de formation en couture, broderie et modélisme pour le Maghreb et sa diaspora.",
  manifest: "/manifest.webmanifest",
  // iOS : rend l'app en plein écran (mode standalone) une fois ajoutée à l'écran d'accueil.
  appleWebApp: {
    capable: true,
    title: "Arazzo",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Arazzo Formation",
    description: "Apprenez la couture et le modélisme avec les meilleurs formateurs du Maghreb.",
    url: "https://www.formation-arazzo.store",
    siteName: "Arazzo Formation",
    locale: "fr_FR",
  },
};

export const viewport: Viewport = {
  themeColor: "#6B21C8",
  width: "device-width",
  initialScale: 1,
  // Confort « app » : évite le zoom involontaire sur les champs, respecte l'encoche iOS.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        {/* Applique le thème enregistré avant le rendu (évite le flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&localStorage.getItem('arazzo-dash')==='1'))document.documentElement.classList.add('dark');var s=localStorage.getItem('arazzo-sidebar');if(s)document.documentElement.dataset.sidebar=s;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <PwaRegister />
        <RecoveryRedirect />
        <AnalyticsTracker />
        <CookieConsent />
      </body>
    </html>
  );
}
