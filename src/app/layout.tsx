import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { validateEnv } from "@/lib/security/env";
import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { GoogleTag } from "@/components/analytics/google-tag";
import { RecoveryRedirect } from "@/components/auth/recovery-redirect";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { InstallApp } from "@/components/pwa/install-app";
import { IndicateurNavigation } from "@/components/layout/indicateur-navigation";
import ModeDemo from "@/components/demo/mode-demo";

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
  // iOS : mode standalone une fois ajouté à l'écran d'accueil.
  // statusBarStyle "default" (et non "black-translucent") : le contenu de l'app
  // commence SOUS la barre de statut iOS au lieu de passer par-dessus (évite le
  // chevauchement du contenu avec l'heure/la batterie du téléphone).
  appleWebApp: {
    capable: true,
    title: "Arazzo",
    statusBarStyle: "default",
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
        {/* Traduction automatique du navigateur (Chrome « Traduire en arabe ») : elle remplace les textes de la page
            par ses propres balises, puis React, en mettant la page à jour, ne retrouve plus ses textes et plante
            (« removeChild / insertBefore : not a child of this node ») → écran « Une erreur s'est produite » chez
            les élèves qui traduisent la page. Ces deux opérations tolèrent désormais un texte déplacé. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(typeof Node!=='function'||!Node.prototype)return;var P=Node.prototype,rc=P.removeChild,ib=P.insertBefore;P.removeChild=function(c){if(c&&c.parentNode!==this)return c;return rc.apply(this,arguments);};P.insertBefore=function(n,r){if(r&&r.parentNode!==this)return ib.call(this,n,null);return ib.apply(this,arguments);};}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {/* Barre de chargement dès qu'on touche un lien (le téléphone ne semble plus « bloqué »). */}
        <IndicateurNavigation />
        {children}
        <PwaRegister />
        <InstallApp />
        <RecoveryRedirect />
        <AnalyticsTracker />
        <MetaPixel />
        <GoogleTag />
        <CookieConsent />
        {/* Mode démo (tutoriels) : seulement avec ?demo=1 — sinon ne fait rien. */}
        <ModeDemo />
      </body>
    </html>
  );
}
