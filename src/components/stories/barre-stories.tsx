"use client";

import { useEffect, useMemo, useState } from "react";
import { regrouper, type StoryVue } from "@/lib/stories/regles";
import { AjouterStory } from "./ajouter-story";
import { VisionneuseStories, type GroupeStories } from "./visionneuse-stories";

const CLE_VUES = "arazzo:stories-vues";

/** Stories déjà vues sur cet appareil (anneau gris au lieu de coloré). */
function lireVues(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CLE_VUES) ?? "[]") as string[]); } catch { return new Set(); }
}
function noterVues(ids: string[]) {
  try {
    const v = lireVues();
    ids.forEach((id) => v.add(id));
    localStorage.setItem(CLE_VUES, JSON.stringify([...v].slice(-500)));
  } catch { /* stockage indisponible */ }
}

/** Anneau autour d'une photo : coloré s'il reste une story à voir, gris si tout est vu, rien sans story. */
export function Anneau({ etat, children, taille = "md" }: { etat: "nouvelle" | "vue" | null; children: React.ReactNode; taille?: "md" | "lg" }) {
  if (!etat) return <>{children}</>;
  const pad = taille === "lg" ? "p-[3px]" : "p-[2.5px]";
  return (
    <span className={`inline-block rounded-full ${pad} ${etat === "nouvelle" ? "bg-gradient-to-tr from-[#FE7223] via-[#e1306c] to-[#5B16F9]" : "bg-gray-300"}`}>
      <span className="block rounded-full bg-white p-[2px]">{children}</span>
    </span>
  );
}

/** Une photo de profil cliquable qui ouvre les stories d'UNE personne (profil communauté, cartes). */
export function PhotoAvecStory({ stories, meId, moderation = false, bibliotheque, ajouter = false, children, taille = "md" }: {
  stories: StoryVue[];
  meId: string | null;
  moderation?: boolean;
  bibliotheque: string;
  /** Sa propre photo : pastille « + » pour ajouter une story. */
  ajouter?: boolean;
  children: React.ReactNode;
  taille?: "md" | "lg";
}) {
  const [ouvert, setOuvert] = useState(false);
  const [vues, setVues] = useState<Set<string>>(new Set());
  useEffect(() => { setVues(lireVues()); }, [ouvert]);
  const actives = useMemo(() => [...(regrouper(stories, new Date()).values())].flat(), [stories]);
  const etat = actives.length ? (actives.every((s) => vues.has(s.id)) ? "vue" : "nouvelle") : null;
  const groupe: GroupeStories | null = actives.length ? { userId: actives[0].userId, nom: actives[0].nom, avatar: actives[0].avatar, stories: actives } : null;

  return (
    <span className="relative inline-block">
      {groupe ? (
        <button type="button" onClick={() => { setOuvert(true); noterVues(actives.map((s) => s.id)); }} aria-label={`Voir la story de ${groupe.nom}`} className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B16F9]">
          <Anneau etat={etat} taille={taille}>{children}</Anneau>
        </button>
      ) : children}
      {ajouter ? <AjouterStory variante="pastille" /> : null}
      {ouvert && groupe ? <VisionneuseStories groupes={[groupe]} depart={0} meId={meId} moderation={moderation} bibliotheque={bibliotheque} onFermer={() => setOuvert(false)} /> : null}
    </span>
  );
}

/**
 * La rangée de stories (comme Instagram) : la mienne d'abord (avec « + »), puis les autres personnes.
 * `personnes` donne l'ordre et les photos ; seules celles qui ont une story active apparaissent (sauf moi).
 */
export function BarreStories({ stories, personnes, meId, moderation = false, bibliotheque, titre = "Stories de la classe" }: {
  stories: StoryVue[];
  personnes: { id: string; nom: string; avatar: string | null }[];
  meId: string;
  moderation?: boolean;
  bibliotheque: string;
  titre?: string;
}) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [vues, setVues] = useState<Set<string>>(new Set());
  useEffect(() => { setVues(lireVues()); }, [ouvert]);
  const parPersonne = useMemo(() => regrouper(stories, new Date()), [stories]);
  const groupes: GroupeStories[] = useMemo(() => {
    const ordre = [meId, ...personnes.map((p) => p.id).filter((id) => id !== meId)];
    return ordre.filter((id) => parPersonne.has(id)).map((id) => {
      const s = parPersonne.get(id)!;
      const p = personnes.find((x) => x.id === id);
      return { userId: id, nom: p?.nom ?? s[0].nom, avatar: p?.avatar ?? s[0].avatar, stories: s };
    });
  }, [parPersonne, personnes, meId]);
  const moi = personnes.find((p) => p.id === meId);
  const aMoi = parPersonne.has(meId);

  const bulle = (g: GroupeStories, index: number) => {
    const toutesVues = g.stories.every((s) => vues.has(s.id));
    return (
      <li key={g.userId} className="shrink-0">
        <button type="button" onClick={() => { setOuvert(index); noterVues(g.stories.map((s) => s.id)); }} className="flex flex-col items-center gap-1 w-[72px]" aria-label={`Story de ${g.nom}`}>
          <Anneau etat={toutesVues ? "vue" : "nouvelle"}>
            <span className="block w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#5B16F9] to-[#2A0880] text-white font-bold flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {g.avatar ? <img src={g.avatar} alt="" className="w-full h-full object-cover" /> : g.nom.charAt(0).toUpperCase()}
            </span>
          </Anneau>
          <span className="text-[11px] text-gray-700 dark:text-white/80 truncate w-full text-center">{g.userId === meId ? "Ma story" : g.nom}</span>
        </button>
      </li>
    );
  };

  return (
    <section aria-label={titre} className="mb-5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">{titre}</h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {!aMoi ? (
          <li className="shrink-0 flex flex-col items-center gap-1 w-[72px]">
            <span className="relative">
              <span className="block w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 font-bold flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {moi?.avatar ? <img src={moi.avatar} alt="" className="w-full h-full object-cover opacity-70" /> : "+"}
              </span>
              <AjouterStory variante="pastille" />
            </span>
            <span className="text-[11px] text-gray-700 dark:text-white/80">Ma story</span>
          </li>
        ) : null}
        {groupes.map((g, k) => bulle(g, k))}
        {aMoi ? <li className="shrink-0 self-center"><AjouterStory /></li> : null}
      </ul>
      {groupes.length === 0 ? <p className="text-xs text-gray-400 mt-1">Pas encore de story aujourd&apos;hui : soyez la première à partager votre travail !</p> : null}
      {ouvert !== null ? <VisionneuseStories groupes={groupes} depart={ouvert} meId={meId} moderation={moderation} bibliotheque={bibliotheque} onFermer={() => setOuvert(null)} /> : null}
    </section>
  );
}
