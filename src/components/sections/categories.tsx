"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Scissors, PencilRuler, Ruler, Gem, Hand, MonitorSmartphone, Megaphone, Route, ArrowUpRight, type LucideIcon } from "lucide-react";
import { HOME, type Lang } from "@/lib/home-i18n";

const MotionLink = motion.create(Link);

const ICONS: { Icon: LucideIcon; chip: string }[] = [
  { Icon: Scissors, chip: "bg-orange-50 text-orange-600" },
  { Icon: PencilRuler, chip: "bg-violet-50 text-violet-700" },
  { Icon: Ruler, chip: "bg-blush-50 text-blush-500" },
  { Icon: Gem, chip: "bg-orange-50 text-orange-600" },
  { Icon: Hand, chip: "bg-violet-50 text-violet-700" },
  { Icon: MonitorSmartphone, chip: "bg-blush-50 text-blush-500" },
  { Icon: Megaphone, chip: "bg-orange-50 text-orange-600" },
  { Icon: Route, chip: "bg-violet-50 text-violet-700" },
];

function Grid({ names }: { names: string[] }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {ICONS.map((c, i) => (
        <MotionLink
          key={i}
          href="/formations"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: reduce ? 0 : i * 0.07, type: "spring", stiffness: 200, damping: 18 }}
          whileHover={reduce ? undefined : { scale: 1.06, backgroundColor: "#6B21C8", color: "#FFFFFF" }}
          whileTap={{ scale: 0.95 }}
          className="group block bg-white dark:bg-white/[0.04] rounded-3xl p-6 border border-cream-200 dark:border-white/10 shadow-soft h-full"
        >
          <div className="flex items-start justify-between mb-5">
            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${c.chip} group-hover:scale-110 transition-transform`}>
              <c.Icon size={26} strokeWidth={1.75} />
            </span>
            <ArrowUpRight size={18} className="text-gray-300 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <h3 className="font-playfair text-lg font-bold text-gray-900 dark:text-white leading-snug group-hover:text-white transition-colors">{names[i]}</h3>
        </MotionLink>
      ))}
    </div>
  );
}

export function CategoriesSection({ lang = "fr" }: { lang?: Lang }) {
  const t = HOME[lang].categories;
  return (
    <section className="relative py-24 bg-white dark:bg-[#0d0a1c] overflow-hidden">
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
