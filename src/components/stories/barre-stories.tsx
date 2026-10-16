"use client";

import { useEffect, useMemo, useState } from "react";
import { ordreBarre, regrouper, type StoryVue } from "@/lib/stories/regles";
import { AjouterStory } from "./ajouter-story";
import { VisionneuseStories, type GroupeStories } from "./visionneuse-stories";
import { ecouterVues, lireVues, noterVues } from "./vues-locales";

/** Anneau autour d'une photo : coloré s'il reste une story à voir, gris si tout est vu, rien sans story. */
export function Anneau({ etat, children, taille = "md", sombre = false }: { etat: "nouvelle" | "vue" | null; children: React.ReactNode; taille?: "md" | "lg"; sombre?: boolean }) {
  if (!etat) return <>{children}</>;
  const pad = taille === "lg" ? "p-[3px]" : "p-[2.5px]";
  return (
    <span className={`inline-block rounded-full ${pad} ${etat === "nouvelle" ? "bg-gradient-to-tr from-[#FE7223] via-[#e1306c] to-[#5B16F9]" : sombre ? "bg-white/30" : "bg-gray-300"}`}>
      <span className={`block rounded-full p-[2px] ${sombre ? "bg-[#0b0818]" : "bg-white"}`}>{children}</span>
    </span>
  );
}

/** Vues de cet appareil, tenues à jour pendant la lecture. */
function useVues(): Set<string> {
  const [vues, setVues] = useState<Set<string>>(new Set());
  useEffect(() => { setVues(lireVues()); return ecouterVues(() => setVues(lireVues())); }, []);
  return vues;
}

/** Une photo de profil cliquable qui ouvre les stories d'UNE personne (profil communauté, cartes). */
export function PhotoAvecStory({ stories, meId, moderation = false, bibliotheque, ajouter = false, equipe = false, children, taille = "md" }: {
  stories: StoryVue[];
  meId: string | null;
  moderation?: boolean;
  bibliotheque: string;
  /** Sa propre photo : pastille « + » pour ajouter une story. */
  ajouter?: boolean;
  /** La personne connectée fait partie de l'équipe (liens vers d'autres sites permis). */
  equipe?: boolean;
  children: React.ReactNode;
  taille?: "md" | "lg";
}) {
  const [ouvert, setOuvert] = useState(false);
  const vues = useVues();
  const actives = useMemo(() => [...(regrouper(stories, new Date()).values())].flat(), [stories]);
  const etat = actives.length ? (actives.every((s) => vues.has(s.id)) ? "vue" : "nouvelle") : null;
  const groupe: GroupeStories | null = actives.length ? { userId: actives[0].userId, nom: actives[0].nom, avatar: actives[0].avatar, stories: actives } : null;

  return (
    <span className="relative inline-block">
      {groupe ? (
        <button type="button" onClick={() => setOuvert(true)} aria-label={`Voir la story de ${groupe.nom}`} className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B16F9]">
          <Anneau etat={etat} taille={taille}>{children}</Anneau>
        </button>
      ) : children}
      {ajouter ? <AjouterStory variante="pastille" equipe={equipe} /> : null}
      {ouvert && groupe ? <VisionneuseStories groupes={[groupe]} depart={0} meId={meId} moderation={moderation} bibliotheque={bibliotheque} onFermer={() => setOuvert(false)} /> : null}
    </span>
  );
}

/**
 * La rangée de stories (comme Instagram). Ordre : l'enseignante d'abord, puis le reste de l'équipe,
 * « Ma story », puis les autres (pas encore vues d'abord). « Ma story + » reste toujours là pour en ajouter une.
 * `personnes` (facultatif) donne les photos et noms à afficher ; sinon ceux des stories.
 * Variante « feed » : compacte, sur fond sombre, sans titre (barre du haut du feed).
 */
