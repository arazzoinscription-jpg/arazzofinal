"use client";

import { useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import { ArrowDown, Scissors } from "lucide-react";

const PHOTOS = [
  { src: "/images/hero-modelisme-2.jpg", alt: "Atelier de modélisme : tracé d'un patron sur la table de coupe" },
  { src: "/images/cours-modelisme11-feminin.jpg", alt: "Cours de couture féminine en atelier" },
];

/**
 * Ruban-mètre de couturière : règle horizontale graduée (cm + repères),
 * motif signature de la refonte. Purement décoratif.
 */
function TapeMeasure({ count = 40, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden className={`relative h-9 w-full select-none ${className}`}>
      <div className="absolute inset-x-0 top-0 flex justify-between">
        {Array.from({ length: count }).map((_, i) => {
          const major = i % 5 === 0;
          return (
            <span key={i} className="relative flex flex-col items-center" style={{ width: `${100 / count}%` }}>
              <span className={`block w-px ${major ? "h-4 bg-violet-950/45 dark:bg-white/45" : "h-2 bg-violet-950/25 dark:bg-white/25"}`} />
              {major && (
                <span className="mt-1 font-mono text-[8px] tracking-wider text-violet-950/45 dark:text-white/40">{i}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Héro éditorial « spécimen de patron » — refonte couture.
 * Cream papier, ruban-mètre gradué, numéro filigrane démesuré, planche lookbook.
 */
export function FormationsHero({
  title, description, ctaText, features, eyebrow = "Catalogue",
}: {
  title: string;
  description: string;
  ctaText: string;
  features: { title: string; description: string }[];
  eyebrow?: string;
}) {
  const reduce = useReducedMotionSafe();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: 0.05 } } };
  const item: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.7, 0.3, 1] } } };
  const mediaV: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, x: 40, rotate: 4, scale: 0.95 }, show: { opacity: 1, x: 0, rotate: 1.6, scale: 1, transition: { duration: 0.95, ease: [0.2, 0.7, 0.3, 1] } } };

  function scrollDown() {
    document.getElementById("formations-content")?.scrollIntoView({ behavior: "smooth" });
  }

  // Dernier mot du titre mis en exergue (italique orange) — robuste i18n.
  const words = title.trim().split(/\s+/);
  const lastWord = words.pop() ?? title;
  const leadWords = words.join(" ");

  const CropMark = ({ pos }: { pos: string }) => (
    <span aria-hidden className={`absolute w-4 h-4 border-violet-950/30 dark:border-white/25 ${pos}`} />
  );

  return (
    <section className="relative overflow-hidden bg-cream-DEFAULT dark:bg-[#0b0818] pt-32 pb-16 lg:pb-24">
      {/* Texture papier à patron */}
      <div aria-hidden className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(91,22,249,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.045) 1px, transparent 1px)",
          backgroundSize: "29px 29px",
        }} />
      <div aria-hidden className="absolute -top-28 end-[-6rem] w-[40rem] h-[40rem] rounded-full bg-orange-400/15 dark:bg-orange-500/15 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 start-[-8rem] w-[32rem] h-[32rem] rounded-full bg-blush-300/30 dark:bg-violet-700/20 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.07] mix-blend-multiply dark:mix-blend-screen pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* Numéro filigrane démesuré (contour seul) */}
      <span aria-hidden
        className="pointer-events-none absolute -top-8 end-2 lg:end-12 font-playfair font-bold leading-none text-[34vw] lg:text-[20rem] z-0 select-none"
        style={{ WebkitTextStroke: "1.5px rgba(91,22,249,0.10)", color: "transparent" }}>
        00
      </span>

      <motion.div ref={ref} variants={container} initial="hidden" animate={inView ? "show" : "hidden"}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">

        {/* ════ Texte éditorial ════ */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          {/* En-tête spécimen */}
          <motion.div variants={item} className="flex items-center gap-3 mb-7">
            <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">N° 00</span>
            <span className="h-px w-10 bg-violet-950/25 dark:bg-white/25" />
            <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.25em] text-violet-950/60 dark:text-white/55">{eyebrow}</span>
          </motion.div>

          <motion.h1 variants={item}
            className="font-playfair text-[2.9rem] sm:text-6xl lg:text-[5rem] font-bold text-violet-950 dark:text-white leading-[1.0] tracking-tight mb-6">
            {leadWords && <span>{leadWords} </span>}
            <span className="relative inline-block italic text-orange-DEFAULT">
              {lastWord}
              <svg aria-hidden viewBox="0 0 200 14" preserveAspectRatio="none"
                className="absolute -bottom-2 start-0 w-full h-3 text-orange-DEFAULT">
                <path d="M2 9 C 50 2, 150 2, 198 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>

          <motion.p variants={item} className="text-violet-950/70 dark:text-white/65 text-lg leading-relaxed mb-8 max-w-xl font-dm">
            {description}
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap items-center gap-4">
            <button onClick={scrollDown}
              className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-7 py-3.5 rounded-xl font-bold text-lg shadow-glow font-dm transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-DEFAULT dark:focus-visible:ring-offset-[#0b0818]">
              {ctaText}
              <ArrowDown size={19} className="group-hover:translate-y-0.5 transition-transform" />
            </button>
            <span className="hidden sm:inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-violet-950/45 dark:text-white/40">
              <Scissors size={13} className="text-orange-600 dark:text-orange-400" /> coupez le long du trait
            </span>
          </motion.div>

          {/* Ruban-mètre + index « specimen » des atouts */}
          <motion.div variants={item} className="mt-12">
            <TapeMeasure count={36} className="mb-1" />
            <div className="grid sm:grid-cols-3 border-t border-dashed border-violet-950/20 dark:border-white/15 pt-1">
              {features.slice(0, 3).map((f, i) => (
                <div key={f.title} className={`py-5 sm:px-5 sm:first:ps-0 ${i > 0 ? "sm:border-s border-violet-950/12 dark:border-white/12" : ""}`}>
                  <span className="font-mono text-[11px] tracking-[0.22em] text-orange-600 dark:text-orange-400">N° 0{i + 1}</span>
                  <h3 className="font-playfair text-lg font-bold text-violet-950 dark:text-white mt-1.5">{f.title}</h3>
                  <p className="text-sm text-violet-950/55 dark:text-white/50 font-dm mt-1 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ════ Planche atelier (photos encadrées + ruban vertical) ════ */}
        <motion.div variants={mediaV} className="lg:col-span-5 order-1 lg:order-2 relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="relative rotate-[1.6deg] hover:rotate-0 transition-transform duration-500 ease-out">
            <CropMark pos="-top-3 -start-3 border-t-2 border-s-2" />
            <CropMark pos="-top-3 -end-3 border-t-2 border-e-2" />
            <CropMark pos="-bottom-3 -end-3 border-b-2 border-e-2" />
            <CropMark pos="-bottom-3 -start-3 border-b-2 border-s-2" />

            {/* Photo principale */}
            <div className="relative rounded-[1.75rem] bg-cream-100 dark:bg-white/[0.04] p-3 ring-1 ring-violet-950/10 dark:ring-white/10 shadow-[0_34px_70px_-26px_rgba(43,18,69,0.55)]">
              <div className="relative overflow-hidden rounded-[1.25rem] aspect-[4/5]">
                <img src={PHOTOS[0].src} alt={PHOTOS[0].alt} className="absolute inset-0 w-full h-full object-cover" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/55 via-transparent to-violet-950/5" />
                <span className="absolute top-4 start-4 inline-flex items-center font-mono text-[11px] tracking-[0.25em] uppercase bg-orange-DEFAULT text-white px-3 py-1.5 rounded-md shadow-md">
                  Planche N° 00
                </span>
                {/* Ruban-mètre vertical interne */}
                <div aria-hidden className="absolute inset-y-6 end-3 w-3 flex flex-col justify-between">
                  {Array.from({ length: 13 }).map((_, i) => (
                    <span key={i} className={`block h-px bg-white/55 ${i % 4 === 0 ? "w-3" : "w-1.5 self-end"}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Photo secondaire chevauchante */}
            <div className="absolute -bottom-8 -start-6 sm:-start-10 w-28 sm:w-36 -rotate-[7deg] rounded-2xl bg-cream-100 dark:bg-white/[0.05] p-2 ring-1 ring-violet-950/10 dark:ring-white/10 shadow-xl hidden sm:block">
              <div className="relative overflow-hidden rounded-xl aspect-square">
                <img src={PHOTOS[1].src} alt={PHOTOS[1].alt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              </div>
              <span className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-violet-DEFAULT text-white font-playfair text-xs font-bold flex items-center justify-center shadow">A</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Couture de bas */}
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
