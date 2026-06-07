"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useSpring, type Variants } from "framer-motion";
import { Users, Film, Star, ArrowRight, Sparkles, Check } from "lucide-react";
import { HOME, type Lang } from "@/lib/home-i18n";

const MotionLink = motion.create(Link);

const STAT_META = [
  { prefix: "+", target: 12000, decimals: 0, suffix: "", Icon: Users },
  { prefix: "", target: 127, decimals: 0, suffix: "", Icon: Film },
  { prefix: "", target: 4.8, decimals: 1, suffix: "/5", Icon: Star },
];

function StatCounter({ prefix, target, decimals, suffix }: { prefix: string; target: number; decimals: number; suffix: string }) {
  const reduce = useReducedMotion();
  const spring = useSpring(reduce ? target : 0, { stiffness: 60, damping: 20 });
  const [disp, setDisp] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => spring.set(target), 250);
    return () => clearTimeout(t);
  }, [reduce, spring, target]);

  useEffect(() => spring.on("change", (v) => setDisp(v)), [spring]);

  const formatted = decimals > 0 ? disp.toFixed(decimals).replace(".", ",") : Math.round(disp).toLocaleString("fr-FR");
  return <>{prefix}{formatted}{suffix}</>;
}

export function HeroSection({ lang = "fr" }: { lang?: Lang }) {
  const reduce = useReducedMotion();
  const t = HOME[lang].hero;
  const statLabels = [t.statActives, t.statCourses, t.statRating];

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: 0.1 } } };
  const item: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.7, 0.3, 1] } } };
  const badgeItem: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, x: -24 }, show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: "easeOut" } } };
  const titleContainer: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.08 } } };
  const word: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.7, 0.3, 1] } } };
  const trustContainer: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: 0.1 } } };
  const trustItem: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  const Word = ({ children }: { children: React.ReactNode }) => (
    <motion.span variants={word} className="inline-block mx-[0.14em]">{children}</motion.span>
  );

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <video className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline preload="auto" aria-hidden="true" poster="/images/hero-modelisme-1.jpg">
        <source src="/videos/hero-couture.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-r from-violet-950/90 via-violet-900/65 to-orange-900/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-violet-950/80 via-transparent to-violet-950/40" />
      <div className="absolute -bottom-32 right-0 w-[40rem] h-[40rem] rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
        <div className="max-w-3xl">
          <motion.div variants={badgeItem} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-7">
            <Sparkles size={15} className="text-orange-300" />
            <span className="text-white/90 text-sm font-semibold font-dm tracking-wide">{t.badge}</span>
          </motion.div>

          <motion.h1 variants={titleContainer} className="font-playfair text-[2.9rem] sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-5">
            {t.t1.split(" ").map((w, i) => <Word key={`a${i}`}>{w}</Word>)}{" "}
            <motion.span variants={word} className="relative inline-block italic bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent mx-[0.14em]">
              {t.hi}
              <svg className="absolute -bottom-3 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
                <path d="M3 8 Q75 2 150 7 Q225 12 297 4" stroke="#E8650A" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray="2 7" />
              </svg>
            </motion.span>
            <br />
            {t.t2.split(" ").map((w, i) => <Word key={`b${i}`}>{w}</Word>)}
          </motion.h1>

          <motion.p variants={item} className="text-white/85 text-lg leading-relaxed mb-9 max-w-xl font-dm">{t.subtitle}</motion.p>

          <motion.div variants={item} className="flex flex-wrap gap-x-8 gap-y-4 mb-10">
            {STAT_META.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-orange-300"><s.Icon size={18} /></span>
                <div>
                  <div className="text-2xl font-bold font-playfair text-white leading-none">
                    <StatCounter prefix={s.prefix} target={s.target} decimals={s.decimals} suffix={s.suffix} />
                  </div>
                  <div className="text-xs text-white/60 font-dm mt-1">{statLabels[i]}</div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={item} className="flex flex-wrap gap-4 mb-7">
            <MotionLink href="/formations" whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 300 }}
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl font-dm">
              {t.ctaPrimary}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </MotionLink>
            <MotionLink href="/boutique" whileHover={{ x: 6 }} transition={{ duration: 0.2 }}
              className="inline-flex items-center bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-violet-900 transition-colors font-dm">
              {t.ctaSecondary}
            </MotionLink>
          </motion.div>

          <motion.div variants={trustContainer} className="flex flex-wrap items-center gap-5 text-sm text-white/70 font-dm">
            {t.trust.map((tx) => (
              <motion.span key={tx} variants={trustItem} className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-orange-400/90 text-white flex items-center justify-center"><Check size={11} strokeWidth={3} /></span>
                {tx}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream-DEFAULT to-transparent pointer-events-none" />
    </section>
  );
}
