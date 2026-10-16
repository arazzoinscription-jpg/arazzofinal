"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { DUREE_PHOTO_MS, ilYa, type StoryVue } from "@/lib/stories/regles";
import { supprimerStory } from "@/app/actions/stories";

export interface GroupeStories { userId: string; nom: string; avatar: string | null; stories: StoryVue[] }

/**
 * Visionneuse plein écran : les stories d'une personne puis de la suivante. Photo : 6 s ; vidéo : sa durée.
 * Toucher à droite = suivante, à gauche = précédente, glisser vers le bas ou ✕ = fermer.
 */
export function VisionneuseStories({ groupes, depart, meId, moderation = false, bibliotheque, onFermer }: {
  groupes: GroupeStories[];
  depart: number;
  meId: string | null;
  /** Administration : peut supprimer n'importe quelle story. */
  moderation?: boolean;
  /** Bibliothèque Bunny (lecteur vidéo intégré). */
  bibliotheque: string;
  onFermer: () => void;
}) {
  const router = useRouter();
  const [g, setG] = useState(depart);
  const [i, setI] = useState(0);
  const [avance, setAvance] = useState(0);
  const [pause, setPause] = useState(false);
  const debut = useRef<{ x: number; y: number } | null>(null);
  const groupe = groupes[g];
  const story = groupe?.stories[i];
  const duree = story ? (story.kind === "video" ? Math.max(3, story.duree ?? 15) * 1000 : DUREE_PHOTO_MS) : DUREE_PHOTO_MS;

  const suivante = useCallback(() => {
    if (!groupe) return;
    if (i < groupe.stories.length - 1) { setI(i + 1); setAvance(0); return; }
    if (g < groupes.length - 1) { setG(g + 1); setI(0); setAvance(0); return; }
    onFermer();
  }, [g, i, groupe, groupes.length, onFermer]);

  const precedente = useCallback(() => {
    if (i > 0) { setI(i - 1); setAvance(0); return; }
    if (g > 0) { setG(g - 1); setI(Math.max(0, groupes[g - 1].stories.length - 1)); setAvance(0); }
  }, [g, i, groupes]);

  // Avancement automatique (barres en haut).
  useEffect(() => {
    if (!story || pause) return;
    const pas = 100;
    const t = window.setInterval(() => setAvance((a) => a + pas), pas);
    return () => window.clearInterval(t);
  }, [story, pause]);
  useEffect(() => { if (avance >= duree) suivante(); }, [avance, duree, suivante]);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
      if (e.key === "ArrowRight") suivante();
      if (e.key === "ArrowLeft") precedente();
    };
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", touche);
    return () => { window.removeEventListener("keydown", touche); document.body.style.overflow = ancien; };
  }, [onFermer, suivante, precedente]);

  if (!groupe || !story) return null;
  const peutSupprimer = meId === story.userId || moderation;

  async function supprimer() {
    if (!story || !confirm("Supprimer cette story ?")) return;
    const r = await supprimerStory(story.id);
    if (r.ok) { router.refresh(); onFermer(); } else alert(r.erreur);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Story de ${groupe.nom}`} className="fixed inset-0 z-[85] bg-black flex flex-col"
      onTouchStart={(e) => { debut.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; setPause(true); }}
      onTouchEnd={(e) => {
        setPause(false);
        const d = debut.current; debut.current = null;
        if (!d) return;
        const dy = e.changedTouches[0].clientY - d.y;
        if (dy > 120) onFermer();
      }}>
      {/* Barres d'avancement */}
      <div className="flex gap-1 px-3 pt-[max(10px,env(safe-area-inset-top))]">
        {groupe.stories.map((s, k) => (
          <span key={s.id} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
            <span className="block h-full bg-white" style={{ width: `${k < i ? 100 : k === i ? Math.min(100, (avance / duree) * 100) : 0}%` }} />
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 text-white">
        <span className="w-9 h-9 rounded-full overflow-hidden bg-white/20 flex items-center justify-center font-bold text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {groupe.avatar ? <img src={groupe.avatar} alt="" className="w-full h-full object-cover" /> : groupe.nom.charAt(0).toUpperCase()}
        </span>
        <span className="font-semibold text-sm truncate">{groupe.nom}</span>
        <span className="text-xs text-white/60">{ilYa(story.createdAt, new Date())}</span>
        {peutSupprimer ? (
          <button type="button" onClick={supprimer} aria-label="Supprimer cette story" className="ms-auto p-2 rounded-full hover:bg-white/10"><Trash2 size={18} /></button>
        ) : <span className="ms-auto" />}
        <button type="button" onClick={onFermer} aria-label="Fermer" className="p-2 rounded-full hover:bg-white/10"><X size={22} /></button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center">
        {story.kind === "image" && story.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={story.id} src={story.mediaUrl} alt={story.legende ?? `Story de ${groupe.nom}`} className="max-w-full max-h-full object-contain" />
        ) : story.bunnyVideoId && bibliotheque ? (
          <iframe key={story.id} src={`https://iframe.mediadelivery.net/embed/${bibliotheque}/${story.bunnyVideoId}?autoplay=true&loop=false&preload=true&responsive=true`}
            title="Story vidéo" allow="autoplay; encrypted-media" className="w-full h-full" style={{ border: 0 }} />
        ) : <p className="text-white/70 text-sm">Story indisponible.</p>}
        {/* Zones de toucher : gauche = précédente, droite = suivante */}
        <button type="button" aria-label="Story précédente" onClick={precedente} className="absolute inset-y-0 start-0 w-1/3" />
        <button type="button" aria-label="Story suivante" onClick={suivante} className="absolute inset-y-0 end-0 w-1/3" />
      </div>
      {story.legende ? <p className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 text-white text-sm text-center">{story.legende}</p> : <div className="h-[max(16px,env(safe-area-inset-bottom))]" />}
    </div>
  );
}
