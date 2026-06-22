"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useSpring, type Variants } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import { ArrowRight, Check, Star, Scissors } from "lucide-react";
import { HOME, type Lang } from "@/lib/home-i18n";
import { Sparkles as SparklesFx } from "@/components/ui/sparkles";

const MotionLink = motion.create(Link);

const STAT_META = [
  { prefix: "+", target: 12000, decimals: 0, suffix: "" },
  { prefix: "", target: 127, decimals: 0, suffix: "" },
  { prefix: "", target: 4.8, decimals: 1, suffix: "/5" },
];

function StatCounter({ prefix, target, decimals, suffix }: { prefix: string; target: number; decimals: number; suffix: string }) {
  const reduce = useReducedMotionSafe();
  const spring = useSpring(reduce ? target : 0, { stiffness: 60, damping: 20 });
  const [disp, setDisp] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => spring.set(target), 250);
    return () => clearTimeout(t);
  }, [reduce, spring, target]);

  useEffect(() => spring.on("change", (v) => setDisp(v)), [spring]);

  // En reduced-motion (et après montage), on affiche directement la valeur cible
  // sans dépendre de l'animation du ressort. Au SSR + 1re passe client, `reduce`
  // vaut false → on affiche `disp` (0), identique au HTML serveur (pas de mismatch).
  const shown = reduce ? target : disp;
  const formatted = decimals > 0 ? shown.toFixed(decimals).replace(".", ",") : Math.round(shown).toLocaleString("fr-FR");
  return <>{prefix}{formatted}{suffix}</>;
}

