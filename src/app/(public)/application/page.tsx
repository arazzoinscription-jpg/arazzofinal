import type { Metadata } from "next";
import { Suspense } from "react";
import { InstallerApp } from "./installer-app";

export const metadata: Metadata = {
  title: "Installer l’application Arazzo",
  description: "Installez gratuitement l’application Arazzo sur votre téléphone Android ou iPhone : vos cours, patrons et nouveautés toujours avec vous.",
};

/** La page du bouton « 📲 Installer l’application » des e-mails (et de partout ailleurs). */
export default function Page() {
  return (
    <main className="min-h-[70vh] px-4 py-10 flex justify-center">
      <Suspense fallback={null}>
        <InstallerApp />
      </Suspense>
    </main>
  );
}
