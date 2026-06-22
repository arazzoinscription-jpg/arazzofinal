import Link from "next/link";
import { Video, ShieldCheck, Lock, ArrowUpRight, Play, BookOpen } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

/**
 * CTA hero de l'espace formatrice : « Filmez vos cours, restez protégée ».
 * Met en avant l'upload vidéo (Bunny Stream) + la protection du contenu
 * (streaming sécurisé, anti-téléchargement). Univers atelier Arazzo.
 */
export function FormateurHeroCTA() {
  return (
    <Reveal animation="up">
      <section className="relative overflow-hidden rounded-3xl border border-cream-200 dark:border-white/10 bg-gradient-to-br from-cream-50 via-white to-cream-100/60 dark:from-white/[0.05] dark:via-white/[0.03] dark:to-white/[0.02] shadow-[0_28px_64px_-34px_rgba(43,18,69,0.5)] mb-6">
        {/* Texture papier */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(91,22,249,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.04) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }} />
        <div aria-hidden className="absolute -top-16 -end-10 w-72 h-72 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
        <span aria-hidden className="absolute top-4 start-4 w-4 h-4 border-t-2 border-s-2 border-violet-950/15 dark:border-white/20" />
        <span aria-hidden className="absolute bottom-4 end-4 w-4 h-4 border-b-2 border-e-2 border-violet-950/15 dark:border-white/20" />

        <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] items-center gap-8 p-7 sm:p-10">
          {/* ── Texte ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">N° 02</span>
              <span className="h-px w-9 bg-violet-950/20 dark:bg-white/25" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-violet-950/50 dark:text-white/55">Vos cours vidéo</span>
            </div>

            <h2 className="font-playfair text-3xl sm:text-[2.5rem] font-bold text-violet-950 dark:text-white leading-[1.07] tracking-tight">
              Filmez. Enseignez.
              <span className="block italic text-orange-600 dark:text-orange-300">Restez protégée.</span>
            </h2>

            <p className="text-violet-950/60 dark:text-violet-100/70 font-dm mt-4 max-w-lg leading-relaxed">
              Téléversez vos cours en vidéo en un clic — <strong className="text-violet-950 dark:text-white font-semibold">streaming sécurisé</strong>,
              lecture protégée contre la copie et le téléchargement. Votre savoir-faire reste le vôtre.
            </p>

            <div className="flex flex-wrap gap-2.5 mt-6">
              {[
                { Icon: Video, label: "Upload direct" },
                { Icon: ShieldCheck, label: "Lecture protégée" },
                { Icon: Lock, label: "Anti-téléchargement" },
              ].map((f) => (
                <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full border border-violet-950/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-violet-950/70 dark:text-white/70">
                  <f.Icon size={14} className="text-violet-600 dark:text-violet-300" /> {f.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Link href="/formateur/cours/nouveau"
                className="shiny-cta group inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold font-dm transition-colors shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                Créer un cours vidéo
                <ArrowUpRight size={17} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:-scale-x-100" />
              </Link>
              <Link href="/formateur/packs/nouveau"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold font-dm text-violet-950/75 dark:text-white/80 border border-violet-950/15 dark:border-white/15 hover:bg-violet-950/[0.04] dark:hover:bg-white/[0.06] transition-colors">
                <BookOpen size={16} /> Créer un pack
              </Link>
            </div>
          </div>

          {/* ── Mockup lecteur protégé ── */}
          <div className="relative hidden sm:block">
            <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-4 rotate-[3deg] rounded-2xl bg-violet-950/[0.06] dark:bg-white/[0.04]" />
            <div className="relative -rotate-[2deg] hover:rotate-0 transition-transform duration-500 rounded-2xl overflow-hidden bg-[#15101f] border border-white/10 shadow-[0_22px_50px_-26px_rgba(43,18,69,0.6)]">
              {/* écran 16:9 */}
              <div className="relative aspect-video bg-gradient-to-br from-violet-900 via-[#1b0c3c] to-[#2a1245] flex items-center justify-center">
                {/* grain */}
                <div aria-hidden className="absolute inset-0 opacity-[0.07] mix-blend-screen"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
                <span className="relative w-14 h-14 rounded-full bg-orange-DEFAULT flex items-center justify-center shadow-glow">
                  <Play size={22} className="text-white fill-white ml-0.5" />
                </span>
                {/* badge protégé */}
                <span className="absolute top-3 start-3 inline-flex items-center gap-1.5 bg-black/45 backdrop-blur text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                  <ShieldCheck size={12} className="text-emerald-300" /> Contenu protégé
                </span>
                <span className="absolute top-3 end-3 inline-flex items-center gap-1 bg-black/45 backdrop-blur text-white/80 text-[10px] font-semibold px-2 py-1 rounded-full">
                  <Lock size={11} /> HLS
                </span>
                {/* barre de lecture */}
                <div className="absolute bottom-3 start-3 end-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-gradient-to-r from-orange-DEFAULT to-orange-400 rounded-full" />
                  </div>
                  <span className="text-[9px] text-white/70 font-mono">12:40</span>
                </div>
              </div>
              {/* pied lecteur */}
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <img src="/images/arazzo-icon.png" alt="" className="w-6 h-6 rounded-md" />
                  <span className="text-white/90 text-xs font-semibold">Leçon 1 · Le patron de base</span>
                </div>
                <span className="text-[9px] font-mono text-white/40">ARAZZO</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
