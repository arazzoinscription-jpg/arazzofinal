"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import { ArrowUpRight, FolderOpen, BookOpen, Scissors } from "lucide-react";

export interface CatItem {
  id: string;
  href: string;
  name: string;
  image: string | null;
  gradient: string;
  /** Nombre d'éléments (sous-catégories ou cours). */
  count: number;
  /** true = afficher en « sous-catégories », false = « cours ». */
  isSub: boolean;
  metaLabel: string;
}

/**
 * Grille de catégories façon « enveloppes de patron » (refonte couture).
 * - Carte = pochette de patron : couture en pointillés, coin corné, n° de planche.
 * - Fenêtre-échantillon (swatch) avec zoom au survol via transform (zéro reflow).
 * - Scrim sombre garantissant un contraste texte ≥ 4.5:1 ; focus clavier visible.
 * - Entrée échelonnée respectant prefers-reduced-motion.
 */
export function CategoryGrid({ items }: { items: CatItem[] }) {
  const ref = useRef(null);
  const reduce = useReducedMotionSafe();
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
      {items.map((c, i) => {
        const Meta = c.isSub ? FolderOpen : BookOpen;
        const num = String(i + 1).padStart(2, "0");
        return (
          <motion.div
            key={c.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: reduce ? 0 : Math.min(i * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={c.href}
              className="group relative block rounded-[1.4rem] bg-cream-50 dark:bg-white/[0.04] p-3 ring-1 ring-violet-950/10 dark:ring-white/10 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow hover:ring-orange-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-DEFAULT dark:focus-visible:ring-offset-[#0d0a1c]"
            >
              {/* Repères de cadrage (coins) */}
              <span aria-hidden className="absolute top-1.5 start-1.5 w-3 h-3 border-t-2 border-s-2 border-violet-950/20 dark:border-white/20 rounded-tl" />
              <span aria-hidden className="absolute bottom-1.5 end-1.5 w-3 h-3 border-b-2 border-e-2 border-violet-950/20 dark:border-white/20 rounded-br" />

              {/* Fenêtre-échantillon (swatch) */}
              <div className="relative h-48 sm:h-52 rounded-2xl overflow-hidden">
                {c.image ? (
                  <img
                    src={c.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

                {/* Plaque numéro de planche */}
                <span className="absolute top-3 start-3 inline-flex items-center font-mono text-[10px] tracking-[0.25em] uppercase bg-orange-DEFAULT text-white px-2.5 py-1 rounded-md shadow-md tnum">
                  N° {num}
                </span>

                {/* Pastille de comptage (verre dépoli) */}
                <span className="absolute top-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20 tnum">
                  <Meta size={13} className="opacity-90" />
                  {c.count}
                </span>

                {/* Ruban-mètre interne (bas de la fenêtre) */}
                <div aria-hidden className="absolute bottom-0 inset-x-0 h-4 flex items-end justify-between px-2 pb-1 opacity-70">
                  {Array.from({ length: 18 }).map((_, k) => (
                    <span key={k} className={`block w-px bg-white/60 ${k % 3 === 0 ? "h-2.5" : "h-1.5"}`} />
                  ))}
                </div>
              </div>

              {/* Rabat de l'enveloppe : couture en pointillés */}
              <div className="relative mt-3 px-1.5 pb-1">
                <span aria-hidden className="absolute -top-1.5 inset-x-1 border-t border-dashed border-violet-950/25 dark:border-white/20" />
                <div className="flex items-start justify-between gap-3 pt-1.5">
                  <div className="min-w-0">
                    <h3 className="font-playfair text-xl font-bold leading-tight text-violet-950 dark:text-white truncate">
                      {c.name}
                    </h3>
                    <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-violet-950/55 dark:text-white/50">
                      <Meta size={12} />
                      {c.metaLabel}
                    </p>
                  </div>
                  {/* Coin corné / flèche */}
                  <span className="shrink-0 w-9 h-9 rounded-full bg-violet-950 dark:bg-orange-DEFAULT text-white flex items-center justify-center shadow-md transition-transform duration-300 group-hover:rotate-45">
                    <ArrowUpRight size={17} className="rtl:-scale-x-100" />
                  </span>
                </div>
                {/* Soulignement de marque animé */}
                <span aria-hidden className="mt-3 block h-0.5 w-10 rounded-full bg-orange-DEFAULT transition-all duration-300 group-hover:w-full" />
              </div>

              {/* Petit ciseau décoratif sur la couture */}
              <Scissors aria-hidden size={13} className="absolute -top-0.5 end-6 text-violet-950/25 dark:text-white/25 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
