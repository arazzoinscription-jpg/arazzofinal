import Link from "next/link";
import { ChevronRight, GraduationCap, PlayCircle, Target } from "lucide-react";

/**
 * Compte SANS formation : dès la création du compte, la leçon d'essai gratuite et les missions du feed
 * (test de niveau, défi de la semaine, modèles à apprendre…), puis l'invitation à rejoindre une classe.
 */
export function CarteDecouverte({ essai }: { essai: { lessonId: string; titre: string; cours: string; vue: boolean } | null }) {
  return (
    <section aria-label="Découvrir Arazzo" className="relative mb-6 rounded-3xl overflow-hidden bg-gradient-to-br from-[#2A0880] via-[#5B16F9] to-[#FE7223] text-white p-5 sm:p-6">
      <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-white/70">Bienvenue · compte gratuit</p>
      <h2 className="font-playfair text-2xl font-bold mt-1">Découvrez la couture avec Arazzo</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link href={essai ? `/dashboard/cours/${essai.lessonId}` : "/formation/niveau-1"} className="rounded-2xl bg-white/10 hover:bg-white/20 p-4 flex flex-col gap-2">
          <PlayCircle size={22} aria-hidden />
          <span className="font-semibold leading-tight">{essai ? (essai.vue ? "Revoir ma leçon d'essai" : "Ma leçon d'essai gratuite") : "Découvrir le Niveau 1"}</span>
          <span className="text-xs text-white/75">{essai ? `« ${essai.titre} » — ${essai.cours}` : "Le programme, les modèles et l'enseignante."}</span>
        </Link>
        <Link href="/communaute" className="rounded-2xl bg-white/10 hover:bg-white/20 p-4 flex flex-col gap-2">
          <Target size={22} aria-hidden />
          <span className="font-semibold leading-tight">Mes missions sur le feed</span>
          <span className="text-xs text-white/75">Test de niveau, défi de la semaine, modèles à apprendre — et un code promo à gagner.</span>
        </Link>
        <Link href="/formation/niveau-1" className="rounded-2xl bg-white text-[#2A0880] p-4 flex flex-col gap-2">
          <GraduationCap size={22} aria-hidden />
          <span className="font-semibold leading-tight inline-flex items-center gap-1">Rejoindre une classe <ChevronRight size={16} aria-hidden /></span>
          <span className="text-xs text-[#2A0880]/70">Votre enseignante, vos camarades, vos publications sans attente.</span>
        </Link>
      </div>
    </section>
  );
}
