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
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
