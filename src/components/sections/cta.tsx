"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { Check } from "lucide-react";
import { HOME, type Lang } from "@/lib/home-i18n";

const MotionLink = motion.create(Link);

export function CtaSection({ lang = "fr" }: { lang?: Lang }) {
  const reduce = useReducedMotion();
  const t = HOME[lang].cta;

  return (
    <section className="py-20 bg-blush-mesh dark:bg-[#0d0a1c]">
      <div className="max-w-5xl mx-auto px-4">
        <Reveal animation="zoom">
          <div className="relative bg-gradient-to-br from-violet-DEFAULT via-violet-600 to-violet-800 rounded-3xl p-10 md:p-16 overflow-hidden text-center shadow-glow">
            {/* Fond qui "respire" */}
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-orange-DEFAULT/15 via-transparent to-violet-400/10"
              animate={reduce ? undefined : { opacity: [0.4, 0.8, 0.4], scale: [1, 1.06, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-orange-DEFAULT/15 -translate-y-1/3 translate-x-1/3 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />

            <div className="relative">
              <div className="flex justify-center mb-5">
                <span className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">
                  <motion.span
                    animate={reduce ? undefined : { rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    🧵
                  </motion.span>
                </span>
              </div>
              <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                {t.title}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-9 mt-6">
                <span className="inline-flex items-center gap-2 text-white font-dm">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white"><Check size={14} strokeWidth={3} /></span>
                  {t.g1}
                </span>
                <span className="inline-flex items-center gap-2 text-white font-dm">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white"><Check size={14} strokeWidth={3} /></span>
                  {t.g2}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <MotionLink href="/register"
                  whileHover={{ scale: 1.05, backgroundColor: "#E8650A" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-orange-DEFAULT text-white px-9 py-4 rounded-2xl font-bold text-lg shadow-lg font-dm"
                >
                  {t.primary}
                </MotionLink>
                <MotionLink href="/devenir-formateur"
                  whileHover={{ x: 4 }} transition={{ duration: 0.2 }}
                  className="bg-white/10 border-2 border-white/40 text-white px-9 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-orange-600 transition-colors font-dm"
                >
                  {t.secondary}
                </MotionLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
