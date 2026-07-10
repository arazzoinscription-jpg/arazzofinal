"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Celebration { student_name: string; course_titre: string | null }

/**
 * Écoute les célébrations en TEMPS RÉEL (table `celebrations`). Quand un élève
 * obtient son diplôme, un popup « Bravo 🎉 » s'affiche à tous les élèves connectés,
 * avec un petit son de félicitation (généré via Web Audio, aucun fichier requis).
 */
export function CelebrationListener() {
  const [celeb, setCeleb] = useState<Celebration | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("celebrations")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "celebrations" }, (payload) => {
        const c = payload.new as Celebration;
        setCeleb(c);
        playBravo();
        setTimeout(() => setCeleb(null), 7000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!celeb) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setCeleb(null)}>
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#15102b] shadow-2xl border border-cream-200 dark:border-white/10 p-7 text-center overflow-hidden animate-[pop_.4s_ease-out]">
        {/* Confettis simples */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="absolute top-0 w-1.5 h-3 rounded-sm animate-[fall_2.2s_linear_infinite]"
              style={{
                left: `${(i * 37) % 100}%`,
                background: ["#E8650A", "#6B21C8", "#EAB308", "#EC4899", "#22C55E"][i % 5],
                animationDelay: `${(i % 8) * 0.15}s`,
              }} />
          ))}
        </div>
        <div className="relative">
          <div className="text-6xl mb-2">🎉</div>
          <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white">Bravo !</h2>
          <p className="mt-2 text-gray-700 dark:text-white/80 font-dm">
            <strong>{celeb.student_name}</strong> vient d'obtenir son diplôme
            {celeb.course_titre ? <> de « {celeb.course_titre} »</> : null} ! 👏
          </p>
          <p className="mt-3 text-sm text-violet-600 dark:text-violet-300 font-dm">À votre tour bientôt 💪</p>
          <button onClick={() => setCeleb(null)} className="mt-5 bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
            Féliciter 🎊
          </button>
        </div>
      </div>
      <style>{`
        @keyframes pop { 0% { transform: scale(.8); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes fall { 0% { transform: translateY(-20px) rotate(0); opacity: 1 } 100% { transform: translateY(340px) rotate(360deg); opacity: 0 } }
      `}</style>
    </div>
  );
}

/** Petit « ta-da » de félicitation via Web Audio (pas de fichier son à héberger). */
function playBravo() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // do-mi-sol-do (accord ascendant)
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.45);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch { /* audio bloqué (pas d'interaction) : le popup reste visible */ }
}
