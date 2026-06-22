"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import {
  Compass, CreditCard, Receipt, GraduationCap,
  PlayCircle, Scissors, MessagesSquare, Award,
  ArrowRight, Sparkles, type LucideIcon,
} from "lucide-react";
import { STORE, isRtl, type Lang } from "@/lib/store-i18n";
import { AnimatedText } from "@/components/ui/animated-text";

const STEP_ICONS: LucideIcon[] = [Compass, CreditCard, Receipt, GraduationCap];
const FEATURE_ICONS: LucideIcon[] = [PlayCircle, Scissors, MessagesSquare, Award];

/* ── Section : Comment s'inscrire ──────────────────────────────────────── */
function EnrollSteps({ lang }: { lang: Lang }) {
  const t = STORE[lang].guide;
  const ref = useRef(null);
  const reduce = useReducedMotionSafe();
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-20 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-cream-DEFAULT dark:bg-[#0d0a1c]" />
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "22px 22px" }} />

      <div ref={ref} className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-orange-700 dark:text-orange-300 font-dm text-xs font-bold uppercase tracking-[0.2em] mb-3">
            <span className="w-8 h-px bg-orange-400" /> {t.enrollEyebrow} <span className="w-8 h-px bg-orange-400" />
          </span>
          <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
            {t.enrollTitle} <span className="italic text-orange-600 dark:text-orange-300">{t.enrollTitleHi}</span>
          </h2>
          <p className="text-gray-500 dark:text-white/50 font-dm mt-3 max-w-md mx-auto">{t.enrollSub}</p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px border-t-2 border-dashed border-orange-300/60 dark:border-orange-400/30" />

          {t.steps.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <motion.div
                key={s.title}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.12 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="relative z-10 mb-5">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-[#15102b] border-2 border-orange-300/70 dark:border-orange-400/40 flex items-center justify-center shadow-soft group-hover:border-orange-500 group-hover:-translate-y-1 transition-all duration-300">
                    <Icon size={26} className="text-orange-600 dark:text-orange-300" strokeWidth={1.75} />
                  </div>
                  <span className="absolute -top-2 -end-2 w-7 h-7 rounded-full bg-violet-DEFAULT text-white text-sm font-bold font-playfair flex items-center justify-center shadow">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-playfair text-xl font-bold text-gray-900 dark:text-white mb-1.5">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-white/50 font-dm leading-relaxed max-w-[15rem]">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Section : Comment utiliser la plateforme ──────────────────────────── */
function UseFeatures({ lang }: { lang: Lang }) {
  const t = STORE[lang].guide;
  const ref = useRef(null);
  const reduce = useReducedMotionSafe();
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-20 sm:py-24 bg-cream-50 dark:bg-[#120d24] overflow-hidden">
      <div className="absolute -top-24 -right-24 w-[34rem] h-[34rem] rounded-full bg-violet-100/50 dark:bg-violet-900/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-orange-100/50 dark:bg-orange-900/15 blur-3xl pointer-events-none" />

      <div ref={ref} className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <span className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 font-dm text-xs font-bold uppercase tracking-[0.2em] mb-3">
              <Sparkles size={14} /> {t.useEyebrow}
            </span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-[1.05]">
              {t.useTitle1}<br /><span className="italic text-violet-700 dark:text-violet-300">{t.useTitle2}</span>
            </h2>
            <p className="text-gray-500 dark:text-white/55 font-dm mt-5 leading-relaxed">{t.useText}</p>
            <Link href="/login"
              className="group inline-flex items-center gap-2 mt-7 text-orange-600 dark:text-orange-300 font-dm font-semibold hover:gap-3 transition-all">
              {t.useCta}
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
            </Link>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {t.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <motion.div
                  key={f.title}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.1 }}
                  className={`relative rounded-2xl border border-cream-200 dark:border-white/10 bg-cream-50/60 dark:bg-white/[0.03] p-6 hover:shadow-glow hover:-translate-y-1 transition-all duration-300 ${i % 2 === 1 ? "sm:translate-y-6" : ""}`}
                >
                  <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-blush-50 dark:from-orange-500/20 dark:to-violet-500/10 flex items-center justify-center mb-4">
                    <Icon size={22} className="text-orange-600 dark:text-orange-300" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-playfair text-lg font-bold text-gray-900 dark:text-white mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-white/50 font-dm leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA final ─────────────────────────────────────────────────────────── */
function FinalCTA({ lang }: { lang: Lang }) {
  const t = STORE[lang].guide;
  return (
    <section className="relative py-8 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-900 via-violet-800 to-[#2a1245] px-7 sm:px-14 py-14 sm:py-16 text-center shadow-2xl">
          <div className="absolute inset-3 rounded-[1.6rem] border border-dashed border-white/15 pointer-events-none" />
          <div className="absolute -top-16 right-10 w-56 h-56 rounded-full bg-orange-500/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-6 w-64 h-64 rounded-full bg-violet-500/30 blur-3xl pointer-events-none" />

          <div className="relative">
            <Scissors className="mx-auto text-orange-300 mb-5" size={32} strokeWidth={1.5} />
            <AnimatedText
              as="h2"
              text={`${t.ctaTitle} ${t.ctaTitleHi} ?`}
              textClassName="font-playfair text-3xl sm:text-5xl font-bold text-white leading-tight max-w-2xl mx-auto"
              underlineClassName="text-orange-400"
            >
              {t.ctaTitle} <span className="italic text-orange-300">{t.ctaTitleHi}</span> ?
            </AnimatedText>
            <p className="text-violet-200 font-dm mt-4 max-w-lg mx-auto">{t.ctaSub}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
              <Link href="/login"
                className="group inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-glow hover:bg-orange-500 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 font-dm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                {t.ctaPrimary}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform rtl:rotate-180" />
              </Link>
              <Link href="/boutique"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/25 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 transition-colors font-dm">
                {t.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FormationsGuide({ lang = "fr" }: { lang?: Lang }) {
  return (
    <>
      <EnrollSteps lang={lang} />
      <UseFeatures lang={lang} />
      <FinalCTA lang={lang} />
    </>
  );
}
