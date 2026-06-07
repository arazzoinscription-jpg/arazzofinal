"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { Scissors, Ruler, Award, Sparkles, ArrowRight, PlayCircle, type LucideIcon } from "lucide-react";
import { HOME, type Lang } from "@/lib/home-i18n";

const FEATURE_ICONS: LucideIcon[] = [Scissors, Ruler, Award];
const GALLERY_IMG = ["/images/mannequin-couture.jpg", "/images/mannequin-dessin.jpg", "/images/mannequin-mode.jpg"];

function GalleryCard({ src, label, tag, index }: { src: string; label: string; tag: string; index: number }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: reduce ? 0 : index * 0.11 }}
      whileHover={reduce ? undefined : { scale: 1.03, rotate: 0.5 }}
      className="group relative rounded-3xl overflow-hidden shadow-soft border border-cream-200"
    >
      <img src={src} alt={label} className="w-full h-60 object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-violet-950/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <span className="inline-block text-[11px] font-bold text-white bg-orange-DEFAULT px-2.5 py-1 rounded-full mb-2">{tag}</span>
        <h3 className="font-playfair text-xl font-bold text-white">{label}</h3>
      </div>
    </motion.div>
  );
}

export function AtelierShowcaseSection({ lang = "fr" }: { lang?: Lang }) {
  const reduce = useReducedMotion();
  const t = HOME[lang].atelier;
  const imgRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  return (
    <section className="relative py-24 bg-gradient-to-b from-cream-DEFAULT to-white dark:from-[#0d0a1c] dark:to-[#0d0a1c] overflow-hidden">
      <div className="absolute -top-20 right-0 w-[36rem] h-[36rem] rounded-full bg-orange-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal animation="left" className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-orange-DEFAULT/30 via-blush-300/20 to-violet-DEFAULT/30 rounded-[2.5rem] blur-2xl" />
            <div ref={imgRef} className="relative rounded-[2rem] overflow-hidden border-[6px] border-white shadow-2xl h-[26rem]">
              <motion.img src="/images/mannequin-couture.jpg" alt="" style={{ y: reduce ? 0 : y }} className="absolute inset-x-0 -top-8 w-full h-[calc(26rem+4rem)] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/25 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-4 sm:right-6 bg-white/90 dark:bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-cream-200 dark:border-white/15 px-5 py-3.5 flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 flex items-center justify-center"><PlayCircle size={22} /></span>
              <div>
                <p className="font-playfair font-bold text-gray-900 dark:text-white text-lg leading-none">{t.cardNum}</p>
                <p className="text-xs text-gray-500 dark:text-white/50 font-dm mt-0.5">{t.cardSub}</p>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal animation="up">
              <span className="inline-flex items-center gap-2 text-orange-600 font-semibold font-dm text-sm tracking-wide mb-4">
                <Sparkles size={16} /> {t.eyebrow}
              </span>
              <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-5">
                {t.title}{" "}<span className="text-orange-600 dark:text-orange-300 italic">{t.hi}</span>.
              </h2>
              <p className="text-gray-600 dark:text-white/60 text-lg leading-relaxed mb-8 font-dm max-w-xl">{t.p}</p>
            </Reveal>

            <div className="space-y-4 mb-9">
              {t.features.map((f, i) => {
                const Icon = FEATURE_ICONS[i];
                return (
                  <Reveal key={f.title} animation="left" delay={i * 120} className="flex items-start gap-4">
                    <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-500/20 dark:to-orange-500/10 text-orange-600 dark:text-orange-300 flex items-center justify-center flex-shrink-0"><Icon size={20} /></span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white font-dm">{f.title}</h3>
                      <p className="text-gray-500 dark:text-white/50 text-sm font-dm">{f.desc}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal animation="up" delay={120}>
              <Link href="/formations" className="group inline-flex items-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-7 py-3.5 rounded-2xl font-bold text-lg shadow-glow hover:-translate-y-0.5 transition-all font-dm">
                {t.btn}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Reveal>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-20">
          {t.gallery.map((g, i) => (
            <GalleryCard key={g.label} src={GALLERY_IMG[i]} label={g.label} tag={g.tag} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
