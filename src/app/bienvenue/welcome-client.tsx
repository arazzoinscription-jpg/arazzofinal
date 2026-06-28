"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Clapperboard, GraduationCap, Scissors } from "lucide-react";
import { isRtl, type Lang } from "@/lib/store-i18n";

const T = {
  fr: {
    eyebrow: "Bienvenue",
    title: "La plateforme de création & production",
    subtitle: "Formation couture et patronnage numérique — apprenez, créez, vendez.",
    highlights: [
      { icon: Clapperboard, text: "Un feed vidéo vivant de la communauté" },
      { icon: GraduationCap, text: "Des espaces élève, formateur & patronniste" },
      { icon: Scissors, text: "Des patrons numériques prêts à imprimer" },
    ],
    cta: "Inscrivez-vous",
    haveAccount: "J'ai déjà un compte",
  },
  ar: {
    eyebrow: "مرحبًا",
    title: "منصّة الإبداع والإنتاج",
    subtitle: "تكوين في الخياطة والباترون الرقمي — تعلّمي، أبدعي، بيعي.",
    highlights: [
      { icon: Clapperboard, text: "feed فيديو حيّ للمجتمع" },
      { icon: GraduationCap, text: "مساحات للطالبة والمدرّبة والباترونيست" },
      { icon: Scissors, text: "باترونات رقمية جاهزة للطباعة" },
    ],
    cta: "سجّلي الآن",
    haveAccount: "لديّ حساب بالفعل",
  },
  en: {
    eyebrow: "Welcome",
    title: "The creation & production platform",
    subtitle: "Sewing courses and digital patternmaking — learn, create, sell.",
    highlights: [
      { icon: Clapperboard, text: "A living community video feed" },
      { icon: GraduationCap, text: "Student, trainer & pattern-maker spaces" },
      { icon: Scissors, text: "Print-ready digital patterns" },
    ],
    cta: "Sign up",
    haveAccount: "I already have an account",
  },
} as const;

export function WelcomeClient({ lang = "fr" }: { lang?: Lang }) {
  const t = T[lang] ?? T.fr;
  const [h, setH] = useState(0);

  // Défilement des points forts (~2,8 s chacun) en arrière-plan du message d'accueil.
  useEffect(() => {
    const id = setInterval(() => setH((n) => (n + 1) % t.highlights.length), 2800);
    return () => clearInterval(id);
  }, [t.highlights.length]);

  const Hi = t.highlights[h].icon;

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="relative min-h-[100dvh] w-full overflow-hidden bg-[#160a30] text-white flex flex-col">
      {/* Vidéo de fond */}
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-45"
        autoPlay muted loop playsInline preload="metadata"
        poster="/videos/bienvenue-montage.jpg"
      >
        {/* Montage des captures réelles : feed vidéo puis espace élève */}
        <source src="/videos/bienvenue-montage.mp4" type="video/mp4" />
        <source src="/videos/hero-couture-mobile.mp4" type="video/mp4" />
      </video>
      {/* Dégradé d'assombrissement */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#160a30]/70 via-[#160a30]/55 to-[#160a30]/95" />

      {/* Contenu */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
        <motion.img
          initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          src="/images/arazzo-icon.png" alt="Arazzo" className="w-16 h-16 rounded-2xl shadow-lg shadow-black/40 mb-6"
        />
        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="font-mono text-[11px] tracking-[0.35em] uppercase text-orange-300 mb-3"
        >
          {t.eyebrow}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          className="font-playfair text-3xl sm:text-4xl font-bold leading-tight max-w-md"
        >
          {t.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}
          className="text-violet-100/80 font-dm mt-4 max-w-sm text-sm sm:text-base"
        >
          {t.subtitle}
        </motion.p>

        {/* Point fort qui défile */}
        <div className="mt-8 h-12 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={h}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-4 py-2.5"
            >
              <Hi size={18} className="text-orange-300 flex-shrink-0" />
              <span className="text-sm font-dm text-white/90">{t.highlights[h].text}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Actions (collées en bas, pouce-friendly) */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
        className="relative z-10 px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] space-y-3 w-full max-w-sm mx-auto"
      >
        <Link href="/register"
          className="group w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-glow hover:brightness-105 transition-all">
          {t.cta} <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
        </Link>
        <Link href="/login"
          className="w-full inline-flex items-center justify-center text-white/70 hover:text-white font-semibold py-2.5 text-sm transition-colors">
          {t.haveAccount}
        </Link>
      </motion.div>
    </div>
  );
}
