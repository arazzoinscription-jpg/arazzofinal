import { Reem_Kufi, IBM_Plex_Sans_Arabic } from "next/font/google";
import type { Metadata } from "next";

// Landings ARABES par niveau (09/11) : une page globale + une page par niveau.
// Polices auto-hébergées (next/font) : titres en Kufi, texte en Plex Arabic.
const titres = Reem_Kufi({ subsets: ["arabic"], weight: ["500", "700"], variable: "--nv-f-titre", display: "swap" });
const texte = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "700"], variable: "--nv-f-texte", display: "swap" });

export const metadata: Metadata = {
  title: "مستويات الخياطة — Arazzo",
  description: "تعلّمي الخياطة والباترون خطوة بخطوة: عن بُعد أو حضوريًا بسطيف والعلمة.",
};

export default function NiveauxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="ar" dir="rtl" className={`${titres.variable} ${texte.variable}`}>
      {children}
    </div>
  );
}
