"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Scissors, PencilRuler, Ruler, Gem, Hand, MonitorSmartphone, Megaphone, Route, ArrowUpRight, type LucideIcon } from "lucide-react";
import { HOME, type Lang } from "@/lib/home-i18n";

const MotionLink = motion.create(Link);

const ICONS: { Icon: LucideIcon; chip: string; slug: string | null }[] = [
  { Icon: Scissors, chip: "bg-orange-50 text-orange-600", slug: "modelisme" },
  { Icon: PencilRuler, chip: "bg-violet-50 text-violet-700", slug: "stylisme" },
  { Icon: Ruler, chip: "bg-blush-50 text-blush-500", slug: "modelisme-industriel" },
  { Icon: Gem, chip: "bg-orange-50 text-orange-600", slug: "accessoire" },
  { Icon: Hand, chip: "bg-violet-50 text-violet-700", slug: "artisanat" },
  { Icon: MonitorSmartphone, chip: "bg-blush-50 text-blush-500", slug: "patron-numerique" },
  { Icon: Megaphone, chip: "bg-orange-50 text-orange-600", slug: "pret-a-porter" },
  { Icon: Route, chip: "bg-violet-50 text-violet-700", slug: "haute-couture" },
];

function Grid({ names }: { names: string[] }) {
  const ref = useRef(null);
  const reduce = useReducedMotionSafe();
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {ICONS.map((c, i) => (
        <MotionLink
          key={i}
          href={c.slug ? `/formations?cat=${c.slug}` : "/formations"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 16 }}
          animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ delay: reduce ? 0 : i * 0.07, type: "spring", stiffness: 200, damping: 20 }}
          whileHover={reduce ? undefined : { y: -6 }}
          whileTap={{ scale: 0.97 }}
          className="group relative block rounded-3xl overflow-hidden aspect-[4/5] border border-cream-200 dark:border-white/10 shadow-soft h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          {/* Photo de catégorie (Nano Banana) — repli sur un fond crème si absente. */}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-cream-100 to-blush-100 dark:from-white/[0.06] dark:to-white/[0.02]" />
          {c.slug && (
            <img
              src={`/images/home-categories/${c.slug}.jpg`}
              alt=""
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          )}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-violet-950/80 via-violet-950/20 to-transparent" />

          <span className="absolute top-3 end-3 w-9 h-9 rounded-full bg-white/85 dark:bg-white/15 backdrop-blur flex items-center justify-center text-violet-800 dark:text-white shadow-sm group-hover:bg-orange-DEFAULT group-hover:text-white transition-colors">
            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:-scale-x-100" />
          </span>

          <div className="absolute inset-x-0 bottom-0 p-4 flex items-center gap-2.5">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-white/90 dark:bg-white/15 backdrop-blur flex items-center justify-center text-violet-800 dark:text-white shadow-sm">
              <c.Icon size={18} strokeWidth={1.9} />
            </span>
            <h3 className="font-playfair text-base sm:text-lg font-bold text-white leading-tight drop-shadow-sm">{names[i]}</h3>
          </div>
        </MotionLink>
      ))}
    </div>
  );
}

export function CategoriesSection({ lang = "fr" }: { lang?: Lang }) {
  const t = HOME[lang].categories;
  return (
    <section className="relative py-24 bg-transparent overflow-hidden">
      <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-[40rem] h-64 bg-blush-100/40 dark:bg-violet-900/20 blur-3xl rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} highlight={t.hi} />

        <Grid names={t.names} />

        <Reveal animation="up" delay={120}>
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            <div className="rounded-3xl p-7 bg-gradient-to-br from-orange-50 to-blush-50 dark:from-white/[0.04] dark:to-white/[0.04] border border-orange-100 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-300 mb-2">{t.b1t}</p>
              <p className="text-gray-700 dark:text-white/70 font-dm">{t.b1d}</p>
            </div>
            <div className="rounded-3xl p-7 bg-gradient-to-br from-violet-50 to-orange-50 dark:from-white/[0.04] dark:to-white/[0.04] border border-violet-100 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-2">{t.b2t}</p>
              <p className="text-gray-700 dark:text-white/70 font-dm">{t.b2d}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