export function HeroSection({ lang = "fr" }: { lang?: Lang }) {
  const reduce = useReducedMotionSafe();
  const router = useRouter();
  const t = HOME[lang].hero;
  const statLabels = [t.statActives, t.statCourses, t.statRating];

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.11, delayChildren: 0.08 } } };
  const item: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.7, 0.3, 1] } } };
  const titleContainer: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.07 } } };
  const word: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.7, 0.3, 1] } } };
  const media: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }, show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.9, ease: [0.2, 0.7, 0.3, 1] } } };

  const Word = ({ children }: { children: React.ReactNode }) => (
    <motion.span variants={word} className="inline-block me-[0.24em]">{children}</motion.span>
  );

  // Repères de cadrage (crop marks) — détail d'imprimerie éditorial
  const CropMark = ({ pos }: { pos: string }) => (
    <span aria-hidden className={`absolute w-4 h-4 border-violet-950/30 dark:border-white/25 ${pos}`} />
  );

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-cream-DEFAULT dark:bg-[#0b0818]">
      {/* ── Texture : papier à patron (grille fine) ── */}
      <div aria-hidden className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(91,22,249,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.04) 1px, transparent 1px)",
          backgroundSize: "27px 27px",
        }} />
      {/* ── Halos couleur ── */}
      <div aria-hidden className="absolute -top-32 end-[-6rem] w-[42rem] h-[42rem] rounded-full bg-orange-400/15 dark:bg-orange-500/15 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 start-[-8rem] w-[34rem] h-[34rem] rounded-full bg-blush-300/30 dark:bg-violet-700/20 blur-3xl pointer-events-none" />
      {/* ── Grain ── */}
      <div aria-hidden className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.07] mix-blend-multiply dark:mix-blend-screen pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      {/* ── Poussière d'atelier (Sparkles) ── */}
      <SparklesFx
        className="absolute inset-0 z-0 pointer-events-none"
        color="#FE7223"
        density={140}
        size={1.6}
        speed={0.5}
        opacity={0.75}
      />

      {/* ── Étiquette verticale (LTR seulement) ── */}
      {lang !== "ar" && (
        <div aria-hidden className="hidden xl:block absolute start-6 top-1/2 -translate-y-1/2 z-10">
          <span className="block font-mono text-[11px] tracking-[0.45em] uppercase text-violet-950/35 dark:text-white/30 [writing-mode:vertical-rl] rotate-180">
            Arazzo · Maison de couture · Est. 2024
          </span>
        </div>
      )}

      <motion.div variants={container} initial="hidden" animate="show"
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:ps-20 pt-32 pb-24 grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">

        {/* ════ Colonne éditoriale ════ */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          {/* Surtitre */}
          <motion.div variants={item} className="flex items-center gap-3 mb-7">
            <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">N° 01</span>
            <span className="h-px w-10 bg-violet-950/25 dark:bg-white/25" />
            <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.18em] text-violet-950/60 dark:text-white/55">{t.badge}</span>
          </motion.div>

          {/* Titre */}
          <motion.h1 variants={titleContainer}
            className="font-playfair text-[3rem] sm:text-6xl lg:text-[5.2rem] font-bold text-violet-950 dark:text-white leading-[1.02] tracking-tight mb-6">
            {t.t1.split(" ").map((w, i) => <Word key={`a${i}`}>{w}</Word>)}{" "}
            <motion.span variants={word} className="relative inline-block italic text-orange-600 dark:text-orange-400 me-[0.24em]">
              {t.hi}
              <svg className="absolute -bottom-2 sm:-bottom-3 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none" aria-hidden>
                <path d="M3 8 Q75 2 150 7 Q225 12 297 4" stroke="#FE7223" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray="2 7" />
              </svg>
            </motion.span>
            <br />
            {t.t2.split(" ").map((w, i) => <Word key={`b${i}`}>{w}</Word>)}
          </motion.h1>

          {/* Sous-titre */}
          <motion.p variants={item} className="text-violet-950/70 dark:text-white/65 text-lg leading-relaxed mb-9 max-w-xl font-dm">
            {t.subtitle}
          </motion.p>

          {/* Boutons */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-4 mb-10">
            <MotionLink href="/formations" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 320 }}
              className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-glow font-dm">
              {t.ctaPrimary}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform rtl:rotate-180" />
            </MotionLink>
            <button onClick={() => router.push("/boutique")}
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-lg font-dm bg-violet-DEFAULT text-white shadow-lg shadow-violet-500/30 hover:bg-violet-700 hover:-translate-y-0.5 transition-all">
              <Scissors size={18} className="text-white -rotate-12" />
              {t.ctaSecondary}
            </button>
          </motion.div>

          {/* Crédits chiffrés */}
          <motion.div variants={item} className="flex flex-wrap gap-y-4">
            {STAT_META.map((s, i) => (
              <div key={i} className={`px-6 first:ps-0 ${i > 0 ? "border-s border-violet-950/12 dark:border-white/12" : ""}`}>
                <div className="font-playfair text-3xl font-bold text-violet-950 dark:text-white leading-none tabular-nums">
                  <StatCounter prefix={s.prefix} target={s.target} decimals={s.decimals} suffix={s.suffix} />
                </div>
                <div className="text-[10px] font-dm font-semibold uppercase tracking-[0.16em] text-violet-950/45 dark:text-white/45 mt-2">{statLabels[i]}</div>
              </div>
            ))}
          </motion.div>

          {/* Garanties */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8 text-sm text-violet-950/60 dark:text-white/55 font-dm">
            {t.trust.map((tx) => (
              <span key={tx} className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center"><Check size={11} strokeWidth={3} /></span>
                {tx}
              </span>
            ))}
          </motion.div>
        </div>

        {/* ════ Cadre atelier (média) ════ */}
        <motion.div variants={media} className="lg:col-span-5 order-1 lg:order-2 relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="relative rotate-[1.6deg] hover:rotate-0 transition-transform duration-500 ease-out">
            {/* Repères de cadrage */}
            <CropMark pos="-top-3 -start-3 border-t-2 border-s-2" />
            <CropMark pos="-top-3 -end-3 border-t-2 border-e-2" />
            <CropMark pos="-bottom-3 -start-3 border-b-2 border-s-2" />
            <CropMark pos="-bottom-3 -end-3 border-b-2 border-e-2" />

            {/* Passe-partout */}
            <div className="relative rounded-[1.75rem] bg-cream-100 dark:bg-white/[0.04] p-3 ring-1 ring-violet-950/10 dark:ring-white/10 shadow-[0_34px_70px_-26px_rgba(43,18,69,0.55)]">
              <div className="relative overflow-hidden rounded-[1.25rem] aspect-[4/5]">
                <video className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline preload="auto"
                  poster="/images/hero-modelisme-1.jpg" aria-hidden="true"
                  style={lang === "ar" ? { transform: "scaleX(-1)" } : undefined}>
                  <source src="/videos/hero-couture.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/55 via-transparent to-violet-950/10" />

                {/* Plaque N° */}
                <span className="absolute top-4 start-4 inline-flex items-center font-mono text-[11px] tracking-[0.25em] uppercase bg-orange-DEFAULT text-white px-3 py-1.5 rounded-md shadow-md">
                  N° 01
                </span>

                {/* Règle de couturière (ticks) */}
                <div aria-hidden className="absolute inset-y-6 end-3 w-3 flex flex-col justify-between">
                  {Array.from({ length: 13 }).map((_, i) => (
                    <span key={i} className={`block h-px bg-white/55 ${i % 4 === 0 ? "w-3" : "w-1.5 self-end"}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Puce note flottante */}
            <div className="absolute -bottom-6 -start-5 sm:-start-7 -rotate-[4deg] bg-white dark:bg-[#15102b] rounded-2xl px-4 py-3 shadow-xl ring-1 ring-violet-950/10 dark:ring-white/10">
              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="text-orange-500 fill-orange-500" />
                ))}
              </div>
              <div className="font-playfair text-lg font-bold text-violet-950 dark:text-white leading-none tabular-nums">4,8<span className="text-violet-950/40 dark:text-white/40 text-sm">/5</span></div>
              <div className="text-[10px] font-dm font-semibold uppercase tracking-[0.14em] text-violet-950/45 dark:text-white/45 mt-1">{t.statRating}</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Couture de bas de section ── */}
      <div aria-hidden className="absolute bottom-0 inset-x-0 flex items-center justify-center pb-5">
        <span className="flex-1 border-t border-dashed border-violet-950/15 dark:border-white/15" />
        <span className="mx-3 w-8 h-8 rounded-full bg-cream-100 dark:bg-white/[0.06] ring-1 ring-violet-950/10 dark:ring-white/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
          <Scissors size={15} />
        </span>
        <span className="flex-1 border-t border-dashed border-violet-950/15 dark:border-white/15" />
      </div>
    </section>
  );
}
