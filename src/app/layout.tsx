import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arazzo Formation — Le fil de votre talent",
  description:
    "Plateforme de formation en couture, broderie et modélisme pour le Maghreb et sa diaspora.",
  openGraph: {
    title: "Arazzo Formation",
    description: "Apprenez la couture et le modélisme avec les meilleurs formateurs du Maghreb.",
    url: "https://arazzo.formation",
    siteName: "Arazzo Formation",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applique le thème enregistré avant le rendu (évite le flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&localStorage.getItem('arazzo-dash')==='1'))document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
