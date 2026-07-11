import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/**
 * Gabarit commun des pages légales / d'information (confidentialité, CGU, CGV,
 * contact…). Fournit la barre de navigation, un en-tête violet, un conteneur
 * « prose » lisible, et le pied de page.
 */
export function LegalShell({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-DEFAULT">
        <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-700 pt-28 pb-14">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-white mb-3">{title}</h1>
            {subtitle && <p className="text-violet-200 text-lg font-dm">{subtitle}</p>}
            {updated && <p className="text-violet-300/80 text-sm font-dm mt-3">Dernière mise à jour : {updated}</p>}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-cream-200 legal-prose">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/** Bloc « section » : titre + contenu, espacé de façon homogène. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed font-dm">{children}</div>
    </section>
  );
}
