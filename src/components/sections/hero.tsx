"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Users, Film, Star, ArrowRight, Sparkles, Check } from "lucide-react";

const STATS = [
  { value: "+12 000", label: "Étudiantes actives", Icon: Users },
  { value: "127", label: "Cours publiés", Icon: Film },
  { value: "4,8/5", label: "Note moyenne", Icon: Star },
];

const TRUST = ["Paiement en DA", "Accès à vie", "Certificat PDF"];

export function HeroSection() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: 0.15 } },
  };
  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 26 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.7, 0.3, 1] } },
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* ── Vidéo de fond (atelier couture) ── */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay muted loop playsInline preload="auto" aria-hidden="true"
        poster="/images/hero-modelisme-1.jpg"
      >
        <source src="/videos/hero-couture.mp4" type="video/mp4" />
      </video>

      {/* ── Voile dégradé orange-dominant (couleurs du logo) — lisibilité + chaleur ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#3a1402]/92 via-orange-900/70 to-violet-900/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#3a1402]/85 via-transparent to-orange-950/35" />
      {/* halos : orange dominant, touche violette */}
      <div className="absolute -bottom-32 right-0 w-[40rem] h-[40rem] rounded-full bg-orange-500/30 blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -left-20 w-[30rem] h-[30rem] rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

      {/* ── Contenu ── */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full"
      >
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div variants={item}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-7">
            <Sparkles size={15} className="text-orange-300" />
            <span className="text-white/90 text-sm font-semibold font-dm tracking-wide">
              L'académie en ligne de couture du Maghreb
            </span>
          </motion.div>

          {/* Titre */}
          <motion.h1 variants={item}
            className="font-playfair text-[2.9rem] sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-5">
            Le fil de{" "}
            <span className="relative inline-block italic bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent">
              votre talent
              <svg className="absolute -bottom-3 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
                <path d="M3 8 Q75 2 150 7 Q225 12 297 4" stroke="#F4801F" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray="2 7" />
              </svg>
            </span>
            <br />
            <span className="text-white">du patron au métier.</span>
          </motion.h1>

          {/* Arabe */}
          <motion.p variants={item}
            className="text-xl text-orange-200/90 font-playfair italic mb-6" dir="rtl">
            خيط موهبتك — من الباترون إلى الحرفة
          </motion.p>

          {/* Sous-titre */}
          <motion.p variants={item}
            className="text-white/85 text-lg leading-relaxed mb-9 max-w-xl font-dm">
            Apprenez la <strong className="text-orange-300 font-semibold">couture</strong>, le{" "}
            <strong className="text-orange-300 font-semibold">modélisme</strong> et le{" "}
            <strong className="text-orange-300 font-semibold">patronage</strong> avec des formatrices
            d'Alger, Casablanca et Tunis. Patrons numériques inclus, certifié par Arazzo.
          </motion.p>

          {/* Stats */}
          <motion.div variants={item} className="flex flex-wrap gap-x-8 gap-y-4 mb-10">
            {STATS.map(({ value, label, Icon }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-orange-300">
                  <Icon size={18} />
                </span>
                <div>
                  <div className="text-2xl font-bold font-playfair text-white leading-none">{value}</div>
                  <div className="text-xs text-white/60 font-dm mt-1">{label}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div variants={item} className="flex flex-wrap gap-4 mb-7">
            <Link href="/formations"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all font-dm">
              Découvrir les formations
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/boutique"
              className="inline-flex items-center bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-violet-900 transition-all font-dm">
              Explorer la boutique
            </Link>
          </motion.div>

          {/* Trust */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-5 text-sm text-white/70 font-dm">
            {TRUST.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-orange-400/90 text-white flex items-center justify-center">
                  <Check size={11} strokeWidth={3} />
                </span>
                {t}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Fondu vers la section suivante (fond crème) */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream-DEFAULT to-transparent pointer-events-none" />
    </section>
  );
}
