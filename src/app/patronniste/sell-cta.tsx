import Link from "next/link";
import { Wand2, Ruler, Scissors, ArrowUpRight, Layers } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

/**
 * CTA hero de l'espace patronniste : « Commencez à vendre vos patrons ».
 * Met en avant l'outil de fiche patronnage (dessin technique IA + photo réelle).
 * Univers couture éditorial Arazzo (Playfair + libellés mono, violet/orange,
 * repères de cadrage, couture en pointillés).
 */
export function SellPatronsCTA() {
  return (
    <Reveal animation="up">
      <section className="relative overflow-hidden rounded-3xl border border-cream-200 dark:border-white/10 bg-gradient-to-br from-cream-50 via-white to-cream-100/60 dark:from-white/[0.05] dark:via-white/[0.03] dark:to-white/[0.02] shadow-[0_28px_64px_-34px_rgba(43,18,69,0.5)] mb-6">
        {/* Texture papier à patron */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(91,22,249,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.04) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }} />
        {/* Halo violet */}
        <div aria-hidden className="absolute -top-16 -start-10 w-72 h-72 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
        {/* Repères de cadrage */}
        <span aria-hidden className="absolute top-4 start-4 w-4 h-4 border-t-2 border-s-2 border-violet-950/15 dark:border-white/20" />
        <span aria-hidden className="absolute bottom-4 end-4 w-4 h-4 border-b-2 border-e-2 border-violet-950/15 dark:border-white/20" />

        <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] items-center gap-8 p-7 sm:p-10">
          {/* ── Texte ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">N° 02</span>
              <span className="h-px w-9 bg-violet-950/20 dark:bg-white/25" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-violet-950/50 dark:text-white/55">Vendez vos patrons</span>
            </div>

            <h2 className="font-playfair text-3xl sm:text-[2.5rem] font-bold text-violet-950 dark:text-white leading-[1.07] tracking-tight">
              Vos patrons méritent
              <span className="block italic text-orange-600 dark:text-orange-300">une vraie vitrine.</span>
            </h2>

            <p className="text-violet-950/60 dark:text-violet-100/70 font-dm mt-4 max-w-lg leading-relaxed">
              Créez votre <strong className="text-violet-950 dark:text-white font-semibold">fiche patronnage</strong> en quelques clics —
              dessin technique généré par IA à partir de votre photo, tailles, prix —
              puis exposez-la à des milliers de couturières.
            </p>

            {/* Atouts */}
            <div className="flex flex-wrap gap-2.5 mt-6">
              {[
                { Icon: Wand2, label: "Dessin technique IA" },
                { Icon: Ruler, label: "Tailles & prix" },
                { Icon: Scissors, label: "Prête à vendre" },
              ].map((f) => (
                <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full border border-violet-950/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-violet-950/70 dark:text-white/70">
                  <f.Icon size={14} className="text-violet-600 dark:text-violet-300" /> {f.label}
                </span>
              ))}
            </div>

            {/* Boutons */}
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Link href="/patronniste/patrons/nouveau"
                className="shiny-cta group inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold font-dm transition-colors shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                Créer ma fiche patronnage
                <ArrowUpRight size={17} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:-scale-x-100" />
              </Link>
              <Link href="/patronniste/patrons"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold font-dm text-violet-950/75 dark:text-white/80 border border-violet-950/15 dark:border-white/15 hover:bg-violet-950/[0.04] dark:hover:bg-white/[0.06] transition-colors">
                <Layers size={16} /> Mes patrons
              </Link>
            </div>
          </div>

          {/* ── Maquette de fiche ── */}
          <div className="relative hidden sm:block">
            {/* carte fantôme décalée (profondeur) */}
            <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-4 rotate-[4deg] rounded-2xl bg-violet-950/[0.06] dark:bg-white/[0.04]" />
            <div className="relative -rotate-[3deg] hover:rotate-0 transition-transform duration-500 rounded-2xl overflow-hidden bg-[#FBF8F3] border border-cream-200 shadow-[0_22px_50px_-26px_rgba(43,18,69,0.55)]">
              <div className="h-1.5 bg-gradient-to-r from-violet-DEFAULT via-violet-500 to-orange-DEFAULT" />
              <div className="p-4">
                {/* marque + réf */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <img src="/images/arazzo-icon.png" alt="" className="w-7 h-7 rounded-lg" />
                    <div className="leading-none">
                      <div className="font-playfair text-sm font-bold text-orange-600">Arazzo</div>
                      <div className="text-[8px] font-mono tracking-[0.2em] uppercase text-violet-600">Patronnage</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[7px] font-mono tracking-[0.2em] uppercase text-violet-950/40">Réf.</div>
                    <div className="font-playfair text-sm font-bold text-violet-950">N° 1001</div>
                  </div>
                </div>
                {/* titre + filet ciseaux */}
                <div className="text-center mb-3">
                  <div className="font-playfair text-base font-bold text-violet-600">Jupe portefeuille</div>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="h-px w-10 bg-gradient-to-r from-transparent to-cream-300" />
                    <Scissors size={9} className="text-orange-500" />
                    <span className="h-px w-10 bg-gradient-to-l from-transparent to-cream-300" />
                  </div>
                </div>
                {/* 2 panneaux */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="h-28 rounded-lg border border-cream-200 bg-white flex items-center justify-center overflow-hidden"
                      style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(91,22,249,0.07) 0 1px, transparent 1px 7px)" }}>
                      <Scissors size={20} className="text-violet-300" />
                    </div>
                    <div className="text-center text-[7px] font-mono tracking-[0.16em] uppercase text-violet-600 mt-1.5">Dessin technique</div>
                  </div>
                  <div>
                    <div className="h-28 rounded-lg border border-cream-200 bg-gradient-to-br from-violet-DEFAULT to-orange-DEFAULT" />
                    <div className="text-center text-[7px] font-mono tracking-[0.16em] uppercase text-orange-600 mt-1.5">Modèle réel</div>
                  </div>
                </div>
                {/* bas : tailles + badges */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-cream-200">
                  <span className="text-[9px] font-semibold text-violet-950/70" dir="rtl">المقاسات xxs–xxxl</span>
                  <div className="flex gap-1">
                    <span className="text-[7px] font-mono font-bold text-white bg-orange-DEFAULT rounded px-1.5 py-0.5">A0.A4</span>
                    <span className="text-[7px] font-mono font-bold text-white bg-violet-950 rounded px-1.5 py-0.5">PDF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
