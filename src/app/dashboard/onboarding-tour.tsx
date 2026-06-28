"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Clapperboard, GraduationCap, Scissors, ArrowRight, X } from "lucide-react";
import type { Lang } from "./dash-i18n";

const STORAGE_KEY = "arazzo_tour_done_v1";
const AUTO_MS = 5000;

type Step = { icon: typeof LayoutGrid; color: string; title: string; body: string };

const STEPS: Record<Lang, Step[]> = {
  fr: [
    { icon: LayoutGrid, color: "text-orange-500", title: "Voici votre espace", body: "Retrouvez ici vos formations, vos travaux pratiques et votre progression." },
    { icon: Clapperboard, color: "text-violet-500", title: "Voici votre feed", body: "Découvrez en vidéo les travaux de la communauté et les nouveautés." },
    { icon: GraduationCap, color: "text-orange-500", title: "Voici les formations", body: "Explorez l'offre de couture & modélisme et inscrivez-vous en quelques clics." },
    { icon: Scissors, color: "text-violet-500", title: "Voici le patronnage", body: "Des patrons numériques prêts à imprimer, à découvrir et à acheter." },
  ],
  ar: [
    { icon: LayoutGrid, color: "text-orange-500", title: "هذه مساحتك", body: "تجدين هنا دوراتك وأعمالك التطبيقية وتقدّمك." },
    { icon: Clapperboard, color: "text-violet-500", title: "هذا الـ feed", body: "اكتشفي فيديوهات المجتمع والجديد." },
    { icon: GraduationCap, color: "text-orange-500", title: "هذه التكوينات", body: "استكشفي عروض الخياطة والمودلاج وسجّلي بسهولة." },
    { icon: Scissors, color: "text-violet-500", title: "هذا الباترون", body: "باترونات رقمية جاهزة للطباعة، للاكتشاف والشراء." },
  ],
  en: [
    { icon: LayoutGrid, color: "text-orange-500", title: "This is your space", body: "Find your courses, practical work and progress here." },
    { icon: Clapperboard, color: "text-violet-500", title: "This is your feed", body: "Discover the community's work and what's new, in video." },
    { icon: GraduationCap, color: "text-orange-500", title: "These are the courses", body: "Explore sewing & patternmaking and enroll in a few clicks." },
    { icon: Scissors, color: "text-violet-500", title: "This is patternmaking", body: "Print-ready digital patterns to discover and buy." },
  ],
};

const UI: Record<Lang, { skip: string; next: string; start: string }> = {
  fr: { skip: "Passer", next: "Suivant", start: "Commencer" },
  ar: { skip: "تخطّي", next: "التالي", start: "ابدئي" },
  en: { skip: "Skip", next: "Next", start: "Start" },
};

/** Visite guidée affichée UNE FOIS, au premier accès au tableau de bord. */
export function OnboardingTour({ lang }: { lang: Lang }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  const steps = STEPS[lang] ?? STEPS.fr;
  const ui = UI[lang] ?? UI.fr;

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch { /* localStorage indisponible → on n'affiche pas */ }
  }, []);

  // Avance automatique (s'arrête sur la dernière étape).
  useEffect(() => {
    if (!open || i >= steps.length - 1) return;
    const id = setTimeout(() => setI((n) => Math.min(n + 1, steps.length - 1)), AUTO_MS);
    return () => clearTimeout(id);
  }, [open, i, steps.length]);

  function close() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  }
  function next() {
    if (i >= steps.length - 1) close();
    else setI((n) => n + 1);
  }

  if (!mounted || !open) return null;

  const step = steps[i];
  const Icon = step.icon;
  const last = i === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-violet-950/70 backdrop-blur-sm" onClick={close} />
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm bg-white dark:bg-[#161033] rounded-3xl shadow-2xl ring-1 ring-violet-950/10 dark:ring-white/10 p-7 text-center"
        >
          <button onClick={close} aria-label={ui.skip}
            className="absolute top-3 end-3 text-gray-300 hover:text-gray-500 dark:text-white/30 dark:hover:text-white/60">
            <X size={18} />
          </button>

          <span className="inline-flex w-16 h-16 rounded-2xl bg-cream-100 dark:bg-white/5 items-center justify-center mb-4">
            <Icon size={30} className={step.color} />
          </span>
          <h2 className="font-playfair text-2xl font-bold text-violet-950 dark:text-white mb-2">{step.title}</h2>
          <p className="text-gray-500 dark:text-white/60 font-dm text-sm leading-relaxed">{step.body}</p>

          {/* Indicateurs */}
          <div className="flex items-center justify-center gap-1.5 mt-5 mb-5">
            {steps.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-orange-DEFAULT" : "w-1.5 bg-cream-300 dark:bg-white/20"}`} />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button onClick={close} className="text-sm font-semibold text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70">
              {ui.skip}
            </button>
            <button onClick={next}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-glow hover:brightness-105 transition-all">
              {last ? ui.start : ui.next}
              {!last && <ArrowRight size={16} className="rtl:rotate-180" />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