export function BarreStories({ stories, personnes = [], meId, moiEquipe = false, monAvatar = null, enseignantes = [], moderation = false, bibliotheque, titre = "Stories de la classe", variante = "classe" }: {
  stories: StoryVue[];
  personnes?: { id: string; nom: string; avatar: string | null }[];
  meId: string;
  moiEquipe?: boolean;
  monAvatar?: string | null;
  /** Mes enseignantes (celles de mes cours) : toujours en premier. */
  enseignantes?: string[];
  moderation?: boolean;
  bibliotheque: string;
  titre?: string;
  variante?: "classe" | "feed";
}) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  const vues = useVues();
  const feed = variante === "feed";
  const parPersonne = useMemo(() => regrouper(stories, new Date()), [stories]);
  const ordre = useMemo(
    () => ordreBarre([...parPersonne.keys(), meId], parPersonne, { meId, moiEquipe, enseignantes, vues }),
    // L'ordre est figé pendant la lecture (sinon les bulles bougent sous le doigt) : recalculé à la fermeture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parPersonne, meId, moiEquipe, enseignantes, ouvert === null ? vues : null],
  );
  const groupes: GroupeStories[] = useMemo(() => ordre.filter((id) => parPersonne.has(id)).map((id) => {
    const s = parPersonne.get(id)!;
    const p = personnes.find((x) => x.id === id);
    return { userId: id, nom: p?.nom ?? s[0].nom, avatar: p?.avatar ?? s[0].avatar, stories: s };
  }), [ordre, parPersonne, personnes]);
  const avatarMoi = monAvatar ?? personnes.find((p) => p.id === meId)?.avatar ?? null;
  const aMoi = parPersonne.has(meId);

  const taille = feed ? "w-[52px] h-[52px]" : "w-14 h-14";
  const largeur = feed ? "w-[62px]" : "w-[72px]";
  const legende = feed ? "text-[10px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,.8)]" : "text-[11px] text-gray-700 dark:text-white/80";

  const bulle = (g: GroupeStories, index: number) => {
    const toutesVues = g.stories.every((s) => vues.has(s.id));
    const equipe = g.stories[0]?.equipe;
    return (
      <li key={g.userId} className="shrink-0">
        <button type="button" onClick={() => { setOuvert(index); noterVues([g.stories[0].id]); }} className={`flex flex-col items-center gap-1 ${largeur}`} aria-label={`Story de ${g.nom}`}>
          <span className="relative">
            <Anneau etat={toutesVues ? "vue" : "nouvelle"} sombre={feed}>
              <span className={`block ${taille} rounded-full overflow-hidden bg-gradient-to-br from-[#5B16F9] to-[#2A0880] text-white font-bold flex items-center justify-center`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.avatar ? <img src={g.avatar} alt="" className="w-full h-full object-cover" /> : g.nom.charAt(0).toUpperCase()}
              </span>
            </Anneau>
            {equipe && g.userId !== meId ? <span className="absolute -bottom-1 start-1/2 -translate-x-1/2 rounded-full bg-[#FE7223] text-white text-[8px] font-bold px-1.5 leading-[14px] ring-2 ring-white whitespace-nowrap" aria-hidden>PROF</span> : null}
          </span>
          <span className={`${legende} truncate w-full text-center`}>{g.userId === meId ? "Ma story" : g.nom}</span>
        </button>
      </li>
    );
  };

  const maBulleVide = (
    <li key="ma-story" className={`shrink-0 flex flex-col items-center gap-1 ${largeur}`}>
      <span className="relative">
        <span className={`block ${taille} rounded-full overflow-hidden border-2 border-dashed font-bold flex items-center justify-center ${feed ? "bg-white/10 border-white/40 text-white/70" : "bg-gray-100 border-gray-300 text-gray-500"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatarMoi ? <img src={avatarMoi} alt="" className="w-full h-full object-cover opacity-70" /> : "+"}
        </span>
        <AjouterStory variante="pastille" equipe={moiEquipe} />
      </span>
      <span className={legende}>Ma story</span>
    </li>
  );

  const liste = (
    <ul className={`flex overflow-x-auto ${feed ? "gap-2 px-3 pb-1 pt-0.5" : "gap-3 pb-1"}`} style={{ scrollbarWidth: "none" }}>
      {ordre.map((id) => {
        if (id === meId && !aMoi) return maBulleVide;
        const k = groupes.findIndex((x) => x.userId === id);
        return k >= 0 ? bulle(groupes[k], k) : null;
      })}
      {aMoi ? <li className="shrink-0 self-center"><AjouterStory sombre={feed} equipe={moiEquipe} /></li> : null}
    </ul>
  );

  return (
    <section aria-label={titre} className={feed ? "" : "mb-5"}>
      {feed ? null : <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">{titre}</h2>}
      {liste}
      {!feed && groupes.length === 0 ? <p className="text-xs text-gray-400 mt-1">Pas encore de story aujourd&apos;hui : soyez la première à partager votre travail !</p> : null}
      {ouvert !== null ? <VisionneuseStories groupes={groupes} depart={ouvert} meId={meId} moderation={moderation} bibliotheque={bibliotheque} onFermer={() => setOuvert(null)} /> : null}
    </section>
  );
}
