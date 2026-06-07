"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { HOME, type Lang } from "@/lib/home-i18n";

const META = [
  { name: "Amina B.", city: "Alger", flag: "🇩🇿", initial: "A", color: "bg-orange-DEFAULT text-white" },
  { name: "Kenza M.", city: "Oran", flag: "🇩🇿", initial: "K", color: "bg-orange-DEFAULT text-white" },
  { name: "Inès T.", city: "Constantine", flag: "🇩🇿", initial: "I", color: "bg-blush-300 text-violet-800" },
];

function TestimonialCard({ m, text, course, index }: { m: (typeof META)[number]; text: string; course: string; index: number }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const starWrap: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.2 } } };
  const star: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }, show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 15 } } };

  return (
    <motion.div
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: reduce ? 0 : index * 0.15, duration: 0.55 }}
      whileHover={{ scale: 1.02 }}
      className="h-full bg-white dark:bg-white/[0.04] rounded-[1.75rem] p-7 border border-cream-200 dark:border-white/10 shadow-soft hover:shadow-2xl transition-shadow duration-300 flex flex-col"
    >
      <motion.div variants={starWrap} initial="hidden" animate={inView ? "show" : "hidden"} className="flex gap-0.5 text-orange-DEFAULT text-xl mb-4">
        {[...Array(5)].map((_, j) => <motion.span key={j} variants={star}>★</motion.span>)}
      </motion.div>

      <p className="text-gray-700 dark:text-white/70 leading-relaxed mb-6 font-dm italic flex-1">&ldquo;{text}&rdquo;</p>

      <div className="flex items-center gap-3 pt-4 border-t border-cream-200 dark:border-white/10">
        <motion.div whileHover={{ scale: 1.12 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${m.color}`}>
          {m.initial}
        </motion.div>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white font-dm">{m.name}</div>
          <div className="text-xs text-gray-500 dark:text-white/50 font-dm">
            {m.flag} {m.city} · <span className="text-orange-600 font-medium">{course}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection({ lang = "fr" }: { lang?: Lang }) {
  const t = HOME[lang].testimonials;
  return (
    <section className="relative py-24 bg-white dark:bg-[#0d0a1c] overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[600px] h-72 bg-blush-100/50 dark:bg-violet-900/20 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} highlight={t.hi} sub={t.sub} />

        <Reveal animation="zoom">
          <div className="relative bg-gradient-to-br from-violet-DEFAULT via-violet-600 to-violet-800 rounded-[2rem] p-8 md:p-12 mb-12 overflow-hidden shadow-glow">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blush-300/15 -translate-y-1/3 translate-x-1/3 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-orange-DEFAULT/15 translate-y-1/3 -translate-x-1/3 blur-2xl" />
            <div className="relative flex flex-col md:flex-row items-center gap-9">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 -m-2 rounded-[1.75rem] stitch-border border-white/30 rotate-3" />
                <div className="w-44 h-44 rounded-[1.5rem] overflow-hidden border-4 border-white/20 shadow-2xl">
                  <Image src="/images/hero-modelisme-1.jpg" alt="Arazzo" width={176} height={176} className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-blush-300 text-6xl font-playfair leading-none mb-1">&ldquo;</div>
                <p className="text-white text-lg md:text-xl leading-relaxed font-dm italic mb-5 max-w-2xl">{t.founderQuote}</p>
                <p className="text-blush-200 font-semibold font-dm">{t.founderName}</p>
                <div className="flex gap-1 mt-2 justify-center md:justify-start">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-orange-300 text-xl">★</span>)}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {META.map((m, i) => <TestimonialCard key={m.name} m={m} text={t.items[i].text} course={t.items[i].course} index={i} />)}
        </div>
      </div>
    </section>
  );
}
